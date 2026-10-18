import { consultar, consultarUm, executar } from '../conexao';

const CAMPOS = 'id, nome, unidade, qtd_embalagem, preco, custo_por_unidade, fornecedor, observacoes, atualizado_em';

export const insumoRepositorio = {
  listar() {
    return consultar(`SELECT ${CAMPOS} FROM insumo ORDER BY nome COLLATE NOCASE`);
  },
  buscarPorId(id) {
    return consultarUm(`SELECT ${CAMPOS} FROM insumo WHERE id = ?`, [id]);
  },
  inserir(i) {
    return executar(
      `INSERT INTO insumo (${CAMPOS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [i.id, i.nome, i.unidade, i.qtd_embalagem, i.preco, i.custo_por_unidade, i.fornecedor, i.observacoes, i.atualizado_em]
    );
  },
  atualizar(i) {
    return executar(
      `UPDATE insumo SET nome = ?, unidade = ?, qtd_embalagem = ?, preco = ?, custo_por_unidade = ?,
        fornecedor = ?, observacoes = ?, atualizado_em = ? WHERE id = ?`,
      [i.nome, i.unidade, i.qtd_embalagem, i.preco, i.custo_por_unidade, i.fornecedor, i.observacoes, i.atualizado_em, i.id]
    );
  },
  async contarUso(id) {
    return (await consultarUm('SELECT COUNT(*) AS total FROM produto_insumo WHERE insumo_id = ?', [id])).total;
  },
  excluir(id) {
    return executar('DELETE FROM insumo WHERE id = ?', [id]);
  },
};
