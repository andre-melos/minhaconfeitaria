import { db } from '@/dados/legado';

import React, { useState, useMemo } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  Trash2, 
  Loader2,
  AlertCircle,
  Search,
  UserPlus
} from 'lucide-react';
import ProductSelector from '../components/orders/ProductSelector';
import { Link } from 'react-router-dom';
import { clientesNoFormatoAntigo, criarClienteNoFormatoAntigo, datasFestivasNoFormatoAntigo, produtosNoFormatoAntigo } from '@/servicos/compatibilidadePrototipo';

export default function NewOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '' });
  
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    client_phone: '',
    delivery_date: format(new Date(), 'yyyy-MM-dd'),
    delivery_time: '',
    delivery_type: 'retirada',
    delivery_address: '',
    freight_value: 0,
    items: [],
    discount_type: 'fixed',
    discount_value: 0,
    notes: '',
    status: 'orcamento'
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

  const createOrderMutation = useMutation({
    mutationFn: (data) => db.entities.Order.create(data),
    onSuccess: (order) => {
      queryClient.invalidateQueries(['orders']);
      navigate(`/pedidos/${order.id}`);
    }
  });

  const createClientMutation = useMutation({
    mutationFn: (data) => criarClienteNoFormatoAntigo(data),
    onSuccess: (client) => {
      queryClient.invalidateQueries(['clients']);
      selectClient(client);
      setShowNewClientDialog(false);
      setNewClient({ name: '', phone: '', address: '' });
    }
  });

  const isHoliday = useMemo(() => {
    if (!formData.delivery_date) return false;
    const dateStr = formData.delivery_date;
    const deliveryDate = new Date(dateStr);
    
    return holidays.some(h => {
      const startDate = new Date(h.date);
      const endDate = h.end_date ? new Date(h.end_date) : startDate;
      
      if (h.recurring) {
        // Para datas recorrentes, comparamos apenas mês e dia
        const deliveryMD = dateStr.slice(5);
        const startMD = h.date?.slice(5);
        const endMD = h.end_date?.slice(5) || startMD;
        
        // Caso simples: mesmo mês ou período não cruza virada de ano
        if (startMD <= endMD) {
          return deliveryMD >= startMD && deliveryMD <= endMD;
        } else {
          // Período cruza virada de ano (ex: 26/12 a 01/01)
          return deliveryMD >= startMD || deliveryMD <= endMD;
        }
      }
      
      return deliveryDate >= startDate && deliveryDate <= endDate;
    });
  }, [formData.delivery_date, holidays]);

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone?.includes(clientSearch)
  );

  const selectClient = (client) => {
    setFormData(prev => ({
      ...prev,
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone || '',
      delivery_address: client.address || prev.delivery_address
    }));
    setStep(2);
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

  const itemsTotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const freightValue = formData.delivery_type === 'entrega' ? (parseFloat(formData.freight_value) || 0) : 0;
  const discountValue = parseFloat(formData.discount_value) || 0;
  const discountAmount = formData.discount_type === 'percent'
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
      paid_value: 0,
      balance: totalValue,
      is_holiday_order: isHoliday
    };
    
    createOrderMutation.mutate(orderData);
  };

  const canProceed = () => {
    if (step === 1) return !!formData.client_id;
    if (step === 2) return !!formData.delivery_date;
    if (step === 3) return formData.items.length > 0;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={'/agenda'}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Pedido</h1>
          <p className="text-gray-500">Passo {step} de 4</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-rose-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Client Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Selecione o Cliente</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowNewClientDialog(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar cliente..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredClients.map(client => (
              <Card
                key={client.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  formData.client_id === client.id ? 'ring-2 ring-rose-500 bg-rose-50' : ''
                }`}
                onClick={() => selectClient(client)}
              >
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-gray-500">{client.phone}</div>
              </Card>
            ))}
            
            {filteredClients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum cliente encontrado</p>
                <Button 
                  variant="link" 
                  className="text-rose-600"
                  onClick={() => setShowNewClientDialog(true)}
                >
                  Criar novo cliente
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Date & Delivery */}
      {step === 2 && (
        <div className="space-y-6">
          <Card className="p-4 bg-gray-50">
            <div className="text-sm text-gray-500">Cliente selecionado</div>
            <div className="font-semibold">{formData.client_name}</div>
            <div className="text-sm text-gray-500">{formData.client_phone}</div>
          </Card>

          <div className="space-y-4">
            <div>
              <Label>Data de Entrega *</Label>
              <Input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              />
              {isHoliday && (
                <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span className="text-sm text-rose-700 font-medium">
                    🎉 Esta é uma data festiva! Recomendamos solicitar sinal.
                  </span>
                </div>
              )}
            </div>

            <div>
              <Label>Horário de Entrega</Label>
              <Input
                type="time"
                value={formData.delivery_time}
                onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
              />
            </div>

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
          </div>
        </div>
      )}

      {/* Step 3: Products */}
      {step === 3 && (
        <div className="space-y-6">
          <ProductSelector products={products} onAddItem={addItem} />

          {formData.items.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Itens do Pedido</h3>

              <div className="space-y-2">
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
            </div>
          )}
        </div>
      )}

      {/* Discount - shown in step 3 when items exist */}
      {step === 3 && formData.items.length > 0 && (
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
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Resumo do Pedido</h2>

          <Card className="p-4 space-y-4">
            <div>
              <div className="text-sm text-gray-500">Cliente</div>
              <div className="font-semibold">{formData.client_name}</div>
              <div className="text-sm text-gray-500">{formData.client_phone}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Data de Entrega</div>
                <div className="font-medium">{formData.delivery_date}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Horário</div>
                <div className="font-medium">{formData.delivery_time || 'A combinar'}</div>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Tipo</div>
              <div className="font-medium flex items-center gap-2">
                {formData.delivery_type === 'entrega' ? (
                  <>
                    <Truck className="w-4 h-4 text-blue-500" />
                    Entrega
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 text-emerald-500" />
                    Retirada
                  </>
                )}
              </div>
            </div>

            {formData.delivery_address && (
              <div>
                <div className="text-sm text-gray-500">Endereço</div>
                <div className="font-medium">{formData.delivery_address}</div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Itens</h3>
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.product_name}</span>
                  <span>R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>

            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>R$ {itemsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              {freightValue > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Frete</span>
                  <span>R$ {freightValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto {formData.discount_type === 'percent' ? `(${formData.discount_value}%)` : ''}</span>
                  <span>- R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-rose-600">
                <span>Total</span>
                <span>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </Card>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações do pedido..."
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 1 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
              Voltar
            </Button>
          )}
          
          {step < 4 ? (
            <Button
              className="flex-1 bg-rose-500 hover:bg-rose-600"
              disabled={!canProceed()}
              onClick={() => setStep(s => s + 1)}
            >
              Continuar
            </Button>
          ) : (
            <Button
              className="flex-1 bg-rose-500 hover:bg-rose-600"
              disabled={createOrderMutation.isPending}
              onClick={handleSubmit}
            >
              {createOrderMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Criar Pedido
            </Button>
          )}
        </div>
      </div>

      {/* New Client Dialog */}
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                placeholder="Endereço para entrega"
              />
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewClientDialog(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-rose-500 hover:bg-rose-600"
                disabled={!newClient.name || !newClient.phone || createClientMutation.isPending}
                onClick={() => createClientMutation.mutate(newClient)}
              >
                {createClientMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}