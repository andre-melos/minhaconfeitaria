// TEMPORÁRIO: entrega os cadastros já migrados no formato de campos que as telas do protótipo
// ainda não migradas (pedidos, produtos, calculadoras e relatórios) esperam.
// Cada tela migrada nos próximos sprints deixa de usar este arquivo, que será removido no Sprint 4.
import { clienteServico } from './clienteServico';
import { categoriaServico } from './categoriaServico';
import { insumoServico } from './insumoServico';
import { embalagemServico } from './embalagemServico';
import { dataFestivaServico } from './dataFestivaServico';
import { massaServico } from './massaServico';
import { produtoRepositorio } from '@/dados/repositorios/produtoRepositorio';

export async function clientesNoFormatoAntigo() {
  return (await clienteServico.listar()).map((c) => ({
    id: c.id, name: c.nome, phone: c.telefone, address: c.endereco, notes: c.observacoes,
  }));
}

export async function criarClienteNoFormatoAntigo(dados) {
  const c = await clienteServico.salvar({
    nome: dados.name, telefone: dados.phone, endereco: dados.address, observacoes: dados.notes,
  });
  return { id: c.id, name: c.nome, phone: c.telefone, address: c.endereco, notes: c.observacoes };
}

export async function categoriasNoFormatoAntigo() {
  return (await categoriaServico.listar()).map((c) => ({ id: c.id, name: c.nome, emoji: c.emoji, active: c.ativa }));
}

export async function insumosNoFormatoAntigo() {
  return (await insumoServico.listar()).map((i) => ({
    id: i.id,
    name: i.nome,
    price: i.preco,
    weight: i.qtd_embalagem,
    unit: i.unidade === 'un' ? 'unidade' : i.unidade,
    supplier: i.fornecedor,
    notes: i.observacoes,
  }));
}

export async function embalagensNoFormatoAntigo() {
  return (await embalagemServico.listar()).map((e) => ({ id: e.id, name: e.nome, description: e.descricao, active: e.ativa }));
}

export async function datasFestivasNoFormatoAntigo() {
  return (await dataFestivaServico.listar()).map((d) => ({
    id: d.id, name: d.nome, date: d.data_inicio, end_date: d.data_fim, recurring: d.recorrente, notes: d.observacoes,
  }));
}

const UNIDADE_BASE = { g: 'g', kg: 'g', ml: 'ml', L: 'ml', un: 'unidade' };

/** Produtos com ficha técnica no formato do protótipo (quantidades já na unidade base). */
export async function produtosNoFormatoAntigo() {
  const [produtos, insumos, componentes] = await Promise.all([
    produtoRepositorio.listar(), produtoRepositorio.todosInsumosDasFichas(), produtoRepositorio.todosComponentes(),
  ]);
  const porId = new Map(produtos.map((p) => [p.id, p]));
  return produtos.map((p) => ({
    id: p.id,
    name: p.nome,
    category: p.categoria_id,
    price: p.preco_venda,
    suggested_price: p.preco_sugerido,
    profit_margin: p.margem_lucro,
    ingredients_cost: p.custo_insumos,
    labor_cost: p.mao_obra_valor,
    labor_cost_type: p.mao_obra_tipo === 'percentual' ? 'percent' : 'fixed',
    labor_cost_calculated: p.mao_obra_calculada,
    other_costs: p.outros_custos,
    total_cost: p.custo_total,
    unit_cost: p.custo_unitario,
    yield_quantity: p.rendimento,
    notes: p.observacoes,
    active: p.ativo,
    ingredients: insumos.filter((i) => i.produto_id === p.id).map((i) => ({
      ingredient_id: i.insumo_id, ingredient_name: i.insumo_nome, quantity: i.quantidade,
      unit: UNIDADE_BASE[i.insumo_unidade], cost: i.custo,
    })),
    sub_products: componentes.filter((c) => c.produto_id === p.id).map((c) => {
      const comp = porId.get(c.componente_id);
      return {
        product_id: c.componente_id, product_name: c.componente_nome, quantity: c.quantidade,
        unit_cost: comp ? comp.custo_insumos / comp.rendimento : 0, cost: c.custo,
      };
    }),
  }));
}

export async function massasNoFormatoAntigo() {
  return (await massaServico.listar()).map((m) => ({
    id: m.id, name: m.nome, recipe_yield_grams: m.rendimento_g, notes: m.observacoes, active: m.ativa,
  }));
}

export async function configuracoesDocesNoFormatoAntigo() {
  return (await massaServico.listarConfiguracoes()).map((c) => ({
    id: c.id,
    product_id: c.produto_id,
    product_name: c.produto_nome,
    unit_weight_grams: c.peso_unitario_g,
    doughs: c.massas.map((m) => ({ dough_id: m.massa_id, dough_name: m.massa_nome, percentage: m.percentual })),
  }));
}

export async function configuracoesEmbalagensNoFormatoAntigo() {
  const itens = await produtoRepositorio.todasEmbalagens();
  const produtos = new Map((await produtoRepositorio.listar()).map((p) => [p.id, p.nome]));
  const porProduto = {};
  for (const e of itens) {
    (porProduto[e.produto_id] ??= []).push({ packaging_id: e.embalagem_id, packaging_name: e.embalagem_nome, quantity: e.quantidade });
  }
  return Object.entries(porProduto).map(([id, packagings]) => ({
    id, product_id: id, product_name: produtos.get(id), packagings,
  }));
}
