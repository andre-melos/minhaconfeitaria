// UC13 – Calcular Insumos: total de cada insumo, incluindo os dos componentes (RN11, RN12)
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import OrigemQuantidades from '@/components/producao/OrigemQuantidades';
import { producaoServico, calcularInsumos, quantidadeLegivel } from '@/servicos/producaoServico';
import { numero } from '@/lib/formatacao';

export default function CalculadoraInsumos() {
  const [origem, setOrigem] = useState({ modo: 'pedidos', quantidades: {} });
  const { data, isLoading } = useQuery({ queryKey: ['producao'], queryFn: producaoServico.dados });

  const resultado = useMemo(
    () => data && calcularInsumos(origem.quantidades ?? {}, data.produtos, data.fichas, data.componentes),
    [data, origem]
  );

  if (isLoading) return <Carregando />;
  const nome = (id) => data.produtos.find((p) => p.id === id)?.nome ?? 'Produto';
  const considerados = Object.entries(origem.quantidades ?? {}).filter(([, q]) => q > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <CabecalhoPagina titulo="Calculadora de insumos" subtitulo="Lista de compras para a produção" />
      <OrigemQuantidades produtos={data.produtos.filter((p) => p.ativo)} aoMudar={setOrigem} />

      {considerados.length > 0 && (
        <p className="text-sm text-gray-700">
          Produção considerada: {considerados.map(([id, q]) => `${numero(q)}x ${nome(id)}`).join(', ')}.
        </p>
      )}
      {resultado?.semFicha.length > 0 && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>Sem ficha técnica: {resultado.semFicha.map(nome).join(', ')}. <Link to="/produtos" className="underline">Completar</Link></span>
        </p>
      )}
      {resultado?.insumos.length > 0 ? (
        <Card className="p-4" aria-live="polite">
          <h2 className="font-semibold mb-3">Insumos necessários</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-600 border-b"><th className="py-2">Insumo</th><th className="py-2 text-right">Quantidade</th></tr></thead>
            <tbody>
              {resultado.insumos.map((i) => (
                <tr key={i.insumo_id} className="border-b last:border-0">
                  <td className="py-2">{i.nome}</td>
                  <td className="py-2 text-right font-medium">{quantidadeLegivel(i.quantidade, i.unidade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <p className="text-center text-gray-600 py-8">
          {origem.modo === 'pedidos' ? 'Nenhum pedido com ficha técnica neste período.' : 'Informe as quantidades para calcular.'}
        </p>
      )}
    </div>
  );
}
