import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Package, Truck, Clock, Phone, DollarSign } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function OrderCard({ order, compact = false }) {
  const isDelivery = order.delivery_type === 'entrega';
  
  return (
    <Link to={`/pedidos/${order.id}`}>
      <Card className={`p-4 hover:shadow-md transition-all duration-200 border-l-4 ${
        order.status === 'cancelado' ? 'border-l-red-400 opacity-60' :
        order.status === 'entregue' ? 'border-l-green-400' :
        order.status === 'pronto' ? 'border-l-emerald-400' :
        order.status === 'em_producao' ? 'border-l-purple-400' :
        order.status === 'confirmado' ? 'border-l-blue-400' :
        order.status === 'aguardando_sinal' ? 'border-l-amber-400' :
        'border-l-gray-300'
      } ${order.is_holiday_order ? 'ring-2 ring-rose-200' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isDelivery ? (
                <Truck className="w-4 h-4 text-blue-500 flex-shrink-0" />
              ) : (
                <Package className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              )}
              <span className="font-semibold text-gray-900 truncate">
                {order.client_name}
              </span>
              {order.is_holiday_order && (
                <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
                  🎉 Festivo
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {order.delivery_time || 'A combinar'}
              </span>
              {!compact && order.client_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {order.client_phone}
                </span>
              )}
            </div>
            
            {!compact && order.items && order.items.length > 0 && (
              <div className="text-sm text-gray-600 mb-2">
                {order.items.slice(0, 2).map((item, idx) => (
                  <span key={idx}>
                    {item.quantity}x {item.product_name}
                    {idx < Math.min(order.items.length - 1, 1) && ', '}
                  </span>
                ))}
                {order.items.length > 2 && (
                  <span className="text-gray-400"> +{order.items.length - 2} mais</span>
                )}
              </div>
            )}
          </div>
          
          <div className="text-right flex flex-col items-end gap-2">
            <StatusBadge status={order.status} size="sm" />
            <div className="flex items-center gap-1 text-gray-900 font-semibold">
              <DollarSign className="w-4 h-4 text-gray-400" />
              {(order.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            {order.balance > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                Saldo: R$ {order.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}