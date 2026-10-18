import { db } from '@/dados/legado';

import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  Phone, 
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  Trash2,
  MessageCircle,
  Edit2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge, { statusConfig } from '../components/orders/StatusBadge';

export default function OrderDetails() {
  const { id: orderId } = useParams();
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: '', method: 'pix' });

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const orders = await db.entities.Order.filter({ id: orderId });
      return orders[0];
    },
    enabled: !!orderId
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['order', orderId]);
      queryClient.invalidateQueries(['orders']);
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id) => db.entities.Order.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      navigate('/pedidos');
    }
  });

  const handleStatusChange = (newStatus) => {
    updateOrderMutation.mutate({
      id: orderId,
      data: { status: newStatus }
    });
  };

  const handlePayment = () => {
    const amount = parseFloat(paymentData.amount) || 0;
    const newPaidValue = (order.paid_value || 0) + amount;
    const newBalance = (order.total_value || 0) - newPaidValue;
    
    let newStatus = order.status;
    if (order.status === 'aguardando_sinal' && amount > 0) {
      newStatus = 'confirmado';
    }
    if (newBalance <= 0 && order.status !== 'entregue') {
      // Fully paid
    }

    updateOrderMutation.mutate({
      id: orderId,
      data: {
        paid_value: newPaidValue,
        balance: Math.max(0, newBalance),
        payment_method: paymentData.method,
        status: newStatus
      }
    });

    setShowPaymentDialog(false);
    setPaymentData({ amount: '', method: 'pix' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pedido não encontrado</p>
        <Link to={'/pedidos'}>
          <Button className="mt-4">Voltar para Pedidos</Button>
        </Link>
      </div>
    );
  }

  // Mensagem de repassar pedido
  const buildRepassarMessage = () => {
    const items = (order.items || []).map(item => 
      `• ${item.product_name} - ${item.quantity}x R$ ${(item.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ ${(item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ).join('\n');
    
    const deliveryType = order.delivery_type === 'retirada' ? 'retirada' : 'entrega';
    const deliveryTypeText = order.delivery_type === 'retirada' ? 'retirada' : 'entrega';
    const dateTime = `${order.delivery_date ? format(parseISO(order.delivery_date), "dd/MM/yyyy", { locale: ptBR }) : ''} às ${order.delivery_time || 'horário a combinar'}`;
    
    let message = `Repassando seu pedido:\n\n${items}`;
    
    if (order.freight_value && order.freight_value > 0) {
      message += `\n• Entrega - R$ ${order.freight_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    
    message += `\n\nTotal: R$ ${(order.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nO pagamento deverá ser realizado 50% no momento do pedido e 50% na ${deliveryTypeText}. O pedido somente será confirmado após o pagamento do sinal.\n\n📅 Data e horário da ${deliveryType}: ${dateTime}`;
    
    if (order.delivery_type === 'retirada') {
      message += `\n\n📍 Endereço: Rua Inácio Justino, 396, no final da Rua da Escola Mascarenhas, em frente ao Mini Mercado Marques`;
    }
    
    message += `\n\nObrigada pela encomenda! 🤎`;
    
    return encodeURIComponent(message);
  };

  // Mensagem de pedido pronto
  const buildPedidoProntoMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'boa tarde';
    if (hour >= 0 && hour < 12) {
      greeting = 'bom dia';
    } else if (hour >= 18 && hour <= 23) {
      greeting = 'boa noite';
    }
    return encodeURIComponent(`Oii, ${greeting}! Passando para avisar que seu pedido já está disponível para retirada 🥰`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={'/pedidos'}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedido</h1>
            <p className="text-gray-500">#{order.id?.slice(-6)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to={`/pedidos/${orderId}/editar`}>
            <Button variant="outline" size="sm">
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </Link>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Holiday Warning */}
      {order.is_holiday_order && (
        <Card className="p-4 bg-rose-50 border-rose-200">
          <div className="flex items-center gap-2 text-rose-700">
            <span className="text-xl">🎉</span>
            <span className="font-medium">Pedido para data festiva</span>
          </div>
        </Card>
      )}

      {/* Client Info */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Cliente</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-lg">{order.client_name}</div>
            {order.client_phone && (
              <div className="flex items-center gap-2 text-gray-500">
                <Phone className="w-4 h-4" />
                {order.client_phone}
              </div>
            )}
          </div>
          
          {order.client_phone && (
            <div className="flex flex-wrap gap-2">
              <a 
                href={`https://wa.me/55${order.client_phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </a>
              <a 
                href={`https://wa.me/55${order.client_phone.replace(/\D/g, '')}?text=${buildRepassarMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Repassar Pedido
                </Button>
              </a>
              <a 
                href={`https://wa.me/55${order.client_phone.replace(/\D/g, '')}?text=${buildPedidoProntoMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Avisar Pronto
                </Button>
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Delivery Info */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-gray-900">Entrega</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Data</div>
              <div className="font-medium">
                {order.delivery_date && format(parseISO(order.delivery_date), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Horário</div>
              <div className="font-medium">{order.delivery_time || 'A combinar'}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            order.delivery_type === 'entrega' ? 'bg-blue-100' : 'bg-emerald-100'
          }`}>
            {order.delivery_type === 'entrega' ? (
              <Truck className="w-5 h-5 text-blue-600" />
            ) : (
              <Package className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div>
            <div className="text-sm text-gray-500">Tipo</div>
            <div className="font-medium capitalize">{order.delivery_type}</div>
          </div>
        </div>

        {order.delivery_address && (
          <div className="flex items-start gap-3 pt-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Endereço</div>
              <div className="font-medium">{order.delivery_address}</div>
            </div>
          </div>
        )}
      </Card>

      {/* Items */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Itens do Pedido</h3>
        <div className="space-y-3">
          {order.items?.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
              <div>
                <div className="font-medium">{item.product_name}</div>
                <div className="text-sm text-gray-500">
                  {item.quantity}x R$ {(item.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                {item.notes && (
                  <div className="text-sm text-gray-400 italic">{item.notes}</div>
                )}
              </div>
              <div className="font-semibold">
                R$ {(item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Payment Summary */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Pagamento</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>R$ {(order.items_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          
          {order.freight_value > 0 && (
            <div className="flex justify-between text-sm">
              <span>Frete</span>
              <span>R$ {(order.freight_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span>R$ {(order.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div className="flex justify-between text-sm text-green-600">
            <span>Pago</span>
            <span>R$ {(order.paid_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          
          {(order.balance || 0) > 0 && (
            <div className="flex justify-between text-sm font-medium text-amber-600">
              <span>Saldo</span>
              <span>R$ {(order.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        <Button 
          className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600"
          onClick={() => {
            setPaymentData({ amount: (order.balance || 0).toString(), method: 'pix' });
            setShowPaymentDialog(true);
          }}
          disabled={(order.balance || 0) <= 0}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Registrar Pagamento
        </Button>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Observações</h3>
          <p className="text-gray-600">{order.notes}</p>
        </Card>
      )}

      {/* Status Change */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Alterar Status</h3>
        <Select value={order.status} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusConfig).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Delete */}
      <Button 
        variant="outline" 
        className="w-full text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => setShowDeleteDialog(true)}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Excluir Pedido
      </Button>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="0,00"
              />
              <p className="text-sm text-gray-500 mt-1">
                Saldo pendente: R$ {(order.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div>
              <Label>Forma de Pagamento</Label>
              <Select 
                value={paymentData.method} 
                onValueChange={(value) => setPaymentData({ ...paymentData, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentDialog(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                disabled={!paymentData.amount || parseFloat(paymentData.amount) <= 0}
                onClick={handlePayment}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O pedido será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOrderMutation.mutate(orderId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}