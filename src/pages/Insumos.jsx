// UC03 – Manter Insumos (RN01: custo por unidade base)
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, ShoppingCart, Pencil, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import EstadoVazio from '@/components/comum/EstadoVazio';
import ConfirmarExclusao from '@/components/comum/ConfirmarExclusao';
import BotoesFormulario from '@/components/comum/BotoesFormulario';
import { insumoServico, UNIDADES, dadosDaUnidade, calcularCustoPorUnidade } from '@/servicos/insumoServico';
import { useAcao } from '@/hooks/useAcao';
import { toast } from '@/components/ui/use-toast';
import { moeda, moedaDetalhada, numero } from '@/lib/formatacao';

const FORMULARIO_VAZIO = { nome: '', unidade: 'g', qtd_embalagem: '', preco: '', fornecedor: '', observacoes: '' };

function CustoUnitario({ custo, unidade }) {
  const { base } = dadosDaUnidade(unidade);
  const porMil = base === 'un' ? null : `${moeda(custo * 1000)}/${base === 'g' ? 'kg' : 'L'}`;
  return (
    <span>
      {moedaDetalhada(custo)}/{base}
      {porMil && <span className="text-gray-500"> ({porMil})</span>}
    </span>
  );
}

export default function Insumos() {
  const [busca, setBusca] = useState('');
  const [formulario, setFormulario] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const { data: insumos = [], isLoading } = useQuery({ queryKey: ['insumos'], queryFn: insumoServico.listar });

  const salvar = useAcao((dados) => insumoServico.salvar(dados), {
    invalidar: ['insumos', 'produtos'],
    mensagemSucesso: 'Insumo salvo.',
    aoConcluir: (insumo) => {
      setFormulario(null);
      if (insumo.produtosAtualizados > 0) {
        toast({ title: `Custo recalculado em ${insumo.produtosAtualizados} produto(s).` });
      }
    },
  });
  const excluir = useAcao((id) => insumoServico.excluir(id), {
    invalidar: ['insumos'], mensagemSucesso: 'Insumo excluído.', aoConcluir: () => setExcluindo(null),
  });

  const previa = useMemo(() => {
    if (!formulario) return null;
    const qtd = Number(String(formulario.qtd_embalagem).replace(',', '.'));
    const preco = Number(String(formulario.preco).replace(',', '.'));
    if (!(qtd > 0) || !(preco >= 0) || formulario.preco === '') return null;
    return calcularCustoPorUnidade(preco, qtd, formulario.unidade);
  }, [formulario]);

  const termo = busca.trim().toLowerCase();
  const filtrados = insumos.filter((i) =>
    i.nome.toLowerCase().includes(termo) || (i.fornecedor ?? '').toLowerCase().includes(termo));

  const alterarCampo = (campo) => (e) => setFormulario({ ...formulario, [campo]: e.target.value });

  if (isLoading) return <Carregando />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CabecalhoPagina titulo="Insumos" subtitulo={`${insumos.length} insumo(s) cadastrado(s)`}>
        <Button onClick={() => setFormulario(FORMULARIO_VAZIO)} className="h-11 bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4 mr-2" /> Novo insumo
        </Button>
      </CabecalhoPagina>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden="true" />
        <Input aria-label="Buscar insumo" placeholder="Buscar por nome ou fornecedor..." value={busca}
          onChange={(e) => setBusca(e.target.value)} className="pl-10 h-11" />
      </div>

      {filtrados.length === 0 ? (
        <EstadoVazio icone={ShoppingCart}
          titulo={busca ? 'Nenhum insumo encontrado' : 'Nenhum insumo cadastrado'}
          descricao={busca ? 'Tente buscar por outro termo.' : 'Cadastre os insumos com o preço pago para calcular os custos.'}
          rotuloAcao={!busca ? 'Novo insumo' : undefined} aoAgir={() => setFormulario(FORMULARIO_VAZIO)} />
      ) : (
        <ul className="grid gap-3">
          {filtrados.map((insumo) => (
            <li key={insumo.id}>
              <Card className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900">{insumo.nome}</h2>
                  <p className="text-sm text-gray-600">
                    {moeda(insumo.preco)} por {numero(insumo.qtd_embalagem, 3)} {insumo.unidade}
                  </p>
                  <p className="text-sm text-rose-700 font-medium">
                    <CustoUnitario custo={insumo.custo_por_unidade} unidade={insumo.unidade} />
                  </p>
                  {insumo.fornecedor && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Building2 className="w-4 h-4" aria-hidden="true" /> {insumo.fornecedor}
                    </p>
                  )}
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Editar ${insumo.nome}`}
                    onClick={() => setFormulario({
                      ...insumo,
                      qtd_embalagem: String(insumo.qtd_embalagem),
                      preco: String(insumo.preco),
                      fornecedor: insumo.fornecedor ?? '',
                      observacoes: insumo.observacoes ?? '',
                    })}>
                    <Pencil className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Excluir ${insumo.nome}`}
                    onClick={() => setExcluindo(insumo)}>
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
            <DialogTitle>{formulario?.id ? 'Editar insumo' : 'Novo insumo'}</DialogTitle>
          </DialogHeader>
          {formulario && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvar.mutate(formulario); }}>
              <div>
                <Label htmlFor="nome-insumo">Nome *</Label>
                <Input id="nome-insumo" value={formulario.nome} onChange={alterarCampo('nome')} required maxLength={80}
                  placeholder="Ex.: Leite condensado" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="qtd">Quantidade comprada *</Label>
                  <Input id="qtd" inputMode="decimal" value={formulario.qtd_embalagem} onChange={alterarCampo('qtd_embalagem')}
                    required placeholder="Ex.: 395" />
                </div>
                <div>
                  <Label htmlFor="unidade">Unidade *</Label>
                  <Select value={formulario.unidade} onValueChange={(unidade) => setFormulario({ ...formulario, unidade })}>
                    <SelectTrigger id="unidade" className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map((u) => <SelectItem key={u.valor} value={u.valor}>{u.rotulo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="preco">Preço pago (R$) *</Label>
                <Input id="preco" inputMode="decimal" value={formulario.preco} onChange={alterarCampo('preco')} required
                  placeholder="Ex.: 7,50" />
                {previa !== null && (
                  <p className="text-sm text-rose-700 mt-1" aria-live="polite">
                    Custo: <CustoUnitario custo={previa} unidade={formulario.unidade} />
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input id="fornecedor" value={formulario.fornecedor} onChange={alterarCampo('fornecedor')} />
              </div>
              <div>
                <Label htmlFor="obs-insumo">Observações</Label>
                <Textarea id="obs-insumo" rows={2} value={formulario.observacoes} onChange={alterarCampo('observacoes')} />
              </div>
              <BotoesFormulario salvando={salvar.isPending} aoCancelar={() => setFormulario(null)} />
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmarExclusao
        aberto={!!excluindo}
        titulo={`Excluir ${excluindo?.nome ?? 'insumo'}?`}
        descricao="Insumos usados em fichas técnicas não podem ser excluídos."
        aoConfirmar={() => excluir.mutate(excluindo.id)}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
