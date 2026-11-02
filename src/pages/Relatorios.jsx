// UC15 – Gerar Relatório de Vendas (RN15): faturamento, custo, lucro, categorias e produtos mais vendidos
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Segmentado from '@/components/comum/Segmentado';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import EstadoVazio from '@/components/comum/EstadoVazio';
import { financeiroServico } from '@/servicos/financeiroServico';
import { categoriaServico } from '@/servicos/categoriaServico';
import { moeda, numero } from '@/lib/formatacao';

const iso = (d) => format(d, 'yyyy-MM-dd');
const COR_BARRA = '#e11d48'; // rose-600: série única, identificada pelo título do gráfico

function Indicador({ rotulo, valor, detalhe, destaque }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-gray-600">{rotulo}</p>
      <p className={`text-2xl font-bold ${destaque ?? 'text-gray-900'}`}>{valor}</p>
      {detalhe && <p className="text-xs text-gray-600">{detalhe}</p>}
    </Card>
  );
}

function DicaGrafico({ active, payload }) {
  if (!active || !payload?.length) return null;
  const c = payload[0].payload;
  return (
    <div className="rounded-lg border bg-white p-2 text-sm shadow">
      <p className="font-medium">{c.emoji} {c.nome}</p>
      <p>Vendas: {moeda(c.valor)}</p>
      <p>Lucro: {moeda(c.lucro)}</p>
    </div>
  );
}

export default function Relatorios() {
  const hoje = new Date();
  const [periodo, setPeriodo] = useState({ inicio: iso(startOfMonth(hoje)), fim: iso(endOfMonth(hoje)) });
  const [categoria, setCategoria] = useState('todas');
  const [ordem, setOrdem] = useState('quantidade');

  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: categoriaServico.listar });
  const { data: rel, isLoading, error } = useQuery({
    queryKey: ['relatorio-vendas', periodo, categoria],
    queryFn: () => financeiroServico.relatorioVendas(periodo.inicio, periodo.fim, categoria === 'todas' ? null : categoria),
    retry: false,
  });

  const atalhos = [
    ['Este mês', startOfMonth(hoje), endOfMonth(hoje)],
    ['Mês passado', startOfMonth(subMonths(hoje, 1)), endOfMonth(subMonths(hoje, 1))],
    ['Últimos 3 meses', startOfMonth(subMonths(hoje, 2)), endOfMonth(hoje)],
  ];
  const produtos = rel ? [...rel.produtos].sort((a, b) => (ordem === 'quantidade' ? b.quantidade - a.quantidade : b.valor - a.valor)) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <CabecalhoPagina titulo="Relatório de vendas" subtitulo="Pedidos prontos ou entregues no período" />

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {atalhos.map(([rotulo, ini, fim]) => (
            <button key={rotulo} type="button" onClick={() => setPeriodo({ inicio: iso(ini), fim: iso(fim) })}
              className={`h-10 px-3 rounded-lg border text-sm ${periodo.inicio === iso(ini) && periodo.fim === iso(fim) ? 'bg-rose-600 text-white border-rose-600' : 'bg-white'}`}>
              {rotulo}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="rel-inicio">De</Label>
            <Input id="rel-inicio" type="date" value={periodo.inicio} onChange={(e) => setPeriodo({ ...periodo, inicio: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="rel-fim">Até</Label>
            <Input id="rel-fim" type="date" value={periodo.fim} onChange={(e) => setPeriodo({ ...periodo, fim: e.target.value })} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="rel-categoria">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger id="rel-categoria" className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.emoji} {c.nome}</SelectItem>)}
                <SelectItem value="sem-categoria">Sem categoria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-red-700" role="alert">{error.message}</p>}
      {isLoading ? <Carregando /> : rel && (
        rel.pedidos === 0 ? (
          <EstadoVazio icone={BarChart3} titulo="Nenhuma venda no período" descricao="O relatório considera pedidos com status Pronto, Entregue ou Entregue (não pago)." />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-live="polite">
              <Indicador rotulo="Faturamento" valor={moeda(rel.faturamento)} detalhe={`${rel.pedidos} pedido(s) · ticket médio ${moeda(rel.ticketMedio)}`} />
              <Indicador rotulo="Custo dos produtos" valor={moeda(rel.custo)} />
              <Indicador rotulo="Lucro" valor={moeda(rel.lucro)} destaque={rel.lucro < 0 ? 'text-red-700' : 'text-green-800'} />
              <Indicador rotulo="Margem" valor={`${numero(rel.margem, 1)}%`} />
            </div>

            <Card className="p-4">
              <h2 className="font-semibold mb-3">Vendas por categoria</h2>
              <div style={{ height: Math.max(120, rel.porCategoria.length * 48) }} aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rel.porCategoria} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tickFormatter={(v) => moeda(v).replace(',00', '')} tick={{ fontSize: 12, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 13, fill: '#111827' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DicaGrafico />} cursor={{ fill: '#fff1f2' }} />
                    <Bar dataKey="valor" fill={COR_BARRA} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full text-sm mt-3 [&_td]:pl-2 [&_th]:pl-2 [&_.text-right]:whitespace-nowrap">
                <caption className="sr-only">Vendas por categoria</caption>
                <thead><tr className="text-left text-gray-600 border-b"><th className="py-2">Categoria</th><th className="text-right">Qtd.</th><th className="text-right">Vendas</th><th className="text-right">Lucro</th></tr></thead>
                <tbody>
                  {rel.porCategoria.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2">{c.emoji} {c.nome}</td><td className="text-right">{numero(c.quantidade)}</td>
                      <td className="text-right">{moeda(c.valor)}</td><td className="text-right">{moeda(c.lucro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h2 className="font-semibold">Produtos mais vendidos</h2>
                <Segmentado rotulo="Ordenar ranking" valor={ordem} aoMudar={setOrdem}
                  opcoes={[{ valor: 'quantidade', rotulo: 'Por quantidade' }, { valor: 'valor', rotulo: 'Por valor' }]} />
              </div>
              <table className="w-full text-sm [&_td]:pl-2 [&_th]:pl-2 [&_.text-right]:whitespace-nowrap">
                <caption className="sr-only">Ranking de produtos</caption>
                <thead><tr className="text-left text-gray-600 border-b"><th className="py-2">#</th><th>Produto</th><th className="text-right">Qtd.</th><th className="text-right">Vendas</th><th className="text-right">Lucro</th></tr></thead>
                <tbody>
                  {produtos.map((p, k) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 text-gray-600">{k + 1}</td><td>{p.nome}</td><td className="text-right">{numero(p.quantidade)}</td>
                      <td className="text-right">{moeda(p.valor)}</td>
                      <td className={`text-right ${p.lucro < 0 ? 'text-red-700' : ''}`}>{moeda(p.lucro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )
      )}
    </div>
  );
}
