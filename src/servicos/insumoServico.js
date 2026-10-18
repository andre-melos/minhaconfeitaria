// UC03 – Manter Insumos (RF03) e recálculo automático dos produtos (RF04)
import { insumoRepositorio } from '@/dados/repositorios/insumoRepositorio';
import { produtoServico } from './produtoServico';
import { gerarId, agoraIso } from '@/dados/conexao';
import { ErroDeNegocio, exigirNumero, exigirTexto, textoLimpo } from './erros';

export const UNIDADES = [
  { valor: 'g', rotulo: 'Gramas (g)', base: 'g', fator: 1 },
  { valor: 'kg', rotulo: 'Quilogramas (kg)', base: 'g', fator: 1000 },
  { valor: 'ml', rotulo: 'Mililitros (ml)', base: 'ml', fator: 1 },
  { valor: 'L', rotulo: 'Litros (L)', base: 'ml', fator: 1000 },
  { valor: 'un', rotulo: 'Unidade (un)', base: 'un', fator: 1 },
];

export function dadosDaUnidade(unidade) {
  const u = UNIDADES.find((item) => item.valor === unidade);
  if (!u) throw new ErroDeNegocio('Unidade de medida inválida.');
  return u;
}

/** RN01: custo por unidade base (g, ml ou un) = preço ÷ (quantidade comprada convertida para a unidade base). */
export function calcularCustoPorUnidade(preco, qtdEmbalagem, unidade) {
  const { fator } = dadosDaUnidade(unidade);
  return preco / (qtdEmbalagem * fator);
}

export const insumoServico = {
  listar() {
    return insumoRepositorio.listar();
  },

  async salvar(dados) {
    const unidade = dadosDaUnidade(dados.unidade).valor;
    const qtd = exigirNumero(dados.qtd_embalagem, 'A quantidade comprada', { maiorQueZero: true });
    const preco = exigirNumero(dados.preco, 'O preço', { minimo: 0 });
    const insumo = {
      id: dados.id || gerarId(),
      nome: exigirTexto(dados.nome, 'o nome do insumo', 80),
      unidade,
      qtd_embalagem: qtd,
      preco,
      custo_por_unidade: calcularCustoPorUnidade(preco, qtd, unidade),
      fornecedor: textoLimpo(dados.fornecedor),
      observacoes: textoLimpo(dados.observacoes),
      atualizado_em: agoraIso(),
    };
    if (!dados.id) {
      await insumoRepositorio.inserir(insumo);
      return { ...insumo, produtosAtualizados: 0 };
    }
    await insumoRepositorio.atualizar(insumo);
    return { ...insumo, produtosAtualizados: await produtoServico.recalcularTodos() };
  },

  async excluir(id) {
    const usos = await insumoRepositorio.contarUso(id);
    if (usos > 0) throw new ErroDeNegocio(`Este insumo está na ficha técnica de ${usos} produto(s).`);
    await insumoRepositorio.excluir(id);
  },
};
