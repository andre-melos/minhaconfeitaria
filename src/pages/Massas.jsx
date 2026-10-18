// UC06 – Manter Massas e Configuração dos Doces (usadas pela Calculadora de Massas)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, CookingPot, Candy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import EstadoVazio from '@/components/comum/EstadoVazio';
import ConfirmarExclusao from '@/components/comum/ConfirmarExclusao';
import BotoesFormulario from '@/components/comum/BotoesFormulario';
import { massaServico } from '@/servicos/massaServico';
import { produtoServico } from '@/servicos/produtoServico';
import { useAcao } from '@/hooks/useAcao';
import { numero } from '@/lib/formatacao';

const MASSA_VAZIA = { nome: '', rendimento_g: '', observacoes: '', ativa: true };
const CONFIG_VAZIA = { produto_id: '', peso_unitario_g: '', massas: [{ massa_id: '', percentual: '100' }] };
const paraNumero = (v) => Number(String(v ?? '').replace(',', '.')) || 0;

export default function Massas() {
  const [formMassa, setFormMassa] = useState(null);
  const [formConfig, setFormConfig] = useState(null);
  const [excluindo, setExcluindo] = useState(null); // { tipo: 'massa' | 'config', item }

  const { data: massas = [], isLoading } = useQuery({ queryKey: ['massas'], queryFn: massaServico.listar });
  const { data: configs = [] } = useQuery({ queryKey: ['configs-doces'], queryFn: massaServico.listarConfiguracoes });
  const { data: produtos = [] } = useQuery({ queryKey: ['produtos'], queryFn: produtoServico.listar });

  const salvarMassa = useAcao((d) => massaServico.salvar(d), {
    invalidar: ['massas'], mensagemSucesso: 'Massa salva.', aoConcluir: () => setFormMassa(null),
  });
  const salvarConfig = useAcao((d) => massaServico.salvarConfiguracao(d), {
    invalidar: ['configs-doces', 'massas'], mensagemSucesso: 'Composição salva.', aoConcluir: () => setFormConfig(null),
  });
  const excluir = useAcao(({ tipo, item }) => (tipo === 'massa' ? massaServico.excluir(item.id) : massaServico.excluirConfiguracao(item.id)), {
    invalidar: ['massas', 'configs-doces'], mensagemSucesso: 'Excluído.', aoConcluir: () => setExcluindo(null),
  });

  if (isLoading) return <Carregando />;

  const somaPercentuais = formConfig ? formConfig.massas.reduce((s, m) => s + paraNumero(m.percentual), 0) : 0;
  const produtosLivres = produtos.filter((p) => p.ativo
    && (!configs.some((c) => c.produto_id === p.id) || p.id === formConfig?.produto_id));
  const alterarMassaConfig = (k, campo, valor) => setFormConfig({
    ...formConfig, massas: formConfig.massas.map((m, j) => (j === k ? { ...m, [campo]: valor } : m)),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CabecalhoPagina titulo="Massas e doces"
        subtitulo="Massas-base e composição de cada doce, usadas pela Calculadora de Massas" />

      <Tabs defaultValue="massas">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="massas">Massas</TabsTrigger>
          <TabsTrigger value="doces">Composição dos doces</TabsTrigger>
        </TabsList>

        <TabsContent value="massas" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button className="h-11 bg-rose-600 hover:bg-rose-700" onClick={() => setFormMassa(MASSA_VAZIA)}>
              <Plus className="w-4 h-4 mr-2" /> Nova massa
            </Button>
          </div>
          {massas.length === 0 ? (
            <EstadoVazio icone={CookingPot} titulo="Nenhuma massa" descricao="Cadastre as massas-base com o rendimento de uma receita em gramas."
              rotuloAcao="Nova massa" aoAgir={() => setFormMassa(MASSA_VAZIA)} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {massas.map((m) => (
                <li key={m.id}>
                  <Card className={`p-4 flex justify-between gap-3 ${m.ativa ? '' : 'opacity-70'}`}>
                    <div>
                      <h2 className="font-semibold text-gray-900">{m.nome} {!m.ativa && <Badge variant="outline">Inativa</Badge>}</h2>
                      <p className="text-sm text-gray-600">Rende {numero(m.rendimento_g, 0)} g por receita · usada em {m.qtd_doces} doce(s)</p>
                      {m.observacoes && <p className="text-sm text-gray-500">{m.observacoes}</p>}
                    </div>
                    <div className="flex">
                      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Editar ${m.nome}`}
                        onClick={() => setFormMassa({ ...m, rendimento_g: String(m.rendimento_g), observacoes: m.observacoes ?? '' })}>
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Excluir ${m.nome}`}
                        onClick={() => setExcluindo({ tipo: 'massa', item: m })}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="doces" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-3">
            <p className="text-sm text-gray-600">
              Os doces são <Link to="/produtos" className="underline text-rose-700">produtos</Link> com peso por unidade e massas.
            </p>
            <Button className="h-11 bg-rose-600 hover:bg-rose-700" disabled={massas.length === 0}
              onClick={() => setFormConfig(CONFIG_VAZIA)}>
              <Plus className="w-4 h-4 mr-2" /> Configurar doce
            </Button>
          </div>
          {configs.length === 0 ? (
            <EstadoVazio icone={Candy} titulo="Nenhum doce configurado"
              descricao={massas.length === 0 ? 'Cadastre as massas primeiro.' : 'Informe o peso e as massas de cada doce.'} />
          ) : (
            <ul className="grid gap-3">
              {configs.map((c) => (
                <li key={c.id}>
                  <Card className="p-4 flex justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-gray-900">{c.produto_nome}</h2>
                      <p className="text-sm text-gray-600">{numero(c.peso_unitario_g, 1)} g por unidade</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.massas.map((m) => <Badge key={m.massa_id} variant="secondary">{m.massa_nome} {numero(m.percentual, 1)}%</Badge>)}
                      </div>
                    </div>
                    <div className="flex">
                      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Editar ${c.produto_nome}`}
                        onClick={() => setFormConfig({
                          id: c.id, produto_id: c.produto_id, peso_unitario_g: String(c.peso_unitario_g),
                          massas: c.massas.map((m) => ({ massa_id: m.massa_id, percentual: String(m.percentual) })),
                        })}>
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Excluir composição de ${c.produto_nome}`}
                        onClick={() => setExcluindo({ tipo: 'config', item: { ...c, nome: `a composição de ${c.produto_nome}` } })}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!formMassa} onOpenChange={(a) => !a && setFormMassa(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{formMassa?.id ? 'Editar massa' : 'Nova massa'}</DialogTitle></DialogHeader>
          {formMassa && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvarMassa.mutate(formMassa); }}>
              <div>
                <Label htmlFor="nome-massa">Nome *</Label>
                <Input id="nome-massa" value={formMassa.nome} required maxLength={60} placeholder="Ex.: Massa de brigadeiro"
                  onChange={(e) => setFormMassa({ ...formMassa, nome: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="rendimento-massa">Rendimento de uma receita (g) *</Label>
                <Input id="rendimento-massa" inputMode="decimal" value={formMassa.rendimento_g} required
                  onChange={(e) => setFormMassa({ ...formMassa, rendimento_g: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="obs-massa">Observações</Label>
                <Textarea id="obs-massa" rows={2} value={formMassa.observacoes}
                  onChange={(e) => setFormMassa({ ...formMassa, observacoes: e.target.value })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="massa-ativa">Massa ativa</Label>
                <Switch id="massa-ativa" checked={formMassa.ativa} onCheckedChange={(ativa) => setFormMassa({ ...formMassa, ativa })} />
              </div>
              <BotoesFormulario salvando={salvarMassa.isPending} aoCancelar={() => setFormMassa(null)} />
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!formConfig} onOpenChange={(a) => !a && setFormConfig(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{formConfig?.id ? 'Editar composição' : 'Configurar doce'}</DialogTitle></DialogHeader>
          {formConfig && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvarConfig.mutate(formConfig); }}>
              <div>
                <Label htmlFor="doce">Doce (produto) *</Label>
                <Select value={formConfig.produto_id} onValueChange={(v) => setFormConfig({ ...formConfig, produto_id: v })}>
                  <SelectTrigger id="doce" className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{produtosLivres.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="peso">Peso de cada unidade (g) *</Label>
                <Input id="peso" inputMode="decimal" value={formConfig.peso_unitario_g} required
                  onChange={(e) => setFormConfig({ ...formConfig, peso_unitario_g: e.target.value })} />
              </div>
              <fieldset className="space-y-2">
                <legend className="font-medium">Massas</legend>
                {formConfig.massas.map((m, k) => (
                  <div key={k} className="flex gap-2 items-center">
                    <Select value={m.massa_id} onValueChange={(v) => alterarMassaConfig(k, 'massa_id', v)}>
                      <SelectTrigger className="h-10 flex-1" aria-label={`Massa ${k + 1}`}><SelectValue placeholder="Massa..." /></SelectTrigger>
                      <SelectContent>{massas.filter((x) => x.ativa || x.id === m.massa_id).map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input aria-label={`Percentual da massa ${k + 1}`} inputMode="decimal" className="w-20 h-10" value={m.percentual}
                      onChange={(e) => alterarMassaConfig(k, 'percentual', e.target.value)} />
                    <span className="text-sm">%</span>
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label={`Remover massa ${k + 1}`}
                      onClick={() => setFormConfig({ ...formConfig, massas: formConfig.massas.filter((_, j) => j !== k) })}>
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <Button type="button" variant="outline" className="h-10"
                    onClick={() => setFormConfig({ ...formConfig, massas: [...formConfig.massas, { massa_id: '', percentual: '' }] })}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar massa
                  </Button>
                  <span className={`text-sm font-medium ${Math.abs(somaPercentuais - 100) > 0.01 ? 'text-red-700' : 'text-green-700'}`} aria-live="polite">
                    Total: {numero(somaPercentuais, 1)}%
                  </span>
                </div>
              </fieldset>
              <BotoesFormulario salvando={salvarConfig.isPending} aoCancelar={() => setFormConfig(null)} />
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmarExclusao
        aberto={!!excluindo}
        titulo={`Excluir ${excluindo?.item.nome ?? ''}?`}
        aoConfirmar={() => excluir.mutate(excluindo)}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
