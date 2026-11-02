// Gera banco/backup_exemplo.json: dados fictícios para avaliar o app (importar em Configurações > Backup).
// Os custos são calculados com as mesmas regras do app (src/servicos/custoServico.js e regrasPedido.js).
// Uso: npm run backup-exemplo
import { writeFileSync } from 'node:fs';
import { calcularCustosProduto } from '../src/servicos/custoServico.js';

// ---------- utilitários ----------
let semente = 20261102; // mulberry32: sempre gera o mesmo arquivo
const aleatorio = () => {
  semente = (semente + 0x6D2B79F5) | 0;
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const sortear = (lista) => lista[Math.floor(aleatorio() * lista.length)];
let contador = 0;
const id = (prefixo) => `ex-${prefixo}-${String(++contador).padStart(4, '0')}`;
const centavos = (v) => Math.round(v * 100) / 100;
const dia = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const AGORA = '2026-11-23T12:00:00.000Z'; // data de referência: dados "atuais" na data da entrega da AS
const HOJE = '2026-11-23';

// ---------- cadastros ----------
const categorias = [['Bolos', '🎂'], ['Doces', '🍬'], ['Salgados', '🥟']].map(([nome, emoji]) => ({ id: id('cat'), nome, emoji, ativa: 1 }));
const cat = Object.fromEntries(categorias.map((c) => [c.nome, c.id]));

const nomesClientes = [
  ['Ana Paula Souza', 'Rua Tiradentes, 450 – Centro'], ['Bruno Carvalho', null], ['Carla Menezes', 'Av. Guilherme Schell, 1200'],
  ['Daniela Ribeiro', null], ['Eduardo Lima', 'Rua Ipiranga, 89 – Niterói'], ['Fernanda Costa', null],
  ['Gabriela Rocha', 'Rua Santos Ferreira, 77'], ['Helena Martins', null], ['Igor Santos', 'Rua Boqueirão, 310'],
  ['Juliana Alves', null], ['Larissa Pereira', 'Av. Inconfidência, 900'], ['Marcos Oliveira', null],
];
const clientes = nomesClientes.map(([nome, endereco], k) => ({
  id: id('cli'), nome, telefone: `(51) 9${String(8100 + k * 137).padStart(4, '0')}-${String(1000 + k * 731).slice(0, 4)}`,
  endereco, observacoes: k === 2 ? 'Prefere entregas pela manhã.' : null, criado_em: '2026-07-20T10:00:00.000Z',
}));

const FATOR = { g: 1, ml: 1, un: 1, kg: 1000, L: 1000 };
const defInsumos = {
  leiteCond: ['Leite condensado', 'g', 395, 7.9, 'Atacadão'], creme: ['Creme de leite', 'g', 200, 3.49, 'Atacadão'],
  cacau: ['Chocolate em pó 50%', 'g', 200, 9.9, 'Loja de confeitaria'], manteiga: ['Manteiga sem sal', 'g', 200, 11.9, 'Atacadão'],
  acucar: ['Açúcar refinado', 'kg', 1, 4.79, 'Atacadão'], farinha: ['Farinha de trigo', 'kg', 1, 5.49, 'Atacadão'],
  ovos: ['Ovos', 'un', 30, 22.9, 'Feira'], leite: ['Leite integral', 'L', 1, 5.29, 'Atacadão'],
  meioAmargo: ['Chocolate meio amargo', 'kg', 1, 54.9, 'Loja de confeitaria'], granulado: ['Granulado de chocolate', 'g', 500, 16.9, 'Loja de confeitaria'],
  coco: ['Coco ralado', 'g', 100, 4.5, 'Atacadão'], fermento: ['Fermento químico', 'g', 100, 3.99, 'Atacadão'],
  frango: ['Peito de frango', 'kg', 1, 19.9, 'Açougue'], oleo: ['Óleo de soja', 'ml', 900, 8.99, 'Atacadão'],
  rosca: ['Farinha de rosca', 'g', 500, 6.99, 'Atacadão'],
  forminha: ['Forminha nº 4', 'un', 100, 6.5, 'Loja de embalagens'], caixaBolo: ['Caixa para bolo 20 cm', 'un', 10, 29.9, 'Loja de embalagens'],
};
const insumos = Object.fromEntries(Object.entries(defInsumos).map(([chave, [nome, unidade, qtd, preco, fornecedor]]) => [chave, {
  id: id('ins'), nome, unidade, qtd_embalagem: qtd, preco, custo_por_unidade: preco / (qtd * FATOR[unidade]),
  fornecedor, observacoes: null, atualizado_em: AGORA,
}]));

const embalagens = Object.fromEntries([
  ['forminha', 'Forminha nº 4', 'Forminha de papel para docinhos'], ['caixa4', 'Caixa 4 doces', 'Caixa kraft com berço'],
  ['caixaBolo', 'Caixa para bolo 20 cm', null], ['saco', 'Saco celofane', 'Para salgados'],
].map(([k, nome, descricao]) => [k, { id: id('emb'), nome, descricao, ativa: 1 }]));

// ---------- produtos (fichas técnicas) ----------
const defProdutos = [
  { k: 'brigadeiro', nome: 'Brigadeiro tradicional', cat: 'Doces', rendimento: 40, mo: ['fixo', 15], outros: 3, margem: 60, preco: 3,
    insumos: { leiteCond: 790, manteiga: 30, cacau: 60, granulado: 150, forminha: 40 }, emb: { forminha: 1 } },
  { k: 'beijinho', nome: 'Beijinho', cat: 'Doces', rendimento: 40, mo: ['fixo', 15], outros: 3, margem: 60, preco: 3,
    insumos: { leiteCond: 790, manteiga: 30, coco: 150, forminha: 40 }, emb: { forminha: 1 } },
  { k: 'gourmet', nome: 'Brigadeiro gourmet meio amargo', cat: 'Doces', rendimento: 30, mo: ['fixo', 18], outros: 3, margem: 60, preco: 4.5,
    insumos: { meioAmargo: 200, creme: 200, leiteCond: 395, manteiga: 20, cacau: 40, forminha: 30 }, emb: { forminha: 1 } },
  { k: 'massaChoc', nome: 'Bolo caseiro de chocolate', cat: 'Bolos', rendimento: 1, mo: ['fixo', 12], outros: 4, margem: 50, preco: 60,
    insumos: { farinha: 300, acucar: 300, cacau: 100, ovos: 4, leite: 240, manteiga: 100, fermento: 15 }, emb: {} },
  { k: 'recheio', nome: 'Recheio de brigadeiro (base)', cat: 'Doces', rendimento: 1, mo: ['fixo', 0], outros: 0, margem: 50, preco: 0, ativo: 0,
    insumos: { leiteCond: 790, creme: 200, cacau: 60, manteiga: 30 }, emb: {},
    observacoes: 'Usado como componente de outros produtos; não é vendido separadamente.' },
  { k: 'boloBrig', nome: 'Bolo de brigadeiro 20 cm', cat: 'Bolos', rendimento: 1, mo: ['percentual', 40], outros: 5, margem: 55, preco: 170,
    insumos: { granulado: 100, caixaBolo: 1 }, componentes: { massaChoc: 1, recheio: 1 }, emb: { caixaBolo: 1 } },
  { k: 'coxinha', nome: 'Coxinha de frango (unidade)', cat: 'Salgados', rendimento: 100, mo: ['fixo', 40], outros: 8, margem: 50, preco: 1.5,
    insumos: { farinha: 1000, frango: 1000, leite: 1000, manteiga: 50, rosca: 400, oleo: 900 }, emb: { saco: 0.02 } },
];
const produtos = {};
const fichas = []; const componentesTab = []; const prodEmb = [];
for (const d of defProdutos) {
  const listaIns = Object.entries(d.insumos).map(([k, quantidade]) => ({ insumo: insumos[k], quantidade, custo_por_unidade: insumos[k].custo_por_unidade }));
  const listaComp = Object.entries(d.componentes ?? {}).map(([k, quantidade]) => ({
    produto: produtos[k], quantidade, custo_unitario_insumos: produtos[k]._custoUnitarioInsumos,
  }));
  const c = calcularCustosProduto({
    insumos: listaIns, componentes: listaComp, mao_obra_tipo: d.mo[0], mao_obra_valor: d.mo[1], outros_custos: d.outros,
    rendimento: d.rendimento, margem_lucro: d.margem, preco_venda: d.preco,
  });
  const p = {
    id: id('prd'), categoria_id: cat[d.cat], nome: d.nome, rendimento: d.rendimento, custo_insumos: c.custo_insumos,
    mao_obra_tipo: d.mo[0], mao_obra_valor: d.mo[1], mao_obra_calculada: c.mao_obra_calculada, outros_custos: d.outros,
    custo_total: c.custo_total, custo_unitario: c.custo_unitario, margem_lucro: d.margem, preco_sugerido: c.preco_sugerido,
    preco_venda: d.preco, observacoes: d.observacoes ?? null, ativo: d.ativo ?? 1, atualizado_em: AGORA,
  };
  Object.defineProperty(p, '_custoUnitarioInsumos', { value: c.custo_unitario_insumos, enumerable: false });
  produtos[d.k] = p;
  listaIns.forEach((i, n) => fichas.push({ id: id('pi'), produto_id: p.id, insumo_id: i.insumo.id, quantidade: i.quantidade, custo: c.itensInsumo[n] }));
  listaComp.forEach((x, n) => componentesTab.push({ id: id('pc'), produto_id: p.id, componente_id: x.produto.id, quantidade: x.quantidade, custo: c.itensComponente[n] }));
  Object.entries(d.emb).forEach(([k, quantidade]) => prodEmb.push({ id: id('pe'), produto_id: p.id, embalagem_id: embalagens[k].id, quantidade }));
}

// ---------- massas e composição dos doces ----------
const massas = Object.fromEntries([
  ['brig', 'Massa de brigadeiro', 1050], ['beij', 'Massa de beijinho', 1000], ['gour', 'Massa de brigadeiro gourmet', 900],
].map(([k, nome, g]) => [k, { id: id('mas'), nome, rendimento_g: g, observacoes: null, ativa: 1 }]));
const configDoce = []; const doceMassa = [];
for (const [prod, peso, massa] of [['brigadeiro', 20, 'brig'], ['beijinho', 20, 'beij'], ['gourmet', 25, 'gour']]) {
  const cfg = { id: id('cd'), produto_id: produtos[prod].id, peso_unitario_g: peso };
  configDoce.push(cfg);
  doceMassa.push({ id: id('dm'), config_doce_id: cfg.id, massa_id: massas[massa].id, percentual: 100 });
}

// ---------- datas festivas (2026) ----------
const datasFestivas = [
  ['Dia dos Pais', '2026-08-02', '2026-08-09', 0], ['Dia das Crianças', '2026-10-01', '2026-10-12', 1],
  ['Natal', '2026-12-10', '2026-12-25', 1], ['Ano Novo', '2026-12-26', '2026-12-31', 1],
].map(([nome, data_inicio, data_fim, recorrente]) => ({ id: id('df'), nome, data_inicio, data_fim, recorrente, observacoes: null }));
const ehFestiva = (iso) => datasFestivas.some((d) => iso >= d.data_inicio && iso <= d.data_fim);

// ---------- pedidos, itens e pagamentos ----------
const pedidos = []; const itens = []; const pagamentos = [];
const formas = ['pix', 'pix', 'pix', 'dinheiro', 'cartao', 'transferencia'];
const vendaveis = ['brigadeiro', 'beijinho', 'gourmet', 'massaChoc', 'boloBrig', 'coxinha'];
const quantidadePara = (k) => ({ brigadeiro: sortear([25, 50, 50, 100]), beijinho: sortear([25, 50, 100]), gourmet: sortear([20, 30, 50]),
  massaChoc: 1, boloBrig: sortear([1, 1, 2]), coxinha: sortear([50, 100, 100, 200]) }[k]);

let entrega = '2026-08-04';
const datas = [];
while (entrega <= '2026-12-22') { datas.push(entrega); entrega = dia(entrega, sortear([2, 3, 3, 4, 5])); }
for (const extra of ['2026-11-25', '2026-11-27', '2026-11-28', '2026-12-18', '2026-12-23']) datas.push(extra);
datas.sort();

datas.forEach((dataEntrega, n) => {
  const cliente = clientes[n % clientes.length === 0 ? 0 : Math.floor(aleatorio() * clientes.length)];
  const escolhidos = [...new Set(Array.from({ length: sortear([1, 1, 2, 2, 3]) }, () => sortear(vendaveis)))];
  const meusItens = escolhidos.map((k) => {
    const quantidade = quantidadePara(k); const p = produtos[k];
    return { id: id('it'), produto_id: p.id, quantidade, preco_unitario: p.preco_venda, custo_unitario: p.custo_unitario,
      subtotal: centavos(quantidade * p.preco_venda), observacoes: null };
  });
  const valorItens = centavos(meusItens.reduce((s, i) => s + i.subtotal, 0));
  const entregaEmCasa = cliente.endereco && aleatorio() < 0.6;
  const frete = entregaEmCasa ? sortear([8, 10, 12, 15]) : 0;
  const temDesconto = aleatorio() < 0.15;
  const tipoDesconto = temDesconto && aleatorio() < 0.5 ? 'percentual' : 'fixo';
  const valorDesconto = temDesconto ? (tipoDesconto === 'percentual' ? 10 : 5) : 0;
  const desconto = centavos(tipoDesconto === 'percentual' ? valorItens * valorDesconto / 100 : valorDesconto);
  const total = centavos(valorItens + frete - desconto);
  const dataPedido = dia(dataEntrega, -sortear([5, 7, 10, 14]));
  const diasAteEntrega = (new Date(dataEntrega) - new Date(HOJE)) / 86400000;

  let status; let pagos = [];
  const sinal = centavos(total / 2);
  if (diasAteEntrega < 0) {
    const r = aleatorio();
    if (r < 0.05) status = 'cancelado';
    else if (r < 0.12) { status = 'entregue_nao_pago'; pagos = [[dataPedido, sinal]]; }
    else { status = 'entregue'; pagos = aleatorio() < 0.7 ? [[dataPedido, sinal], [dataEntrega, centavos(total - sinal)]] : [[dataEntrega, total]]; }
  } else if (diasAteEntrega <= 2) { status = sortear(['em_producao', 'pronto']); pagos = [[dataPedido, sinal]]; }
  else if (diasAteEntrega <= 14) { status = sortear(['confirmado', 'confirmado', 'aguardando_sinal']); if (status === 'confirmado') pagos = [[dataPedido, sinal]]; }
  else { status = sortear(['orcamento', 'aguardando_sinal', 'confirmado']); if (status === 'confirmado') pagos = [[dataPedido, sinal]]; }
  pagos = pagos.filter(([d]) => d <= HOJE);
  const pago = centavos(pagos.reduce((s, [, v]) => s + v, 0));

  const pedido = {
    id: id('ped'), cliente_id: cliente.id, data_pedido: dataPedido, data_entrega: dataEntrega,
    hora_entrega: sortear(['09:00', '10:30', '14:00', '15:30', '17:00', null]),
    tipo_entrega: entregaEmCasa ? 'entrega' : 'retirada', endereco_entrega: entregaEmCasa ? cliente.endereco : null,
    valor_frete: frete, tipo_desconto: tipoDesconto, valor_desconto: valorDesconto, valor_itens: valorItens, valor_total: total,
    valor_pago: pago, saldo: centavos(total - pago), status, data_festiva: ehFestiva(dataEntrega) ? 1 : 0,
    observacoes: aleatorio() < 0.15 ? sortear(['Aniversário de 30 anos', 'Sem lactose no recheio, se possível', 'Cliente busca no portão']) : null,
    atualizado_em: AGORA,
  };
  pedidos.push(pedido);
  meusItens.forEach((i) => itens.push({ ...i, pedido_id: pedido.id }));
  pagos.forEach(([data, valor]) => pagamentos.push({ id: id('pag'), pedido_id: pedido.id, data, valor, forma: sortear(formas) }));
});

// ---------- despesas ----------
const despesas = [];
for (const mes of ['2026-08', '2026-09', '2026-10', '2026-11']) {
  const lista = [
    ['Compra de insumos no atacado', 'insumos', 180 + Math.round(aleatorio() * 120), '05', 'pix'],
    ['Reposição de insumos', 'insumos', 90 + Math.round(aleatorio() * 80), '18', 'pix'],
    ['Forminhas e caixas', 'embalagens', 45 + Math.round(aleatorio() * 30), '08', 'cartao'],
    ['Botijão de gás', 'gas', 125, '10', 'dinheiro'],
    ['Conta de energia (parte da cozinha)', 'energia', 70 + Math.round(aleatorio() * 30), '15', 'boleto'],
    ['Impulsionamento no Instagram', 'marketing', 50, '20', 'cartao'],
  ];
  for (const [descricao, categoria, valor, d, forma] of lista) {
    const data = `${mes}-${d}`;
    if (data > HOJE) continue;
    despesas.push({ id: id('des'), descricao, categoria, valor, data, forma_pagamento: forma, observacoes: null });
  }
}
despesas.push({ id: id('des'), descricao: 'Batedeira planetária', categoria: 'equipamentos', valor: 649.9, data: '2026-09-12', forma_pagamento: 'cartao', observacoes: 'Parcelado em 10x' });

const backup = {
  app: 'MinhaConfeitaria', formato: 1, versao_banco: 5, gerado_em: AGORA,
  configuracao: { margem_padrao: 50, endereco_retirada: 'Rua das Flores, 123 – Centro, Canoas/RS' },
  tabelas: {
    categoria: categorias, cliente: clientes, insumo: Object.values(insumos), embalagem: Object.values(embalagens),
    data_festiva: datasFestivas, massa: Object.values(massas), produto: Object.values(produtos), produto_insumo: fichas,
    produto_componente: componentesTab, config_doce: configDoce, doce_massa: doceMassa, produto_embalagem: prodEmb,
    pedido: pedidos, item_pedido: itens, pagamento: pagamentos, despesa: despesas,
  },
};
writeFileSync(new URL('../banco/backup_exemplo.json', import.meta.url), JSON.stringify(backup, null, 1));
const st = pedidos.reduce((m, p) => ({ ...m, [p.status]: (m[p.status] ?? 0) + 1 }), {});
console.log(`banco/backup_exemplo.json: ${clientes.length} clientes, ${Object.keys(produtos).length} produtos, ${pedidos.length} pedidos`, st,
  `${pagamentos.length} pagamentos, ${despesas.length} despesas`);
