import { describe, expect, it, vi } from 'vitest';

// As regras são testadas sem banco: a conexão é substituída por um módulo vazio.
vi.mock('@/dados/conexao', () => ({ gerarId: () => 'id', agoraIso: () => '2026-01-01T00:00:00Z' }));

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

const { calcularTotais, statusPermitidos, statusAposPagamento, statusDeEntrega, mensagemResumoPedido, linkWhatsApp } = await import('../regrasPedido');
const { calcularMassas, montarCaixaDegustacao, calcularInsumos, calcularEmbalagens, quantidadeLegivel } = await import('../producaoServico');

describe('RN14 – totais do pedido', () => {
  const itens = [{ quantidade: 50, preco_unitario: 2.5 }, { quantidade: 1, preco_unitario: 80 }];
  it('soma itens, frete e desconto fixo', () => {
    const t = calcularTotais({ itens, tipo_entrega: 'entrega', valor_frete: 10, tipo_desconto: 'fixo', valor_desconto: 15 });
    expect(t).toMatchObject({ valor_itens: 205, valor_frete: 10, desconto_aplicado: 15, valor_total: 200, saldo: 200 });
  });
  it('desconto percentual incide sobre os itens', () => {
    const t = calcularTotais({ itens, tipo_entrega: 'entrega', valor_frete: 10, tipo_desconto: 'percentual', valor_desconto: 10, valor_pago: 50 });
    expect(t.desconto_aplicado).toBe(20.5);
    expect(t.valor_total).toBe(194.5);
    expect(t.saldo).toBe(144.5);
  });
  it('retirada não cobra frete', () => {
    expect(calcularTotais({ itens, tipo_entrega: 'retirada', valor_frete: 10 }).valor_frete).toBe(0);
  });
});

describe('RN13 – ciclo do pedido', () => {
  it('pagamento do sinal confirma o pedido', () => expect(statusAposPagamento('aguardando_sinal', 50)).toBe('confirmado'));
  it('quitar pedido entregue não pago o torna entregue', () => expect(statusAposPagamento('entregue_nao_pago', 0)).toBe('entregue'));
  it('entrega com saldo fica como não paga', () => {
    expect(statusDeEntrega(10)).toBe('entregue_nao_pago');
    expect(statusDeEntrega(0)).toBe('entregue');
  });
  it('pedido entregue não volta para produção nem é cancelado', () => {
    expect(statusPermitidos('entregue', 0)).toEqual([]);
    expect(statusPermitidos('pronto', 0)).toContain('cancelado');
    expect(statusPermitidos('cancelado', 0)).toEqual(['orcamento']);
  });
  it('monta a mensagem de resumo e o link do WhatsApp', () => {
    const texto = mensagemResumoPedido({
      tipo_entrega: 'retirada', data_entrega: '2026-11-20', hora_entrega: '15:00', valor_frete: 0, valor_total: 125,
      itens: [{ produto_nome: 'Brigadeiro', quantidade: 50, preco_unitario: 2.5, subtotal: 125 }],
    }, { endereco_retirada: 'Rua A, 1', mensagem_pagamento: '50% na {tipo}.' });
    expect(texto).toContain('50% na retirada.');
    expect(texto).toContain('📍 Endereço: Rua A, 1');
    expect(linkWhatsApp('(51) 99999-0000')).toBe('https://wa.me/5551999990000');
  });
});

describe('RN09 a RN11 – calculadoras', () => {
  const configs = [
    { produto_id: 'brig', produto_nome: 'Brigadeiro', peso_unitario_g: 20, massas: [{ massa_id: 'preta', massa_nome: 'Preta', percentual: 100, rendimento_g: 850 }] },
    { produto_id: 'casad', produto_nome: 'Casadinho', peso_unitario_g: 20, massas: [
      { massa_id: 'preta', massa_nome: 'Preta', percentual: 50, rendimento_g: 850 },
      { massa_id: 'branca', massa_nome: 'Branca', percentual: 50, rendimento_g: 800 }] },
  ];
  it('calcula gramas e receitas arredondadas em 0,5', () => {
    const { massas } = calcularMassas({ brig: 100, casad: 40 }, configs);
    const preta = massas.find((m) => m.massa_id === 'preta');
    expect(preta.gramas).toBe(2400);
    expect(preta.receitas_exatas).toBeCloseTo(2.8235, 3);
    expect(preta.receitas).toBe(3);
    expect(massas.find((m) => m.massa_id === 'branca').receitas).toBe(0.5);
  });
  it('monta a caixa degustação com 1 de cada sabor e completa as vagas', () => {
    const q = montarCaixaDegustacao(configs, ['brig', 'casad'], 4, 10);
    expect(q.brig + q.casad).toBe(40);
    expect(q.brig).toBeGreaterThanOrEqual(10);
    expect(q.casad).toBeGreaterThanOrEqual(10);
    expect(() => montarCaixaDegustacao(configs, ['brig', 'casad'], 1, 1)).toThrow('pelo menos 2 lugares');
  });
  it('soma os insumos expandindo componentes', () => {
    const produtos = [{ id: 'massa', rendimento: 1000 }, { id: 'bolo', rendimento: 1 }];
    const fichas = [
      { produto_id: 'massa', insumo_id: 'farinha', insumo_nome: 'Farinha', insumo_unidade: 'kg', quantidade: 600 },
      { produto_id: 'bolo', insumo_id: 'ovo', insumo_nome: 'Ovo', insumo_unidade: 'un', quantidade: 3 },
    ];
    const componentes = [{ produto_id: 'bolo', componente_id: 'massa', quantidade: 500 }];
    const { insumos } = calcularInsumos({ bolo: 2 }, produtos, fichas, componentes);
    expect(insumos.find((i) => i.insumo_id === 'farinha')).toMatchObject({ quantidade: 600, unidade: 'g' });
    expect(insumos.find((i) => i.insumo_id === 'ovo').quantidade).toBe(6);
    expect(quantidadeLegivel(2500, 'g')).toBe('2,5 kg');
  });
  it('soma as embalagens e arredonda para compra', () => {
    const { embalagens, semEmbalagem } = calcularEmbalagens({ brig: 10, casad: 3 },
      [{ produto_id: 'brig', embalagem_id: 'cx', embalagem_nome: 'Caixa 4', quantidade: 0.25 }]);
    expect(embalagens[0]).toMatchObject({ quantidade: 2.5, quantidade_compra: 3 });
    expect(semEmbalagem).toEqual(['casad']);
  });
});

const { montarRelatorioVendas, montarFluxoCaixa } = await import('../financeiroServico');
const { validarConteudo } = await import('../backupServico');

describe('RN15 e RN16 – relatório de vendas e fluxo de caixa', () => {
  const itens = [
    { pedido_id: 'p1', produto_id: 'brig', produto_nome: 'Brigadeiro', categoria_id: 'doces', categoria_nome: 'Doces', quantidade: 100, preco_unitario: 2.5, custo_unitario: 1.22, subtotal: 250 },
    { pedido_id: 'p2', produto_id: 'bolo', produto_nome: 'Bolo', categoria_id: 'bolos', categoria_nome: 'Bolos', quantidade: 1, preco_unitario: 120, custo_unitario: 60, subtotal: 120 },
    { pedido_id: 'p2', produto_id: 'brig', produto_nome: 'Brigadeiro', categoria_id: 'doces', categoria_nome: 'Doces', quantidade: 20, preco_unitario: 2.5, custo_unitario: 1.3, subtotal: 50 },
  ];
  const pedidos = [{ id: 'p1', valor_total: 260 }, { id: 'p2', valor_total: 170 }];

  it('usa o custo gravado no item e o total dos pedidos', () => {
    const r = montarRelatorioVendas(itens, pedidos);
    expect(r.faturamento).toBe(430);
    expect(r.custo).toBe(208);
    expect(r.lucro).toBe(222);
    expect(r.margem).toBeCloseTo(51.63, 2);
    expect(r.ticketMedio).toBe(215);
    expect(r.produtos.find((p) => p.id === 'brig')).toMatchObject({ quantidade: 120, valor: 300 });
  });
  it('com filtro de categoria, considera só os itens da categoria', () => {
    const r = montarRelatorioVendas(itens, pedidos, 'doces');
    expect(r.faturamento).toBe(300);
    expect(r.pedidos).toBe(2);
  });
  it('fluxo de caixa: entradas menos saídas, agrupando despesas', () => {
    const f = montarFluxoCaixa([{ valor: 100 }, { valor: 135 }], [{ categoria: 'gas', valor: 120 }, { categoria: 'insumos', valor: 80.5 }, { categoria: 'gas', valor: 10 }]);
    expect(f).toMatchObject({ entradas: 235, saidas: 210.5, saldo: 24.5 });
    expect(f.porCategoria[0]).toMatchObject({ categoria: 'gas', valor: 130 });
  });
});

describe('RF21 e RF22 – validação do arquivo de backup', () => {
  const valido = { app: 'MinhaConfeitaria', formato: 1, versao_banco: 5, gerado_em: '2026-11-01T10:00:00Z', tabelas: { cliente: [{ id: 'c1' }], pedido: [] } };
  it('aceita um backup válido e resume o conteúdo', () => {
    expect(validarConteudo(JSON.stringify(valido), 5).resumo).toMatchObject({ clientes: 1, pedidos: 0 });
  });
  it('recusa arquivo de outro aplicativo, corrompido ou de versão mais nova', () => {
    expect(() => validarConteudo('{"a":1}', 5)).toThrow('não é um backup do MinhaConfeitaria');
    expect(() => validarConteudo('não é json', 5)).toThrow('formato inválido');
    expect(() => validarConteudo(JSON.stringify({ ...valido, versao_banco: 9 }), 5)).toThrow('versão mais nova');
    expect(() => validarConteudo(JSON.stringify({ ...valido, tabelas: { cliente: 'x' } }), 5)).toThrow('corrompido');
  });
});
