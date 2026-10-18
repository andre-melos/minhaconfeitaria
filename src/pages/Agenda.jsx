// UC11 – Consultar Agenda (dia, semana e mês), com datas festivas e fins de semana destacados (RN17)
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isWeekend, startOfMonth, startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, PartyPopper, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Segmentado from '@/components/comum/Segmentado';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Carregando from '@/components/comum/Carregando';
import EstadoVazio from '@/components/comum/EstadoVazio';
import CartaoPedido from '@/components/pedidos/CartaoPedido';
import { pedidoServico } from '@/servicos/pedidoServico';
import { dataFestivaServico, encontrarDataFestiva } from '@/servicos/dataFestivaServico';
import { STATUS_PEDIDO } from '@/servicos/regrasPedido';
import { moeda } from '@/lib/formatacao';

const iso = (d) => format(d, 'yyyy-MM-dd');
const OPCOES_SEMANA = { weekStartsOn: 0, locale: ptBR };

function periodo(visao, data) {
  if (visao === 'dia') return [data, data];
  if (visao === 'semana') return [startOfWeek(data, OPCOES_SEMANA), endOfWeek(data, OPCOES_SEMANA)];
  return [startOfWeek(startOfMonth(data), OPCOES_SEMANA), endOfWeek(endOfMonth(data), OPCOES_SEMANA)];
}

export default function Agenda() {
  const [visao, setVisao] = useState('semana');
  const [data, setData] = useState(new Date());
  const [status, setStatus] = useState('todos');
  const [inicio, fim] = periodo(visao, data);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos', 'agenda', iso(inicio), iso(fim)],
    queryFn: () => pedidoServico.listar({ inicio: iso(inicio), fim: iso(fim) }),
  });
  const { data: datasFestivas = [] } = useQuery({ queryKey: ['datas-festivas'], queryFn: dataFestivaServico.listar });

  const doDia = useMemo(() => {
    const visiveis = pedidos.filter((p) => (status === 'todos' ? p.status !== 'cancelado' : p.status === status));
    return (dia) => visiveis.filter((p) => p.data_entrega === iso(dia));
  }, [pedidos, status]);

  const mover = (sentido) => setData((d) => (visao === 'dia' ? addDays(d, sentido) : visao === 'semana' ? addWeeks(d, sentido) : addMonths(d, sentido)));
  const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const titulo = visao === 'dia'
    ? format(data, "EEEE, dd 'de' MMMM", { locale: ptBR })
    : visao === 'semana' ? `${format(inicio, 'dd MMM', { locale: ptBR })} – ${format(fim, 'dd MMM', { locale: ptBR })}`
      : format(data, 'MMMM yyyy', { locale: ptBR });
  const dias = [];
  for (let d = inicio; d <= fim; d = addDays(d, 1)) dias.push(d);

  const Festiva = ({ dia }) => {
    const festa = encontrarDataFestiva(datasFestivas, iso(dia));
    return festa ? <span className="text-xs text-rose-800 flex items-center gap-1"><PartyPopper className="w-3 h-3" aria-hidden="true" />{festa.nome}</span> : null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600">Pedidos por data de entrega</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Segmentado rotulo="Visualização" valor={visao} aoMudar={setVisao}
            opcoes={[{ valor: 'dia', rotulo: 'Dia' }, { valor: 'semana', rotulo: 'Semana' }, { valor: 'mes', rotulo: 'Mês' }]} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48 h-10" aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos (exceto cancelados)</SelectItem>
              {Object.entries(STATUS_PEDIDO).map(([v, r]) => <SelectItem key={v} value={v}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => mover(-1)} aria-label="Anterior"><ChevronLeft /></Button>
        <div className="text-center">
          <p className="font-semibold">{maiuscula(titulo)}</p>
          <Button variant="link" className="h-7 text-rose-700" onClick={() => setData(new Date())}>Hoje</Button>
        </div>
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => mover(1)} aria-label="Próximo"><ChevronRight /></Button>
      </Card>

      {isLoading ? <Carregando /> : (
        <>
          {visao === 'dia' && (
            <section className="space-y-3">
              <Festiva dia={data} />
              {doDia(data).length === 0 ? (
                <EstadoVazio icone={CalendarDays} titulo="Nenhum pedido neste dia" descricao="Os pedidos aparecem aqui pela data de entrega."
                  rotuloAcao="Novo pedido" rotaAcao="/pedidos/novo" />
              ) : (
                <ul className="grid gap-3">{doDia(data).map((p) => <li key={p.id}><CartaoPedido pedido={p} /></li>)}</ul>
              )}
            </section>
          )}

          {visao === 'semana' && (
            <ul className="grid gap-3">
              {dias.map((dia) => {
                const lista = doDia(dia);
                const festa = encontrarDataFestiva(datasFestivas, iso(dia));
                const pico = festa || isWeekend(dia);
                return (
                  <li key={iso(dia)}>
                    <Card className={`p-4 ${isSameDay(dia, new Date()) ? 'ring-2 ring-rose-400' : ''} ${pico ? 'bg-rose-50/40' : ''}`}>
                      <div className="flex justify-between items-center mb-2">
                        <button type="button" className="font-medium text-left hover:underline"
                          onClick={() => { setData(dia); setVisao('dia'); }}>
                          {maiuscula(format(dia, "EEEE, dd 'de' MMM", { locale: ptBR }))}
                        </button>
                        <span className="text-sm text-gray-600">
                          {lista.length} pedido(s){lista.length > 0 && ` · ${moeda(lista.reduce((s, p) => s + p.valor_total, 0))}`}
                        </span>
                      </div>
                      <Festiva dia={dia} />
                      {lista.length > 0 && <ul className="grid gap-2 mt-2">{lista.map((p) => <li key={p.id}><CartaoPedido pedido={p} /></li>)}</ul>}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}

          {visao === 'mes' && (
            <Card className="p-2 sm:p-4">
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-600 mb-1" aria-hidden="true">
                {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {dias.map((dia) => {
                  const lista = doDia(dia);
                  const festa = encontrarDataFestiva(datasFestivas, iso(dia));
                  return (
                    <button key={iso(dia)} type="button" onClick={() => { setData(dia); setVisao('dia'); }}
                      aria-label={`${format(dia, "dd 'de' MMMM", { locale: ptBR })}: ${lista.length} pedido(s)${festa ? `, ${festa.nome}` : ''}`}
                      className={`min-h-[64px] rounded-lg border p-1 text-left text-xs ${!isSameMonth(dia, data) ? 'bg-gray-50 text-gray-500'
                        : festa ? 'border-rose-300 bg-rose-50' : isWeekend(dia) ? 'bg-amber-50' : 'bg-white'} ${isSameDay(dia, new Date()) ? 'ring-2 ring-rose-500' : ''}`}>
                      <span className="font-semibold">{format(dia, 'd')}</span>
                      {festa && <span className="block truncate text-rose-800" aria-hidden="true">🎉 {festa.nome}</span>}
                      {lista.length > 0 && <span className="block mt-1 rounded bg-rose-600 text-white px-1">{lista.length} ped.</span>}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      <Button asChild size="lg" className="lg:hidden fixed bottom-6 right-6 z-30 h-14 w-14 rounded-2xl bg-rose-600 hover:bg-rose-700 shadow-xl">
        <Link to="/pedidos/novo" aria-label="Novo pedido"><Plus className="w-6 h-6" /></Link>
      </Button>
    </div>
  );
}
