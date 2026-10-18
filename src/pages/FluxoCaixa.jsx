// UC16 – Registrar Despesas e Consultar Fluxo de Caixa (RN16)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import ConfirmarExclusao from '@/components/comum/ConfirmarExclusao';
import BotoesFormulario from '@/components/comum/BotoesFormulario';
import { financeiroServico, CATEGORIAS_DESPESA, FORMAS_DESPESA } from '@/servicos/financeiroServico';
import { FORMAS_PAGAMENTO } from '@/servicos/regrasPedido';
import { useAcao } from '@/hooks/useAcao';
import { moeda } from '@/lib/formatacao';

const iso = (d) => format(d, 'yyyy-MM-dd');
const dataCurta = (d) => format(parseISO(d), 'dd/MM');

export default function FluxoCaixa() {
  const [mes, setMes] = useState(startOfMonth(new Date()));
  const [formulario, setFormulario] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const inicio = iso(startOfMonth(mes));
  const fim = iso(endOfMonth(mes));

  const { data: fluxo, isLoading } = useQuery({ queryKey: ['fluxo-caixa', inicio, fim], queryFn: () => financeiroServico.fluxoCaixa(inicio, fim) });
  const salvar = useAcao((d) => financeiroServico.salvarDespesa(d), {
    invalidar: ['fluxo-caixa'], mensagemSucesso: 'Despesa salva.', aoConcluir: () => setFormulario(null),
  });
  const excluir = useAcao((id) => financeiroServico.excluirDespesa(id), {
    invalidar: ['fluxo-caixa'], mensagemSucesso: 'Despesa excluída.', aoConcluir: () => setExcluindo(null),
  });
  const nova = () => setFormulario({ descricao: '', categoria: 'insumos', valor: '', data: iso(new Date()), forma_pagamento: 'pix', observacoes: '' });
  const titulo = format(mes, 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <CabecalhoPagina titulo="Fluxo de caixa" subtitulo="Entradas (pagamentos recebidos) e saídas (despesas)">
        <Button className="h-11 bg-rose-600 hover:bg-rose-700" onClick={nova}><Plus className="w-4 h-4 mr-2" /> Nova despesa</Button>
      </CabecalhoPagina>

      <Card className="p-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Mês anterior" onClick={() => setMes(addMonths(mes, -1))}><ChevronLeft /></Button>
        <p className="font-semibold">{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</p>
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Próximo mês" onClick={() => setMes(addMonths(mes, 1))}><ChevronRight /></Button>
      </Card>

      {isLoading || !fluxo ? <Carregando /> : (
        <>
          <div className="grid grid-cols-3 gap-3" aria-live="polite">
            <Card className="p-4"><p className="text-sm text-gray-600">Entradas</p><p className="text-xl sm:text-2xl font-bold text-green-800">{moeda(fluxo.entradas)}</p></Card>
            <Card className="p-4"><p className="text-sm text-gray-600">Saídas</p><p className="text-xl sm:text-2xl font-bold text-red-700">{moeda(fluxo.saidas)}</p></Card>
            <Card className="p-4"><p className="text-sm text-gray-600">Saldo</p><p className={`text-xl sm:text-2xl font-bold ${fluxo.saldo < 0 ? 'text-red-700' : 'text-gray-900'}`}>{moeda(fluxo.saldo)}</p></Card>
          </div>
          {fluxo.aReceber.total > 0 && (
            <p className="text-sm text-orange-900 bg-orange-50 border border-orange-200 rounded-lg p-3">
              A receber de {fluxo.aReceber.pedidos} pedido(s): <strong>{moeda(fluxo.aReceber.total)}</strong>.{' '}
              <Link to="/pedidos" className="underline">Ver pedidos</Link>
            </p>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-4 space-y-2">
              <h2 className="font-semibold flex items-center gap-2"><ArrowDownCircle className="w-5 h-5 text-green-700" aria-hidden="true" /> Entradas</h2>
              {fluxo.pagamentos.length === 0 ? <p className="text-sm text-gray-600">Nenhum pagamento recebido no mês.</p> : (
                <ul className="text-sm divide-y">
                  {fluxo.pagamentos.map((p) => (
                    <li key={p.id} className="py-2 flex justify-between gap-2">
                      <Link to={`/pedidos/${p.pedido_id}`} className="hover:underline">{dataCurta(p.data)} · {p.cliente_nome} · {FORMAS_PAGAMENTO[p.forma]}</Link>
                      <span className="font-medium text-green-800">{moeda(p.valor)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-4 space-y-2">
              <h2 className="font-semibold flex items-center gap-2"><ArrowUpCircle className="w-5 h-5 text-red-700" aria-hidden="true" /> Saídas</h2>
              {fluxo.porCategoria.length > 0 && (
                <ul className="text-sm flex flex-wrap gap-2" aria-label="Despesas por categoria">
                  {fluxo.porCategoria.map((c) => <li key={c.categoria} className="bg-gray-100 rounded-full px-3 py-1">{c.nome}: {moeda(c.valor)}</li>)}
                </ul>
              )}
              {fluxo.despesas.length === 0 ? <p className="text-sm text-gray-600">Nenhuma despesa no mês.</p> : (
                <ul className="text-sm divide-y">
                  {fluxo.despesas.map((d) => (
                    <li key={d.id} className="py-1 flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate">{dataCurta(d.data)} · {d.descricao}</span>
                        <span className="text-xs text-gray-600">{CATEGORIAS_DESPESA[d.categoria]}{d.forma_pagamento && ` · ${FORMAS_DESPESA[d.forma_pagamento]}`}</span>
                      </span>
                      <span className="flex items-center shrink-0">
                        <span className="font-medium text-red-700 mr-1">{moeda(d.valor)}</span>
                        <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`Editar ${d.descricao}`}
                          onClick={() => setFormulario({ ...d, valor: String(d.valor).replace('.', ','), forma_pagamento: d.forma_pagamento ?? 'pix', observacoes: d.observacoes ?? '' })}>
                          <Pencil className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`Excluir ${d.descricao}`} onClick={() => setExcluindo(d)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      <Dialog open={!!formulario} onOpenChange={(a) => !a && setFormulario(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{formulario?.id ? 'Editar despesa' : 'Nova despesa'}</DialogTitle></DialogHeader>
          {formulario && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvar.mutate(formulario); }}>
              <div>
                <Label htmlFor="descricao-despesa">Descrição *</Label>
                <Input id="descricao-despesa" value={formulario.descricao} required maxLength={100}
                  onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="valor-despesa">Valor (R$) *</Label>
                  <Input id="valor-despesa" inputMode="decimal" value={formulario.valor} required
                    onChange={(e) => setFormulario({ ...formulario, valor: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="data-despesa">Data *</Label>
                  <Input id="data-despesa" type="date" value={formulario.data} required
                    onChange={(e) => setFormulario({ ...formulario, data: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="categoria-despesa">Categoria</Label>
                  <Select value={formulario.categoria} onValueChange={(categoria) => setFormulario({ ...formulario, categoria })}>
                    <SelectTrigger id="categoria-despesa" className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CATEGORIAS_DESPESA).map(([v, r]) => <SelectItem key={v} value={v}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="forma-despesa">Pagamento</Label>
                  <Select value={formulario.forma_pagamento} onValueChange={(forma_pagamento) => setFormulario({ ...formulario, forma_pagamento })}>
                    <SelectTrigger id="forma-despesa" className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(FORMAS_DESPESA).map(([v, r]) => <SelectItem key={v} value={v}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="obs-despesa">Observações</Label>
                <Textarea id="obs-despesa" rows={2} value={formulario.observacoes}
                  onChange={(e) => setFormulario({ ...formulario, observacoes: e.target.value })} />
              </div>
              <BotoesFormulario salvando={salvar.isPending} aoCancelar={() => setFormulario(null)} />
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmarExclusao aberto={!!excluindo} titulo={`Excluir a despesa "${excluindo?.descricao ?? ''}"?`}
        aoConfirmar={() => excluir.mutate(excluindo.id)} aoCancelar={() => setExcluindo(null)} />
    </div>
  );
}
