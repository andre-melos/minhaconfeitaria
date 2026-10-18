import { db } from '@/dados/legado';
import { pedidosNoFormatoAntigo, produtosNoFormatoAntigo } from '@/servicos/compatibilidadePrototipo';

import React, { useState, useMemo } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, ChevronLeft, ChevronRight, Loader2, TrendingUp, Wallet, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const expenseCategories = [
  { value: 'insumos', label: 'Insumos', color: 'bg-amber-100 text-amber-700' },
  { value: 'embalagens', label: 'Embalagens', color: 'bg-pink-100 text-pink-700' },
  { value: 'equipamentos', label: 'Equipamentos', color: 'bg-purple-100 text-purple-700' },
  { value: 'aluguel', label: 'Aluguel', color: 'bg-blue-100 text-blue-700' },
  { value: 'energia', label: 'Energia', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'agua', label: 'Água', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'gas', label: 'Gás', color: 'bg-orange-100 text-orange-700' },
  { value: 'transporte', label: 'Transporte', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'marketing', label: 'Marketing', color: 'bg-rose-100 text-rose-700' },
  { value: 'impostos', label: 'Impostos', color: 'bg-red-100 text-red-700' },
  { value: 'salarios', label: 'Salários', color: 'bg-green-100 text-green-700' },
  { value: 'outros', label: 'Outros', color: 'bg-gray-100 text-gray-700' }
];

export default function CashFlow() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    category: 'outros',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'pix',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => db.entities.Expense.list('-date')
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: pedidosNoFormatoAntigo
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: produtosNoFormatoAntigo
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      closeDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      closeDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setDeleteId(null);
    }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { monthlyExpenses, monthlyOrders, stats } = useMemo(() => {
    const filteredExpenses = expenses.filter(exp => {
      if (!exp.date) return false;
      const expDate = parseISO(exp.date);
      return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
    });

    const filteredOrders = orders.filter(order => {
      if (!order.delivery_date || order.status === 'cancelado') return false;
      const orderDate = parseISO(order.delivery_date);
      return isWithinInterval(orderDate, { start: monthStart, end: monthEnd }) &&
        (order.status === 'entregue' || order.status === 'pronto');
    });

    let grossRevenue = 0;
    let productCost = 0;

    filteredOrders.forEach(order => {
      grossRevenue += order.total_value || 0;
      (order.items || []).forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          // Calcular custo unitário corretamente
          const yieldQty = product.yield_quantity || 1;
          const recipeTotalCost = product.total_cost || 0;
          const unitCost = yieldQty > 0 ? recipeTotalCost / yieldQty : 0;
          productCost += unitCost * (item.quantity || 1);
        }
      });
    });

    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const netRevenue = grossRevenue - productCost;
    const balance = netRevenue - totalExpenses;

    return {
      monthlyExpenses: filteredExpenses,
      monthlyOrders: filteredOrders,
      stats: { grossRevenue, productCost, netRevenue, totalExpenses, balance }
    };
  }, [expenses, orders, products, monthStart, monthEnd]);

  const openNewDialog = () => {
    setEditingExpense(null);
    setFormData({
      description: '',
      category: 'outros',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'pix',
      notes: ''
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description || '',
      category: expense.category || 'outros',
      amount: expense.amount?.toString() || '',
      date: expense.date || format(new Date(), 'yyyy-MM-dd'),
      payment_method: expense.payment_method || 'pix',
      notes: expense.notes || ''
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, amount: parseFloat(formData.amount) || 0 };
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getCategoryInfo = (cat) => expenseCategories.find(c => c.value === cat) || expenseCategories[11];

  if (loadingExpenses || loadingOrders) {
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
          <h1 className="text-2xl font-bold text-gray-900">Fluxo de Caixa</h1>
          <p className="text-gray-500">Movimentação financeira mensal</p>
        </div>
        <Button onClick={openNewDialog} className="bg-red-500 hover:bg-red-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* Month Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 capitalize">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <ArrowUpCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700">Receita Bruta</p>
              <p className="text-lg font-bold text-green-800">
                R$ {stats.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700">Lucro Líquido</p>
              <p className="text-lg font-bold text-blue-800">
                R$ {stats.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-blue-600">(-R$ {stats.productCost.toFixed(2)} custos)</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-3">
            <ArrowDownCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-red-700">Total Despesas</p>
              <p className="text-lg font-bold text-red-800">
                R$ {stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 bg-gradient-to-br ${stats.balance >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
          <div className="flex items-center gap-3">
            <Wallet className={`w-8 h-8 ${stats.balance >= 0 ? 'text-emerald-600' : 'text-orange-600'}`} />
            <div>
              <p className={`text-sm ${stats.balance >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>Saldo Final</p>
              <p className={`text-lg font-bold ${stats.balance >= 0 ? 'text-emerald-800' : 'text-orange-800'}`}>
                R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-green-500" />
            Vendas ({monthlyOrders.length})
          </h3>
          {monthlyOrders.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {monthlyOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.client_name}</p>
                    <p className="text-xs text-gray-500">{format(parseISO(order.delivery_date), 'dd/MM')}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-700">
                    +R$ {(order.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Nenhuma venda no período</p>
          )}
        </Card>

        {/* Expenses */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-red-500" />
            Despesas ({monthlyExpenses.length})
          </h3>
          {monthlyExpenses.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {monthlyExpenses.map(expense => {
                const catInfo = getCategoryInfo(expense.category);
                return (
                  <div key={expense.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{expense.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${catInfo.color}`}>{catInfo.label}</Badge>
                        <span className="text-xs text-gray-500">{format(parseISO(expense.date), 'dd/MM')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-red-700">
                        -R$ {(expense.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(expense)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(expense.id)}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Nenhuma despesa registrada</p>
          )}
        </Card>
      </div>

      {/* Expense Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Compra de farinha"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pagamento</Label>
                <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-red-500 hover:bg-red-600" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingExpense ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}