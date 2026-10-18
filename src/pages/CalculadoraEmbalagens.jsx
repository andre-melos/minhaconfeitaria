import { db } from '@/dados/legado';
import { Link } from 'react-router-dom';
import { embalagensNoFormatoAntigo, configuracoesEmbalagensNoFormatoAntigo, produtosNoFormatoAntigo } from '@/servicos/compatibilidadePrototipo';

import React, { useState, useMemo } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";






import { Calculator, Loader2, Package, PackageOpen } from 'lucide-react';

export default function PackagingCalculator() {
  const queryClient = useQueryClient();

  // States — Calculadora
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Queries
  const { data: packagings = [], isLoading: loadingPackagings } = useQuery({
    queryKey: ['packagings'],
    queryFn: async () => (await embalagensNoFormatoAntigo()).filter((e) => e.active)
  });

  const { data: packagingConfigs = [], isLoading: loadingConfigs } = useQuery({
    queryKey: ['packagingConfigs'],
    queryFn: configuracoesEmbalagensNoFormatoAntigo
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: produtosNoFormatoAntigo
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => db.entities.Order.list('-delivery_date')
  });

  // Cálculo por período
  const packagingNeeds = useMemo(() => {
    if (!startDate || !endDate) return {};

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const needs = {}; // packaging_id -> { name, total, products: [] }

    // Quantidade de cada produto nos pedidos do período
    const productQtys = {};
    orders.forEach(order => {
      if (!order.delivery_date || order.status === 'cancelado') return;
      const orderDate = parseISO(order.delivery_date);
      if (!isWithinInterval(orderDate, { start, end })) return;
      (order.items || []).forEach(item => {
        productQtys[item.product_id] = (productQtys[item.product_id] || 0) + (item.quantity || 0);
      });
    });

    // Cruzar com configurações de embalagem
    packagingConfigs.forEach(config => {
      const qty = productQtys[config.product_id] || 0;
      if (qty <= 0) return;

      (config.packagings || []).forEach(pkg => {
        if (!pkg.packaging_id) return;
        const totalQty = qty * (pkg.quantity || 1);

        if (!needs[pkg.packaging_id]) {
          needs[pkg.packaging_id] = {
            name: pkg.packaging_name,
            total: 0,
            products: []
          };
        }
        needs[pkg.packaging_id].total += totalQty;
        needs[pkg.packaging_id].products.push({
          name: config.product_name,
          qty,
          packagingQty: pkg.quantity || 1,
          total: totalQty
        });
      });
    });

    return needs;
  }, [orders, packagingConfigs, startDate, endDate]);

  if (loadingPackagings || loadingConfigs) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  const configuredProductIds = packagingConfigs.map(c => c.product_id);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calculadora de Embalagens</h1>
        <p className="text-gray-500">Calcule quantas embalagens serão necessárias para suas encomendas</p>
      </div>

      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
          <TabsTrigger value="packagings">Embalagens</TabsTrigger>
          <TabsTrigger value="products">Configurar Produtos</TabsTrigger>
        </TabsList>

        {/* Aba Calculadora */}
        <TabsContent value="calculator" className="space-y-6">
          <Card className="p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Selecione o período</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Data Inicial</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label>Data Final</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </Card>

          {Object.keys(packagingNeeds).length > 0 ? (
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-rose-500" />
                Embalagens Necessárias
              </h3>
              <div className="space-y-4">
                {Object.entries(packagingNeeds).map(([pkgId, data]) => (
                  <div key={pkgId} className="p-4 bg-gradient-to-r from-rose-50 to-purple-50 rounded-lg border border-rose-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-900 flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-500" />
                        {data.name}
                      </span>
                      <span className="text-2xl font-bold text-rose-600">{data.total} un.</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      {data.products.map((p, i) => (
                        <span key={i} className="inline-block mr-3">
                          {p.name} ({p.qty} un. × {p.packagingQty} emb. = {p.total} un.)
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-gray-500">
              <PackageOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma embalagem encontrada para o período selecionado</p>
              <p className="text-xs mt-1">Certifique-se de que os produtos dos pedidos estão configurados com embalagens</p>
            </Card>
          )}
        </TabsContent>

        {/* Aba Embalagens */}
        <TabsContent value="packagings" className="space-y-4">
          <Card className="p-6 text-center space-y-3">
            <p className="text-gray-700">{packagings.length} embalagem(ns) ativa(s) cadastrada(s).</p>
            <Button asChild className="bg-rose-600 hover:bg-rose-700">
              <Link to="/embalagens">Gerenciar embalagens</Link>
            </Button>
          </Card>
        </TabsContent>

        {/* Aba Configurar Produtos */}
        <TabsContent value="products" className="space-y-4">
          <Card className="p-6 text-center space-y-3">
            <p className="text-gray-700">{packagingConfigs.length} produto(s) com embalagens configuradas.</p>
            <p className="text-sm text-gray-600">As embalagens de cada produto são definidas no cadastro do produto.</p>
            <Button asChild className="bg-rose-600 hover:bg-rose-700"><Link to="/produtos">Ir para Produtos</Link></Button>
          </Card>
        </TabsContent>
      </Tabs>


    </div>
  );
}