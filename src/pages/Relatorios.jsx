import { db } from '@/dados/legado';

import React, { useState, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, DollarSign, ShoppingBag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { categoriasNoFormatoAntigo, produtosNoFormatoAntigo } from '@/servicos/compatibilidadePrototipo';

const COLORS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#64748b'];

export default function Reports() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => db.entities.Order.list('-delivery_date')
  });

  const { data: dbCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriasNoFormatoAntigo()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: produtosNoFormatoAntigo
  });

  // Mapa de categorias para converter ID em nome
  const categoryMap = useMemo(() => {
    const map = {};
    dbCategories.forEach(cat => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [dbCategories]);

  const filteredOrders = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return orders.filter(order => {
      if (!order.delivery_date || order.status === 'cancelado') return false;
      const orderDate = parseISO(order.delivery_date);
      const inDateRange = isWithinInterval(orderDate, { start, end });
      
      // Filtro por categoria
      if (categoryFilter !== 'all' && inDateRange) {
        const hasCategory = (order.items || []).some(item => {
          const product = products.find(p => p.id === item.product_id);
          return product && product.category === categoryFilter;
        });
        if (!hasCategory) return false;
      }
      
      return inDateRange;
    });
  }, [orders, startDate, endDate, categoryFilter, products]);

  const stats = useMemo(() => {
    let grossRevenue = 0;
    let totalCost = 0;
    let productCount = 0;
    const categoryStats = {};
    const productStats = {};

    filteredOrders.forEach(order => {
      if (order.status !== 'entregue' && order.status !== 'pronto') return;
      
      grossRevenue += order.total_value || 0;
      
      (order.items || []).forEach(item => {
        const qty = item.quantity || 1;
        
        // Find product to get cost and category
        const product = products.find(p => p.id === item.product_id);
        
        // Se há filtro de categoria, só contabilizar itens da categoria selecionada
        if (categoryFilter !== 'all' && product && product.category !== categoryFilter) {
          return;
        }
        
        productCount += qty;
        
        if (product) {
          // Calcular custo unitário corretamente
          const yieldQty = product.yield_quantity || 1;
          const recipeTotalCost = product.total_cost || 0;
          const unitCost = yieldQty > 0 ? recipeTotalCost / yieldQty : 0;
          const itemCost = unitCost * qty;
          totalCost += itemCost;
          
          // Category stats - converter ID da categoria para nome
          const catId = product.category || 'outro';
          const catDisplayName = categoryMap[catId] || catId;
          if (!categoryStats[catId]) categoryStats[catId] = { name: catDisplayName, value: 0, count: 0 };
          categoryStats[catId].value += item.total || 0;
          categoryStats[catId].count += qty;
          
          // Product stats
          if (!productStats[item.product_name]) productStats[item.product_name] = { name: item.product_name, value: 0, count: 0, category: catId };
          productStats[item.product_name].value += item.total || 0;
          productStats[item.product_name].count += qty;
        }
      });
    });

    const netRevenue = grossRevenue - totalCost;
    const margin = grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0;

    // Se há filtro de categoria, mostrar apenas produtos daquela categoria no gráfico
    let filteredProductData = Object.values(productStats);
    if (categoryFilter !== 'all') {
      filteredProductData = filteredProductData.filter(p => p.category === categoryFilter);
    }

    return {
      grossRevenue,
      totalCost,
      netRevenue,
      margin,
      orderCount: filteredOrders.filter(o => o.status === 'entregue' || o.status === 'pronto').length,
      productCount,
      categoryData: Object.values(categoryStats).sort((a, b) => b.value - a.value),
      productData: filteredProductData.sort((a, b) => b.value - a.value).slice(0, 10)
    };
  }, [filteredOrders, products, categoryMap, categoryFilter]);

  if (loadingOrders) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatório de Vendas</h1>
        <p className="text-gray-500">Análise financeira do período</p>
      </div>

      {/* Date Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="startDate">Data Inicial</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="endDate">Data Final</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label>Categoria</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {dbCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.emoji || '📦'} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-700">Receita Bruta</p>
              <p className="text-xl font-bold text-green-800">
                R$ {stats.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-200 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-sm text-red-700">Custo Produtos</p>
              <p className="text-xl font-bold text-red-800">
                R$ {stats.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-blue-700">Lucro Líquido</p>
              <p className="text-xl font-bold text-blue-800">
                R$ {stats.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-blue-600">Margem: {stats.margin.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-purple-700">Pedidos / Itens</p>
              <p className="text-xl font-bold text-purple-800">{stats.orderCount} / {stats.productCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Chart - quando filtra por categoria mostra produtos daquela categoria */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {categoryFilter === 'all' 
              ? 'Vendas por Categoria' 
              : `Produtos Mais Vendidos - ${dbCategories.find(c => c.id === categoryFilter)?.name || 'Categoria'}`
            }
          </h3>
          {(categoryFilter === 'all' ? stats.categoryData : stats.productData).length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryFilter === 'all' ? stats.categoryData : stats.productData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {(categoryFilter === 'all' ? stats.categoryData : stats.productData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Sem dados para o período</p>
          )}
        </Card>

        {/* Top Products */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h3>
          {stats.productData.length > 0 ? (
            <div className="space-y-3">
              {stats.productData.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center text-xs font-medium text-rose-600">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      R$ {product.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500">{product.count} un.</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Sem dados para o período</p>
          )}
        </Card>
      </div>
    </div>
  );
}