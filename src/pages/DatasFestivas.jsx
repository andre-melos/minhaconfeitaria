// UC08 – Manter Datas Festivas
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Cake, Pencil, Trash2, RotateCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import EstadoVazio from '@/components/comum/EstadoVazio';
import ConfirmarExclusao from '@/components/comum/ConfirmarExclusao';
import BotoesFormulario from '@/components/comum/BotoesFormulario';
import { dataFestivaServico } from '@/servicos/dataFestivaServico';
import { useAcao } from '@/hooks/useAcao';

const FORMULARIO_VAZIO = { nome: '', data_inicio: '', data_fim: '', recorrente: true, observacoes: '' };
const formatarData = (iso, recorrente) =>
  format(parseISO(iso), recorrente ? "dd 'de' MMMM" : "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

export default function DatasFestivas() {
  const [formulario, setFormulario] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const { data: datas = [], isLoading } = useQuery({ queryKey: ['datas-festivas'], queryFn: dataFestivaServico.listar });

  const salvar = useAcao((dados) => dataFestivaServico.salvar(dados), {
    invalidar: ['datas-festivas'], mensagemSucesso: 'Data festiva salva.', aoConcluir: () => setFormulario(null),
  });
  const excluir = useAcao((id) => dataFestivaServico.excluir(id), {
    invalidar: ['datas-festivas'], mensagemSucesso: 'Data festiva excluída.', aoConcluir: () => setExcluindo(null),
  });
  const adicionarPadrao = useAcao(() => dataFestivaServico.adicionarDatasPadrao(), {
    invalidar: ['datas-festivas'], mensagemSucesso: 'Datas comuns adicionadas.',
  });

  const alterarCampo = (campo) => (e) => setFormulario({ ...formulario, [campo]: e.target.value });

  if (isLoading) return <Carregando />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <CabecalhoPagina titulo="Datas festivas" subtitulo="Períodos de maior demanda, destacados na agenda">
        <div className="flex gap-2">
          <Button variant="outline" className="h-11" onClick={() => adicionarPadrao.mutate()} disabled={adicionarPadrao.isPending}>
            <Sparkles className="w-4 h-4 mr-2" /> Datas comuns
          </Button>
          <Button onClick={() => setFormulario(FORMULARIO_VAZIO)} className="h-11 bg-rose-600 hover:bg-rose-700">
            <Plus className="w-4 h-4 mr-2" /> Nova data
          </Button>
        </div>
      </CabecalhoPagina>

      {datas.length === 0 ? (
        <EstadoVazio icone={Cake} titulo="Nenhuma data festiva"
          descricao="Use “Datas comuns” para incluir Páscoa, Dia das Mães, Natal e outras de uma vez."
          rotuloAcao="Incluir datas comuns" aoAgir={() => adicionarPadrao.mutate()} />
      ) : (
        <ul className="grid gap-3">
          {datas.map((data) => (
            <li key={data.id}>
              <Card className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    {data.nome}
                    {data.recorrente && (
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <RotateCw className="w-3 h-3" aria-hidden="true" /> todo ano
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {formatarData(data.data_inicio, data.recorrente)}
                    {data.data_fim && data.data_fim !== data.data_inicio && ` até ${formatarData(data.data_fim, data.recorrente)}`}
                  </p>
                  {data.observacoes && <p className="text-sm text-gray-500 mt-1">{data.observacoes}</p>}
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Editar ${data.nome}`}
                    onClick={() => setFormulario({ ...data, data_fim: data.data_fim ?? '', observacoes: data.observacoes ?? '' })}>
                    <Pencil className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Excluir ${data.nome}`}
                    onClick={() => setExcluindo(data)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!formulario} onOpenChange={(aberto) => !aberto && setFormulario(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{formulario?.id ? 'Editar data festiva' : 'Nova data festiva'}</DialogTitle>
          </DialogHeader>
          {formulario && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvar.mutate(formulario); }}>
              <div>
                <Label htmlFor="nome-data">Nome *</Label>
                <Input id="nome-data" value={formulario.nome} onChange={alterarCampo('nome')} required maxLength={60} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inicio">Início *</Label>
                  <Input id="inicio" type="date" value={formulario.data_inicio} onChange={alterarCampo('data_inicio')} required />
                </div>
                <div>
                  <Label htmlFor="fim">Fim</Label>
                  <Input id="fim" type="date" value={formulario.data_fim} onChange={alterarCampo('data_fim')} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="recorrente">Repete todo ano</Label>
                <Switch id="recorrente" checked={formulario.recorrente}
                  onCheckedChange={(recorrente) => setFormulario({ ...formulario, recorrente })} />
              </div>
              <div>
                <Label htmlFor="obs-data">Observações</Label>
                <Textarea id="obs-data" rows={2} value={formulario.observacoes} onChange={alterarCampo('observacoes')} />
              </div>
              <BotoesFormulario salvando={salvar.isPending} aoCancelar={() => setFormulario(null)} />
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmarExclusao
        aberto={!!excluindo}
        titulo={`Excluir ${excluindo?.nome ?? 'data festiva'}?`}
        aoConfirmar={() => excluir.mutate(excluindo.id)}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
