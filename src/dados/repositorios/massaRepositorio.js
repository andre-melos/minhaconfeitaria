import { consultar, consultarUm, executar, gerarId, transacao } from '../conexao';

const paraMassa = (linha) => linha && { ...linha, ativa: linha.ativa === 1 };

export const massaRepositorio = {
  async listar() {
    const linhas = await consultar(`
      SELECT m.id, m.nome, m.rendimento_g, m.observacoes, m.ativa,
        (SELECT COUNT(*) FROM doce_massa dm WHERE dm.massa_id = m.id) AS qtd_doces
      FROM massa m ORDER BY m.nome COLLATE NOCASE`);
    return linhas.map(paraMassa);
  },
  inserir(m) {
    return executar('INSERT INTO massa (id, nome, rendimento_g, observacoes, ativa) VALUES (?, ?, ?, ?, ?)',
      [m.id, m.nome, m.rendimento_g, m.observacoes, m.ativa ? 1 : 0]);
  },
  atualizar(m) {
    return executar('UPDATE massa SET nome = ?, rendimento_g = ?, observacoes = ?, ativa = ? WHERE id = ?',
      [m.nome, m.rendimento_g, m.observacoes, m.ativa ? 1 : 0, m.id]);
  },
  async contarUso(id) {
    return (await consultarUm('SELECT COUNT(*) AS total FROM doce_massa WHERE massa_id = ?', [id])).total;
  },
  excluir(id) {
    return executar('DELETE FROM massa WHERE id = ?', [id]);
  },

  /** Configurações dos doces com as massas de cada um. */
  async listarConfiguracoes() {
    const configs = await consultar(`
      SELECT cd.id, cd.produto_id, cd.peso_unitario_g, p.nome AS produto_nome
      FROM config_doce cd JOIN produto p ON p.id = cd.produto_id ORDER BY p.nome COLLATE NOCASE`);
    const itens = await consultar(`
      SELECT dm.config_doce_id, dm.massa_id, dm.percentual, m.nome AS massa_nome, m.rendimento_g
      FROM doce_massa dm JOIN massa m ON m.id = dm.massa_id ORDER BY dm.percentual DESC`);
    return configs.map((c) => ({ ...c, massas: itens.filter((i) => i.config_doce_id === c.id) }));
  },
  async buscarConfiguracaoPorProduto(produtoId) {
    return consultarUm('SELECT id FROM config_doce WHERE produto_id = ?', [produtoId]);
  },
  salvarConfiguracao(config, massas, nova) {
    return transacao(async () => {
      if (nova) {
        await executar('INSERT INTO config_doce (id, produto_id, peso_unitario_g) VALUES (?, ?, ?)',
          [config.id, config.produto_id, config.peso_unitario_g]);
      } else {
        await executar('UPDATE config_doce SET produto_id = ?, peso_unitario_g = ? WHERE id = ?',
          [config.produto_id, config.peso_unitario_g, config.id]);
        await executar('DELETE FROM doce_massa WHERE config_doce_id = ?', [config.id]);
      }
      for (const m of massas) {
        await executar('INSERT INTO doce_massa (id, config_doce_id, massa_id, percentual) VALUES (?, ?, ?, ?)',
          [gerarId(), config.id, m.massa_id, m.percentual]);
      }
    });
  },
  excluirConfiguracao(id) {
    return executar('DELETE FROM config_doce WHERE id = ?', [id]);
  },
};
