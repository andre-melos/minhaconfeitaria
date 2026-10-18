import { consultar, consultarUm, executar } from '../conexao';

const CAMPOS = 'id, nome, telefone, endereco, observacoes, criado_em';

export const clienteRepositorio = {
  listar() {
    return consultar(`SELECT ${CAMPOS} FROM cliente ORDER BY nome COLLATE NOCASE`);
  },
  buscarPorId(id) {
    return consultarUm(`SELECT ${CAMPOS} FROM cliente WHERE id = ?`, [id]);
  },
  inserir(c) {
    return executar(
      'INSERT INTO cliente (id, nome, telefone, endereco, observacoes, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, c.nome, c.telefone, c.endereco, c.observacoes, c.criado_em]
    );
  },
  atualizar(c) {
    return executar(
      'UPDATE cliente SET nome = ?, telefone = ?, endereco = ?, observacoes = ? WHERE id = ?',
      [c.nome, c.telefone, c.endereco, c.observacoes, c.id]
    );
  },
  excluir(id) {
    return executar('DELETE FROM cliente WHERE id = ?', [id]);
  },
};
