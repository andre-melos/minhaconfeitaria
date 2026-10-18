// Regras de cálculo de custo e preço (RN03 a RN07). Funções puras, sem acesso ao banco.

const arredondar = (valor, casas = 6) => Math.round((Number(valor) || 0) * 10 ** casas) / 10 ** casas;

/**
 * Calcula os custos de um produto a partir da ficha técnica.
 * @param {object} p
 * @param {{quantidade:number, custo_por_unidade:number}[]} p.insumos   quantidade na unidade base (g, ml, un)
 * @param {{quantidade:number, custo_unitario_insumos:number}[]} p.componentes  quantidade em unidades do componente
 */
export function calcularCustosProduto({
  insumos = [], componentes = [], mao_obra_tipo = 'fixo', mao_obra_valor = 0, outros_custos = 0,
  rendimento = 1, margem_lucro = 0, preco_venda = 0,
}) {
  const itensInsumo = insumos.map((i) => arredondar(i.quantidade * i.custo_por_unidade));
  const itensComponente = componentes.map((c) => arredondar(c.quantidade * c.custo_unitario_insumos));
  // RN03
  const custoInsumos = arredondar([...itensInsumo, ...itensComponente].reduce((soma, v) => soma + v, 0));
  // RN04
  const maoObra = mao_obra_tipo === 'percentual'
    ? arredondar((custoInsumos + outros_custos) * (mao_obra_valor / 100))
    : arredondar(mao_obra_valor);
  // RN05
  const custoTotal = arredondar(custoInsumos + maoObra + outros_custos);
  const qtd = rendimento > 0 ? rendimento : 1;
  const custoUnitario = arredondar(custoTotal / qtd);
  // RN06
  const precoSugerido = margem_lucro < 100 ? arredondar(custoUnitario / (1 - margem_lucro / 100), 4) : 0;
  const margemReal = preco_venda > 0 ? arredondar(((preco_venda - custoUnitario) / preco_venda) * 100, 2) : null;

  return {
    itensInsumo,
    itensComponente,
    custo_insumos: custoInsumos,
    custo_unitario_insumos: arredondar(custoInsumos / qtd), // usado quando o produto é componente de outro
    mao_obra_calculada: maoObra,
    custo_total: custoTotal,
    custo_unitario: custoUnitario,
    preco_sugerido: precoSugerido,
    margem_real: margemReal,
  };
}

/** RN07: produtos com preço de venda abaixo do sugerido em mais de X%. */
export function produtosAbaixoDoSugerido(produtos, percentual) {
  const limite = 1 - percentual / 100;
  return produtos
    .filter((p) => p.ativo && p.preco_sugerido > 0 && p.preco_venda < p.preco_sugerido * limite)
    .map((p) => ({ ...p, diferenca: arredondar(((p.preco_sugerido - p.preco_venda) / p.preco_sugerido) * 100, 1) }))
    .sort((a, b) => b.diferenca - a.diferenca);
}

/** Verifica se usar `componenteId` dentro de `produtoId` criaria um ciclo (A usa B que usa A). */
export function criaCiclo(produtoId, componenteId, componentesPorProduto) {
  const visitar = (atual, visitados) => {
    if (atual === produtoId) return true;
    if (visitados.has(atual)) return false;
    visitados.add(atual);
    return (componentesPorProduto[atual] || []).some((filho) => visitar(filho, visitados));
  };
  return visitar(componenteId, new Set());
}
