// UC04 – Manter Produtos (ficha técnica), UC05 – Revisar Preços, RF04 – recálculo automático
import { produtoRepositorio } from '@/dados/repositorios/produtoRepositorio';
import { insumoRepositorio } from '@/dados/repositorios/insumoRepositorio';
import { lerLegado } from '@/dados/legado';
import { agoraIso, gerarId } from '@/dados/conexao';
import { ErroDeNegocio, exigirNumero, exigirTexto, textoLimpo } from './erros';
import { calcularCustosProduto, criaCiclo, produtosAbaixoDoSugerido } from './custoServico';

const quase = (a, b) => Math.abs((a || 0) - (b || 0)) < 0.000001;

async function carregarTudo() {
  const [produtos, insumos, componentes] = await Promise.all([
    produtoRepositorio.listar(), produtoRepositorio.todosInsumosDasFichas(), produtoRepositorio.todosComponentes(),
  ]);
  return { produtos, insumos, componentes };
}

/** Calcula os custos de todos os produtos, resolvendo primeiro os componentes (sub-produtos). */
function calcularTodos({ produtos, insumos, componentes }) {
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const resultado = new Map();
  const calcular = (id, pilha = new Set()) => {
    if (resultado.has(id)) return resultado.get(id);
    if (pilha.has(id)) throw new ErroDeNegocio('Há produtos que usam um ao outro como componente.');
    pilha.add(id);
    const p = porId.get(id);
    const meusInsumos = insumos.filter((i) => i.produto_id === id);
    const meusComponentes = componentes.filter((c) => c.produto_id === id)
      .map((c) => ({ ...c, custo_unitario_insumos: calcular(c.componente_id, pilha).custo_unitario_insumos }));
    const custos = calcularCustosProduto({ ...p, insumos: meusInsumos, componentes: meusComponentes });
    resultado.set(id, { ...custos, meusInsumos, meusComponentes });
    pilha.delete(id);
    return resultado.get(id);
  };
  produtos.forEach((p) => calcular(p.id));
  return resultado;
}

function validar(dados, margemPadrao) {
  const rendimento = exigirNumero(dados.rendimento, 'O rendimento', { maiorQueZero: true });
  const margem = exigirNumero(dados.margem_lucro === '' ? margemPadrao : dados.margem_lucro, 'A margem', { minimo: 0 });
  if (margem > 95) throw new ErroDeNegocio('A margem de lucro deve ser de no máximo 95%.');
  const tipo = dados.mao_obra_tipo === 'percentual' ? 'percentual' : 'fixo';
  const maoObra = exigirNumero(dados.mao_obra_valor || 0, 'A mão de obra', { minimo: 0 });
  if (tipo === 'percentual' && maoObra > 500) throw new ErroDeNegocio('Percentual de mão de obra inválido.');

  const insumos = (dados.insumos || []).map((i) => ({
    insumo_id: i.insumo_id,
    quantidade: exigirNumero(i.quantidade, `A quantidade de ${i.insumo_nome || 'insumo'}`, { maiorQueZero: true }),
  }));
  const componentes = (dados.componentes || []).map((c) => ({
    componente_id: c.componente_id,
    quantidade: exigirNumero(c.quantidade, `A quantidade de ${c.componente_nome || 'componente'}`, { maiorQueZero: true }),
  }));
  const embalagens = (dados.embalagens || []).map((e) => ({
    embalagem_id: e.embalagem_id,
    quantidade: exigirNumero(e.quantidade, `A quantidade de ${e.embalagem_nome || 'embalagem'}`, { maiorQueZero: true }),
  }));
  const repetido = (lista, chave) => new Set(lista.map((x) => x[chave])).size !== lista.length;
  if (repetido(insumos, 'insumo_id')) throw new ErroDeNegocio('Há insumos repetidos na ficha técnica.');
  if (repetido(componentes, 'componente_id')) throw new ErroDeNegocio('Há componentes repetidos.');
  if (repetido(embalagens, 'embalagem_id')) throw new ErroDeNegocio('Há embalagens repetidas.');

  return {
    produto: {
      categoria_id: dados.categoria_id || null,
      nome: exigirTexto(dados.nome, 'o nome do produto', 80),
      rendimento,
      mao_obra_tipo: tipo,
      mao_obra_valor: maoObra,
      outros_custos: exigirNumero(dados.outros_custos || 0, 'Outros custos', { minimo: 0 }),
      margem_lucro: margem,
      observacoes: textoLimpo(dados.observacoes),
      ativo: dados.ativo !== false,
    },
    insumos,
    componentes,
    embalagens,
    precoInformado: textoLimpo(dados.preco_venda),
  };
}

export const produtoServico = {
  listar() {
    return produtoRepositorio.listar();
  },

  async obterCompleto(id) {
    const [produto, insumos, componentes, embalagens] = await Promise.all([
      produtoRepositorio.buscarPorId(id), produtoRepositorio.listarInsumosDaFicha(id),
      produtoRepositorio.listarComponentes(id), produtoRepositorio.listarEmbalagens(id),
    ]);
    return { ...produto, insumos, componentes, embalagens };
  },

  /** Prévia dos custos enquanto o usuário preenche o formulário (não grava nada). */
  previa(dados, insumosCadastrados, produtosCadastrados) {
    const custoInsumo = new Map(insumosCadastrados.map((i) => [i.id, i.custo_por_unidade]));
    const custoComp = new Map(produtosCadastrados.map((p) => [p.id, p.custo_insumos / (p.rendimento || 1)]));
    const num = (v) => Number(String(v ?? '').replace(',', '.')) || 0;
    return calcularCustosProduto({
      insumos: (dados.insumos || []).map((i) => ({ quantidade: num(i.quantidade), custo_por_unidade: custoInsumo.get(i.insumo_id) || 0 })),
      componentes: (dados.componentes || []).map((c) => ({ quantidade: num(c.quantidade), custo_unitario_insumos: custoComp.get(c.componente_id) || 0 })),
      mao_obra_tipo: dados.mao_obra_tipo,
      mao_obra_valor: num(dados.mao_obra_valor),
      outros_custos: num(dados.outros_custos),
      rendimento: num(dados.rendimento) || 1,
      margem_lucro: num(dados.margem_lucro),
      preco_venda: num(dados.preco_venda),
    });
  },

  async salvar(dados, margemPadrao = 50) {
    const v = validar(dados, margemPadrao);
    const id = dados.id || gerarId();

    // Impede ciclos entre componentes (RN02)
    const todos = await carregarTudo();
    const mapa = {};
    todos.componentes.filter((c) => c.produto_id !== id)
      .forEach((c) => { (mapa[c.produto_id] ??= []).push(c.componente_id); });
    for (const c of v.componentes) {
      if (c.componente_id === id || criaCiclo(id, c.componente_id, mapa)) {
        throw new ErroDeNegocio('Um produto não pode usar a si mesmo como componente, nem por meio de outro produto.');
      }
    }

    // Custos (RN03 a RN06)
    const insumosCad = new Map((await insumoRepositorio.listar()).map((i) => [i.id, i]));
    const calculados = calcularTodos(todos);
    const custoComp = (cid) => calculados.get(cid)?.custo_unitario_insumos ?? 0;
    const custos = calcularCustosProduto({
      ...v.produto,
      insumos: v.insumos.map((i) => ({ ...i, custo_por_unidade: insumosCad.get(i.insumo_id)?.custo_por_unidade ?? 0 })),
      componentes: v.componentes.map((c) => ({ ...c, custo_unitario_insumos: custoComp(c.componente_id) })),
    });
    const precoVenda = v.precoInformado !== null
      ? exigirNumero(v.precoInformado, 'O preço de venda', { minimo: 0 })
      : Math.round(custos.preco_sugerido * 100) / 100;

    const produto = {
      id, ...v.produto,
      custo_insumos: custos.custo_insumos,
      mao_obra_calculada: custos.mao_obra_calculada,
      custo_total: custos.custo_total,
      custo_unitario: custos.custo_unitario,
      preco_sugerido: custos.preco_sugerido,
      preco_venda: precoVenda,
      atualizado_em: agoraIso(),
    };
    await produtoRepositorio.salvarCompleto(
      produto,
      v.insumos.map((i, k) => ({ ...i, custo: custos.itensInsumo[k] })),
      v.componentes.map((c, k) => ({ ...c, custo: custos.itensComponente[k] })),
      v.embalagens,
      !dados.id
    );
    // Produtos que usam este como componente também mudam de custo.
    if (dados.id) await this.recalcularTodos();
    return produto;
  },

  /** RF04: recalcula todos os produtos e grava apenas o que mudou. Devolve quantos produtos mudaram. */
  async recalcularTodos() {
    const todos = await carregarTudo();
    const calculados = calcularTodos(todos);
    let alterados = 0;
    for (const p of todos.produtos) {
      const c = calculados.get(p.id);
      for (const [k, item] of c.meusInsumos.entries()) {
        if (!quase(item.custo, c.itensInsumo[k])) await produtoRepositorio.atualizarCustoItemInsumo(item.id, c.itensInsumo[k]);
      }
      for (const [k, item] of c.meusComponentes.entries()) {
        if (!quase(item.custo, c.itensComponente[k])) await produtoRepositorio.atualizarCustoComponente(item.id, c.itensComponente[k]);
      }
      if (!quase(p.custo_total, c.custo_total) || !quase(p.custo_insumos, c.custo_insumos)
        || !quase(p.preco_sugerido, c.preco_sugerido) || !quase(p.custo_unitario, c.custo_unitario)) {
        await produtoRepositorio.atualizarCustos(p.id, { ...c, atualizado_em: agoraIso() });
        alterados += 1;
      }
    }
    return alterados;
  },

  async revisarPrecos(percentual) {
    const pct = exigirNumero(percentual, 'O percentual', { minimo: 0 });
    if (pct >= 100) throw new ErroDeNegocio('Informe um percentual menor que 100.');
    return produtosAbaixoDoSugerido(await produtoRepositorio.listar(), pct);
  },

  async excluir(id) {
    if (await produtoRepositorio.contarUsoComoComponente(id)) {
      throw new ErroDeNegocio('Este produto é componente de outro produto. Remova-o da outra ficha técnica ou inative-o.');
    }
    const pedidos = await lerLegado('Order');
    if (pedidos.some((p) => (p.items || []).some((i) => i.product_id === id))) {
      throw new ErroDeNegocio('Este produto aparece em pedidos e não pode ser excluído. Inative-o.');
    }
    await produtoRepositorio.excluir(id);
  },
};
