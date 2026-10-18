// TEMPORÁRIO: entrega categorias, produtos e pedidos no formato de campos que as telas de
// Relatório de vendas e Fluxo de caixa do protótipo ainda esperam. Removido no Sprint 4.
import { categoriaServico } from './categoriaServico';
import { produtoRepositorio } from '@/dados/repositorios/produtoRepositorio';
import { pedidoRepositorio } from '@/dados/repositorios/pedidoRepositorio';

export async function categoriasNoFormatoAntigo() {
  return (await categoriaServico.listar()).map((c) => ({ id: c.id, name: c.nome, emoji: c.emoji, active: c.ativa }));
}

export async function produtosNoFormatoAntigo() {
  return (await produtoRepositorio.listar()).map((p) => ({
    id: p.id,
    name: p.nome,
    category: p.categoria_id,
    price: p.preco_venda,
    total_cost: p.custo_total,
    unit_cost: p.custo_unitario,
    yield_quantity: p.rendimento,
    active: p.ativo,
  }));
}

export async function pedidosNoFormatoAntigo() {
  const [pedidos, itens] = await Promise.all([pedidoRepositorio.listar(), pedidoRepositorio.todosItens()]);
  return pedidos.map((p) => ({
    id: p.id,
    client_id: p.cliente_id,
    client_name: p.cliente_nome,
    delivery_date: p.data_entrega,
    status: p.status,
    total_value: p.valor_total,
    paid_value: p.valor_pago,
    balance: p.saldo,
    items: itens.filter((i) => i.pedido_id === p.id).map((i) => ({
      product_id: i.produto_id, product_name: i.produto_nome, quantity: i.quantidade, unit_price: i.preco_unitario, total: i.subtotal,
    })),
  }));
}
