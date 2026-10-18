// UC09 – Registrar Pedido (e edição do pedido, UC10). Três etapas: cliente, produtos e entrega (RNF02).
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, UserPlus, Minus, Plus, Trash2, Truck, Store, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Carregando from '@/components/comum/Carregando';
import BotoesFormulario from '@/components/comum/BotoesFormulario';
import { clienteServico } from '@/servicos/clienteServico';
import { produtoServico } from '@/servicos/produtoServico';
import { categoriaServico } from '@/servicos/categoriaServico';
import { pedidoServico } from '@/servicos/pedidoServico';
import { calcularTotais } from '@/servicos/regrasPedido';
import { useAcao } from '@/hooks/useAcao';
import { moeda } from '@/lib/formatacao';

const ETAPAS = ['Cliente', 'Produtos', 'Entrega e resumo'];
const num = (v) => Number(String(v ?? '').replace(',', '.')) || 0;
const PEDIDO_VAZIO = {
  cliente_id: '', itens: [], data_entrega: '', hora_entrega: '', tipo_entrega: 'retirada', endereco_entrega: '',
  valor_frete: '', tipo_desconto: 'fixo', valor_desconto: '', observacoes: '',
};

function NovoClienteRapido({ aberto, aoFechar, aoCriar }) {
  const [dados, setDados] = useState({ nome: '', telefone: '', endereco: '' });
  const salvar = useAcao((d) => clienteServico.salvar(d), {
    invalidar: ['clientes'], mensagemSucesso: 'Cliente cadastrado.',
    aoConcluir: (c) => { setDados({ nome: '', telefone: '', endereco: '' }); aoCriar(c); },
  });
  return (
    <Dialog open={aberto} onOpenChange={(a) => !a && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); salvar.mutate(dados); }}>
          <div>
            <Label htmlFor="novo-cliente-nome">Nome *</Label>
            <Input id="novo-cliente-nome" value={dados.nome} required onChange={(e) => setDados({ ...dados, nome: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="novo-cliente-telefone">Telefone/WhatsApp *</Label>
            <Input id="novo-cliente-telefone" type="tel" value={dados.telefone} required onChange={(e) => setDados({ ...dados, telefone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="novo-cliente-endereco">Endereço</Label>
            <Input id="novo-cliente-endereco" value={dados.endereco} onChange={(e) => setDados({ ...dados, endereco: e.target.value })} />
          </div>
          <BotoesFormulario salvando={salvar.isPending} aoCancelar={aoFechar} rotulo="Cadastrar" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FormularioPedido() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [etapa, setEtapa] = useState(id ? 1 : 0);
  const [pedido, setPedido] = useState(id ? null : PEDIDO_VAZIO);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [novoCliente, setNovoCliente] = useState(false);

  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: clienteServico.listar });
  const { data: produtos = [] } = useQuery({ queryKey: ['produtos'], queryFn: produtoServico.listar });
  const { data: categorias = [] } = useQuery({ queryKey: ['categorias'], queryFn: categoriaServico.listar });
  const { data: existente } = useQuery({ queryKey: ['pedido', id], queryFn: () => pedidoServico.obter(id), enabled: !!id });
  const { data: dataFestiva } = useQuery({
    queryKey: ['data-festiva', pedido?.data_entrega],
    queryFn: () => pedidoServico.ehDataFestiva(pedido.data_entrega),
    enabled: !!pedido?.data_entrega,
  });

  useEffect(() => {
    if (existente && !pedido) {
      setPedido({
        ...existente,
        hora_entrega: existente.hora_entrega ?? '',
        endereco_entrega: existente.endereco_entrega ?? '',
        valor_frete: existente.valor_frete ? String(existente.valor_frete) : '',
        valor_desconto: existente.valor_desconto ? String(existente.valor_desconto) : '',
        observacoes: existente.observacoes ?? '',
        itens: existente.itens.map((i) => ({ produto_id: i.produto_id, produto_nome: i.produto_nome, quantidade: i.quantidade, preco_unitario: String(i.preco_unitario) })),
      });
    }
  }, [existente, pedido]);

  const salvar = useAcao((dados) => pedidoServico.salvar(dados), {
    invalidar: ['pedidos', 'pedido'], mensagemSucesso: id ? 'Pedido atualizado.' : 'Pedido registrado como orçamento.',
    aoConcluir: (p) => navegar(`/pedidos/${p.id}`, { replace: true }),
  });

  const totais = useMemo(() => pedido && calcularTotais({
    itens: pedido.itens.map((i) => ({ quantidade: num(i.quantidade), preco_unitario: num(i.preco_unitario) })),
    tipo_entrega: pedido.tipo_entrega, valor_frete: num(pedido.valor_frete),
    tipo_desconto: pedido.tipo_desconto, valor_desconto: num(pedido.valor_desconto), valor_pago: existente?.valor_pago ?? 0,
  }), [pedido, existente]);

  if (!pedido) return <Carregando />;

  const cliente = clientes.find((c) => c.id === pedido.cliente_id);
  const alterar = (campo) => (e) => setPedido({ ...pedido, [campo]: e.target.value });
  const termoCliente = buscaCliente.trim().toLowerCase();
  const clientesFiltrados = clientes.filter((c) => c.nome.toLowerCase().includes(termoCliente) || c.telefone.includes(termoCliente));
  const produtosFiltrados = produtos.filter((p) => p.ativo
    && p.nome.toLowerCase().includes(buscaProduto.trim().toLowerCase())
    && (categoria === 'todas' || p.categoria_id === categoria));

  const escolherCliente = (c) => {
    setPedido({ ...pedido, cliente_id: c.id, endereco_entrega: pedido.endereco_entrega || c.endereco || '' });
    setEtapa(1);
  };
  const adicionarProduto = (p) => {
    const existenteItem = pedido.itens.find((i) => i.produto_id === p.id);
    setPedido({
      ...pedido,
      itens: existenteItem
        ? pedido.itens.map((i) => (i.produto_id === p.id ? { ...i, quantidade: num(i.quantidade) + 1 } : i))
        : [...pedido.itens, { produto_id: p.id, produto_nome: p.nome, quantidade: 1, preco_unitario: String(p.preco_venda) }],
    });
  };
  const alterarItem = (k, campo, valor) => setPedido({ ...pedido, itens: pedido.itens.map((i, j) => (j === k ? { ...i, [campo]: valor } : i)) });

  const podeAvancar = [!!pedido.cliente_id, pedido.itens.length > 0, !!pedido.data_entrega][etapa];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-28">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-11 w-11">
          <Link to={id ? `/pedidos/${id}` : '/pedidos'} aria-label="Voltar"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Editar pedido' : 'Novo pedido'}</h1>
          <p className="text-gray-600">Etapa {etapa + 1} de 3 · {ETAPAS[etapa]}</p>
        </div>
      </div>
      <ol className="flex gap-2" aria-label="Etapas">
        {ETAPAS.map((nome, k) => (
          <li key={nome} className="flex-1">
            <button type="button" disabled={k > etapa && !podeAvancar} onClick={() => k <= etapa && setEtapa(k)}
              className={`w-full h-2 rounded-full ${k <= etapa ? 'bg-rose-600' : 'bg-gray-200'}`} aria-label={`Etapa ${k + 1}: ${nome}`}
              aria-current={k === etapa ? 'step' : undefined} />
          </li>
        ))}
      </ol>

      {etapa === 0 && (
        <section className="space-y-4" aria-label="Cliente">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden="true" />
              <Input aria-label="Buscar cliente" placeholder="Buscar cliente..." value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)} className="pl-10 h-11" />
            </div>
            <Button variant="outline" className="h-11" onClick={() => setNovoCliente(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Novo
            </Button>
          </div>
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {clientesFiltrados.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => escolherCliente(c)}
                  className={`w-full text-left rounded-xl border bg-white p-4 hover:shadow-md ${pedido.cliente_id === c.id ? 'ring-2 ring-rose-600' : ''}`}>
                  <span className="font-medium block">{c.nome}</span>
                  <span className="text-sm text-gray-600">{c.telefone}</span>
                </button>
              </li>
            ))}
          </ul>
          {clientesFiltrados.length === 0 && <p className="text-center text-gray-600 py-6">Nenhum cliente encontrado.</p>}
        </section>
      )}

      {etapa === 1 && (
        <section className="space-y-4" aria-label="Produtos">
          <Card className="p-3 bg-gray-50 text-sm">Cliente: <strong>{cliente?.nome}</strong></Card>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden="true" />
              <Input aria-label="Buscar produto" placeholder="Buscar produto..." value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)} className="pl-10 h-11" />
            </div>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="sm:w-44 h-11" aria-label="Categoria"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {categorias.filter((c) => c.ativa).map((c) => <SelectItem key={c.id} value={c.id}>{c.emoji} {c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <ul className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto" aria-label="Produtos disponíveis">
            {produtosFiltrados.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => adicionarProduto(p)}
                  className="w-full h-full text-left rounded-xl border bg-white p-3 hover:border-rose-400 min-h-[44px]">
                  <span className="text-sm font-medium block">{p.categoria_emoji} {p.nome}</span>
                  <span className="text-sm text-rose-700">{moeda(p.preco_venda)}</span>
                </button>
              </li>
            ))}
            {produtosFiltrados.length === 0 && <li className="col-span-2 text-center text-gray-600 py-4">Nenhum produto ativo encontrado.</li>}
          </ul>

          {pedido.itens.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-semibold">Itens do pedido</h2>
              {pedido.itens.map((item, k) => (
                <Card key={item.produto_id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{item.produto_nome}</span>
                    <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`Remover ${item.produto_nome}`}
                      onClick={() => setPedido({ ...pedido, itens: pedido.itens.filter((_, j) => j !== k) })}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10" aria-label="Diminuir quantidade"
                      onClick={() => alterarItem(k, 'quantidade', Math.max(1, num(item.quantidade) - 1))}><Minus className="w-4 h-4" /></Button>
                    <Input aria-label={`Quantidade de ${item.produto_nome}`} inputMode="decimal" className="w-16 h-10 text-center"
                      value={item.quantidade} onChange={(e) => alterarItem(k, 'quantidade', e.target.value)} />
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10" aria-label="Aumentar quantidade"
                      onClick={() => alterarItem(k, 'quantidade', num(item.quantidade) + 1)}><Plus className="w-4 h-4" /></Button>
                    <span className="text-sm text-gray-600 ml-2">×</span>
                    <Input aria-label={`Preço de ${item.produto_nome}`} inputMode="decimal" className="w-24 h-10"
                      value={item.preco_unitario} onChange={(e) => alterarItem(k, 'preco_unitario', e.target.value)} />
                    <span className="ml-auto font-semibold text-rose-700">{moeda(num(item.quantidade) * num(item.preco_unitario))}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {etapa === 2 && totais && (
        <section className="space-y-5" aria-label="Entrega e resumo">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="data-entrega">Data de entrega *</Label>
              <Input id="data-entrega" type="date" value={pedido.data_entrega} onChange={alterar('data_entrega')} required />
            </div>
            <div>
              <Label htmlFor="hora-entrega">Horário</Label>
              <Input id="hora-entrega" type="time" value={pedido.hora_entrega} onChange={alterar('hora_entrega')} />
            </div>
          </div>
          {dataFestiva && (
            <p className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm font-medium" role="status">
              <PartyPopper className="w-5 h-5" aria-hidden="true" /> {dataFestiva.nome}: data de alta demanda. Considere pedir sinal.
            </p>
          )}
          <RadioGroup value={pedido.tipo_entrega} onValueChange={(v) => setPedido({ ...pedido, tipo_entrega: v })}
            className="grid grid-cols-2 gap-3" aria-label="Tipo de entrega">
            {[['retirada', 'Retirada', Store], ['entrega', 'Entrega', Truck]].map(([valor, rotulo, Icone]) => (
              <Label key={valor} htmlFor={`tipo-${valor}`}
                className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer ${pedido.tipo_entrega === valor ? 'ring-2 ring-rose-600 bg-rose-50' : 'bg-white'}`}>
                <RadioGroupItem id={`tipo-${valor}`} value={valor} /> <Icone className="w-5 h-5" aria-hidden="true" /> {rotulo}
              </Label>
            ))}
          </RadioGroup>
          {pedido.tipo_entrega === 'entrega' && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="endereco-entrega">Endereço de entrega</Label>
                <Input id="endereco-entrega" value={pedido.endereco_entrega} onChange={alterar('endereco_entrega')} />
              </div>
              <div>
                <Label htmlFor="frete">Frete (R$)</Label>
                <Input id="frete" inputMode="decimal" value={pedido.valor_frete} onChange={alterar('valor_frete')} />
              </div>
            </div>
          )}
          <fieldset className="space-y-2">
            <legend className="font-medium">Desconto</legend>
            <div className="flex gap-2">
              <RadioGroup value={pedido.tipo_desconto} onValueChange={(v) => setPedido({ ...pedido, tipo_desconto: v })}
                className="flex gap-4 items-center" aria-label="Tipo de desconto">
                <div className="flex items-center gap-2"><RadioGroupItem id="desc-fixo" value="fixo" /><Label htmlFor="desc-fixo">R$</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem id="desc-pct" value="percentual" /><Label htmlFor="desc-pct">%</Label></div>
              </RadioGroup>
              <Input aria-label="Valor do desconto" inputMode="decimal" className="flex-1 h-10" value={pedido.valor_desconto}
                onChange={alterar('valor_desconto')} placeholder="0" />
            </div>
          </fieldset>
          <div>
            <Label htmlFor="obs-pedido">Observações</Label>
            <Textarea id="obs-pedido" rows={2} value={pedido.observacoes} onChange={alterar('observacoes')} />
          </div>

          <Card className="p-4 space-y-1 text-sm" aria-live="polite">
            <h2 className="font-semibold text-base mb-2">Resumo</h2>
            <p>Cliente: <strong>{cliente?.nome}</strong></p>
            {pedido.itens.map((i) => (
              <div key={i.produto_id} className="flex justify-between"><span>{i.quantidade}x {i.produto_nome}</span><span>{moeda(num(i.quantidade) * num(i.preco_unitario))}</span></div>
            ))}
            <div className="border-t pt-2 mt-2 space-y-1">
              <div className="flex justify-between"><span>Itens</span><span>{moeda(totais.valor_itens)}</span></div>
              {totais.valor_frete > 0 && <div className="flex justify-between"><span>Frete</span><span>{moeda(totais.valor_frete)}</span></div>}
              {totais.desconto_aplicado > 0 && <div className="flex justify-between text-green-800"><span>Desconto</span><span>- {moeda(totais.desconto_aplicado)}</span></div>}
              <div className="flex justify-between text-lg font-bold text-rose-700"><span>Total</span><span>{moeda(totais.valor_total)}</span></div>
              {existente?.valor_pago > 0 && (
                <div className="flex justify-between text-gray-700"><span>Já pago</span><span>{moeda(existente.valor_pago)}</span></div>
              )}
            </div>
          </Card>
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t p-4 z-30">
        <div className="max-w-2xl mx-auto flex gap-3">
          {etapa > 0 && <Button variant="outline" className="flex-1 h-12" onClick={() => setEtapa(etapa - 1)}>Voltar</Button>}
          {etapa < 2 ? (
            <Button className="flex-1 h-12 bg-rose-600 hover:bg-rose-700" disabled={!podeAvancar} onClick={() => setEtapa(etapa + 1)}>
              Continuar
            </Button>
          ) : (
            <Button className="flex-1 h-12 bg-rose-600 hover:bg-rose-700" disabled={!podeAvancar || salvar.isPending}
              onClick={() => salvar.mutate(pedido)}>
              {id ? 'Salvar alterações' : 'Registrar pedido'}
            </Button>
          )}
        </div>
      </div>

      <NovoClienteRapido aberto={novoCliente} aoFechar={() => setNovoCliente(false)}
        aoCriar={(c) => { setNovoCliente(false); escolherCliente(c); }} />
    </div>
  );
}
