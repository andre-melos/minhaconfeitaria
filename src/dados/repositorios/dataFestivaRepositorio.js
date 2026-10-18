import { consultar, consultarUm, executar } from '../conexao';

const CAMPOS = 'id, nome, data_inicio, data_fim, recorrente, observacoes';
const paraObjeto = (linha) => linha && { ...linha, recorrente: linha.recorrente === 1 };

export const dataFestivaRepositorio = {
  async listar() {
    return (await consultar(`SELECT ${CAMPOS} FROM data_festiva ORDER BY data_inicio`)).map(paraObjeto);
  },
  async buscarPorId(id) {
    return paraObjeto(await consultarUm(`SELECT ${CAMPOS} FROM data_festiva WHERE id = ?`, [id]));
  },
  inserir(d) {
    return executar(`INSERT INTO data_festiva (${CAMPOS}) VALUES (?, ?, ?, ?, ?, ?)`,
      [d.id, d.nome, d.data_inicio, d.data_fim, d.recorrente ? 1 : 0, d.observacoes]);
  },
  atualizar(d) {
    return executar(
      'UPDATE data_festiva SET nome = ?, data_inicio = ?, data_fim = ?, recorrente = ?, observacoes = ? WHERE id = ?',
      [d.nome, d.data_inicio, d.data_fim, d.recorrente ? 1 : 0, d.observacoes, d.id]);
  },
  excluir(id) {
    return executar('DELETE FROM data_festiva WHERE id = ?', [id]);
  },
};
