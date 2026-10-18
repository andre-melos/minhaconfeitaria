// UC07 – Manter Embalagens (a configuração por produto fica na Calculadora de Embalagens)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, PackageOpen, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import EstadoVazio from '@/components/comum/EstadoVazio';
import ConfirmarExclusao from '@/components/comum/ConfirmarExclusao';
import BotoesFormulario from '@/components/comum/BotoesFormulario';
import { embalagemServico } from '@/servicos/embalagemServico';
import { useAcao } from '@/hooks/useAcao';

const FORMULARIO_VAZIO = { nome: '', descricao: '', ativa: true };

export default function Embalagens() {
  const [formulario, setFormulario] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const { data: embalagens = [], isLoading } = useQuery({ queryKey: ['embalagens'], queryFn: embalagemServico.listar });

  const salvar = useAcao((dados) => embalagemServico.salvar(dados), {
    invalidar: ['embalagens'], mensagemSucesso: 'Embalagem salva.', aoConcluir: () => setFormulario(null),
  });
  const excluir = useAcao((id) => embalagemServico.excluir(id), {
    invalidar: ['embalagens'], mensagemSucesso: 'Embalagem excluída.', aoConcluir: () => setExcluindo(null),
  });

  if (isLoading) return <Carregando />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <CabecalhoPagina titulo="Embalagens" subtitulo="Forminhas, caixas, sacos, fitas e outros materiais">
        <Button onClick={() => setFormulario(FORMULARIO_VAZIO)} className="h-11 bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4 mr-2" /> Nova embalagem
        </Button>
      </CabecalhoPagina>

      <p className="text-sm text-gray-600">
        Para definir quais embalagens cada produto usa, acesse a{' '}
        <Link to="/calculadora-embalagens" className="text-rose-700 underline">Calculadora de Embalagens</Link>.
      </p>

      {embalagens.length === 0 ? (
        <EstadoVazio icone={PackageOpen} titulo="Nenhuma embalagem" descricao="Cadastre as embalagens que você usa."
          rotuloAcao="Nova embalagem" aoAgir={() => setFormulario(FORMULARIO_VAZIO)} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {embalagens.map((embalagem) => (
            <li key={embalagem.id}>
              <Card className={`p-4 flex items-start justify-between gap-3 ${embalagem.ativa ? '' : 'opacity-70'}`}>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900">
                    {embalagem.nome}
                    {!embalagem.ativa && <Badge variant="outline" className="ml-2">Inativa</Badge>}
                  </h2>
                  {embalagem.descricao && <p className="text-sm text-gray-600">{embalagem.descricao}</p>}
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Editar ${embalagem.nome}`}
                    onClick={() => setFormulario({ ...embalagem, descricao: embalagem.descricao ?? '' })}>
                    <Pencil className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Excluir ${embalagem.nome}`}
                    onClick={() => setExcluindo(embalagem)}>
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
            <DialogTitle>{formulario?.id ? 'Editar embalagem' : 'Nova embalagem'}</DialogTitle>
          </DialogHeader>
          {formulario && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvar.mutate(formulario); }}>
              <div>
                <Label htmlFor="nome-embalagem">Nome *</Label>
                <Input id="nome-embalagem" value={formulario.nome} required maxLength={80} placeholder="Ex.: Forminha nº 4"
                  onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="descricao-embalagem">Descrição</Label>
                <Input id="descricao-embalagem" value={formulario.descricao}
                  onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="embalagem-ativa">Embalagem ativa</Label>
                <Switch id="embalagem-ativa" checked={formulario.ativa}
                  onCheckedChange={(ativa) => setFormulario({ ...formulario, ativa })} />
              </div>
              <BotoesFormulario salvando={salvar.isPending} aoCancelar={() => setFormulario(null)} />
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmarExclusao
        aberto={!!excluindo}
        titulo={`Excluir ${excluindo?.nome ?? 'embalagem'}?`}
        descricao="Embalagens configuradas em produtos não podem ser excluídas; nesse caso, inative-as."
        aoConfirmar={() => excluir.mutate(excluindo.id)}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
