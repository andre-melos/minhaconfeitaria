// Regras do pedido (RN13 e RN14). Funções puras, sem acesso ao banco.
import { format, parseISO } from 'date-fns';

export const STATUS_PEDIDO = {
  orcamento: 'Orçamento',
  aguardando_sinal: 'Aguardando sinal',
  confirmado: 'Confirmado',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  entregue_nao_pago: 'Entregue (não pago)',
  cancelado: 'Cancelado',
};

export const FORMAS_PAGAMENTO = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão', transferencia: 'Transferência', outro: 'Outro' };

const EM_ANDAMENTO = ['orcamento', 'aguardando_sinal', 'confirmado', 'em_producao', 'pronto'];
const ENTREGUES = ['entregue', 'entregue_nao_pago'];
const centavos = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const estaEmAndamento = (status) => EM_ANDAMENTO.includes(status);
export const foiEntregue = (status) => ENTREGUES.includes(status);
/** A edição de itens e valores é permitida até o status Pronto. */
export const podeEditar = (status) => EM_ANDAMENTO.includes(status);

/** RN14: valor dos itens, desconto (fixo ou % sobre os itens), frete, total e saldo. */
export function calcularTotais({ itens = [], tipo_entrega, valor_frete = 0, tipo_desconto = 'fixo', valor_desconto = 0, valor_pago = 0 }) {
  const valorItens = centavos(itens.reduce((soma, i) => soma + centavos(i.quantidade * i.preco_unitario), 0));
  const frete = tipo_entrega === 'entrega' ? centavos(valor_frete) : 0;
  const descontoBruto = tipo_desconto === 'percentual' ? valorItens * (Number(valor_desconto) || 0) / 100 : Number(valor_desconto) || 0;
  const desconto = centavos(Math.min(descontoBruto, valorItens + frete));
  const total = centavos(valorItens + frete - desconto);
  return { valor_itens: valorItens, valor_frete: frete, desconto_aplicado: desconto, valor_total: total, saldo: centavos(total - valor_pago) };
}

/** Status de destino permitidos a partir do status atual (RN13). */
export function statusPermitidos(atual, saldo) {
  if (atual === 'cancelado') return ['orcamento'];
  if (atual === 'entregue') return [];
  if (atual === 'entregue_nao_pago') return saldo <= 0 ? ['entregue'] : [];
  const seguintes = EM_ANDAMENTO.filter((s) => s !== atual);
  return [...seguintes, saldo > 0 ? 'entregue_nao_pago' : 'entregue', 'cancelado'];
}

/** Ao entregar, o status depende do saldo. */
export const statusDeEntrega = (saldo) => (saldo > 0.004 ? 'entregue_nao_pago' : 'entregue');

/** Efeito de um pagamento sobre o status (RN13). */
export function statusAposPagamento(atual, novoSaldo) {
  if (atual === 'aguardando_sinal') return 'confirmado';
  if (atual === 'entregue_nao_pago' && novoSaldo <= 0.004) return 'entregue';
  return atual;
}

const reais = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Texto para enviar o resumo do pedido ao cliente pelo WhatsApp (envio feito pelo usuário). */
export function mensagemResumoPedido(pedido, config = {}) {
  const tipo = pedido.tipo_entrega === 'entrega' ? 'entrega' : 'retirada';
  const linhas = pedido.itens.map((i) => `• ${i.produto_nome} - ${i.quantidade}x ${reais(i.preco_unitario)} = ${reais(i.subtotal)}`);
  if (pedido.valor_frete > 0) linhas.push(`• Entrega - ${reais(pedido.valor_frete)}`);
  const data = format(parseISO(pedido.data_entrega), 'dd/MM/yyyy');
  let texto = `Repassando seu pedido:\n\n${linhas.join('\n')}\n\nTotal: ${reais(pedido.valor_total)}`;
  if (config.mensagem_pagamento) texto += `\n\n${config.mensagem_pagamento.replaceAll('{tipo}', tipo)}`;
  texto += `\n\n📅 Data e horário da ${tipo}: ${data} às ${pedido.hora_entrega || 'horário a combinar'}`;
  if (tipo === 'retirada' && config.endereco_retirada) texto += `\n\n📍 Endereço: ${config.endereco_retirada}`;
  return `${texto}\n\nObrigada pela encomenda! 🤎`;
}

export function mensagemPedidoPronto(hora = new Date().getHours()) {
  const saudacao = hora < 12 ? 'bom dia' : hora < 18 ? 'boa tarde' : 'boa noite';
  return `Oii, ${saudacao}! Passando para avisar que seu pedido já está disponível para retirada 🥰`;
}

export const linkWhatsApp = (telefone, texto) =>
  `https://wa.me/55${String(telefone).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
