// UC02 – Manter Categorias
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Tag, Pencil, Trash2 } from 'lucide-react';
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
import { categoriaServico } from '@/servicos/categoriaServico';
import { useAcao } from '@/hooks/useAcao';

const SUGESTOES_EMOJI = ['🎂', '🧁', '🍬', '🍫', '🍪', '🥧', '🍰', '🥟', '🍞', '🎁', '✨', '📦'];
const FORMULARIO_VAZIO = { nome: '', emoji: '🎂', ativa: true };

export default function Categorias() {
  const [formulario, setFormulario] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const { data: categorias = [], isLoading } = useQuery({ queryKey: ['categorias'], queryFn: categoriaServico.listar });
  const { data: produtosPorCategoria = {} } = useQuery({
    queryKey: ['produtos-por-categoria'],
    queryFn: () => categoriaServico.contarProdutosPorCategoria(),
  });

  const salvar = useAcao((dados) => categoriaServico.salvar(dados), {
    invalidar: ['categorias'], mensagemSucesso: 'Categoria salva.', aoConcluir: () => setFormulario(null),
  });
  const excluir = useAcao((id) => categoriaServico.excluir(id), {
    invalidar: ['categorias'], mensagemSucesso: 'Categoria excluída.', aoConcluir: () => setExcluindo(null),
  });

  if (isLoading) return <Carregando />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <CabecalhoPagina titulo="Categorias" subtitulo="Organize seus produtos por tipo">
        <Button onClick={() => setFormulario(FORMULARIO_VAZIO)} className="h-11 bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4 mr-2" /> Nova categoria
        </Button>
      </CabecalhoPagina>

      {categorias.length === 0 ? (
        <EstadoVazio icone={Tag} titulo="Nenhuma categoria" descricao="Crie categorias para organizar os produtos."
          rotuloAcao="Nova categoria" aoAgir={() => setFormulario(FORMULARIO_VAZIO)} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {categorias.map((categoria) => (
            <li key={categoria.id}>
              <Card className={`p-4 flex items-center justify-between gap-3 ${categoria.ativa ? '' : 'opacity-70'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl" aria-hidden="true">{categoria.emoji || '📦'}</span>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{categoria.nome}</h2>
                    <p className="text-sm text-gray-600">
                      {produtosPorCategoria[categoria.id] || 0} produto(s)
                      {!categoria.ativa && <Badge variant="outline" className="ml-2">Inativa</Badge>}
                    </p>
                  </div>
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Editar ${categoria.nome}`}
                    onClick={() => setFormulario({ ...categoria, emoji: categoria.emoji ?? '' })}>
                    <Pencil className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Excluir ${categoria.nome}`}
                    onClick={() => setExcluindo(categoria)}>
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
            <DialogTitle>{formulario?.id ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          </DialogHeader>
          {formulario && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvar.mutate(formulario); }}>
              <div>
                <Label htmlFor="nome-categoria">Nome *</Label>
                <Input id="nome-categoria" value={formulario.nome} maxLength={50} required
                  onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} />
              </div>
              <fieldset>
                <legend className="text-sm font-medium mb-2">Ícone</legend>
                <div className="flex flex-wrap gap-2">
                  {SUGESTOES_EMOJI.map((emoji) => (
                    <button key={emoji} type="button" aria-label={`Ícone ${emoji}`} aria-pressed={formulario.emoji === emoji}
                      onClick={() => setFormulario({ ...formulario, emoji })}
                      className={`w-11 h-11 rounded-lg text-xl border ${formulario.emoji === emoji ? 'border-rose-600 bg-rose-50' : 'border-gray-200'}`}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="flex items-center justify-between">
                <Label htmlFor="ativa">Categoria ativa</Label>
                <Switch id="ativa" checked={formulario.ativa}
                  onCheckedChange={(ativa) => setFormulario({ ...formulario, ativa })} />
              </div>
              <BotoesFormulario salvando={salvar.isPending} aoCancelar={() => setFormulario(null)} />
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmarExclusao
        aberto={!!excluindo}
        titulo={`Excluir ${excluindo?.nome ?? 'categoria'}?`}
        descricao="Categorias com produtos não podem ser excluídas; nesse caso, inative-as."
        aoConfirmar={() => excluir.mutate(excluindo.id)}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
