// Lista de pedidos (UC10)
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, ShoppingBag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Segmentado from '@/components/comum/Segmentado';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import EstadoVazio from '@/components/comum/EstadoVazio';
import CartaoPedido from '@/components/pedidos/CartaoPedido';
import { pedidoServico } from '@/servicos/pedidoServico';
import { estaEmAndamento } from '@/servicos/regrasPedido';

const FILTROS = {
  ativos: { rotulo: 'Em andamento', teste: (p) => estaEmAndamento(p.status) },
  nao_pagos: { rotulo: 'Não pagos', teste: (p) => p.status === 'entregue_nao_pago' },
  entregues: { rotulo: 'Entregues', teste: (p) => p.status === 'entregue' },
  cancelados: { rotulo: 'Cancelados', teste: (p) => p.status === 'cancelado' },
  todos: { rotulo: 'Todos', teste: () => true },
};

const POR_PAGINA = 50;

const ORDENS = {
  proximas: { rotulo: 'Entrega (mais próximas)', comparar: (a, b) => (a.data_entrega + (a.hora_entrega ?? '')).localeCompare(b.data_entrega + (b.hora_entrega ?? '')) },
  recentes: { rotulo: 'Entrega (mais recentes)', comparar: (a, b) => b.data_entrega.localeCompare(a.data_entrega) },
  valor: { rotulo: 'Maior valor', comparar: (a, b) => b.valor_total - a.valor_total },
};

export default function Pedidos() {
  const [parametros, setParametros] = useSearchParams();
  const clienteId = parametros.get('cliente') || undefined;
  const [filtro, setFiltro] = useState('ativos');
  const [ordem, setOrdem] = useState('proximas');
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(POR_PAGINA);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos', { clienteId }],
    queryFn: () => pedidoServico.listar({ clienteId }),
  });

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos
      .filter(FILTROS[filtro].teste)
      .filter((p) => !termo || p.cliente_nome.toLowerCase().includes(termo) || p.cliente_telefone.includes(termo))
      .sort(ORDENS[ordem].comparar);
  }, [pedidos, filtro, ordem, busca]);

  if (isLoading) return <Carregando />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CabecalhoPagina titulo="Pedidos" subtitulo={`${pedidos.length} pedido(s)`}>
        <Button asChild className="h-11 bg-rose-600 hover:bg-rose-700">
          <Link to="/pedidos/novo"><Plus className="w-4 h-4 mr-2" /> Novo pedido</Link>
        </Button>
      </CabecalhoPagina>

      {clienteId && (
        <div className="flex items-center gap-2 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          <span>Mostrando os pedidos de <strong>{pedidos[0]?.cliente_nome ?? 'um cliente'}</strong>.</span>
          <Button variant="ghost" size="sm" className="ml-auto h-9" onClick={() => setParametros({})}>
            <X className="w-4 h-4 mr-1" /> Ver todos
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <Segmentado rotulo="Filtrar pedidos" valor={filtro} aoMudar={setFiltro} colunas="w-full grid grid-cols-2 sm:grid-cols-5"
          opcoes={Object.entries(FILTROS).map(([chave, f]) => ({ valor: chave, rotulo: `${f.rotulo} (${pedidos.filter(f.teste).length})` }))} />
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden="true" />
            <Input aria-label="Buscar por cliente" placeholder="Buscar por cliente ou telefone..." value={busca}
              onChange={(e) => setBusca(e.target.value)} className="pl-10 h-11" />
          </div>
          <Select value={ordem} onValueChange={setOrdem}>
            <SelectTrigger className="sm:w-56 h-11" aria-label="Ordenar"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ORDENS).map(([chave, o]) => <SelectItem key={chave} value={chave}>{o.rotulo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <EstadoVazio icone={ShoppingBag} titulo="Nenhum pedido encontrado"
          descricao={pedidos.length === 0 ? 'Registre o primeiro pedido.' : 'Mude o filtro ou a busca.'}
          rotuloAcao={pedidos.length === 0 ? 'Novo pedido' : undefined} rotaAcao="/pedidos/novo" />
      ) : (
        <>
          <ul className="grid gap-3">
            {visiveis.slice(0, limite).map((p) => <li key={p.id}><CartaoPedido pedido={p} mostrarData /></li>)}
          </ul>
          {visiveis.length > limite && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setLimite(limite + POR_PAGINA)}>
                Mostrar mais ({visiveis.length - limite} restantes)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
