import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Truck, Store, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { moeda, numero } from '@/lib/formatacao';
import StatusPedido, { ESTILO_STATUS } from './StatusPedido';

export default function CartaoPedido({ pedido, mostrarData = false }) {
  const IconeEntrega = pedido.tipo_entrega === 'entrega' ? Truck : Store;
  const resumo = pedido.itens.slice(0, 2).map((i) => `${numero(i.quantidade)}x ${i.produto_nome}`).join(', ');
  return (
    <Link to={`/pedidos/${pedido.id}`} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600">
      <Card className={`p-4 border-l-4 hover:shadow-md transition-shadow ${ESTILO_STATUS[pedido.status]?.borda} ${pedido.status === 'cancelado' ? 'opacity-70' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 flex items-center gap-2">
              <IconeEntrega className="w-4 h-4 shrink-0 text-gray-600" aria-label={pedido.tipo_entrega === 'entrega' ? 'Entrega' : 'Retirada'} />
              <span className="truncate">{pedido.cliente_nome}</span>
              {pedido.data_festiva && <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">🎉 Data festiva</span>}
            </p>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              {mostrarData && `${format(parseISO(pedido.data_entrega), 'dd/MM (EEE)', { locale: ptBR })} · `}
              {pedido.hora_entrega || 'Horário a combinar'}
            </p>
            {resumo && (
              <p className="text-sm text-gray-700 mt-1 truncate">
                {resumo}{pedido.itens.length > 2 && ` +${pedido.itens.length - 2}`}
              </p>
            )}
          </div>
          <div className="text-right flex flex-col items-end gap-1 shrink-0">
            <StatusPedido status={pedido.status} pequeno />
            <span className="font-semibold text-gray-900">{moeda(pedido.valor_total)}</span>
            {pedido.saldo > 0 && pedido.status !== 'cancelado' && (
              <span className="text-xs text-orange-800 font-medium">Saldo {moeda(pedido.saldo)}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
