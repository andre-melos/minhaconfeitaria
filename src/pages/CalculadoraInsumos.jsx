import { db } from '@/dados/legado';
import { produtosNoFormatoAntigo } from '@/servicos/compatibilidadePrototipo';

import React, { useState, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { Calculator, Trash2, FlaskConical, AlertCircle } from 'lucide-react';
import ProductSelector from '../components/orders/ProductSelector';

export default function IngredientsCalculator() {
  const [mode, setMode] = useState('period');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualItems, setManualItems] = useState([]);
  const [results, setResults] = useState(null);

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => db.entities.Order.list('-delivery_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await produtosNoFormatoAntigo()).filter((p) => p.active)
  });

  const activeProducts = products.filter(p => p.active !== false);

  const ordersInPeriod = useMemo(() => {
    if (mode !== 'period') return [];
    return orders.filter(o =>
      o.status !== 'cancelado' &&
      o.delivery_date >= startDate &&
      o.delivery_date <= endDate
    );
  }, [orders, mode, startDate, endDate]);

  const calculateIngredients = () => {
    const productMap = {};
    products.forEach(p => { productMap[p.id] = p; });

    let itemsToCalc = [];
    if (mode === 'period') {
      ordersInPeriod.forEach(order => {
        (order.items || []).forEach(item => {
          itemsToCalc.push({ product_id: item.product_id, product_name: item.product_name, quantity: item.quantity });
        });
      });
    } else {
      itemsToCalc = manualItems;
    }

    // Aggregate by product first
    const productTotals = {};
    itemsToCalc.forEach(({ product_id, product_name, quantity }) => {
      if (!productTotals[product_id]) {
        productTotals[product_id] = { product_name, quantity: 0 };
      }
      productTotals[product_id].quantity += quantity;
    });

    // Calculate ingredients
    const ingredientTotals = {};
    Object.entries(productTotals).forEach(([product_id, { quantity }]) => {
      const product = productMap[product_id];
      if (!product || !product.ingredients || product.ingredients.length === 0) return;

      const yieldQty = product.yield_quantity || 1;
      product.ingredients.forEach(ing => {
        const key = `${ing.ingredient_name}__${ing.unit}`;
        const amountPerUnit = ing.quantity / yieldQty;
        const total = amountPerUnit * quantity;

        if (!ingredientTotals[key]) {
          ingredientTotals[key] = { name: ing.ingredient_name, unit: ing.unit, total: 0 };
        }
        ingredientTotals[key].total += total;
      });
    });

    setResults({ ingredientTotals, productTotals, itemsToCalc });
  };

  const addManualItem = (product) => {
    const existing = manualItems.findIndex(i => i.product_id === product.id);
    if (existing >= 0) {
      const newItems = [...manualItems];
      newItems[existing].quantity += 1;
      setManualItems(newItems);
    } else {
      setManualItems([...manualItems, { product_id: product.id, product_name: product.name, quantity: 1 }]);
    }
    setResults(null);
  };

  const updateQuantity = (index, qty) => {
    if (qty < 1) return;
    const newItems = [...manualItems];
    newItems[index].quantity = qty;
    setManualItems(newItems);
    setResults(null);
  };

  const removeItem = (index) => {
    setManualItems(manualItems.filter((_, i) => i !== index));
    setResults(null);
  };

  const canCalculate = mode === 'period' ? ordersInPeriod.length > 0 : manualItems.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calculadora de Insumos</h1>
        <p className="text-gray-500">Calcule os insumos necessários para produzir seus pedidos</p>
      </div>

      <Tabs value={mode} onValueChange={(v) => { setMode(v); setResults(null); }}>
        <TabsList className="w-full">
          <TabsTrigger value="period" className="flex-1">Por Período</TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">Simulação Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="period" className="mt-4 space-y-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Período de Entrega</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data inicial</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setResults(null); }} />
              </div>
              <div>
                <Label>Data final</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setResults(null); }} />
              </div>
            </div>

            {startDate && endDate && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {ordersInPeriod.length} pedido(s) encontrado(s) no período
                </p>
                {ordersInPeriod.length > 0 && (
                  <div className="space-y-1">
                    {ordersInPeriod.map(order => (
                      <p key={order.id} className="text-xs text-gray-600">
                        • <span className="font-medium">{order.client_name}</span> — {(order.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                      </p>
                    ))}
                  </div>
                )}
                {ordersInPeriod.length === 0 && (
                  <p className="text-xs text-gray-500">Nenhum pedido ativo neste período</p>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-4 space-y-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Adicionar Produtos</h3>
            <ProductSelector products={activeProducts} onAddItem={addManualItem} />

            {manualItems.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <h4 className="text-sm font-medium text-gray-700">Produtos adicionados</h4>
                {manualItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 py-1">
                    <span className="flex-1 text-sm font-medium truncate">{item.product_name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(index, item.quantity - 1)}>-</Button>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                        className="w-14 h-7 text-center text-sm"
                      />
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(index, item.quantity + 1)}>+</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(index)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Button
        className="w-full bg-rose-500 hover:bg-rose-600"
        onClick={calculateIngredients}
        disabled={!canCalculate}
      >
        <Calculator className="w-4 h-4 mr-2" />
        Calcular Insumos
      </Button>

      {results && (
        <div className="space-y-4">
          {/* Resumo de produtos */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">Resumo de Produção</h3>
            <div className="space-y-1">
              {Object.values(results.productTotals).map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{p.product_name}</span>
                  <span className="font-medium">{p.quantity} unidade(s)</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Insumos necessários */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-rose-500" />
              Insumos Necessários
            </h3>

            {Object.keys(results.ingredientTotals).length === 0 ? (
              <div className="flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm">Nenhum insumo encontrado. Verifique se os produtos têm insumos cadastrados.</p>
              </div>
            ) : (
              <div className="divide-y">
                {Object.values(results.ingredientTotals)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2.5">
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <span className="text-rose-600 font-bold text-base">
                        {Number.isInteger(item.total) ? item.total : item.total.toFixed(2)} {item.unit}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}