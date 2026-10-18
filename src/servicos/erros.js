/** Erro de regra de negócio: a mensagem é mostrada ao usuário. */
export class ErroDeNegocio extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroDeNegocio';
  }
}

export const textoLimpo = (valor) => {
  const t = (valor ?? '').toString().trim();
  return t === '' ? null : t;
};

export function exigirTexto(valor, nomeCampo, maximo = 120) {
  const t = textoLimpo(valor);
  if (!t) throw new ErroDeNegocio(`Informe ${nomeCampo}.`);
  if (t.length > maximo) throw new ErroDeNegocio(`${nomeCampo} deve ter no máximo ${maximo} caracteres.`);
  return t;
}

export function exigirNumero(valor, nomeCampo, { minimo = 0, maiorQueZero = false } = {}) {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) throw new ErroDeNegocio(`${nomeCampo} deve ser um número.`);
  if (maiorQueZero && n <= 0) throw new ErroDeNegocio(`${nomeCampo} deve ser maior que zero.`);
  if (n < minimo) throw new ErroDeNegocio(`${nomeCampo} não pode ser menor que ${minimo}.`);
  return n;
}
