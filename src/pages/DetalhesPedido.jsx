// UC10 – Gerenciar Pedido: status, pagamentos, edição, cancelamento e mensagens ao cliente
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Pencil, Phone, MessageCircle, Send, Bell, Truck, Store, Wallet, Trash2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Carregando from '@/components/comum/Carregando';
import BotoesFormulario from '@/components/comum/BotoesFormulario';
import ConfirmarExclusao from '@/components/comum/ConfirmarExclusao';
import StatusPedido from '@/components/pedidos/StatusPedido';
import { pedidoServico } from '@/servicos/pedidoServico';
import { configuracaoServico } from '@/servicos/configuracaoServico';
import {
  STATUS_PEDIDO, FORMAS_PAGAMENTO, statusPermitidos, podeEditar, mensagemResumoPedido, mensagemPedidoPronto, linkWhatsApp,
} from '@/servicos/regrasPedido';
import { useAcao } from '@/hooks/useAcao';
import { moeda, numero } from '@/lib/formatacao';

const dataLonga = (iso) => {
  const texto = format(parseISO(iso), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

function Linha({ rotulo, valor, classe = '' }) {
  return <div className={`flex justify-between ${classe}`}><span>{rotulo}</span><span>{valor}</span></div>;
}

export default function DetalhesPedido() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [pagamento, setPagamento] = useState(null);
  const [confirmar, setConfirmar] = useState(null); // 'excluir' | 'cancelar' | { pagamento }

  const { data: pedido, isLoading } = useQuery({ queryKey: ['pedido', id], queryFn: () => pedidoServico.obter(id) });
  const { data: config } = useQuery({ queryKey: ['configuracao'], queryFn: configuracaoServico.obter });

  const invalidar = ['pedido', 'pedidos'];
  const mudarStatus = useAcao((novo) => pedidoServico.alterarStatus(id, novo), {
    invalidar, aoConcluir: () => setConfirmar(null), mensagemSucesso: 'Status atualizado.',
  });
  const pagar = useAcao((dados) => pedidoServico.registrarPagamento(id, dados), {
    invalidar, mensagemSucesso: 'Pagamento registrado.', aoConcluir: () => setPagamento(null),
  });
  const removerPagamento = useAcao((pagId) => pedidoServico.excluirPagamento(id, pagId), {
    invalidar, mensagemSucesso: 'Pagamento removido.', aoConcluir: () => setConfirmar(null),
  });
  const excluir = useAcao(() => pedidoServico.excluir(id), {
    invalidar: ['pedidos'], mensagemSucesso: 'Pedido excluído.', aoConcluir: () => navegar('/pedidos', { replace: true }),
  });

  if (isLoading) return <Carregando />;
  if (!pedido) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-gray-700">Pedido não encontrado.</p>
        <Button asChild><Link to="/pedidos">Voltar para pedidos</Link></Button>
      </div>
    );
  }

  const permitidos = statusPermitidos(pedido.status, pedido.saldo).filter((s) => s !== 'cancelado');
  const podeCancelar = statusPermitidos(pedido.status, pedido.saldo).includes('cancelado');
  const podeExcluir = ['orcamento', 'cancelado'].includes(pedido.status) && pedido.pagamentos.length === 0;
  const IconeEntrega = pedido.tipo_entrega === 'entrega' ? Truck : Store;
  const desconto = pedido.valor_itens + pedido.valor_frete - pedido.valor_total;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-11 w-11">
            <Link to="/pedidos" aria-label="Voltar para pedidos"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedido</h1>
            <p className="text-gray-600 text-sm">Registrado em {format(parseISO(pedido.data_pedido), 'dd/MM/yyyy')}</p>
          </div>
        </div>
        {podeEditar(pedido.status) && (
          <Button asChild variant="outline" className="h-11">
            <Link to={`/pedidos/${id}/editar`}><Pencil className="w-4 h-4 mr-2" /> Editar</Link>
          </Button>
        )}
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <StatusPedido status={pedido.status} />
          {permitidos.length > 0 && (
            <Select value="" onValueChange={(s) => mudarStatus.mutate(s)}>
              <SelectTrigger className="w-56 h-11" aria-label="Alterar status"><SelectValue placeholder="Alterar status para..." /></SelectTrigger>
              <SelectContent>
                {permitidos.map((s) => <SelectItem key={s} value={s}>{STATUS_PEDIDO[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        {pedido.data_festiva && (
          <p className="text-sm text-rose-800 flex items-center gap-1"><PartyPopper className="w-4 h-4" aria-hidden="true" /> Entrega em data festiva</p>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Cliente</h2>
        <p className="font-medium">{pedido.cliente_nome}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-11">
            <a href={`tel:${pedido.cliente_telefone}`}><Phone className="w-4 h-4 mr-2" /> {pedido.cliente_telefone}</a>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <a href={linkWhatsApp(pedido.cliente_telefone)} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp</a>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <a href={linkWhatsApp(pedido.cliente_telefone, mensagemResumoPedido(pedido, config))} target="_blank" rel="noreferrer">
              <Send className="w-4 h-4 mr-2" /> Enviar resumo
            </a>
          </Button>
          {pedido.status === 'pronto' && (
            <Button asChild variant="outline" className="h-11">
              <a href={linkWhatsApp(pedido.cliente_telefone, mensagemPedidoPronto())} target="_blank" rel="noreferrer">
                <Bell className="w-4 h-4 mr-2" /> Avisar que está pronto
              </a>
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-4 space-y-1">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <IconeEntrega className="w-5 h-5" aria-hidden="true" /> {pedido.tipo_entrega === 'entrega' ? 'Entrega' : 'Retirada'}
        </h2>
        <p>{dataLonga(pedido.data_entrega)}</p>
        <p className="text-gray-700">{pedido.hora_entrega ? `às ${pedido.hora_entrega}` : 'Horário a combinar'}</p>
        {pedido.endereco_entrega && <p className="text-gray-700">{pedido.endereco_entrega}</p>}
        {pedido.observacoes && <p className="text-sm text-gray-600 pt-2">Obs.: {pedido.observacoes}</p>}
      </Card>

      <Card className="p-4 space-y-2 text-sm">
        <h2 className="font-semibold text-gray-900 text-base">Itens</h2>
        {pedido.itens.map((i) => (
          <Linha key={i.id} rotulo={`${numero(i.quantidade)}x ${i.produto_nome} (${moeda(i.preco_unitario)})`} valor={moeda(i.subtotal)} />
        ))}
        <div className="border-t pt-2 space-y-1">
          <Linha rotulo="Itens" valor={moeda(pedido.valor_itens)} />
          {pedido.valor_frete > 0 && <Linha rotulo="Frete" valor={moeda(pedido.valor_frete)} />}
          {desconto > 0.004 && <Linha rotulo="Desconto" valor={`- ${moeda(desconto)}`} classe="text-green-800" />}
          <Linha rotulo="Total" valor={moeda(pedido.valor_total)} classe="text-lg font-bold text-gray-900" />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Pagamentos</h2>
          {pedido.saldo > 0 && pedido.status !== 'cancelado' && (
            <Button className="h-11 bg-rose-600 hover:bg-rose-700"
              onClick={() => setPagamento({ valor: String(pedido.saldo).replace('.', ','), forma: 'pix', data: format(new Date(), 'yyyy-MM-dd') })}>
              <Wallet className="w-4 h-4 mr-2" /> Registrar pagamento
            </Button>
          )}
        </div>
        {pedido.pagamentos.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum pagamento registrado.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {pedido.pagamentos.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>{format(parseISO(p.data), 'dd/MM/yyyy')} · {FORMAS_PAGAMENTO[p.forma]}</span>
                <span className="flex items-center gap-1">
                  {moeda(p.valor)}
                  <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`Remover pagamento de ${moeda(p.valor)}`}
                    onClick={() => setConfirmar({ pagamento: p })}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t pt-2 text-sm space-y-1">
          <Linha rotulo="Pago" valor={moeda(pedido.valor_pago)} classe="text-green-800" />
          <Linha rotulo="Saldo a receber" valor={moeda(pedido.saldo)} classe={pedido.saldo > 0 ? 'font-semibold text-orange-800' : ''} />
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        {podeCancelar && (
          <Button variant="outline" className="h-11 flex-1 text-red-700 border-red-300" onClick={() => setConfirmar('cancelar')}>
            Cancelar pedido
          </Button>
        )}
        {podeExcluir && (
          <Button variant="outline" className="h-11 flex-1 text-red-700 border-red-300" onClick={() => setConfirmar('excluir')}>
            <Trash2 className="w-4 h-4 mr-2" /> Excluir
          </Button>
        )}
      </div>

      <Dialog open={!!pagamento} onOpenChange={(a) => !a && setPagamento(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
          {pagamento && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); pagar.mutate(pagamento); }}>
              <p className="text-sm text-gray-700">Saldo a receber: <strong>{moeda(pedido.saldo)}</strong></p>
              <div>
                <Label htmlFor="valor-pagamento">Valor (R$) *</Label>
                <Input id="valor-pagamento" inputMode="decimal" value={pagamento.valor} required
                  onChange={(e) => setPagamento({ ...pagamento, valor: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="forma-pagamento">Forma de pagamento</Label>
                <Select value={pagamento.forma} onValueChange={(forma) => setPagamento({ ...pagamento, forma })}>
                  <SelectTrigger id="forma-pagamento" className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FORMAS_PAGAMENTO).map(([v, r]) => <SelectItem key={v} value={v}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="data-pagamento">Data</Label>
                <Input id="data-pagamento" type="date" value={pagamento.data} onChange={(e) => setPagamento({ ...pagamento, data: e.target.value })} />
              </div>
              <BotoesFormulario salvando={pagar.isPending} aoCancelar={() => setPagamento(null)} rotulo="Registrar" />
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmarExclusao
        aberto={!!confirmar}
        titulo={confirmar === 'cancelar' ? 'Cancelar este pedido?' : confirmar === 'excluir' ? 'Excluir este pedido?' : 'Remover este pagamento?'}
        descricao={confirmar === 'cancelar'
          ? 'O pedido sai das calculadoras e dos relatórios, mas continua no histórico.'
          : 'Esta ação não pode ser desfeita.'}
        aoConfirmar={() => {
          if (confirmar === 'cancelar') mudarStatus.mutate('cancelado');
          else if (confirmar === 'excluir') excluir.mutate();
          else removerPagamento.mutate(confirmar.pagamento.id);
        }}
        aoCancelar={() => setConfirmar(null)}
        rotuloConfirmar={confirmar === 'cancelar' ? 'Cancelar pedido' : confirmar === 'excluir' ? 'Excluir' : 'Remover'}
      />
    </div>
  );
}
