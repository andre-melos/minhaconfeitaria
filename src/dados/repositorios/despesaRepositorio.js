import { consultar, executar } from '../conexao';

const CAMPOS = 'id, descricao, categoria, valor, data, forma_pagamento, observacoes';

export const despesaRepositorio = {
  listarPorPeriodo(inicio, fim) {
    return consultar(`SELECT ${CAMPOS} FROM despesa WHERE data BETWEEN ? AND ? ORDER BY data DESC`, [inicio, fim]);
  },
  inserir(d) {
    return executar(`INSERT INTO despesa (${CAMPOS}) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.id, d.descricao, d.categoria, d.valor, d.data, d.forma_pagamento, d.observacoes]);
  },
  atualizar(d) {
    return executar(`UPDATE despesa SET descricao = ?, categoria = ?, valor = ?, data = ?, forma_pagamento = ?, observacoes = ?
      WHERE id = ?`, [d.descricao, d.categoria, d.valor, d.data, d.forma_pagamento, d.observacoes, d.id]);
  },
  excluir(id) {
    return executar('DELETE FROM despesa WHERE id = ?', [id]);
  },
};
