// UC12 – Calcular Massas, UC13 – Calcular Insumos, UC14 – Calcular Embalagens (RN09 a RN12)
import { pedidoRepositorio } from '@/dados/repositorios/pedidoRepositorio';
import { produtoRepositorio } from '@/dados/repositorios/produtoRepositorio';
import { massaRepositorio } from '@/dados/repositorios/massaRepositorio';
import { ErroDeNegocio, exigirNumero } from './erros';
import { dadosDaUnidade } from './insumoServico';

const arredondarMeia = (valor) => Math.ceil(valor * 2 - 1e-9) / 2;

// ---------- Funções puras ----------

/** RN09: gramas e número de receitas de cada massa para as quantidades { produtoId: qtd }. */
export function calcularMassas(quantidades, configuracoes) {
  const porMassa = new Map();
  const semConfiguracao = [];
  for (const [produtoId, qtd] of Object.entries(quantidades)) {
    if (!(qtd > 0)) continue;
    const config = configuracoes.find((c) => c.produto_id === produtoId);
    if (!config) { semConfiguracao.push(produtoId); continue; }
    const pesoTotal = qtd * config.peso_unitario_g;
    for (const m of config.massas) {
      const gramas = pesoTotal * (m.percentual / 100);
      const atual = porMassa.get(m.massa_id) ?? { massa_id: m.massa_id, nome: m.massa_nome, rendimento_g: m.rendimento_g, gramas: 0, doces: [] };
      atual.gramas += gramas;
      atual.doces.push({ produto_id: produtoId, nome: config.produto_nome, quantidade: qtd, gramas });
      porMassa.set(m.massa_id, atual);
    }
  }
  const massas = [...porMassa.values()].map((m) => {
    const exatas = m.gramas / m.rendimento_g;
    return { ...m, receitas_exatas: exatas, receitas: arredondarMeia(exatas) };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return { massas, semConfiguracao };
}

/**
 * RN10: monta a caixa degustação. Começa com 1 unidade de cada sabor e preenche as vagas restantes,
 * uma a uma, com o sabor que deixa o total de massa mais próximo de receitas inteiras (menor sobra).
 * Cada sabor repete no máximo uma vez enquanto houver sabores que ainda não repetiram.
 */
export function montarCaixaDegustacao(configuracoes, sabores, tamanho, caixas = 1) {
  const escolhidos = configuracoes.filter((c) => sabores.includes(c.produto_id));
  if (escolhidos.length === 0) throw new ErroDeNegocio('Selecione pelo menos um sabor.');
  const tam = exigirNumero(tamanho, 'O tamanho da caixa', { maiorQueZero: true });
  if (!Number.isInteger(tam)) throw new ErroDeNegocio('O tamanho da caixa deve ser um número inteiro.');
  if (tam < escolhidos.length) throw new ErroDeNegocio(`A caixa precisa ter pelo menos ${escolhidos.length} lugares (um por sabor).`);
  const qtdCaixas = Math.max(1, Math.floor(exigirNumero(caixas, 'O número de caixas', { maiorQueZero: true })));

  const qtds = Object.fromEntries(escolhidos.map((c) => [c.produto_id, 1]));
  const sobra = (q) => calcularMassas(q, escolhidos).massas
    .reduce((total, m) => { const frac = m.receitas_exatas % 1; return total + Math.min(frac, 1 - frac); }, 0);
  const repetidos = new Set();

  for (let vaga = escolhidos.length; vaga < tam; vaga += 1) {
    const candidatos = escolhidos.filter((c) => !repetidos.has(c.produto_id));
    const lista = candidatos.length ? candidatos : escolhidos;
    let melhor = null;
    let menorSobra = Infinity;
    for (const c of lista) {
      const teste = sobra({ ...qtds, [c.produto_id]: qtds[c.produto_id] + 1 });
      if (teste < menorSobra) { menorSobra = teste; melhor = c; }
    }
    qtds[melhor.produto_id] += 1;
    repetidos.add(melhor.produto_id);
  }
  return Object.fromEntries(Object.entries(qtds).map(([id, q]) => [id, q * qtdCaixas]));
}

/** RN11: total de cada insumo, expandindo os componentes (sub-produtos). */
export function calcularInsumos(quantidades, produtos, fichas, componentes) {
  const porProduto = new Map(produtos.map((p) => [p.id, p]));
  const totais = new Map();
  const semFicha = new Set();
  const somar = (produtoId, unidades, caminho = new Set()) => {
    const produto = porProduto.get(produtoId);
    if (!produto || caminho.has(produtoId)) return;
    const meusInsumos = fichas.filter((f) => f.produto_id === produtoId);
    const meusComponentes = componentes.filter((c) => c.produto_id === produtoId);
    if (meusInsumos.length === 0 && meusComponentes.length === 0) semFicha.add(produtoId);
    const receitas = unidades / produto.rendimento;
    for (const f of meusInsumos) {
      const atual = totais.get(f.insumo_id) ?? { insumo_id: f.insumo_id, nome: f.insumo_nome, unidade: dadosDaUnidade(f.insumo_unidade).base, quantidade: 0 };
      atual.quantidade += f.quantidade * receitas;
      totais.set(f.insumo_id, atual);
    }
    const proximo = new Set(caminho).add(produtoId);
    for (const c of meusComponentes) somar(c.componente_id, c.quantidade * receitas, proximo);
  };
  for (const [produtoId, qtd] of Object.entries(quantidades)) if (qtd > 0) somar(produtoId, qtd);
  return {
    insumos: [...totais.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    semFicha: [...semFicha],
  };
}

/** RN11: total de cada embalagem = quantidade do produto × embalagens por unidade. */
export function calcularEmbalagens(quantidades, produtoEmbalagens) {
  const totais = new Map();
  const semEmbalagem = [];
  for (const [produtoId, qtd] of Object.entries(quantidades)) {
    if (!(qtd > 0)) continue;
    const minhas = produtoEmbalagens.filter((e) => e.produto_id === produtoId);
    if (minhas.length === 0) { semEmbalagem.push(produtoId); continue; }
    for (const e of minhas) {
      const atual = totais.get(e.embalagem_id) ?? { embalagem_id: e.embalagem_id, nome: e.embalagem_nome, quantidade: 0, produtos: [] };
      atual.quantidade += qtd * e.quantidade;
      atual.produtos.push({ produto_id: produtoId, quantidade: qtd * e.quantidade });
      totais.set(e.embalagem_id, atual);
    }
  }
  return {
    embalagens: [...totais.values()].map((e) => ({ ...e, quantidade_compra: Math.ceil(e.quantidade - 1e-9) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    semEmbalagem,
  };
}

/** Formata quantidades grandes de forma legível (2500 g → 2,5 kg). */
export function quantidadeLegivel(quantidade, unidade) {
  const fmt = (v, casas) => v.toLocaleString('pt-BR', { maximumFractionDigits: casas });
  if (unidade === 'g' && quantidade >= 1000) return `${fmt(quantidade / 1000, 3)} kg`;
  if (unidade === 'ml' && quantidade >= 1000) return `${fmt(quantidade / 1000, 3)} L`;
  return `${fmt(quantidade, unidade === 'un' ? 2 : 1)} ${unidade}`;
}

// ---------- Acesso aos dados ----------

export const producaoServico = {
  /** RN12: quantidades por produto nos pedidos não cancelados do período. */
  async quantidadesDoPeriodo(inicio, fim) {
    if (!inicio || !fim) throw new ErroDeNegocio('Informe o período.');
    if (fim < inicio) throw new ErroDeNegocio('A data final não pode ser anterior à inicial.');
    const linhas = await pedidoRepositorio.quantidadesPorProduto(inicio, fim);
    return Object.fromEntries(linhas.map((l) => [l.produto_id, l.quantidade]));
  },

  async dados() {
    const [produtos, configuracoes, fichas, componentes, embalagens] = await Promise.all([
      produtoRepositorio.listar(), massaRepositorio.listarConfiguracoes(), produtoRepositorio.todosInsumosDasFichas(),
      produtoRepositorio.todosComponentes(), produtoRepositorio.todasEmbalagens(),
    ]);
    return { produtos, configuracoes, fichas, componentes, embalagens };
  },
};
