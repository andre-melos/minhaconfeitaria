-- MinhaConfeitaria – script do banco de dados (SQLite)
-- Gerado automaticamente a partir de src/dados/migracoes.js (npm run script-banco).
-- No aplicativo, o esquema é criado pelas migrações na primeira execução; este arquivo
-- serve para análise do modelo e para criar o banco manualmente, se desejado.
-- Valores monetários em REAL, sempre arredondados para centavos nos serviços.
-- insumo.qtd_embalagem = quantidade comprada (conteúdo do pacote: 395 g, 1 kg, 100 un...).
-- O custo das embalagens (forminhas, caixas) entra na ficha técnica como insumo; a tabela
-- embalagem e produto_embalagem servem só para a Calculadora de Embalagens (quantidades).
--
-- Migração v1: Tabelas do Sprint 1 (cadastros e configuração) e tabelas do protótipo ainda não migradas
-- Migração v2: Copia os cadastros do protótipo (formato JSON) para as tabelas relacionais e remove o estoque
-- Migração v3: Sprint 2: produtos com ficha técnica, massas, configuração dos doces e embalagens por produto
-- Migração v4: Sprint 3: pedidos, itens com custo gravado, pagamentos e textos de mensagem
-- Migração v5: Sprint 4: despesas relacionais (fluxo de caixa); fim das tabelas do protótipo

PRAGMA foreign_keys = ON;

CREATE TABLE migracao (
  versao INTEGER PRIMARY KEY,
  descricao TEXT NOT NULL,
  aplicada_em TEXT NOT NULL
);

CREATE TABLE cliente (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  endereco TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL
);

CREATE TABLE categoria (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL,
  emoji TEXT,
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1))
);

CREATE TABLE insumo (
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

CREATE TABLE embalagem (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1))
);

CREATE TABLE data_festiva (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL,
  data_inicio TEXT NOT NULL,
  data_fim TEXT,
  recorrente INTEGER NOT NULL DEFAULT 1 CHECK (recorrente IN (0, 1)),
  observacoes TEXT
);

CREATE TABLE configuracao (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  margem_padrao REAL NOT NULL DEFAULT 50 CHECK (margem_padrao >= 0 AND margem_padrao <= 95),
  pin_hash TEXT,
  pin_salt TEXT,
  ultimo_backup_em TEXT
  , endereco_retirada TEXT, mensagem_pagamento TEXT);

CREATE TABLE produto (
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

CREATE TABLE produto_insumo (
  id TEXT PRIMARY KEY NOT NULL,
  produto_id TEXT NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
  insumo_id TEXT NOT NULL REFERENCES insumo(id) ON DELETE RESTRICT,
  quantidade REAL NOT NULL CHECK (quantidade > 0),
  custo REAL NOT NULL DEFAULT 0,
  UNIQUE (produto_id, insumo_id)
);

CREATE TABLE produto_componente (
  id TEXT PRIMARY KEY NOT NULL,
  produto_id TEXT NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
  componente_id TEXT NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
  quantidade REAL NOT NULL CHECK (quantidade > 0),
  custo REAL NOT NULL DEFAULT 0,
  CHECK (produto_id <> componente_id),
  UNIQUE (produto_id, componente_id)
);

CREATE TABLE massa (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL,
  rendimento_g REAL NOT NULL CHECK (rendimento_g > 0),
  observacoes TEXT,
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1))
);

CREATE TABLE config_doce (
  id TEXT PRIMARY KEY NOT NULL,
  produto_id TEXT NOT NULL UNIQUE REFERENCES produto(id) ON DELETE CASCADE,
  peso_unitario_g REAL NOT NULL CHECK (peso_unitario_g > 0)
);

CREATE TABLE doce_massa (
  id TEXT PRIMARY KEY NOT NULL,
  config_doce_id TEXT NOT NULL REFERENCES config_doce(id) ON DELETE CASCADE,
  massa_id TEXT NOT NULL REFERENCES massa(id) ON DELETE RESTRICT,
  percentual REAL NOT NULL CHECK (percentual > 0 AND percentual <= 100),
  UNIQUE (config_doce_id, massa_id)
);

CREATE TABLE produto_embalagem (
  id TEXT PRIMARY KEY NOT NULL,
  produto_id TEXT NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
  embalagem_id TEXT NOT NULL REFERENCES embalagem(id) ON DELETE RESTRICT,
  quantidade REAL NOT NULL CHECK (quantidade > 0),
  UNIQUE (produto_id, embalagem_id)
);

CREATE TABLE pedido (
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

CREATE TABLE item_pedido (
  id TEXT PRIMARY KEY NOT NULL,
  pedido_id TEXT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  produto_id TEXT NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
  quantidade REAL NOT NULL CHECK (quantidade > 0),
  preco_unitario REAL NOT NULL CHECK (preco_unitario >= 0),
  custo_unitario REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL,
  observacoes TEXT
);

CREATE TABLE pagamento (
  id TEXT PRIMARY KEY NOT NULL,
  pedido_id TEXT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  valor REAL NOT NULL CHECK (valor > 0),
  forma TEXT NOT NULL CHECK (forma IN ('pix', 'dinheiro', 'cartao', 'transferencia', 'outro'))
);

CREATE TABLE despesa (
  id TEXT PRIMARY KEY NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('insumos', 'embalagens', 'equipamentos', 'aluguel', 'energia', 'agua',
  'gas', 'transporte', 'marketing', 'impostos', 'salarios', 'outros')),
  valor REAL NOT NULL CHECK (valor > 0),
  data TEXT NOT NULL,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('pix', 'dinheiro', 'cartao', 'transferencia', 'boleto', 'outro')),
  observacoes TEXT
);

CREATE INDEX idx_cliente_nome ON cliente(nome);

CREATE INDEX idx_insumo_nome ON insumo(nome);

CREATE INDEX idx_produto_nome ON produto(nome);

CREATE INDEX idx_produto_insumo_insumo ON produto_insumo(insumo_id);

CREATE INDEX idx_pedido_entrega ON pedido(data_entrega);

CREATE INDEX idx_pedido_cliente ON pedido(cliente_id);

CREATE INDEX idx_item_pedido_pedido ON item_pedido(pedido_id);

CREATE INDEX idx_item_pedido_produto ON item_pedido(produto_id);

CREATE INDEX idx_pagamento_data ON pagamento(data);

CREATE INDEX idx_despesa_data ON despesa(data);

-- Registro inicial
INSERT INTO configuracao (id, margem_padrao) VALUES (1, 50);
INSERT INTO categoria (id, nome, emoji, ativa) VALUES
  (lower(hex(randomblob(16))), 'Bolos', '🎂', 1),
  (lower(hex(randomblob(16))), 'Doces', '🍬', 1),
  (lower(hex(randomblob(16))), 'Salgados', '🥟', 1);
