import { describe, expect, it, vi } from 'vitest';

// As regras são testadas sem banco: a conexão é substituída por um módulo vazio.
vi.mock('@/dados/conexao', () => ({ gerarId: () => 'id', agoraIso: () => '2026-01-01T00:00:00Z' }));
vi.mock('@/dados/legado', () => ({ lerLegado: async () => [] }));

const { calcularCustoPorUnidade } = await import('../insumoServico');
const { encontrarDataFestiva, domingoDePascoa, datasPadrao } = await import('../dataFestivaServico');
const { exigirNumero, exigirTexto } = await import('../erros');

describe('RN01 – custo por unidade base do insumo', () => {
  it('converte kg para gramas', () => {
    expect(calcularCustoPorUnidade(25, 5, 'kg')).toBeCloseTo(0.005, 6);
  });
  it('converte litros para mililitros', () => {
    expect(calcularCustoPorUnidade(8, 1, 'L')).toBeCloseTo(0.008, 6);
  });
  it('mantém gramas e unidades', () => {
    expect(calcularCustoPorUnidade(7.5, 395, 'g')).toBeCloseTo(0.018987, 5);
    expect(calcularCustoPorUnidade(15, 30, 'un')).toBeCloseTo(0.5, 6);
  });
  it('rejeita unidade inválida', () => {
    expect(() => calcularCustoPorUnidade(1, 1, 'xícara')).toThrow('Unidade de medida inválida');
  });
});

describe('RN17 – datas festivas', () => {
  const natal = { nome: 'Natal', data_inicio: '2025-12-10', data_fim: '2025-12-25', recorrente: true };
  const anoNovo = { nome: 'Ano Novo', data_inicio: '2025-12-28', data_fim: '2026-01-02', recorrente: true };
  const pascoa = { nome: 'Páscoa', data_inicio: '2026-03-29', data_fim: '2026-04-05', recorrente: false };

  it('reconhece data recorrente em outro ano', () => {
    expect(encontrarDataFestiva([natal], '2027-12-20')?.nome).toBe('Natal');
    expect(encontrarDataFestiva([natal], '2027-12-26')).toBeNull();
  });
  it('trata período que atravessa a virada do ano', () => {
    expect(encontrarDataFestiva([anoNovo], '2027-01-01')?.nome).toBe('Ano Novo');
    expect(encontrarDataFestiva([anoNovo], '2027-12-29')?.nome).toBe('Ano Novo');
  });
  it('data não recorrente vale só no próprio ano', () => {
    expect(encontrarDataFestiva([pascoa], '2026-04-01')?.nome).toBe('Páscoa');
    expect(encontrarDataFestiva([pascoa], '2027-04-01')).toBeNull();
  });
  it('calcula o domingo de Páscoa', () => {
    expect(domingoDePascoa(2026).toDateString()).toBe(new Date(2026, 3, 5).toDateString());
    expect(domingoDePascoa(2027).toDateString()).toBe(new Date(2027, 2, 28).toDateString());
  });
  it('Dia das Mães é o 2º domingo de maio', () => {
    const maes = datasPadrao(2026).find((d) => d.nome === 'Dia das Mães');
    expect(maes.data_fim).toBe('2026-05-10');
  });
});

describe('Validações', () => {
  it('aceita número com vírgula', () => {
    expect(exigirNumero('7,50', 'O preço')).toBe(7.5);
  });
  it('recusa zero quando deve ser positivo', () => {
    expect(() => exigirNumero('0', 'A quantidade', { maiorQueZero: true })).toThrow('maior que zero');
  });
  it('recusa texto vazio', () => {
    expect(() => exigirTexto('   ', 'o nome')).toThrow('Informe o nome.');
  });
});

const { calcularCustosProduto, produtosAbaixoDoSugerido, criaCiclo } = await import('../custoServico');

describe('RN03 a RN06 – custo e preço do produto (exemplo da AP2: brigadeiro)', () => {
  const brigadeiro = calcularCustosProduto({
    insumos: [
      { quantidade: 790, custo_por_unidade: 7.5 / 395 }, // leite condensado
      { quantidade: 20, custo_por_unidade: 12 / 200 }, // manteiga
      { quantidade: 40, custo_por_unidade: 18 / 200 }, // cacau
      { quantidade: 40, custo_por_unidade: 5 / 100 }, // forminhas
    ],
    mao_obra_tipo: 'fixo', mao_obra_valor: 24, outros_custos: 3, rendimento: 40, margem_lucro: 50, preco_venda: 2.5,
  });
  it('soma os insumos', () => expect(brigadeiro.custo_insumos).toBeCloseTo(21.8, 4));
  it('calcula o custo total e unitário', () => {
    expect(brigadeiro.custo_total).toBeCloseTo(48.8, 4);
    expect(brigadeiro.custo_unitario).toBeCloseTo(1.22, 4);
  });
  it('calcula o preço sugerido pela margem', () => expect(brigadeiro.preco_sugerido).toBeCloseTo(2.44, 4));
  it('calcula a margem real pelo preço de venda', () => expect(brigadeiro.margem_real).toBeCloseTo(51.2, 1));

  it('mão de obra percentual incide sobre insumos + outros custos', () => {
    const r = calcularCustosProduto({ insumos: [{ quantidade: 1, custo_por_unidade: 10 }], mao_obra_tipo: 'percentual',
      mao_obra_valor: 50, outros_custos: 2, rendimento: 1 });
    expect(r.mao_obra_calculada).toBeCloseTo(6, 6);
    expect(r.custo_total).toBeCloseTo(18, 6);
  });
  it('componente entra pelo custo unitário de insumos', () => {
    const r = calcularCustosProduto({ componentes: [{ quantidade: 2, custo_unitario_insumos: 1.5 }], rendimento: 1 });
    expect(r.custo_insumos).toBeCloseTo(3, 6);
  });
});

describe('RN07 e RN02 – revisão de preços e componentes', () => {
  it('lista só produtos ativos abaixo do limite', () => {
    const lista = produtosAbaixoDoSugerido([
      { id: 'a', ativo: true, preco_sugerido: 10, preco_venda: 8 },
      { id: 'b', ativo: true, preco_sugerido: 10, preco_venda: 9.5 },
      { id: 'c', ativo: false, preco_sugerido: 10, preco_venda: 5 },
    ], 10);
    expect(lista.map((p) => p.id)).toEqual(['a']);
    expect(lista[0].diferenca).toBe(20);
  });
  it('detecta ciclo entre componentes', () => {
    const mapa = { B: ['C'], C: ['A'] };
    expect(criaCiclo('A', 'B', mapa)).toBe(true);
    expect(criaCiclo('A', 'D', mapa)).toBe(false);
  });
});
