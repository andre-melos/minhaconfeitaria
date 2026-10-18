// UC01 – Manter Clientes
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Users, Phone, MapPin, Pencil, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import EstadoVazio from '@/components/comum/EstadoVazio';
import ConfirmarExclusao from '@/components/comum/ConfirmarExclusao';
import BotoesFormulario from '@/components/comum/BotoesFormulario';
import { clienteServico } from '@/servicos/clienteServico';
import { useAcao } from '@/hooks/useAcao';

const FORMULARIO_VAZIO = { nome: '', telefone: '', endereco: '', observacoes: '' };

export default function Clientes() {
  const [busca, setBusca] = useState('');
  const [formulario, setFormulario] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const { data: clientes = [], isLoading } = useQuery({ queryKey: ['clientes'], queryFn: clienteServico.listar });
  const { data: pedidosPorCliente = {} } = useQuery({
    queryKey: ['pedidos-por-cliente'],
    queryFn: () => clienteServico.contarPedidosPorCliente(),
  });

  const salvar = useAcao((dados) => clienteServico.salvar(dados), {
    invalidar: ['clientes'],
    mensagemSucesso: 'Cliente salvo.',
    aoConcluir: () => setFormulario(null),
  });
  const excluir = useAcao((id) => clienteServico.excluir(id), {
    invalidar: ['clientes'],
    mensagemSucesso: 'Cliente excluído.',
    aoConcluir: () => setExcluindo(null),
  });

  const termo = busca.trim().toLowerCase();
  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(termo) || c.telefone.includes(termo));

  const alterarCampo = (campo) => (e) => setFormulario({ ...formulario, [campo]: e.target.value });

  if (isLoading) return <Carregando />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CabecalhoPagina
        titulo="Clientes"
        subtitulo={`${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} cadastrado${clientes.length !== 1 ? 's' : ''}`}
      >
        <Button onClick={() => setFormulario(FORMULARIO_VAZIO)} className="h-11 bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4 mr-2" /> Novo cliente
        </Button>
      </CabecalhoPagina>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden="true" />
        <Input
          aria-label="Buscar cliente"
          placeholder="Buscar por nome ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {filtrados.length === 0 ? (
        <EstadoVazio
          icone={Users}
          titulo={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          descricao={busca ? 'Tente buscar por outro termo.' : 'Cadastre seu primeiro cliente.'}
          rotuloAcao={!busca ? 'Novo cliente' : undefined}
          aoAgir={() => setFormulario(FORMULARIO_VAZIO)}
        />
      ) : (
        <ul className="grid gap-3">
          {filtrados.map((cliente) => (
            <li key={cliente.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{cliente.nome}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                      <a href={`tel:${cliente.telefone}`} className="flex items-center gap-1 hover:text-rose-700">
                        <Phone className="w-4 h-4" aria-hidden="true" /> {cliente.telefone}
                      </a>
                      {cliente.endereco && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" aria-hidden="true" /> {cliente.endereco}
                        </span>
                      )}
                    </div>
                    {cliente.observacoes && <p className="text-sm text-gray-500 mt-2 line-clamp-1">{cliente.observacoes}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button asChild variant="outline" size="sm" className="h-11">
                      <Link to={`/pedidos?cliente=${cliente.id}`} aria-label={`Pedidos de ${cliente.nome}`}>
                        <ShoppingBag className="w-4 h-4 mr-1" aria-hidden="true" /> {pedidosPorCliente[cliente.id] || 0}
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Editar ${cliente.nome}`}
                      onClick={() => setFormulario({ ...cliente, endereco: cliente.endereco ?? '', observacoes: cliente.observacoes ?? '' })}>
                      <Pencil className="w-4 h-4 text-gray-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Excluir ${cliente.nome}`}
                      onClick={() => setExcluindo(cliente)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!formulario} onOpenChange={(aberto) => !aberto && setFormulario(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{formulario?.id ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          </DialogHeader>
          {formulario && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvar.mutate(formulario); }}>
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" value={formulario.nome} onChange={alterarCampo('nome')} required maxLength={100} />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone/WhatsApp *</Label>
                <Input id="telefone" type="tel" inputMode="tel" value={formulario.telefone} onChange={alterarCampo('telefone')}
                  placeholder="(51) 99999-9999" required maxLength={20} />
              </div>
              <div>
                <Label htmlFor="endereco">Endereço de entrega</Label>
                <Input id="endereco" value={formulario.endereco} onChange={alterarCampo('endereco')} />
              </div>
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea id="observacoes" value={formulario.observacoes} onChange={alterarCampo('observacoes')}
                  placeholder="Preferências, alergias etc." rows={2} />
              </div>
              <BotoesFormulario salvando={salvar.isPending} aoCancelar={() => setFormulario(null)} />
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmarExclusao
        aberto={!!excluindo}
        titulo={`Excluir ${excluindo?.nome ?? 'cliente'}?`}
        descricao="O cliente será removido permanentemente. Clientes com pedidos não podem ser excluídos."
        aoConfirmar={() => excluir.mutate(excluindo.id)}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
