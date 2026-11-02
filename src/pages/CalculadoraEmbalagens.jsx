// UC14 – Calcular Embalagens (RN11, RN12). As embalagens de cada produto são definidas no cadastro do produto.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, PackageOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import OrigemQuantidades from '@/components/producao/OrigemQuantidades';
import { producaoServico, calcularEmbalagens } from '@/servicos/producaoServico';
import { numero } from '@/lib/formatacao';

export default function CalculadoraEmbalagens() {
  const [origem, setOrigem] = useState({ modo: 'pedidos', quantidades: {} });
  const { data, isLoading } = useQuery({ queryKey: ['producao'], queryFn: producaoServico.dados });

  const resultado = useMemo(() => data && calcularEmbalagens(origem.quantidades ?? {}, data.embalagens), [data, origem]);

  if (isLoading) return <Carregando />;
  const nome = (id) => data.produtos.find((p) => p.id === id)?.nome ?? 'Produto';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <CabecalhoPagina titulo="Calculadora de embalagens" subtitulo="Quantas embalagens separar ou comprar" />
      <p className="text-sm text-gray-600">
        As embalagens usadas por unidade de cada produto são informadas no <Link to="/produtos" className="underline text-rose-700">cadastro do produto</Link>.
        O cálculo é só de quantidades; o custo das embalagens entra na ficha técnica, como insumo.
      </p>
      <OrigemQuantidades produtos={data.produtos.filter((p) => p.ativo)} aoMudar={setOrigem} />

      {resultado?.semEmbalagem.length > 0 && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>Sem embalagens configuradas: {resultado.semEmbalagem.map(nome).join(', ')}.</span>
        </p>
      )}
      {resultado?.embalagens.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2" aria-live="polite">
          {resultado.embalagens.map((e) => (
            <li key={e.embalagem_id}>
              <Card className="p-4">
                <h2 className="font-semibold flex items-center gap-2"><PackageOpen className="w-5 h-5 text-rose-600" aria-hidden="true" /> {e.nome}</h2>
                <p className="text-3xl font-bold text-rose-700">{e.quantidade_compra} <span className="text-base font-medium">un</span></p>
                {e.quantidade_compra !== e.quantidade && <p className="text-xs text-gray-600">Cálculo exato: {numero(e.quantidade, 2)}</p>}
                <ul className="text-sm text-gray-600 mt-1">
                  {e.produtos.map((p) => <li key={p.produto_id}>• {nome(p.produto_id)}: {numero(p.quantidade, 2)}</li>)}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-gray-600 py-8">
          {origem.modo === 'pedidos' ? 'Nenhum pedido com embalagens configuradas neste período.' : 'Informe as quantidades para calcular.'}
        </p>
      )}
    </div>
  );
}
