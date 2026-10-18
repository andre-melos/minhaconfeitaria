import { db } from '@/dados/legado';

import React, { useState, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, ShoppingBag, Loader2 } from 'lucide-react';
import OrderCard from '../components/orders/OrderCard';
import EstadoVazio from '@/components/comum/EstadoVazio';
import { Link, useSearchParams } from 'react-router-dom';

export default function Orders() {
  const [parametros] = useSearchParams();
  const clientFilter = parametros.get('cliente') || '';
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy] = useState('delivery_date');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => db.entities.Order.list('-delivery_date')
  });

  const filteredOrders = useMemo(() => {
    let result = orders;

    // Client filter from URL
    if (clientFilter) {
      result = result.filter(o => o.client_id === clientFilter);
    }

    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(o =>
        o.client_name?.toLowerCase().includes(searchLower) ||
        o.client_phone?.includes(search)
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter(o => !['entregue', 'entregue_nao_pago', 'cancelado'].includes(o.status));
    } else if (statusFilter === 'entregue_nao_pago') {
      result = result.filter(o => o.status === 'entregue_nao_pago');
    } else if (statusFilter === 'entregue') {
      result = result.filter(o => o.status === 'entregue');
    } else if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'delivery_date') {
        return (a.delivery_date || '').localeCompare(b.delivery_date || '');
      }
      if (sortBy === '-delivery_date') {
        return (b.delivery_date || '').localeCompare(a.delivery_date || '');
      }
      if (sortBy === 'total_value') {
        return (b.total_value || 0) - (a.total_value || 0);
      }
      return 0;
    });

    return result;
  }, [orders, search, statusFilter, sortBy, clientFilter]);

  // Group by date
  const groupedOrders = useMemo(() => {
    const groups = {};
    filteredOrders.forEach(order => {
      const date = order.delivery_date || 'Sem data';
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(order);
    });
    return groups;
  }, [filteredOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500">
            {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
            {clientFilter && ' deste cliente'}
          </p>
        </div>
        
        <Link to={'/pedidos/novo'}>
          <Button className="bg-rose-500 hover:bg-rose-600">
            <Plus className="w-4 h-4 mr-2" />
            Novo Pedido
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar por cliente ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
            <TabsList className="w-full bg-gray-100 flex-wrap h-auto gap-1">
              <TabsTrigger value="active" className="flex-1">Ativos</TabsTrigger>
              <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
              <TabsTrigger value="entregue" className="flex-1">Entregues</TabsTrigger>
              <TabsTrigger value="entregue_nao_pago" className="flex-1 text-amber-700 data-[state=active]:text-amber-700 data-[state=active]:bg-amber-50">
                Entregue e não pago
              </TabsTrigger>
              <TabsTrigger value="cancelado" className="flex-1">Cancelados</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delivery_date">Entrega (próximas)</SelectItem>
              <SelectItem value="-delivery_date">Entrega (recentes)</SelectItem>
              <SelectItem value="total_value">Maior valor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EstadoVazio
          icone={ShoppingBag}
          titulo={search || statusFilter !== 'active' ? "Nenhum pedido encontrado" : "Nenhum pedido ativo"}
          descricao={search || statusFilter !== 'active' ? "Tente outro filtro" : "Crie seu primeiro pedido"}
          rotuloAcao={!search && statusFilter === 'active' ? "Novo Pedido" : undefined}
          rotaAcao={!search && statusFilter === 'active' ? "/pedidos/novo" : undefined}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedOrders).map(([date, dateOrders]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">
                {date !== 'Sem data' 
                  ? format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR })
                  : 'Sem data definida'
                }
              </h3>
              <div className="space-y-3">
                {dateOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}