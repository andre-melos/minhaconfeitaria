// UC15 – Relatório de Vendas (RN15) e UC16 – Despesas e Fluxo de Caixa (RN16)
import { despesaRepositorio } from '@/dados/repositorios/despesaRepositorio';
import { relatorioRepositorio } from '@/dados/repositorios/pedidoRepositorio';
import { gerarId } from '@/dados/conexao';
import { ErroDeNegocio, exigirNumero, exigirTexto, textoLimpo } from './erros';

export const CATEGORIAS_DESPESA = {
  insumos: 'Insumos', embalagens: 'Embalagens', equipamentos: 'Equipamentos', aluguel: 'Aluguel', energia: 'Energia',
  agua: 'Água', gas: 'Gás', transporte: 'Transporte', marketing: 'Marketing', impostos: 'Impostos', salarios: 'Salários',
  outros: 'Outros',
};
export const FORMAS_DESPESA = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', transferencia: 'Transferência', boleto: 'Boleto', outro: 'Outro' };

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const centavos = (v) => Math.round((Number(v) || 0) * 100) / 100;
const somar = (lista, campo) => centavos(lista.reduce((s, x) => s + (Number(x[campo]) || 0), 0));

function validarPeriodo(inicio, fim) {
  if (!DATA.test(inicio || '') || !DATA.test(fim || '')) throw new ErroDeNegocio('Informe o período.');
  if (fim < inicio) throw new ErroDeNegocio('A data final não pode ser anterior à inicial.');
}

/**
 * RN15: faturamento, custo (gravado no item), lucro e margem; vendas por categoria e ranking de produtos.
 * Sem filtro de categoria, o faturamento usa o total dos pedidos (com frete e desconto);
 * com filtro, usa a soma dos itens da categoria.
 */
export function montarRelatorioVendas(itens, pedidos, categoriaId = null) {
  const filtrados = categoriaId ? itens.filter((i) => (i.categoria_id ?? 'sem-categoria') === categoriaId) : itens;
  const faturamento = categoriaId ? somar(filtrados, 'subtotal') : somar(pedidos, 'valor_total');
  const custo = centavos(filtrados.reduce((s, i) => s + i.custo_unitario * i.quantidade, 0));
  const lucro = centavos(faturamento - custo);
  const qtdPedidos = categoriaId ? new Set(filtrados.map((i) => i.pedido_id)).size : pedidos.length;

  const agrupar = (chave, montar) => {
    const mapa = new Map();
    for (const i of filtrados) {
      const k = chave(i);
      const atual = mapa.get(k) ?? { ...montar(i), quantidade: 0, valor: 0, custo: 0 };
      atual.quantidade += i.quantidade;
      atual.valor = centavos(atual.valor + i.subtotal);
      atual.custo = centavos(atual.custo + i.custo_unitario * i.quantidade);
      mapa.set(k, atual);
    }
    return [...mapa.values()].map((x) => ({ ...x, lucro: centavos(x.valor - x.custo) }));
  };

  return {
    faturamento,
    custo,
    lucro,
    margem: faturamento > 0 ? centavos((lucro / faturamento) * 100) : 0,
    pedidos: qtdPedidos,
    ticketMedio: qtdPedidos > 0 ? centavos(faturamento / qtdPedidos) : 0,
    porCategoria: agrupar((i) => i.categoria_id ?? 'sem-categoria', (i) => ({
      id: i.categoria_id ?? 'sem-categoria', nome: i.categoria_nome ?? 'Sem categoria', emoji: i.categoria_emoji ?? '📦',
    })).sort((a, b) => b.valor - a.valor),
    produtos: agrupar((i) => i.produto_id, (i) => ({ id: i.produto_id, nome: i.produto_nome })),
  };
}

/** RN16: entradas (pagamentos), saídas (despesas) e saldo do período. */
export function montarFluxoCaixa(pagamentos, despesas) {
  const entradas = somar(pagamentos, 'valor');
  const saidas = somar(despesas, 'valor');
  const porCategoria = Object.entries(despesas.reduce((m, d) => ({ ...m, [d.categoria]: (m[d.categoria] || 0) + d.valor }), {}))
    .map(([categoria, valor]) => ({ categoria, nome: CATEGORIAS_DESPESA[categoria], valor: centavos(valor) }))
    .sort((a, b) => b.valor - a.valor);
  return { entradas, saidas, saldo: centavos(entradas - saidas), porCategoria };
}

export const financeiroServico = {
  async relatorioVendas(inicio, fim, categoriaId) {
    validarPeriodo(inicio, fim);
    const [itens, pedidos] = await Promise.all([
      relatorioRepositorio.itensVendidos(inicio, fim), relatorioRepositorio.pedidosVendidos(inicio, fim),
    ]);
    return montarRelatorioVendas(itens, pedidos, categoriaId);
  },

  async fluxoCaixa(inicio, fim) {
    validarPeriodo(inicio, fim);
    const [pagamentos, despesas, aReceber] = await Promise.all([
      relatorioRepositorio.pagamentosRecebidos(inicio, fim), despesaRepositorio.listarPorPeriodo(inicio, fim), relatorioRepositorio.aReceber(),
    ]);
    return { ...montarFluxoCaixa(pagamentos, despesas), pagamentos, despesas, aReceber };
  },

  async salvarDespesa(dados) {
    if (!CATEGORIAS_DESPESA[dados.categoria]) throw new ErroDeNegocio('Selecione a categoria.');
    if (!DATA.test(dados.data || '')) throw new ErroDeNegocio('Informe a data.');
    const despesa = {
      id: dados.id || gerarId(),
      descricao: exigirTexto(dados.descricao, 'a descrição', 100),
      categoria: dados.categoria,
      valor: exigirNumero(dados.valor, 'O valor', { maiorQueZero: true }),
      data: dados.data,
      forma_pagamento: FORMAS_DESPESA[dados.forma_pagamento] ? dados.forma_pagamento : null,
      observacoes: textoLimpo(dados.observacoes),
    };
    if (dados.id) await despesaRepositorio.atualizar(despesa);
    else await despesaRepositorio.inserir(despesa);
    return despesa;
  },

  excluirDespesa(id) {
    return despesaRepositorio.excluir(id);
  },
};
