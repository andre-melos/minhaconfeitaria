const moedaFormato = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const moeda = (valor) => moedaFormato.format(Number(valor) || 0);

export const numero = (valor, casas = 2) =>
  (Number(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });

/** Valor monetário pequeno (ex.: custo por grama) com 4 casas decimais. */
export const moedaDetalhada = (valor) =>
  `R$ ${(Number(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
