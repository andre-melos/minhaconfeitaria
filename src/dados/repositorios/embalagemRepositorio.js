import { consultar, consultarUm, executar } from '../conexao';

const paraObjeto = (linha) => linha && { ...linha, ativa: linha.ativa === 1 };

export const embalagemRepositorio = {
  async listar() {
    const linhas = await consultar('SELECT id, nome, descricao, ativa FROM embalagem ORDER BY nome COLLATE NOCASE');
    return linhas.map(paraObjeto);
  },
  async buscarPorId(id) {
    return paraObjeto(await consultarUm('SELECT id, nome, descricao, ativa FROM embalagem WHERE id = ?', [id]));
  },
  inserir(e) {
    return executar('INSERT INTO embalagem (id, nome, descricao, ativa) VALUES (?, ?, ?, ?)',
      [e.id, e.nome, e.descricao, e.ativa ? 1 : 0]);
  },
  atualizar(e) {
    return executar('UPDATE embalagem SET nome = ?, descricao = ?, ativa = ? WHERE id = ?',
      [e.nome, e.descricao, e.ativa ? 1 : 0, e.id]);
  },
  async contarUso(id) {
    return (await consultarUm('SELECT COUNT(*) AS total FROM produto_embalagem WHERE embalagem_id = ?', [id])).total;
  },
  excluir(id) {
    return executar('DELETE FROM embalagem WHERE id = ?', [id]);
  },
};
