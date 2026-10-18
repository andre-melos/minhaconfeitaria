import { db } from '@/dados/legado';

import React, { useState, useEffect, useMemo } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  Trash2, 
  Loader2,
  AlertCircle,
  Save
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductSelector from '../components/orders/ProductSelector';
import { clientesNoFormatoAntigo, datasFestivasNoFormatoAntigo, produtosNoFormatoAntigo } from '@/servicos/compatibilidadePrototipo';

export default function EditOrder() {
  const { id: orderId } = useParams();
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState(null);

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const orders = await db.entities.Order.filter({ id: orderId });
      return orders[0];
    },
    enabled: !!orderId
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientesNoFormatoAntigo()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await produtosNoFormatoAntigo()).filter((p) => p.active)
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => datasFestivasNoFormatoAntigo()
  });

  // Inicializar formData quando order carregar
  useEffect(() => {
    if (order && !formData) {
      setFormData({
        client_id: order.client_id || '',
        client_name: order.client_name || '',
        client_phone: order.client_phone || '',
        delivery_date: order.delivery_date || format(new Date(), 'yyyy-MM-dd'),
        delivery_time: order.delivery_time || '',
        delivery_type: order.delivery_type || 'retirada',
        delivery_address: order.delivery_address || '',
        freight_value: order.freight_value || 0,
        items: order.items || [],
        discount_type: order.discount_type || 'fixed',
        discount_value: order.discount_value || 0,
        notes: order.notes || '',
        status: order.status || 'orcamento'
      });
    }
  }, [order, formData]);

  const updateOrderMutation = useMutation({
    mutationFn: (data) => db.entities.Order.update(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['order', orderId]);
      queryClient.invalidateQueries(['orders']);
      navigate(`/pedidos/${orderId}`);
    }
  });

  const isHoliday = useMemo(() => {
    if (!formData?.delivery_date) return false;
    const dateStr = formData.delivery_date;
    const deliveryDate = new Date(dateStr);
    
    return holidays.some(h => {
      const startDate = new Date(h.date);
      const endDate = h.end_date ? new Date(h.end_date) : startDate;
      
      if (h.recurring) {
        const deliveryMD = dateStr.slice(5);
        const startMD = h.date?.slice(5);
        const endMD = h.end_date?.slice(5) || startMD;
        
        if (startMD <= endMD) {
          return deliveryMD >= startMD && deliveryMD <= endMD;
        } else {
          return deliveryMD >= startMD || deliveryMD <= endMD;
        }
      }
      
      return deliveryDate >= startDate && deliveryDate <= endDate;
    });
  }, [formData?.delivery_date, holidays]);

  const selectClient = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        client_id: client.id,
        client_name: client.name,
        client_phone: client.phone || '',
        delivery_address: client.address || prev.delivery_address
      }));
    }
  };

  const addItem = (product) => {
    const existingIndex = formData.items.findIndex(i => i.product_id === product.id);
    
    if (existingIndex >= 0) {
      const newItems = [...formData.items];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].total = newItems[existingIndex].quantity * newItems[existingIndex].unit_price;
      setFormData(prev => ({ ...prev, items: newItems }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          total: product.price,
          notes: ''
        }]
      }));
    }
  };

  const updateItemQuantity = (index, quantity) => {
    if (quantity < 1) return;
    const newItems = [...formData.items];
    newItems[index].quantity = quantity;
    newItems[index].total = quantity * newItems[index].unit_price;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const itemsTotal = formData?.items?.reduce((sum, item) => sum + item.total, 0) || 0;
  const freightValue = formData?.delivery_type === 'entrega' ? (parseFloat(formData.freight_value) || 0) : 0;
  const discountValue = parseFloat(formData?.discount_value) || 0;
  const discountAmount = formData?.discount_type === 'percent'
    ? ((itemsTotal + freightValue) * discountValue / 100)
    : discountValue;
  const totalValue = Math.max(0, itemsTotal + freightValue - discountAmount);

  const handleSubmit = () => {
    const orderData = {
      ...formData,
      items_total: itemsTotal,
      total_value: totalValue,
      freight_value: freightValue,
      discount_amount: discountAmount,
      balance: totalValue - (order?.paid_value || 0),
      is_holiday_order: isHoliday
    };
    
    updateOrderMutation.mutate(orderData);
  };

  if (loadingOrder || !formData) {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/pedidos/${orderId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Pedido</h1>
          <p className="text-gray-500">#{orderId?.slice(-6)}</p>
        </div>
      </div>

      {/* Cliente */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Cliente</h3>
        <Select value={formData.client_id} onValueChange={selectClient}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.name} - {client.phone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Data e Entrega */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Data e Entrega</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data de Entrega *</Label>
            <Input
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Horário</Label>
            <Input
              type="time"
              value={formData.delivery_time}
              onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
            />
          </div>
        </div>

        {isHoliday && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span className="text-sm text-rose-700 font-medium">
              🎉 Esta é uma data festiva!
            </span>
          </div>
        )}

        <div>
          <Label>Tipo de Entrega *</Label>
          <RadioGroup
            value={formData.delivery_type}
            onValueChange={(value) => setFormData({ ...formData, delivery_type: value })}
            className="grid grid-cols-2 gap-4 mt-2"
          >
            <Card className={`p-4 cursor-pointer ${formData.delivery_type === 'retirada' ? 'ring-2 ring-rose-500 bg-rose-50' : ''}`}>
              <Label className="flex items-center gap-3 cursor-pointer">
                <RadioGroupItem value="retirada" />
                <Package className="w-5 h-5 text-emerald-500" />
                <span>Retirada</span>
              </Label>
            </Card>
            <Card className={`p-4 cursor-pointer ${formData.delivery_type === 'entrega' ? 'ring-2 ring-rose-500 bg-rose-50' : ''}`}>
              <Label className="flex items-center gap-3 cursor-pointer">
                <RadioGroupItem value="entrega" />
                <Truck className="w-5 h-5 text-blue-500" />
                <span>Entrega</span>
              </Label>
            </Card>
          </RadioGroup>
        </div>

        {formData.delivery_type === 'entrega' && (
          <>
            <div>
              <Label>Endereço de Entrega</Label>
              <Textarea
                value={formData.delivery_address}
                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                placeholder="Endereço completo"
                rows={2}
              />
            </div>
            <div>
              <Label>Valor do Frete (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.freight_value}
                onChange={(e) => setFormData({ ...formData, freight_value: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </>
        )}
      </Card>

      {/* Produtos */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Produtos</h3>
        
        <ProductSelector products={products} onAddItem={addItem} />

        {formData.items.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium text-sm text-gray-700">Itens do Pedido</h4>
            {formData.items.map((item, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.product_name}</div>
                    <div className="text-sm text-gray-500">
                      R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} cada
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateItemQuantity(index, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                      className="w-14 h-8 text-center text-sm font-medium"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateItemQuantity(index, item.quantity + 1)}
                    >
                      +
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="text-right text-sm font-medium text-rose-600 mt-2">
                  R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Desconto */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Desconto</h3>
        <div className="flex gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={formData.discount_type === 'fixed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({ ...formData, discount_type: 'fixed', discount_value: 0 })}
              className={formData.discount_type === 'fixed' ? 'bg-rose-500 hover:bg-rose-600' : ''}
            >
              R$
            </Button>
            <Button
              type="button"
              variant={formData.discount_type === 'percent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({ ...formData, discount_type: 'percent', discount_value: 0 })}
              className={formData.discount_type === 'percent' ? 'bg-rose-500 hover:bg-rose-600' : ''}
            >
              %
            </Button>
          </div>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.discount_value || ''}
            onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
            placeholder={formData.discount_type === 'percent' ? 'Ex: 10' : 'Ex: 5,00'}
            className="flex-1"
          />
        </div>
        {discountAmount > 0 && (
          <p className="text-sm text-green-600 font-medium">
            Desconto de R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aplicado
          </p>
        )}
      </Card>

      {/* Resumo */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Resumo</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>R$ {itemsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          {freightValue > 0 && (
            <div className="flex justify-between">
              <span>Frete</span>
              <span>R$ {freightValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Desconto {formData.discount_type === 'percent' ? `(${formData.discount_value}%)` : ''}</span>
              <span>- R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span className="text-rose-600">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          {(order.paid_value || 0) > 0 && (
            <>
              <div className="flex justify-between text-green-600">
                <span>Já pago</span>
                <span>R$ {(order.paid_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-amber-600 font-medium">
                <span>Novo saldo</span>
                <span>R$ {Math.max(0, totalValue - (order.paid_value || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Observações */}
      <Card className="p-4 space-y-3">
        <Label>Observações</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Observações do pedido..."
          rows={3}
        />
      </Card>

      {/* Botões de ação */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Link to={`/pedidos/${orderId}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button
            className="flex-1 bg-rose-500 hover:bg-rose-600"
            disabled={updateOrderMutation.isPending || formData.items.length === 0}
            onClick={handleSubmit}
          >
            {updateOrderMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
}