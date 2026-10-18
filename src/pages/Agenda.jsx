import { db } from '@/dados/legado';

import React, { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth, isWeekend, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Calendar, Loader2, AlertTriangle } from 'lucide-react';
import OrderCard from '../components/orders/OrderCard';
import EstadoVazio from '@/components/comum/EstadoVazio';
import { datasFestivasNoFormatoAntigo } from '@/servicos/compatibilidadePrototipo';

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week');

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => db.entities.Order.list('-delivery_date')
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => datasFestivasNoFormatoAntigo()
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const isHoliday = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.some(h => {
      if (h.recurring) {
        return h.date.slice(5) === dateStr.slice(5);
      }
      return h.date === dateStr;
    });
  };

  const getHolidayName = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find(h => {
      if (h.recurring) {
        return h.date.slice(5) === dateStr.slice(5);
      }
      return h.date === dateStr;
    });
    return holiday?.name;
  };

  const getOrdersForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return orders.filter(o => o.delivery_date === dateStr && o.status !== 'cancelado');
  };

  const todayOrders = getOrdersForDate(currentDate);
  const todayHoliday = getHolidayName(currentDate);

  const navigateDate = (direction) => {
    if (view === 'day') {
      setCurrentDate(prev => addDays(prev, direction));
    } else if (view === 'week') {
      setCurrentDate(prev => addDays(prev, direction * 7));
    } else {
      setCurrentDate(prev => addMonths(prev, direction));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  if (loadingOrders) {
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
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500">Gerencie seus pedidos do dia</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <Button variant="ghost" size="icon" onClick={() => navigateDate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {view === 'day' 
              ? format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })
              : view === 'week'
              ? `${format(weekStart, "d MMM", { locale: ptBR })} - ${format(addDays(weekStart, 6), "d MMM", { locale: ptBR })}`
              : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
            }
          </h2>
          {view === 'day' && todayHoliday && (
            <span className="text-sm text-rose-600 font-medium">🎉 {todayHoliday}</span>
          )}
        </div>
        
        <Button variant="ghost" size="icon" onClick={() => navigateDate(1)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {view === 'day' ? (
        /* Day View */
        <div className="space-y-3">
          {todayOrders.length === 0 ? (
            <EstadoVazio
              icone={Calendar}
              titulo="Nenhum pedido para este dia"
              descricao="Adicione um novo pedido para começar"
              rotuloAcao="Novo Pedido"
              rotaAcao="/pedidos/novo"
            />
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                <span>{todayOrders.length} pedido{todayOrders.length !== 1 ? 's' : ''}</span>
                <span>
                  Total: R$ {todayOrders.reduce((sum, o) => sum + (o.total_value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {todayOrders
                .sort((a, b) => (a.delivery_time || '').localeCompare(b.delivery_time || ''))
                .map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
            </>
          )}
        </div>
      ) : view === 'week' ? (
        /* Week View */
        <div className="grid grid-cols-1 gap-4">
          {weekDays.map(day => {
            const dayOrders = getOrdersForDate(day);
            const dayHoliday = getHolidayName(day);
            const isToday = isSameDay(day, new Date());
            const isPeakDay = isWeekend(day) || isHoliday(day);
            
            return (
              <Card 
                key={day.toISOString()} 
                className={`p-4 ${isToday ? 'ring-2 ring-rose-300 bg-rose-50/30' : ''} ${
                  isPeakDay ? 'border-l-4 border-l-amber-400' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isToday ? 'text-rose-600' : 'text-gray-900'}`}>
                      {format(day, 'EEE, d MMM', { locale: ptBR })}
                    </span>
                    {dayHoliday && (
                      <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
                        🎉 {dayHoliday}
                      </span>
                    )}
                    {dayOrders.length >= 5 && (
                      <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        Pico
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {dayOrders.length} pedido{dayOrders.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {dayOrders.length > 0 ? (
                  <div className="space-y-2">
                    {dayOrders
                      .sort((a, b) => (a.delivery_time || '').localeCompare(b.delivery_time || ''))
                      .slice(0, 3)
                      .map(order => (
                        <OrderCard key={order.id} order={order} compact />
                      ))}
                    {dayOrders.length > 3 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        +{dayOrders.length - 3} pedido{dayOrders.length - 3 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">Sem pedidos</p>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* Month View */
        <div className="space-y-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const monthStart = startOfMonth(currentDate);
              const monthEnd = endOfMonth(currentDate);
              const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
              const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
              
              const days = [];
              let day = calendarStart;
              
              while (day <= calendarEnd) {
                days.push(day);
                day = addDays(day, 1);
              }
              
              return days.map(day => {
                const dayOrders = getOrdersForDate(day);
                const dayHoliday = getHolidayName(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <Card 
                    key={day.toISOString()} 
                    className={`p-2 min-h-[80px] cursor-pointer hover:shadow-md transition-shadow ${
                      !isCurrentMonth ? 'bg-gray-50 opacity-50' : ''
                    } ${isToday ? 'ring-2 ring-rose-300' : ''} ${
                      dayHoliday ? 'bg-rose-50/50' : ''
                    }`}
                    onClick={() => {
                      setCurrentDate(day);
                      setView('day');
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${
                        isToday ? 'text-rose-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {dayHoliday && (
                        <span className="text-xs">🎉</span>
                      )}
                    </div>
                    
                    {dayOrders.length > 0 && (
                      <div className="space-y-1">
                        {dayOrders.slice(0, 2).map(order => (
                          <div 
                            key={order.id} 
                            className={`text-xs truncate px-1 py-0.5 rounded ${
                              order.status === 'entregue' ? 'bg-green-100 text-green-700' :
                              order.status === 'pronto' ? 'bg-emerald-100 text-emerald-700' :
                              order.status === 'em_producao' ? 'bg-purple-100 text-purple-700' :
                              order.status === 'confirmado' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {order.client_name?.split(' ')[0]}
                          </div>
                        ))}
                        {dayOrders.length > 2 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayOrders.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}