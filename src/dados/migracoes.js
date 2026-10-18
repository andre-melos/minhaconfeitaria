// Migrações do esquema do banco. Cada versão é aplicada uma única vez, em ordem,
// e fica registrada na tabela "migracao". Nunca altere uma migração já publicada:
// crie uma nova versão.

const TABELAS_LEGADAS_DO_PROTOTIPO = [
  'orders', 'products', 'expenses', 'dough_types', 'sweet_configs', 'packaging_configs',
];

const MIGRACOES = [
  {
    versao: 1,
    descricao: 'Tabelas do Sprint 1 (cadastros e configuração) e tabelas do protótipo ainda não migradas',
    sql: `
      CREATE TABLE IF NOT EXISTS cliente (
        id TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        telefone TEXT NOT NULL,
        endereco TEXT,
        observacoes TEXT,
        criado_em TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cliente_nome ON cliente(nome);

      CREATE TABLE IF NOT EXISTS categoria (
        id TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        emoji TEXT,
        ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS insumo (
        id TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        unidade TEXT NOT NULL CHECK (unidade IN ('g', 'kg', 'ml', 'L', 'un')),
        qtd_embalagem REAL NOT NULL CHECK (qtd_embalagem > 0),
        preco REAL NOT NULL CHECK (preco >= 0),
        custo_por_unidade REAL NOT NULL,
        fornecedor TEXT,
        observacoes TEXT,
        atualizado_em TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_insumo_nome ON insumo(nome);

      CREATE TABLE IF NOT EXISTS embalagem (
        id TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        descricao TEXT,
        ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS data_festiva (
        id TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        data_inicio TEXT NOT NULL,
        data_fim TEXT,
        recorrente INTEGER NOT NULL DEFAULT 1 CHECK (recorrente IN (0, 1)),
        observacoes TEXT
      );

      CREATE TABLE IF NOT EXISTS configuracao (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        margem_padrao REAL NOT NULL DEFAULT 50 CHECK (margem_padrao >= 0 AND margem_padrao <= 95),
        pin_hash TEXT,
        pin_salt TEXT,
        ultimo_backup_em TEXT
      );
      INSERT OR IGNORE INTO configuracao (id, margem_padrao) VALUES (1, 50);

      ${TABELAS_LEGADAS_DO_PROTOTIPO.map((tabela) => `
      CREATE TABLE IF NOT EXISTS ${tabela} (
        id TEXT PRIMARY KEY NOT NULL,
        created_date TEXT NOT NULL,
        payload TEXT NOT NULL
      );`).join('\n')}
    `,
  },
  {
    versao: 2,
    descricao: 'Copia os cadastros do protótipo (formato JSON) para as tabelas relacionais e remove o estoque',
    executar: migrarCadastrosDoPrototipo,
  },
  {
    versao: 3,
    descricao: 'Sprint 2: produtos com ficha técnica, massas, configuração dos doces e embalagens por produto',
    sql: `
      CREATE TABLE IF NOT EXISTS produto (
        id TEXT PRIMARY KEY NOT NULL,
        categoria_id TEXT REFERENCES categoria(id) ON DELETE RESTRICT,
        nome TEXT NOT NULL,
        rendimento REAL NOT NULL CHECK (rendimento > 0),
        custo_insumos REAL NOT NULL DEFAULT 0,
        mao_obra_tipo TEXT NOT NULL DEFAULT 'fixo' CHECK (mao_obra_tipo IN ('fixo', 'percentual')),
        mao_obra_valor REAL NOT NULL DEFAULT 0 CHECK (mao_obra_valor >= 0),
        mao_obra_calculada REAL NOT NULL DEFAULT 0,
        outros_custos REAL NOT NULL DEFAULT 0 CHECK (outros_custos >= 0),
        custo_total REAL NOT NULL DEFAULT 0,
        custo_unitario REAL NOT NULL DEFAULT 0,
        margem_lucro REAL NOT NULL DEFAULT 50 CHECK (margem_lucro >= 0 AND margem_lucro <= 95),
        preco_sugerido REAL NOT NULL DEFAULT 0,
        preco_venda REAL NOT NULL DEFAULT 0 CHECK (preco_venda >= 0),
        observacoes TEXT,
        ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
        atualizado_em TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_produto_nome ON produto(nome);

      CREATE TABLE IF NOT EXISTS produto_insumo (
        id TEXT PRIMARY KEY NOT NULL,
        produto_id TEXT NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
        insumo_id TEXT NOT NULL REFERENCES insumo(id) ON DELETE RESTRICT,
        quantidade REAL NOT NULL CHECK (quantidade > 0),
        custo REAL NOT NULL DEFAULT 0,
        UNIQUE (produto_id, insumo_id)
      );
      CREATE INDEX IF NOT EXISTS idx_produto_insumo_insumo ON produto_insumo(insumo_id);

      CREATE TABLE IF NOT EXISTS produto_componente (
        id TEXT PRIMARY KEY NOT NULL,
        produto_id TEXT NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
        componente_id TEXT NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
        quantidade REAL NOT NULL CHECK (quantidade > 0),
        custo REAL NOT NULL DEFAULT 0,
        CHECK (produto_id <> componente_id),
        UNIQUE (produto_id, componente_id)
      );

      CREATE TABLE IF NOT EXISTS massa (
        id TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        rendimento_g REAL NOT NULL CHECK (rendimento_g > 0),
        observacoes TEXT,
        ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS config_doce (
        id TEXT PRIMARY KEY NOT NULL,
        produto_id TEXT NOT NULL UNIQUE REFERENCES produto(id) ON DELETE CASCADE,
        peso_unitario_g REAL NOT NULL CHECK (peso_unitario_g > 0)
      );

      CREATE TABLE IF NOT EXISTS doce_massa (
        id TEXT PRIMARY KEY NOT NULL,
        config_doce_id TEXT NOT NULL REFERENCES config_doce(id) ON DELETE CASCADE,
        massa_id TEXT NOT NULL REFERENCES massa(id) ON DELETE RESTRICT,
        percentual REAL NOT NULL CHECK (percentual > 0 AND percentual <= 100),
        UNIQUE (config_doce_id, massa_id)
      );

      CREATE TABLE IF NOT EXISTS produto_embalagem (
        id TEXT PRIMARY KEY NOT NULL,
        produto_id TEXT NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
        embalagem_id TEXT NOT NULL REFERENCES embalagem(id) ON DELETE RESTRICT,
        quantidade REAL NOT NULL CHECK (quantidade > 0),
        UNIQUE (produto_id, embalagem_id)
      );
    `,
    executar: migrarProdutosDoPrototipo,
  },
  {
    versao: 4,
    descricao: 'Sprint 3: pedidos, itens com custo gravado, pagamentos e textos de mensagem',
    sql: `
      CREATE TABLE IF NOT EXISTS pedido (
        id TEXT PRIMARY KEY NOT NULL,
        cliente_id TEXT NOT NULL REFERENCES cliente(id) ON DELETE RESTRICT,
        data_pedido TEXT NOT NULL,
        data_entrega TEXT NOT NULL,
        hora_entrega TEXT,
        tipo_entrega TEXT NOT NULL CHECK (tipo_entrega IN ('retirada', 'entrega')),
        endereco_entrega TEXT,
        valor_frete REAL NOT NULL DEFAULT 0 CHECK (valor_frete >= 0),
        tipo_desconto TEXT NOT NULL DEFAULT 'fixo' CHECK (tipo_desconto IN ('fixo', 'percentual')),
        valor_desconto REAL NOT NULL DEFAULT 0 CHECK (valor_desconto >= 0),
        valor_itens REAL NOT NULL DEFAULT 0,
        valor_total REAL NOT NULL DEFAULT 0,
        valor_pago REAL NOT NULL DEFAULT 0,
        saldo REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'orcamento' CHECK (status IN ('orcamento', 'aguardando_sinal', 'confirmado',
          'em_producao', 'pronto', 'entregue', 'entregue_nao_pago', 'cancelado')),
        data_festiva INTEGER NOT NULL DEFAULT 0 CHECK (data_festiva IN (0, 1)),
        observacoes TEXT,
        atualizado_em TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pedido_entrega ON pedido(data_entrega);
      CREATE INDEX IF NOT EXISTS idx_pedido_cliente ON pedido(cliente_id);

      CREATE TABLE IF NOT EXISTS item_pedido (
        id TEXT PRIMARY KEY NOT NULL,
        pedido_id TEXT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
        produto_id TEXT NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
        quantidade REAL NOT NULL CHECK (quantidade > 0),
        preco_unitario REAL NOT NULL CHECK (preco_unitario >= 0),
        custo_unitario REAL NOT NULL DEFAULT 0,
        subtotal REAL NOT NULL,
        observacoes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_item_pedido_pedido ON item_pedido(pedido_id);
      CREATE INDEX IF NOT EXISTS idx_item_pedido_produto ON item_pedido(produto_id);

      CREATE TABLE IF NOT EXISTS pagamento (
        id TEXT PRIMARY KEY NOT NULL,
        pedido_id TEXT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        valor REAL NOT NULL CHECK (valor > 0),
        forma TEXT NOT NULL CHECK (forma IN ('pix', 'dinheiro', 'cartao', 'transferencia', 'outro'))
      );
      CREATE INDEX IF NOT EXISTS idx_pagamento_data ON pagamento(data);

      ALTER TABLE configuracao ADD COLUMN endereco_retirada TEXT;
      ALTER TABLE configuracao ADD COLUMN mensagem_pagamento TEXT;
      UPDATE configuracao SET mensagem_pagamento =
        'O pagamento deverá ser realizado 50% no momento do pedido e 50% na {tipo}. O pedido somente será confirmado após o pagamento do sinal.'
      WHERE id = 1;
    `,
    executar: migrarPedidosDoPrototipo,
  },
  {
    versao: 5,
    descricao: 'Sprint 4: despesas relacionais (fluxo de caixa); fim das tabelas do protótipo',
    sql: `
      CREATE TABLE IF NOT EXISTS despesa (
        id TEXT PRIMARY KEY NOT NULL,
        descricao TEXT NOT NULL,
        categoria TEXT NOT NULL CHECK (categoria IN ('insumos', 'embalagens', 'equipamentos', 'aluguel', 'energia', 'agua',
          'gas', 'transporte', 'marketing', 'impostos', 'salarios', 'outros')),
        valor REAL NOT NULL CHECK (valor > 0),
        data TEXT NOT NULL,
        forma_pagamento TEXT CHECK (forma_pagamento IN ('pix', 'dinheiro', 'cartao', 'transferencia', 'boleto', 'outro')),
        observacoes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_despesa_data ON despesa(data);
    `,
    executar: migrarDespesasDoPrototipo,
  },
];

async function tabelaExiste(db, nome) {
  const linhas = await db.consultar(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [nome]
  );
  return linhas.length > 0;
}

async function lerTabelaAntiga(db, nome) {
  if (!(await tabelaExiste(db, nome))) return [];
  const linhas = await db.consultar(`SELECT id, created_date, payload FROM ${nome}`);
  return linhas.map((linha) => ({ id: linha.id, created_date: linha.created_date, ...JSON.parse(linha.payload) }));
}

const texto = (valor) => (valor === undefined || valor === null || valor === '' ? null : String(valor));
const numero = (valor, padrao = 0) => (Number.isFinite(Number(valor)) ? Number(valor) : padrao);
const unidadeNova = (unidade) => (unidade === 'unidade' ? 'un' : unidade || 'g');
const fatorBase = (unidade) => (unidade === 'kg' || unidade === 'L' ? 1000 : 1);

async function migrarCadastrosDoPrototipo(db) {
  const agora = new Date().toISOString();

  for (const c of await lerTabelaAntiga(db, 'clients')) {
    await db.executar(
      'INSERT OR IGNORE INTO cliente (id, nome, telefone, endereco, observacoes, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, c.name || 'Sem nome', c.phone || '', texto(c.address), texto(c.notes), c.created_date || agora]
    );
  }
  for (const c of await lerTabelaAntiga(db, 'categories')) {
    await db.executar(
      'INSERT OR IGNORE INTO categoria (id, nome, emoji, ativa) VALUES (?, ?, ?, ?)',
      [c.id, c.name || 'Sem nome', texto(c.emoji), c.active === false ? 0 : 1]
    );
  }
  for (const i of await lerTabelaAntiga(db, 'ingredients')) {
    const qtd = numero(i.weight, 1) > 0 ? numero(i.weight, 1) : 1;
    const preco = Math.max(0, numero(i.price));
    const unidade = unidadeNova(i.unit);
    await db.executar(
      `INSERT OR IGNORE INTO insumo
        (id, nome, unidade, qtd_embalagem, preco, custo_por_unidade, fornecedor, observacoes, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [i.id, i.name || 'Sem nome', unidade, qtd, preco, preco / (qtd * fatorBase(unidade)), texto(i.supplier), texto(i.notes), agora]
    );
  }
  for (const e of await lerTabelaAntiga(db, 'packaging')) {
    await db.executar(
      'INSERT OR IGNORE INTO embalagem (id, nome, descricao, ativa) VALUES (?, ?, ?, ?)',
      [e.id, e.name || 'Sem nome', texto(e.description), e.active === false ? 0 : 1]
    );
  }
  for (const d of await lerTabelaAntiga(db, 'holidays')) {
    if (!d.date) continue;
    await db.executar(
      'INSERT OR IGNORE INTO data_festiva (id, nome, data_inicio, data_fim, recorrente, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
      [d.id, d.name || 'Sem nome', d.date, texto(d.end_date), d.recurring === false ? 0 : 1, texto(d.notes)]
    );
  }

  for (const antiga of ['clients', 'categories', 'ingredients', 'packaging', 'holidays', 'stock']) {
    await db.executar(`DROP TABLE IF EXISTS ${antiga}`);
  }

  // Categorias iniciais para quem começa do zero.
  const total = await db.consultar('SELECT COUNT(*) AS total FROM categoria');
  if (total[0].total === 0) {
    const iniciais = [['Bolos', '🎂'], ['Doces', '🍬'], ['Salgados', '🥟']];
    for (const [nome, emoji] of iniciais) {
      await db.executar('INSERT INTO categoria (id, nome, emoji, ativa) VALUES (?, ?, ?, 1)', [crypto.randomUUID(), nome, emoji]);
    }
  }
}

async function migrarProdutosDoPrototipo(db) {
  const agora = new Date().toISOString();
  const categorias = await db.consultar('SELECT id, nome FROM categoria');
  const idCategoria = (valor) => {
    if (!valor) return null;
    const porId = categorias.find((c) => c.id === valor);
    if (porId) return porId.id;
    const porNome = categorias.find((c) => c.nome.toLowerCase().startsWith(String(valor).toLowerCase().slice(0, 4)));
    return porNome ? porNome.id : null;
  };
  const insumos = new Map((await db.consultar('SELECT id, unidade FROM insumo')).map((i) => [i.id, i]));
  const embalagens = new Set((await db.consultar('SELECT id FROM embalagem')).map((e) => e.id));

  const produtos = await lerTabelaAntiga(db, 'products');
  const idsProdutos = new Set(produtos.map((p) => p.id));
  for (const p of produtos) {
    const margem = Math.min(95, Math.max(0, numero(p.profit_margin, 50)));
    await db.executar(
      `INSERT OR IGNORE INTO produto (id, categoria_id, nome, rendimento, mao_obra_tipo, mao_obra_valor, outros_custos,
        margem_lucro, preco_venda, observacoes, ativo, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, idCategoria(p.category), p.name || 'Sem nome', Math.max(1, numero(p.yield_quantity, 1)),
        p.labor_cost_type === 'percent' ? 'percentual' : 'fixo', Math.max(0, numero(p.labor_cost)),
        Math.max(0, numero(p.other_costs)), margem, Math.max(0, numero(p.price)), texto(p.notes),
        p.active === false ? 0 : 1, agora]
    );
    for (const item of p.ingredients || []) {
      const insumo = insumos.get(item.ingredient_id);
      const quantidade = numero(item.quantity) * fatorBase(insumo?.unidade); // protótipo: quantidade na unidade de compra
      if (!insumo || quantidade <= 0) continue;
      await db.executar('INSERT OR IGNORE INTO produto_insumo (id, produto_id, insumo_id, quantidade) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), p.id, insumo.id, quantidade]);
    }
  }
  for (const p of produtos) {
    for (const comp of p.sub_products || []) {
      if (!idsProdutos.has(comp.product_id) || comp.product_id === p.id || numero(comp.quantity) <= 0) continue;
      await db.executar('INSERT OR IGNORE INTO produto_componente (id, produto_id, componente_id, quantidade) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), p.id, comp.product_id, numero(comp.quantity)]);
    }
  }

  const massas = await lerTabelaAntiga(db, 'dough_types');
  const idsMassas = new Set(massas.map((m) => m.id));
  for (const m of massas) {
    await db.executar('INSERT OR IGNORE INTO massa (id, nome, rendimento_g, observacoes, ativa) VALUES (?, ?, ?, ?, ?)',
      [m.id, m.name || 'Sem nome', Math.max(1, numero(m.recipe_yield_grams, 1)), texto(m.notes), m.active === false ? 0 : 1]);
  }
  for (const c of await lerTabelaAntiga(db, 'sweet_configs')) {
    if (!idsProdutos.has(c.product_id) || numero(c.unit_weight_grams) <= 0) continue;
    await db.executar('INSERT OR IGNORE INTO config_doce (id, produto_id, peso_unitario_g) VALUES (?, ?, ?)',
      [c.id, c.product_id, numero(c.unit_weight_grams)]);
    for (const d of c.doughs || []) {
      if (!idsMassas.has(d.dough_id) || numero(d.percentage) <= 0) continue;
      await db.executar('INSERT OR IGNORE INTO doce_massa (id, config_doce_id, massa_id, percentual) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), c.id, d.dough_id, Math.min(100, numero(d.percentage))]);
    }
  }
  for (const c of await lerTabelaAntiga(db, 'packaging_configs')) {
    if (!idsProdutos.has(c.product_id)) continue;
    for (const e of c.packagings || []) {
      if (!embalagens.has(e.packaging_id)) continue;
      await db.executar('INSERT OR IGNORE INTO produto_embalagem (id, produto_id, embalagem_id, quantidade) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), c.product_id, e.packaging_id, Math.max(numero(e.quantity, 1), 0.001)]);
    }
  }

  for (const antiga of ['products', 'dough_types', 'sweet_configs', 'packaging_configs']) {
    await db.executar(`DROP TABLE IF EXISTS ${antiga}`);
  }
  // Os custos dos produtos migrados são calculados pela regra oficial (RN03 a RN06).
  if (db.aposMigrar) db.aposMigrar.push('recalcular-custos');
}

async function migrarPedidosDoPrototipo(db) {
  const agora = new Date().toISOString();
  const clientes = new Set((await db.consultar('SELECT id FROM cliente')).map((c) => c.id));
  const produtos = new Map((await db.consultar('SELECT id, custo_unitario FROM produto')).map((p) => [p.id, p]));
  const STATUS = ['orcamento', 'aguardando_sinal', 'confirmado', 'em_producao', 'pronto', 'entregue', 'entregue_nao_pago', 'cancelado'];
  const FORMAS = ['pix', 'dinheiro', 'cartao', 'transferencia', 'outro'];

  for (const o of await lerTabelaAntiga(db, 'orders')) {
    if (!o.delivery_date) continue;
    let clienteId = o.client_id;
    if (!clientes.has(clienteId)) { // cliente apagado no protótipo: recria a partir dos dados guardados no pedido
      clienteId = crypto.randomUUID();
      await db.executar('INSERT INTO cliente (id, nome, telefone, criado_em) VALUES (?, ?, ?, ?)',
        [clienteId, o.client_name || 'Cliente do protótipo', o.client_phone || '-', agora]);
      clientes.add(clienteId);
    }
    const itens = (o.items || []).filter((i) => produtos.has(i.product_id) && numero(i.quantity) > 0);
    const valorItens = itens.reduce((s, i) => s + numero(i.quantity) * numero(i.unit_price), 0);
    const total = numero(o.total_value, valorItens);
    const pago = Math.max(0, numero(o.paid_value));
    await db.executar(
      `INSERT OR IGNORE INTO pedido (id, cliente_id, data_pedido, data_entrega, hora_entrega, tipo_entrega, endereco_entrega,
        valor_frete, tipo_desconto, valor_desconto, valor_itens, valor_total, valor_pago, saldo, status, data_festiva,
        observacoes, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [o.id, clienteId, o.order_date || (o.created_date || agora).slice(0, 10), o.delivery_date, texto(o.delivery_time),
        o.delivery_type === 'entrega' ? 'entrega' : 'retirada', texto(o.delivery_address), Math.max(0, numero(o.freight_value)),
        o.discount_type === 'percent' ? 'percentual' : 'fixo', Math.max(0, numero(o.discount_value)), valorItens, total, pago,
        Math.max(0, total - pago), STATUS.includes(o.status) ? o.status : 'orcamento', o.is_holiday_order ? 1 : 0,
        texto(o.notes), agora]
    );
    for (const i of itens) {
      await db.executar(
        `INSERT INTO item_pedido (id, pedido_id, produto_id, quantidade, preco_unitario, custo_unitario, subtotal, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), o.id, i.product_id, numero(i.quantity), Math.max(0, numero(i.unit_price)),
          produtos.get(i.product_id).custo_unitario, numero(i.quantity) * numero(i.unit_price), texto(i.notes)]
      );
    }
    if (pago > 0) { // o protótipo guardava só o total pago: vira um pagamento na data do pedido
      await db.executar('INSERT INTO pagamento (id, pedido_id, data, valor, forma) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), o.id, o.order_date || o.delivery_date, pago, FORMAS.includes(o.payment_method) ? o.payment_method : 'outro']);
    }
  }
  await db.executar('DROP TABLE IF EXISTS orders');
}

async function migrarDespesasDoPrototipo(db) {
  const CATEGORIAS = ['insumos', 'embalagens', 'equipamentos', 'aluguel', 'energia', 'agua', 'gas', 'transporte', 'marketing',
    'impostos', 'salarios', 'outros'];
  const FORMAS = ['pix', 'dinheiro', 'cartao', 'transferencia', 'boleto', 'outro'];
  for (const d of await lerTabelaAntiga(db, 'expenses')) {
    if (!d.date || !(numero(d.amount) > 0)) continue;
    await db.executar(
      'INSERT OR IGNORE INTO despesa (id, descricao, categoria, valor, data, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [d.id, d.description || 'Despesa', CATEGORIAS.includes(d.category) ? d.category : 'outros', numero(d.amount), d.date,
        FORMAS.includes(d.payment_method) ? d.payment_method : null, texto(d.notes)]
    );
  }
  await db.executar('DROP TABLE IF EXISTS expenses');
}

/** Aplica as migrações pendentes e devolve as tarefas a executar depois (ex.: recalcular custos). */
export async function aplicarMigracoes(db) {
  db.aposMigrar = db.aposMigrar ?? [];
  await db.executarScript(`
    CREATE TABLE IF NOT EXISTS migracao (
      versao INTEGER PRIMARY KEY,
      descricao TEXT NOT NULL,
      aplicada_em TEXT NOT NULL
    );
  `);
  const aplicadas = new Set((await db.consultar('SELECT versao FROM migracao')).map((m) => m.versao));

  for (const migracao of MIGRACOES) {
    if (aplicadas.has(migracao.versao)) continue;
    await db.transacao(async () => {
      if (migracao.sql) await db.executarScript(migracao.sql);
      if (migracao.executar) await migracao.executar(db);
      await db.executar(
        'INSERT INTO migracao (versao, descricao, aplicada_em) VALUES (?, ?, ?)',
        [migracao.versao, migracao.descricao, new Date().toISOString()]
      );
    });
  }
  return db.aposMigrar;
}
