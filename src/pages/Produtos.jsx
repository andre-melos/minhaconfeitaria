// UC04 – Manter Produtos (ficha técnica, custos e preço) e UC05 – Revisar Preços
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Package, Pencil, Trash2, Copy, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import EstadoVazio from '@/components/comum/EstadoVazio';
import ConfirmarExclusao from '@/components/comum/ConfirmarExclusao';
import BotoesFormulario from '@/components/comum/BotoesFormulario';
import { produtoServico } from '@/servicos/produtoServico';
import { insumoServico, dadosDaUnidade } from '@/servicos/insumoServico';
import { categoriaServico } from '@/servicos/categoriaServico';
import { embalagemServico } from '@/servicos/embalagemServico';
import { configuracaoServico } from '@/servicos/configuracaoServico';
import { useAcao } from '@/hooks/useAcao';
import { moeda, numero } from '@/lib/formatacao';

const SEM_CATEGORIA = 'sem-categoria';

function novoFormulario(margemPadrao) {
  return {
    nome: '', categoria_id: '', rendimento: '1', ativo: true, insumos: [], componentes: [], embalagens: [],
    mao_obra_tipo: 'fixo', mao_obra_valor: '', outros_custos: '', margem_lucro: String(margemPadrao ?? 50),
    preco_venda: '', observacoes: '',
  };
}

const paraTexto = (v) => (v === null || v === undefined ? '' : String(v).replace('.', ','));

function paraFormulario(p, copia = false) {
  return {
    id: copia ? undefined : p.id,
    nome: copia ? `${p.nome} (cópia)` : p.nome,
    categoria_id: p.categoria_id ?? '',
    rendimento: paraTexto(p.rendimento),
    ativo: copia ? true : p.ativo,
    insumos: p.insumos.map((i) => ({ insumo_id: i.insumo_id, insumo_nome: i.insumo_nome, quantidade: paraTexto(i.quantidade) })),
    componentes: p.componentes.map((c) => ({ componente_id: c.componente_id, componente_nome: c.componente_nome, quantidade: paraTexto(c.quantidade) })),
    embalagens: p.embalagens.map((e) => ({ embalagem_id: e.embalagem_id, embalagem_nome: e.embalagem_nome, quantidade: paraTexto(e.quantidade) })),
    mao_obra_tipo: p.mao_obra_tipo,
    mao_obra_valor: paraTexto(p.mao_obra_valor),
    outros_custos: paraTexto(p.outros_custos),
    margem_lucro: paraTexto(p.margem_lucro),
    preco_venda: paraTexto(p.preco_venda.toFixed(2)),
    observacoes: p.observacoes ?? '',
  };
}

/** Lista editável de itens (insumos, componentes ou embalagens) com quantidade. */
function ListaItens({ titulo, ajuda, opcoes, itens, chave, nomeCampo, unidadeDe, custoDe, rotuloAdicionar, aoMudar }) {
  const disponiveis = opcoes.filter((o) => !itens.some((i) => i[chave] === o.id));
  const adicionar = (id) => {
    const opcao = opcoes.find((o) => o.id === id);
    aoMudar([...itens, { [chave]: id, [nomeCampo]: opcao.nome, quantidade: '' }]);
  };
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium text-gray-900">{titulo}</legend>
      {ajuda && <p className="text-xs text-gray-600">{ajuda}</p>}
      {itens.map((item, k) => (
        <div key={item[chave]} className="flex items-center gap-2">
          <span className="flex-1 text-sm truncate">{item[nomeCampo]}</span>
          <Input aria-label={`Quantidade de ${item[nomeCampo]}`} inputMode="decimal" className="w-24 h-10" value={item.quantidade}
            onChange={(e) => aoMudar(itens.map((x, j) => (j === k ? { ...x, quantidade: e.target.value } : x)))} />
          <span className="w-12 text-sm text-gray-600">{unidadeDe(item)}</span>
          {custoDe && <span className="w-20 text-right text-sm text-gray-700">{moeda(custoDe(k))}</span>}
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label={`Remover ${item[nomeCampo]}`}
            onClick={() => aoMudar(itens.filter((_, j) => j !== k))}>
            <X className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      ))}
      {disponiveis.length > 0 && (
        <Select value="" onValueChange={adicionar}>
          <SelectTrigger className="h-10" aria-label={rotuloAdicionar}><SelectValue placeholder={rotuloAdicionar} /></SelectTrigger>
          <SelectContent>
            {disponiveis.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </fieldset>
  );
}

function LinhaResumo({ rotulo, valor, destaque }) {
  return (
    <div className={`flex justify-between ${destaque ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
      <span>{rotulo}</span><span>{valor}</span>
    </div>
  );
}

function RevisaoPrecos({ aberto, aoFechar, aoEditar }) {
  const [percentual, setPercentual] = useState('10');
  const [resultado, setResultado] = useState(null);
  const buscar = useAcao((pct) => produtoServico.revisarPrecos(pct), { aoConcluir: (lista) => setResultado(lista) });

  return (
    <Dialog open={aberto} onOpenChange={(a) => { if (!a) { setResultado(null); aoFechar(); } }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Revisão de preços</DialogTitle></DialogHeader>
        <p className="text-sm text-gray-600">Lista os produtos ativos vendidos abaixo do preço sugerido além do percentual informado.</p>
        <form className="flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); buscar.mutate(percentual); }}>
          <div className="flex-1">
            <Label htmlFor="pct-revisao">Diferença mínima (%)</Label>
            <Input id="pct-revisao" inputMode="decimal" value={percentual} onChange={(e) => setPercentual(e.target.value)} />
          </div>
          <Button type="submit" className="h-10 bg-rose-600 hover:bg-rose-700">Verificar</Button>
        </form>
        {resultado && (resultado.length === 0 ? (
          <p className="text-green-700 font-medium" role="status">Nenhum produto abaixo desse limite. Seus preços estão adequados.</p>
        ) : (
          <ul className="space-y-2" aria-label="Produtos abaixo do preço sugerido">
            {resultado.map((p) => (
              <li key={p.id}>
                <Card className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-sm text-gray-600">Vende a {moeda(p.preco_venda)} · sugerido {moeda(p.preco_sugerido)}</p>
                    <p className="text-sm text-red-700 font-medium">{numero(p.diferenca, 1)}% abaixo</p>
                  </div>
                  <Button variant="outline" className="h-10" onClick={() => { setResultado(null); aoEditar(p.id); }}>Ajustar</Button>
                </Card>
              </li>
            ))}
          </ul>
        ))}
      </DialogContent>
    </Dialog>
  );
}

export default function Produtos() {
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [formulario, setFormulario] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [revisando, setRevisando] = useState(false);

  const { data: produtos = [], isLoading } = useQuery({ queryKey: ['produtos'], queryFn: produtoServico.listar });
  const { data: insumos = [] } = useQuery({ queryKey: ['insumos'], queryFn: insumoServico.listar });
  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: categoriaServico.listar });
  const { data: embalagens = [] } = useQuery({ queryKey: ['embalagens'], queryFn: embalagemServico.listar });
  const { data: config } = useQuery({ queryKey: ['configuracao'], queryFn: configuracaoServico.obter });

  const salvar = useAcao((dados) => produtoServico.salvar(dados, config?.margem_padrao), {
    invalidar: ['produtos'], mensagemSucesso: 'Produto salvo.', aoConcluir: () => setFormulario(null),
  });
  const excluir = useAcao((id) => produtoServico.excluir(id), {
    invalidar: ['produtos'], mensagemSucesso: 'Produto excluído.', aoConcluir: () => setExcluindo(null),
  });
  const abrir = useAcao(({ id, copia }) => produtoServico.obterCompleto(id).then((p) => paraFormulario(p, copia)), {
    aoConcluir: (f) => setFormulario(f),
  });

  const previa = useMemo(
    () => (formulario ? produtoServico.previa(formulario, insumos, produtos) : null),
    [formulario, insumos, produtos]
  );

  const termo = busca.trim().toLowerCase();
  const filtrados = produtos.filter((p) => p.nome.toLowerCase().includes(termo)
    && (filtroCategoria === 'todas' || (p.categoria_id ?? SEM_CATEGORIA) === filtroCategoria));

  const campo = (nome) => (e) => setFormulario({ ...formulario, [nome]: e.target.value });
  const unidadeInsumo = (item) => {
    const insumo = insumos.find((i) => i.id === item.insumo_id);
    return insumo ? dadosDaUnidade(insumo.unidade).base : '';
  };

  if (isLoading) return <Carregando />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CabecalhoPagina titulo="Produtos" subtitulo={`${produtos.length} produto(s) com ficha técnica`}>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11" onClick={() => setRevisando(true)}>
            <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" aria-hidden="true" /> Revisar preços
          </Button>
          <Button className="h-11 bg-rose-600 hover:bg-rose-700" onClick={() => setFormulario(novoFormulario(config?.margem_padrao))}>
            <Plus className="w-4 h-4 mr-2" /> Novo produto
          </Button>
        </div>
      </CabecalhoPagina>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden="true" />
          <Input aria-label="Buscar produto" placeholder="Buscar produto..." value={busca}
            onChange={(e) => setBusca(e.target.value)} className="pl-10 h-11" />
        </div>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="sm:w-52 h-11" aria-label="Filtrar por categoria"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.emoji} {c.nome}</SelectItem>)}
            <SelectItem value={SEM_CATEGORIA}>Sem categoria</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtrados.length === 0 ? (
        <EstadoVazio icone={Package}
          titulo={busca || filtroCategoria !== 'todas' ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
          descricao="Cadastre os produtos com a ficha técnica para calcular custo e preço."
          rotuloAcao={!busca ? 'Novo produto' : undefined}
          aoAgir={() => setFormulario(novoFormulario(config?.margem_padrao))} />
      ) : (
        <ul className="grid gap-3">
          {filtrados.map((p) => {
            const margemReal = p.preco_venda > 0 ? ((p.preco_venda - p.custo_unitario) / p.preco_venda) * 100 : null;
            return (
              <li key={p.id}>
                <Card className={`p-4 ${p.ativo ? '' : 'opacity-70'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span aria-hidden="true">{p.categoria_emoji || '📦'}</span> {p.nome}
                      </h2>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary">{p.categoria_nome || 'Sem categoria'}</Badge>
                        {!p.ativo && <Badge variant="outline">Inativo</Badge>}
                        <Badge variant="outline">{p.qtd_insumos} insumo(s){p.qtd_componentes ? ` + ${p.qtd_componentes} componente(s)` : ''}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Custo {moeda(p.custo_unitario)}/un · rende {numero(p.rendimento)} un
                        {margemReal !== null && (
                          <span className={margemReal < 0 ? 'text-red-700 font-medium' : 'text-green-700'}>
                            {' '}· margem {numero(margemReal, 1)}%
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900">{moeda(p.preco_venda)}</p>
                      <div className="flex">
                        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Duplicar ${p.nome}`}
                          onClick={() => abrir.mutate({ id: p.id, copia: true })}>
                          <Copy className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Editar ${p.nome}`}
                          onClick={() => abrir.mutate({ id: p.id })}>
                          <Pencil className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Excluir ${p.nome}`}
                          onClick={() => setExcluindo(p)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!formulario} onOpenChange={(a) => !a && setFormulario(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{formulario?.id ? 'Editar produto' : 'Novo produto'}</DialogTitle></DialogHeader>
          {formulario && previa && (
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); salvar.mutate(formulario); }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="nome-produto">Nome *</Label>
                  <Input id="nome-produto" value={formulario.nome} onChange={campo('nome')} required maxLength={80} />
                </div>
                <div>
                  <Label htmlFor="categoria-produto">Categoria</Label>
                  <Select value={formulario.categoria_id || SEM_CATEGORIA}
                    onValueChange={(v) => setFormulario({ ...formulario, categoria_id: v === SEM_CATEGORIA ? '' : v })}>
                    <SelectTrigger id="categoria-produto" className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_CATEGORIA}>Sem categoria</SelectItem>
                      {categorias.filter((c) => c.ativa || c.id === formulario.categoria_id)
                        .map((c) => <SelectItem key={c.id} value={c.id}>{c.emoji} {c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rendimento">Rendimento da receita (unidades) *</Label>
                  <Input id="rendimento" inputMode="decimal" value={formulario.rendimento} onChange={campo('rendimento')} required />
                </div>
              </div>

              <section className="space-y-4 border rounded-xl p-4">
                <h3 className="font-semibold text-gray-900">Ficha técnica (para o rendimento informado)</h3>
                <ListaItens titulo="Insumos" ajuda="Quantidade em gramas (g), mililitros (ml) ou unidades (un). O custo de forminhas, caixas e outras embalagens entra aqui, cadastrado como insumo."
                  opcoes={insumos} itens={formulario.insumos} chave="insumo_id" nomeCampo="insumo_nome"
                  unidadeDe={unidadeInsumo} custoDe={(k) => previa.itensInsumo[k]} rotuloAdicionar="Adicionar insumo..."
                  aoMudar={(lista) => setFormulario({ ...formulario, insumos: lista })} />
                <ListaItens titulo="Componentes (outros produtos)" ajuda="Ex.: massa ou recheio cadastrado como produto. Quantidade em unidades do componente."
                  opcoes={produtos.filter((p) => p.id !== formulario.id)} itens={formulario.componentes}
                  chave="componente_id" nomeCampo="componente_nome" unidadeDe={() => 'un'} custoDe={(k) => previa.itensComponente[k]}
                  rotuloAdicionar="Adicionar componente..."
                  aoMudar={(lista) => setFormulario({ ...formulario, componentes: lista })} />
              </section>

              <section className="space-y-3 border rounded-xl p-4">
                <h3 className="font-semibold text-gray-900">Mão de obra e outros custos (por receita)</h3>
                <RadioGroup value={formulario.mao_obra_tipo} className="flex gap-6"
                  onValueChange={(v) => setFormulario({ ...formulario, mao_obra_tipo: v })} aria-label="Tipo de mão de obra">
                  <div className="flex items-center gap-2"><RadioGroupItem value="fixo" id="mo-fixo" /><Label htmlFor="mo-fixo">Valor fixo (R$)</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="percentual" id="mo-pct" /><Label htmlFor="mo-pct">Percentual (%)</Label></div>
                </RadioGroup>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="mao-obra">{formulario.mao_obra_tipo === 'fixo' ? 'Mão de obra (R$)' : 'Mão de obra (%)'}</Label>
                    <Input id="mao-obra" inputMode="decimal" value={formulario.mao_obra_valor} onChange={campo('mao_obra_valor')} />
                  </div>
                  <div>
                    <Label htmlFor="outros-custos">Outros custos (R$)</Label>
                    <Input id="outros-custos" inputMode="decimal" value={formulario.outros_custos} onChange={campo('outros_custos')}
                      placeholder="Gás, energia, transporte etc." />
                  </div>
                </div>
              </section>

              <section className="space-y-3 border rounded-xl p-4 bg-rose-50/50" aria-live="polite">
                <h3 className="font-semibold text-gray-900">Custo e preço</h3>
                <div className="text-sm space-y-1">
                  <LinhaResumo rotulo="Insumos e componentes" valor={moeda(previa.custo_insumos)} />
                  <LinhaResumo rotulo="Mão de obra" valor={moeda(previa.mao_obra_calculada)} />
                  <LinhaResumo rotulo="Outros custos" valor={moeda(previa.custo_total - previa.custo_insumos - previa.mao_obra_calculada)} />
                  <LinhaResumo rotulo="Custo total da receita" valor={moeda(previa.custo_total)} destaque />
                  <LinhaResumo rotulo="Custo por unidade" valor={moeda(previa.custo_unitario)} destaque />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="margem-produto">Margem desejada (%)</Label>
                    <Input id="margem-produto" inputMode="decimal" value={formulario.margem_lucro} onChange={campo('margem_lucro')} />
                    <p className="text-sm mt-1">Sugerido: <strong>{moeda(previa.preco_sugerido)}</strong></p>
                  </div>
                  <div>
                    <Label htmlFor="preco-venda">Preço de venda (R$)</Label>
                    <Input id="preco-venda" inputMode="decimal" value={formulario.preco_venda} onChange={campo('preco_venda')}
                      placeholder="Vazio = preço sugerido" />
                    <Button type="button" variant="link" className="px-0 h-8 text-rose-700"
                      onClick={() => setFormulario({ ...formulario, preco_venda: previa.preco_sugerido.toFixed(2).replace('.', ',') })}>
                      Usar preço sugerido
                    </Button>
                  </div>
                </div>
                {previa.margem_real !== null && (
                  <p className={`text-sm font-medium ${previa.margem_real < 0 ? 'text-red-700' : 'text-green-700'}`}>
                    Margem real: {numero(previa.margem_real, 1)}%{previa.margem_real < 0 && ' — o preço está abaixo do custo!'}
                  </p>
                )}
              </section>

              <section className="border rounded-xl p-4">
                <ListaItens titulo="Embalagens por unidade vendida"
                  ajuda="Usado só na Calculadora de Embalagens (quantidades para separar ou comprar). Não entra no custo, para não contar duas vezes."
                  opcoes={embalagens.filter((e) => e.ativa)}
                  itens={formulario.embalagens} chave="embalagem_id" nomeCampo="embalagem_nome" unidadeDe={() => 'un'}
                  rotuloAdicionar="Adicionar embalagem..." aoMudar={(lista) => setFormulario({ ...formulario, embalagens: lista })} />
              </section>

              <div>
                <Label htmlFor="obs-produto">Observações</Label>
                <Textarea id="obs-produto" rows={2} value={formulario.observacoes} onChange={campo('observacoes')} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="produto-ativo">Produto ativo (aparece nos pedidos)</Label>
                <Switch id="produto-ativo" checked={formulario.ativo} onCheckedChange={(ativo) => setFormulario({ ...formulario, ativo })} />
              </div>
              <BotoesFormulario salvando={salvar.isPending} aoCancelar={() => setFormulario(null)} />
            </form>
          )}
        </DialogContent>
      </Dialog>

      <RevisaoPrecos aberto={revisando} aoFechar={() => setRevisando(false)}
        aoEditar={(id) => { setRevisando(false); abrir.mutate({ id }); }} />

      <ConfirmarExclusao
        aberto={!!excluindo}
        titulo={`Excluir ${excluindo?.nome ?? 'produto'}?`}
        descricao="Produtos usados em pedidos ou como componente de outro produto não podem ser excluídos; nesse caso, inative-os."
        aoConfirmar={() => excluir.mutate(excluindo.id)}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
