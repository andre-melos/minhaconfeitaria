// UC02 – Manter Categorias (RF02)
import { categoriaRepositorio } from '@/dados/repositorios/categoriaRepositorio';
import { gerarId } from '@/dados/conexao';
import { ErroDeNegocio, exigirTexto, textoLimpo } from './erros';

export const categoriaServico = {
  listar() {
    return categoriaRepositorio.listar();
  },

  async listarAtivas() {
    return (await categoriaRepositorio.listar()).filter((c) => c.ativa);
  },

  async salvar(dados) {
    const categoria = {
      id: dados.id || gerarId(),
      nome: exigirTexto(dados.nome, 'o nome da categoria', 50),
      emoji: textoLimpo(dados.emoji),
      ativa: dados.ativa !== false,
    };
    if (dados.id) await categoriaRepositorio.atualizar(categoria);
    else await categoriaRepositorio.inserir(categoria);
    return categoria;
  },

  contarProdutosPorCategoria() {
    return categoriaRepositorio.contarProdutosPorCategoria();
  },

  async excluir(id) {
    const total = (await this.contarProdutosPorCategoria())[id] || 0;
    if (total > 0) {
      throw new ErroDeNegocio(`Há ${total} produto(s) nesta categoria. Inative a categoria em vez de excluí-la.`);
    }
    await categoriaRepositorio.excluir(id);
  },
};
