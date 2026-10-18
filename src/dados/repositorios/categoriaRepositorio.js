import { consultar, consultarUm, executar } from '../conexao';

const paraObjeto = (linha) => linha && { ...linha, ativa: linha.ativa === 1 };

export const categoriaRepositorio = {
  async listar() {
    const linhas = await consultar('SELECT id, nome, emoji, ativa FROM categoria ORDER BY nome COLLATE NOCASE');
    return linhas.map(paraObjeto);
  },
  async buscarPorId(id) {
    return paraObjeto(await consultarUm('SELECT id, nome, emoji, ativa FROM categoria WHERE id = ?', [id]));
  },
  inserir(c) {
    return executar('INSERT INTO categoria (id, nome, emoji, ativa) VALUES (?, ?, ?, ?)',
      [c.id, c.nome, c.emoji, c.ativa ? 1 : 0]);
  },
  atualizar(c) {
    return executar('UPDATE categoria SET nome = ?, emoji = ?, ativa = ? WHERE id = ?',
      [c.nome, c.emoji, c.ativa ? 1 : 0, c.id]);
  },
  async contarProdutosPorCategoria() {
    const linhas = await consultar('SELECT categoria_id, COUNT(*) AS total FROM produto GROUP BY categoria_id');
    return Object.fromEntries(linhas.map((l) => [l.categoria_id, l.total]));
  },
  excluir(id) {
    return executar('DELETE FROM categoria WHERE id = ?', [id]);
  },
};
