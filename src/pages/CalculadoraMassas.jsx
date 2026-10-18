// UC12 – Calcular Massas: por pedidos, manual ou caixa degustação (RN09, RN10, RN12)
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CookingPot, AlertTriangle, Gift } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import EstadoVazio from '@/components/comum/EstadoVazio';
import OrigemQuantidades from '@/components/producao/OrigemQuantidades';
import { producaoServico, calcularMassas, montarCaixaDegustacao, quantidadeLegivel } from '@/servicos/producaoServico';
import { numero } from '@/lib/formatacao';

export default function CalculadoraMassas() {
  const [origem, setOrigem] = useState({ modo: 'pedidos', quantidades: {} });
  const [caixa, setCaixa] = useState({ tamanho: '', caixas: '1', sabores: [] });
  const { data, isLoading } = useQuery({ queryKey: ['producao'], queryFn: producaoServico.dados });

  const resultado = useMemo(() => {
    if (!data) return null;
    try {
      const quantidades = origem.modo === 'caixa'
        ? montarCaixaDegustacao(data.configuracoes, caixa.sabores, caixa.tamanho, caixa.caixas)
        : origem.quantidades;
      return { quantidades, ...calcularMassas(quantidades, data.configuracoes) };
    } catch (erro) {
      return { erro: erro.message };
    }
  }, [data, origem, caixa]);

  if (isLoading) return <Carregando />;
  const nome = (id) => data.produtos.find((p) => p.id === id)?.nome ?? 'Produto';
  const docesConfigurados = data.configuracoes.map((c) => ({ id: c.produto_id, nome: c.produto_nome }));
  const alternarSabor = (id) => setCaixa({ ...caixa, sabores: caixa.sabores.includes(id) ? caixa.sabores.filter((s) => s !== id) : [...caixa.sabores, id] });

  const conteudoCaixa = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="tamanho-caixa">Doces por caixa</Label>
          <Input id="tamanho-caixa" inputMode="numeric" value={caixa.tamanho} onChange={(e) => setCaixa({ ...caixa, tamanho: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="qtd-caixas">Número de caixas</Label>
          <Input id="qtd-caixas" inputMode="numeric" value={caixa.caixas} onChange={(e) => setCaixa({ ...caixa, caixas: e.target.value })} />
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-medium mb-2">Sabores</legend>
        <ul className="grid sm:grid-cols-2 gap-2">
          {docesConfigurados.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <input type="checkbox" id={`sabor-${d.id}`} checked={caixa.sabores.includes(d.id)} onChange={() => alternarSabor(d.id)}
                className="h-5 w-5 accent-rose-600" />
              <Label htmlFor={`sabor-${d.id}`}>{d.nome}</Label>
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <CabecalhoPagina titulo="Calculadora de massas" subtitulo="Quantas receitas de cada massa preparar" />
      {data.configuracoes.length === 0 ? (
        <EstadoVazio icone={CookingPot} titulo="Nenhum doce configurado"
          descricao="Cadastre as massas e a composição dos doces para usar a calculadora." rotuloAcao="Ir para Massas e doces" rotaAcao="/massas" />
      ) : (
        <>
          <OrigemQuantidades produtos={docesConfigurados} aoMudar={setOrigem}
            modosExtras={[{ valor: 'caixa', rotulo: 'Caixa degustação', conteudo: conteudoCaixa }]} />

          {resultado?.erro && origem.modo === 'caixa' && (caixa.tamanho || caixa.sabores.length > 0) && (
            <p className="text-sm text-red-700" role="alert">{resultado.erro}</p>
          )}

          {origem.modo === 'caixa' && resultado?.quantidades && !resultado.erro && (
            <Card className="p-4">
              <h2 className="font-semibold flex items-center gap-2"><Gift className="w-5 h-5 text-rose-600" aria-hidden="true" /> Montagem das caixas</h2>
              <ul className="text-sm mt-2 grid sm:grid-cols-2 gap-1">
                {Object.entries(resultado.quantidades).map(([id, q]) => (
                  <li key={id}>{nome(id)}: <strong>{q}</strong> un ({numero(q / (Number(caixa.caixas) || 1))} por caixa)</li>
                ))}
              </ul>
            </Card>
          )}

          {resultado?.semConfiguracao?.length > 0 && (
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Sem composição de massas (fora do cálculo): {resultado.semConfiguracao.map(nome).join(', ')}.{' '}
                <Link to="/massas" className="underline">Configurar</Link></span>
            </p>
          )}

          {resultado?.massas?.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2" aria-live="polite">
              {resultado.massas.map((m) => (
                <li key={m.massa_id}>
                  <Card className="p-4 space-y-2">
                    <h2 className="font-semibold text-gray-900">{m.nome}</h2>
                    <p className="text-3xl font-bold text-rose-700">{numero(m.receitas, 1)} <span className="text-base font-medium">receita(s)</span></p>
                    <p className="text-sm text-gray-700">
                      Necessário: {quantidadeLegivel(m.gramas, 'g')} ({numero(m.receitas_exatas, 2)} receitas exatas) ·
                      rende {numero(m.rendimento_g, 0)} g por receita
                    </p>
                    <ul className="text-sm text-gray-600">
                      {m.doces.map((d) => <li key={d.produto_id}>• {d.nome}: {numero(d.quantidade)} un = {quantidadeLegivel(d.gramas, 'g')}</li>)}
                    </ul>
                  </Card>
                </li>
              ))}
            </ul>
          ) : !resultado?.erro && (
            <p className="text-center text-gray-600 py-8">
              {origem.modo === 'pedidos' ? 'Nenhum doce configurado nos pedidos deste período.' : 'Informe as quantidades para calcular.'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
