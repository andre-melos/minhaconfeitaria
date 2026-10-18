// Define de onde vêm as quantidades usadas nas calculadoras: pedidos de um período (RN12) ou digitação manual.
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Segmentado from '@/components/comum/Segmentado';
import { producaoServico } from '@/servicos/producaoServico';

const iso = (d) => format(d, 'yyyy-MM-dd');

/**
 * @param produtos  produtos que podem ser informados no modo manual
 * @param modosExtras  abas adicionais { valor, rotulo, conteudo } (ex.: caixa degustação)
 * @param aoMudar  recebe { modo, quantidades }
 */
export default function OrigemQuantidades({ produtos, modosExtras = [], aoMudar, children }) {
  const [modo, setModo] = useState('pedidos');
  const [inicio, setInicio] = useState(iso(new Date()));
  const [fim, setFim] = useState(iso(addDays(new Date(), 7)));
  const [manuais, setManuais] = useState({});

  const periodoValido = inicio && fim && fim >= inicio;
  const { data: doPeriodo = {}, isFetching } = useQuery({
    queryKey: ['quantidades-periodo', inicio, fim],
    queryFn: () => producaoServico.quantidadesDoPeriodo(inicio, fim),
    enabled: modo === 'pedidos' && !!periodoValido,
  });

  useEffect(() => {
    if (modo === 'pedidos') aoMudar({ modo, quantidades: periodoValido ? doPeriodo : {}, carregando: isFetching });
    else if (modo === 'manual') {
      const q = Object.fromEntries(Object.entries(manuais).map(([id, v]) => [id, Number(String(v).replace(',', '.')) || 0]).filter(([, v]) => v > 0));
      aoMudar({ modo, quantidades: q });
    } else aoMudar({ modo, quantidades: null });
  }, [modo, doPeriodo, manuais, periodoValido, isFetching]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="p-4 space-y-4">
      <Segmentado rotulo="Origem das quantidades" valor={modo} aoMudar={setModo}
        colunas={`w-full grid ${modosExtras.length ? 'grid-cols-3' : 'grid-cols-2'}`}
        opcoes={[{ valor: 'pedidos', rotulo: 'Pelos pedidos' }, { valor: 'manual', rotulo: 'Manual' }, ...modosExtras]} />

      {modo === 'pedidos' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="periodo-inicio">Entregas de</Label>
              <Input id="periodo-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="periodo-fim">até</Label>
              <Input id="periodo-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>
          {!periodoValido && <p className="text-sm text-red-700" role="alert">A data final não pode ser anterior à inicial.</p>}
          <p className="text-xs text-gray-600">Considera os pedidos não cancelados com entrega no período.</p>
        </div>
      )}

      {modo === 'manual' && (
        produtos.length === 0 ? <p className="text-sm text-gray-600">Nenhum produto disponível.</p> : (
          <ul className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {produtos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <Label htmlFor={`qtd-${p.id}`} className="text-sm flex-1">{p.nome}</Label>
                <Input id={`qtd-${p.id}`} inputMode="decimal" className="w-24 h-10" placeholder="0" value={manuais[p.id] ?? ''}
                  onChange={(e) => setManuais({ ...manuais, [p.id]: e.target.value })} />
              </li>
            ))}
          </ul>
        )
      )}

      {modosExtras.map((m) => (modo === m.valor ? <div key={m.valor}>{m.conteudo}</div> : null))}
      {children}
    </Card>
  );
}
