import { consultar, consultarUm, executar, gerarId, transacao } from '../conexao';

const CAMPOS = `p.id, p.cliente_id, p.data_pedido, p.data_entrega, p.hora_entrega, p.tipo_entrega, p.endereco_entrega,
  p.valor_frete, p.tipo_desconto, p.valor_desconto, p.valor_itens, p.valor_total, p.valor_pago, p.saldo, p.status,
  p.data_festiva, p.observacoes, p.atualizado_em, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
  c.endereco AS cliente_endereco`;

const paraPedido = (linha) => linha && { ...linha, data_festiva: linha.data_festiva === 1 };

export const pedidoRepositorio = {
  /** Pedidos (com cliente) e um resumo dos itens; filtro opcional por período de entrega e cliente. */
  async listar({ inicio, fim, clienteId } = {}) {
    const condicoes = [];
    const parametros = [];
    if (inicio) { condicoes.push('p.data_entrega >= ?'); parametros.push(inicio); }
    if (fim) { condicoes.push('p.data_entrega <= ?'); parametros.push(fim); }
    if (clienteId) { condicoes.push('p.cliente_id = ?'); parametros.push(clienteId); }
    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    const pedidos = (await consultar(`
      SELECT ${CAMPOS} FROM pedido p JOIN cliente c ON c.id = p.cliente_id ${where}
      ORDER BY p.data_entrega, p.hora_entrega`, parametros)).map(paraPedido);
    if (pedidos.length === 0) return pedidos;
    // Mesma condição da consulta principal (sem lista IN, que tem limite de parâmetros no SQLite).
    const itens = await consultar(`
      SELECT i.pedido_id, i.produto_id, i.quantidade, pr.nome AS produto_nome
      FROM item_pedido i JOIN pedido p ON p.id = i.pedido_id JOIN produto pr ON pr.id = i.produto_id ${where}`, parametros);
    const porPedido = new Map();
    for (const i of itens) {
      if (!porPedido.has(i.pedido_id)) porPedido.set(i.pedido_id, []);
      porPedido.get(i.pedido_id).push(i);
    }
    return pedidos.map((p) => ({ ...p, itens: porPedido.get(p.id) ?? [] }));
  },

  async buscarPorId(id) {
    const pedido = paraPedido(await consultarUm(`SELECT ${CAMPOS} FROM pedido p JOIN cliente c ON c.id = p.cliente_id WHERE p.id = ?`, [id]));
    if (!pedido) return null;
    const [itens, pagamentos] = await Promise.all([
      consultar(`SELECT i.id, i.produto_id, i.quantidade, i.preco_unitario, i.custo_unitario, i.subtotal, i.observacoes,
          pr.nome AS produto_nome
        FROM item_pedido i JOIN produto pr ON pr.id = i.produto_id WHERE i.pedido_id = ? ORDER BY pr.nome`, [id]),
      consultar('SELECT id, data, valor, forma FROM pagamento WHERE pedido_id = ? ORDER BY data', [id]),
    ]);
    return { ...pedido, itens, pagamentos };
  },

  /** Grava o pedido e substitui os itens numa única transação. */
  salvar(pedido, itens, novo) {
    return transacao(async () => {
      const valores = [pedido.cliente_id, pedido.data_pedido, pedido.data_entrega, pedido.hora_entrega, pedido.tipo_entrega,
        pedido.endereco_entrega, pedido.valor_frete, pedido.tipo_desconto, pedido.valor_desconto, pedido.valor_itens,
        pedido.valor_total, pedido.valor_pago, pedido.saldo, pedido.status, pedido.data_festiva ? 1 : 0, pedido.observacoes,
        pedido.atualizado_em];
      if (novo) {
        await executar(`INSERT INTO pedido (cliente_id, data_pedido, data_entrega, hora_entrega, tipo_entrega, endereco_entrega,
          valor_frete, tipo_desconto, valor_desconto, valor_itens, valor_total, valor_pago, saldo, status, data_festiva,
          observacoes, atualizado_em, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...valores, pedido.id]);
      } else {
        await executar(`UPDATE pedido SET cliente_id = ?, data_pedido = ?, data_entrega = ?, hora_entrega = ?, tipo_entrega = ?,
          endereco_entrega = ?, valor_frete = ?, tipo_desconto = ?, valor_desconto = ?, valor_itens = ?, valor_total = ?,
          valor_pago = ?, saldo = ?, status = ?, data_festiva = ?, observacoes = ?, atualizado_em = ? WHERE id = ?`,
        [...valores, pedido.id]);
        await executar('DELETE FROM item_pedido WHERE pedido_id = ?', [pedido.id]);
      }
      for (const i of itens) {
        await executar(`INSERT INTO item_pedido (id, pedido_id, produto_id, quantidade, preco_unitario, custo_unitario, subtotal,
          observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [gerarId(), pedido.id, i.produto_id, i.quantidade, i.preco_unitario, i.custo_unitario, i.subtotal, i.observacoes]);
      }
    });
  },

  atualizarSituacao(id, { status, valor_pago, saldo, atualizado_em }) {
    return executar('UPDATE pedido SET status = ?, valor_pago = ?, saldo = ?, atualizado_em = ? WHERE id = ?',
      [status, valor_pago, saldo, atualizado_em, id]);
  },

  registrarPagamento(pedidoId, pagamento, situacao) {
    return transacao(async () => {
      await executar('INSERT INTO pagamento (id, pedido_id, data, valor, forma) VALUES (?, ?, ?, ?, ?)',
        [gerarId(), pedidoId, pagamento.data, pagamento.valor, pagamento.forma]);
      await this.atualizarSituacao(pedidoId, situacao);
    });
  },

  excluirPagamento(pagamentoId, pedidoId, situacao) {
    return transacao(async () => {
      await executar('DELETE FROM pagamento WHERE id = ? AND pedido_id = ?', [pagamentoId, pedidoId]);
      await this.atualizarSituacao(pedidoId, situacao);
    });
  },

  excluir(id) {
    return executar('DELETE FROM pedido WHERE id = ?', [id]);
  },

  async contarPorCliente() {
    const linhas = await consultar('SELECT cliente_id, COUNT(*) AS total FROM pedido GROUP BY cliente_id');
    return Object.fromEntries(linhas.map((l) => [l.cliente_id, l.total]));
  },

  async contarItensDoProduto(produtoId) {
    return (await consultarUm('SELECT COUNT(*) AS total FROM item_pedido WHERE produto_id = ?', [produtoId])).total;
  },

  /** Quantidade pedida de cada produto nos pedidos não cancelados com entrega no período (RN12). */
  quantidadesPorProduto(inicio, fim) {
    return consultar(`
      SELECT i.produto_id, SUM(i.quantidade) AS quantidade
      FROM item_pedido i JOIN pedido p ON p.id = i.pedido_id
      WHERE p.status <> 'cancelado' AND p.data_entrega BETWEEN ? AND ?
      GROUP BY i.produto_id`, [inicio, fim]);
  },

  /** Itens de todos os pedidos (para relatórios). */
  todosItens() {
    return consultar(`SELECT i.pedido_id, i.produto_id, i.quantidade, i.preco_unitario, i.custo_unitario, i.subtotal,
      pr.nome AS produto_nome FROM item_pedido i JOIN produto pr ON pr.id = i.produto_id`);
  },

  todosPagamentos() {
    return consultar('SELECT id, pedido_id, data, valor, forma FROM pagamento ORDER BY data');
  },
};

/** Consultas usadas pelos relatórios e pelo fluxo de caixa. */
export const relatorioRepositorio = {
  /** Itens vendidos (pedidos Pronto, Entregue e Entregue não pago) com entrega no período (RN15). */
  itensVendidos(inicio, fim) {
    return consultar(`
      SELECT i.pedido_id, i.produto_id, i.quantidade, i.preco_unitario, i.custo_unitario, i.subtotal,
        pr.nome AS produto_nome, pr.categoria_id, c.nome AS categoria_nome, c.emoji AS categoria_emoji
      FROM item_pedido i
      JOIN pedido p ON p.id = i.pedido_id
      JOIN produto pr ON pr.id = i.produto_id
      LEFT JOIN categoria c ON c.id = pr.categoria_id
      WHERE p.status IN ('pronto', 'entregue', 'entregue_nao_pago') AND p.data_entrega BETWEEN ? AND ?`, [inicio, fim]);
  },
  pedidosVendidos(inicio, fim) {
    return consultar(`
      SELECT id, valor_itens, valor_frete, valor_total FROM pedido
      WHERE status IN ('pronto', 'entregue', 'entregue_nao_pago') AND data_entrega BETWEEN ? AND ?`, [inicio, fim]);
  },
  /** Pagamentos recebidos no período (entradas do fluxo de caixa, RN16). */
  pagamentosRecebidos(inicio, fim) {
    return consultar(`
      SELECT pg.id, pg.pedido_id, pg.data, pg.valor, pg.forma, c.nome AS cliente_nome
      FROM pagamento pg JOIN pedido p ON p.id = pg.pedido_id JOIN cliente c ON c.id = p.cliente_id
      WHERE pg.data BETWEEN ? AND ? ORDER BY pg.data DESC`, [inicio, fim]);
  },
  /** Saldo a receber de pedidos não cancelados. */
  async aReceber() {
    const linhas = await consultar("SELECT COALESCE(SUM(saldo), 0) AS total, COUNT(*) AS pedidos FROM pedido WHERE status <> 'cancelado' AND saldo > 0");
    return linhas[0];
  },
};
