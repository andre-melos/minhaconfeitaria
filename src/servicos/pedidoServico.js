// UC09 – Registrar Pedido, UC10 – Gerenciar Pedido, UC11 – Consultar Agenda
import { format } from 'date-fns';
import { pedidoRepositorio } from '@/dados/repositorios/pedidoRepositorio';
import { produtoRepositorio } from '@/dados/repositorios/produtoRepositorio';
import { clienteRepositorio } from '@/dados/repositorios/clienteRepositorio';
import { dataFestivaRepositorio } from '@/dados/repositorios/dataFestivaRepositorio';
import { agoraIso, gerarId } from '@/dados/conexao';
import { ErroDeNegocio, exigirNumero, textoLimpo } from './erros';
import { encontrarDataFestiva } from './dataFestivaServico';
import {
  calcularTotais, podeEditar, statusAposPagamento, statusDeEntrega, statusPermitidos, foiEntregue, FORMAS_PAGAMENTO, STATUS_PEDIDO,
} from './regrasPedido';

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;
const hojeIso = () => format(new Date(), 'yyyy-MM-dd');

export const pedidoServico = {
  listar(filtros) {
    return pedidoRepositorio.listar(filtros);
  },

  obter(id) {
    return pedidoRepositorio.buscarPorId(id);
  },

  async ehDataFestiva(dataIso) {
    if (!dataIso) return null;
    return encontrarDataFestiva(await dataFestivaRepositorio.listar(), dataIso);
  },

  /** Cria ou edita um pedido (RN14). Grava o custo unitário vigente de cada produto (RN08). */
  async salvar(dados) {
    const atual = dados.id ? await pedidoRepositorio.buscarPorId(dados.id) : null;
    if (atual && !podeEditar(atual.status)) {
      throw new ErroDeNegocio(`Pedidos com status "${STATUS_PEDIDO[atual.status]}" não podem ser editados.`);
    }
    if (!dados.cliente_id || !(await clienteRepositorio.buscarPorId(dados.cliente_id))) {
      throw new ErroDeNegocio('Selecione o cliente.');
    }
    if (!DATA.test(dados.data_entrega || '')) throw new ErroDeNegocio('Informe a data de entrega.');
    const hora = textoLimpo(dados.hora_entrega);
    if (hora && !HORA.test(hora)) throw new ErroDeNegocio('Horário de entrega inválido.');
    const tipoEntrega = dados.tipo_entrega === 'entrega' ? 'entrega' : 'retirada';
    if (!dados.itens?.length) throw new ErroDeNegocio('Adicione pelo menos um produto.');

    const produtos = new Map((await produtoRepositorio.listar()).map((p) => [p.id, p]));
    const custoAnterior = new Map((atual?.itens ?? []).map((i) => [i.produto_id, i.custo_unitario]));
    const itens = dados.itens.map((i) => {
      const produto = produtos.get(i.produto_id);
      if (!produto) throw new ErroDeNegocio('Há um produto que não existe mais no pedido.');
      const quantidade = exigirNumero(i.quantidade, `A quantidade de ${produto.nome}`, { maiorQueZero: true });
      const preco = exigirNumero(i.preco_unitario, `O preço de ${produto.nome}`, { minimo: 0 });
      return {
        produto_id: i.produto_id,
        quantidade,
        preco_unitario: preco,
        custo_unitario: custoAnterior.get(i.produto_id) ?? produto.custo_unitario,
        subtotal: Math.round(quantidade * preco * 100) / 100,
        observacoes: textoLimpo(i.observacoes),
      };
    });

    const valorPago = atual?.valor_pago ?? 0;
    const tipoDesconto = dados.tipo_desconto === 'percentual' ? 'percentual' : 'fixo';
    const valorDesconto = exigirNumero(dados.valor_desconto || 0, 'O desconto', { minimo: 0 });
    if (tipoDesconto === 'percentual' && valorDesconto > 100) throw new ErroDeNegocio('O desconto não pode passar de 100%.');
    const totais = calcularTotais({
      itens, tipo_entrega: tipoEntrega, tipo_desconto: tipoDesconto, valor_desconto: valorDesconto, valor_pago: valorPago,
      valor_frete: exigirNumero(dados.valor_frete || 0, 'O frete', { minimo: 0 }),
    });
    if (totais.saldo < -0.004) {
      throw new ErroDeNegocio('O novo total ficou menor que o valor já pago. Ajuste os itens ou o desconto.');
    }

    const pedido = {
      id: dados.id || gerarId(),
      cliente_id: dados.cliente_id,
      data_pedido: atual?.data_pedido ?? hojeIso(),
      data_entrega: dados.data_entrega,
      hora_entrega: hora,
      tipo_entrega: tipoEntrega,
      endereco_entrega: tipoEntrega === 'entrega' ? textoLimpo(dados.endereco_entrega) : null,
      valor_frete: totais.valor_frete,
      tipo_desconto: tipoDesconto,
      valor_desconto: valorDesconto,
      valor_itens: totais.valor_itens,
      valor_total: totais.valor_total,
      valor_pago: valorPago,
      saldo: Math.max(0, totais.saldo),
      status: atual?.status ?? 'orcamento',
      data_festiva: !!(await this.ehDataFestiva(dados.data_entrega)),
      observacoes: textoLimpo(dados.observacoes),
      atualizado_em: agoraIso(),
    };
    await pedidoRepositorio.salvar(pedido, itens, !atual);
    return pedido;
  },

  async alterarStatus(id, novoStatus) {
    const pedido = await pedidoRepositorio.buscarPorId(id);
    if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.');
    const destino = foiEntregue(novoStatus) ? statusDeEntrega(pedido.saldo) : novoStatus;
    if (!statusPermitidos(pedido.status, pedido.saldo).includes(destino)) {
      throw new ErroDeNegocio(`Não é possível passar de "${STATUS_PEDIDO[pedido.status]}" para "${STATUS_PEDIDO[destino]}".`);
    }
    await pedidoRepositorio.atualizarSituacao(id, { ...pedido, status: destino, atualizado_em: agoraIso() });
    return destino;
  },

  async registrarPagamento(id, dados) {
    const pedido = await pedidoRepositorio.buscarPorId(id);
    if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.');
    if (pedido.status === 'cancelado') throw new ErroDeNegocio('Não é possível registrar pagamento em pedido cancelado.');
    const valor = exigirNumero(dados.valor, 'O valor', { maiorQueZero: true });
    if (valor > pedido.saldo + 0.004) throw new ErroDeNegocio(`O valor é maior que o saldo (${pedido.saldo.toFixed(2).replace('.', ',')}).`);
    if (!FORMAS_PAGAMENTO[dados.forma]) throw new ErroDeNegocio('Selecione a forma de pagamento.');
    const data = DATA.test(dados.data || '') ? dados.data : hojeIso();
    const pago = Math.round((pedido.valor_pago + valor) * 100) / 100;
    const saldo = Math.max(0, Math.round((pedido.valor_total - pago) * 100) / 100);
    const status = statusAposPagamento(pedido.status, saldo);
    await pedidoRepositorio.registrarPagamento(id, { data, valor, forma: dados.forma },
      { status, valor_pago: pago, saldo, atualizado_em: agoraIso() });
    return { status, saldo };
  },

  async excluirPagamento(pedidoId, pagamentoId) {
    const pedido = await pedidoRepositorio.buscarPorId(pedidoId);
    const pagamento = pedido?.pagamentos.find((p) => p.id === pagamentoId);
    if (!pagamento) throw new ErroDeNegocio('Pagamento não encontrado.');
    const pago = Math.round((pedido.valor_pago - pagamento.valor) * 100) / 100;
    const saldo = Math.round((pedido.valor_total - pago) * 100) / 100;
    const status = pedido.status === 'entregue' && saldo > 0 ? 'entregue_nao_pago' : pedido.status;
    await pedidoRepositorio.excluirPagamento(pagamentoId, pedidoId, { status, valor_pago: pago, saldo, atualizado_em: agoraIso() });
  },

  async excluir(id) {
    const pedido = await pedidoRepositorio.buscarPorId(id);
    if (!pedido) return;
    if (!['orcamento', 'cancelado'].includes(pedido.status) || pedido.pagamentos.length > 0) {
      throw new ErroDeNegocio('Só é possível excluir orçamentos ou pedidos cancelados sem pagamentos. Cancele o pedido para mantê-lo no histórico.');
    }
    await pedidoRepositorio.excluir(id);
  },
};
