import { consultar, consultarUm, executar, gerarId, transacao } from '../conexao';

const CAMPOS_PRODUTO = `p.id, p.categoria_id, p.nome, p.rendimento, p.custo_insumos, p.mao_obra_tipo, p.mao_obra_valor,
  p.mao_obra_calculada, p.outros_custos, p.custo_total, p.custo_unitario, p.margem_lucro, p.preco_sugerido,
  p.preco_venda, p.observacoes, p.ativo, p.atualizado_em`;

const paraProduto = (linha) => linha && { ...linha, ativo: linha.ativo === 1 };

export const produtoRepositorio = {
  /** Produtos com nome e ícone da categoria e quantidade de itens da ficha técnica. */
  async listar() {
    const linhas = await consultar(`
      SELECT ${CAMPOS_PRODUTO}, c.nome AS categoria_nome, c.emoji AS categoria_emoji,
        (SELECT COUNT(*) FROM produto_insumo pi WHERE pi.produto_id = p.id) AS qtd_insumos,
        (SELECT COUNT(*) FROM produto_componente pc WHERE pc.produto_id = p.id) AS qtd_componentes
      FROM produto p LEFT JOIN categoria c ON c.id = p.categoria_id
      ORDER BY p.nome COLLATE NOCASE`);
    return linhas.map(paraProduto);
  },

  async buscarPorId(id) {
    return paraProduto(await consultarUm(`SELECT ${CAMPOS_PRODUTO} FROM produto p WHERE p.id = ?`, [id]));
  },

  listarInsumosDaFicha(produtoId) {
    return consultar(`
      SELECT pi.id, pi.insumo_id, pi.quantidade, pi.custo, i.nome AS insumo_nome, i.unidade AS insumo_unidade,
        i.custo_por_unidade
      FROM produto_insumo pi JOIN insumo i ON i.id = pi.insumo_id
      WHERE pi.produto_id = ? ORDER BY i.nome COLLATE NOCASE`, [produtoId]);
  },

  listarComponentes(produtoId) {
    return consultar(`
      SELECT pc.id, pc.componente_id, pc.quantidade, pc.custo, p.nome AS componente_nome
      FROM produto_componente pc JOIN produto p ON p.id = pc.componente_id
      WHERE pc.produto_id = ? ORDER BY p.nome COLLATE NOCASE`, [produtoId]);
  },

  listarEmbalagens(produtoId) {
    return consultar(`
      SELECT pe.id, pe.embalagem_id, pe.quantidade, e.nome AS embalagem_nome
      FROM produto_embalagem pe JOIN embalagem e ON e.id = pe.embalagem_id
      WHERE pe.produto_id = ? ORDER BY e.nome COLLATE NOCASE`, [produtoId]);
  },

  /** Todos os itens de todas as fichas (usado no recálculo geral e nas calculadoras). */
  todosInsumosDasFichas() {
    return consultar(`
      SELECT pi.id, pi.produto_id, pi.insumo_id, pi.quantidade, pi.custo, i.custo_por_unidade, i.nome AS insumo_nome,
        i.unidade AS insumo_unidade
      FROM produto_insumo pi JOIN insumo i ON i.id = pi.insumo_id`);
  },

  todosComponentes() {
    return consultar(`
      SELECT pc.id, pc.produto_id, pc.componente_id, pc.quantidade, pc.custo, p.nome AS componente_nome
      FROM produto_componente pc JOIN produto p ON p.id = pc.componente_id`);
  },

  todasEmbalagens() {
    return consultar(`
      SELECT pe.id, pe.produto_id, pe.embalagem_id, pe.quantidade, e.nome AS embalagem_nome
      FROM produto_embalagem pe JOIN embalagem e ON e.id = pe.embalagem_id`);
  },

  /** Grava o produto e substitui ficha técnica, componentes e embalagens numa única transação. */
  salvarCompleto(produto, insumos, componentes, embalagens, novo) {
    return transacao(async () => {
      const valores = [produto.categoria_id, produto.nome, produto.rendimento, produto.custo_insumos, produto.mao_obra_tipo,
        produto.mao_obra_valor, produto.mao_obra_calculada, produto.outros_custos, produto.custo_total, produto.custo_unitario,
        produto.margem_lucro, produto.preco_sugerido, produto.preco_venda, produto.observacoes, produto.ativo ? 1 : 0,
        produto.atualizado_em];
      if (novo) {
        await executar(`INSERT INTO produto (categoria_id, nome, rendimento, custo_insumos, mao_obra_tipo, mao_obra_valor,
          mao_obra_calculada, outros_custos, custo_total, custo_unitario, margem_lucro, preco_sugerido, preco_venda,
          observacoes, ativo, atualizado_em, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...valores, produto.id]);
      } else {
        await executar(`UPDATE produto SET categoria_id = ?, nome = ?, rendimento = ?, custo_insumos = ?, mao_obra_tipo = ?,
          mao_obra_valor = ?, mao_obra_calculada = ?, outros_custos = ?, custo_total = ?, custo_unitario = ?,
          margem_lucro = ?, preco_sugerido = ?, preco_venda = ?, observacoes = ?, ativo = ?, atualizado_em = ?
          WHERE id = ?`, [...valores, produto.id]);
        await executar('DELETE FROM produto_insumo WHERE produto_id = ?', [produto.id]);
        await executar('DELETE FROM produto_componente WHERE produto_id = ?', [produto.id]);
        await executar('DELETE FROM produto_embalagem WHERE produto_id = ?', [produto.id]);
      }
      for (const i of insumos) {
        await executar('INSERT INTO produto_insumo (id, produto_id, insumo_id, quantidade, custo) VALUES (?, ?, ?, ?, ?)',
          [gerarId(), produto.id, i.insumo_id, i.quantidade, i.custo]);
      }
      for (const c of componentes) {
        await executar('INSERT INTO produto_componente (id, produto_id, componente_id, quantidade, custo) VALUES (?, ?, ?, ?, ?)',
          [gerarId(), produto.id, c.componente_id, c.quantidade, c.custo]);
      }
      for (const e of embalagens) {
        await executar('INSERT INTO produto_embalagem (id, produto_id, embalagem_id, quantidade) VALUES (?, ?, ?, ?)',
          [gerarId(), produto.id, e.embalagem_id, e.quantidade]);
      }
    });
  },

  /** Atualiza só os valores calculados (usado no recálculo automático). */
  atualizarCustos(id, c) {
    return executar(`UPDATE produto SET custo_insumos = ?, mao_obra_calculada = ?, custo_total = ?, custo_unitario = ?,
      preco_sugerido = ?, atualizado_em = ? WHERE id = ?`,
    [c.custo_insumos, c.mao_obra_calculada, c.custo_total, c.custo_unitario, c.preco_sugerido, c.atualizado_em, id]);
  },

  atualizarCustoItemInsumo(id, custo) {
    return executar('UPDATE produto_insumo SET custo = ? WHERE id = ?', [custo, id]);
  },

  atualizarCustoComponente(id, custo) {
    return executar('UPDATE produto_componente SET custo = ? WHERE id = ?', [custo, id]);
  },

  async contarUsoComoComponente(id) {
    const linha = await consultarUm('SELECT COUNT(*) AS total FROM produto_componente WHERE componente_id = ?', [id]);
    return linha.total;
  },

  excluir(id) {
    return executar('DELETE FROM produto WHERE id = ?', [id]);
  },
};
