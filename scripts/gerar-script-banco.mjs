// Gera banco/script_banco.sql a partir das migrações (fonte única do esquema).
// Uso: npm run script-banco
import { writeFileSync } from 'node:fs';
import initSqlJs from 'sql.js';
import { aplicarMigracoes } from '../src/dados/migracoes.js';

const SQL = await initSqlJs();
const db = new SQL.Database();
db.run('PRAGMA foreign_keys = ON');
const consultar = async (sql, p = []) => {
  const st = db.prepare(sql); st.bind(p); const r = [];
  while (st.step()) r.push(st.getAsObject());
  st.free(); return r;
};
const ctx = {
  consultar,
  executar: async (sql, p = []) => db.run(sql, p),
  executarScript: async (sql) => db.exec(sql),
  transacao: async (fn) => { db.run('BEGIN'); try { await fn(); db.run('COMMIT'); } catch (e) { db.run('ROLLBACK'); throw e; } },
};
await aplicarMigracoes(ctx);

const versoes = await consultar('SELECT versao, descricao FROM migracao ORDER BY versao');
const objetos = await consultar(`SELECT type, name, sql FROM sqlite_master
  WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, rowid`);
const linhas = [
  '-- MinhaConfeitaria – script do banco de dados (SQLite)',
  '-- Gerado automaticamente a partir de src/dados/migracoes.js (npm run script-banco).',
  '-- No aplicativo, o esquema é criado pelas migrações na primeira execução; este arquivo',
  '-- serve para análise do modelo e para criar o banco manualmente, se desejado.',
  '-- Valores monetários em REAL, sempre arredondados para centavos nos serviços.',
  '-- insumo.qtd_embalagem = quantidade comprada (conteúdo do pacote: 395 g, 1 kg, 100 un...).',
  '-- O custo das embalagens (forminhas, caixas) entra na ficha técnica como insumo; a tabela',
  '-- embalagem e produto_embalagem servem só para a Calculadora de Embalagens (quantidades).',
  '--',
  ...versoes.map((v) => `-- Migração v${v.versao}: ${v.descricao}`),
  '',
  'PRAGMA foreign_keys = ON;',
  '',
  ...objetos.map((o) => `${o.sql.split("\n").map((l, i) => (i === 0 ? l.trim() : "  " + l.trim().replace(/^\)/, ")"))).join("\n").replace(/\n  \)/g, "\n)")};\n`),
  '-- Registro inicial',
  "INSERT INTO configuracao (id, margem_padrao) VALUES (1, 50);",
  "INSERT INTO categoria (id, nome, emoji, ativa) VALUES",
  "  (lower(hex(randomblob(16))), 'Bolos', '🎂', 1),",
  "  (lower(hex(randomblob(16))), 'Doces', '🍬', 1),",
  "  (lower(hex(randomblob(16))), 'Salgados', '🥟', 1);",
  '',
];
writeFileSync(new URL('../banco/script_banco.sql', import.meta.url), linhas.join('\n'));
console.log(`banco/script_banco.sql: ${objetos.filter((o) => o.type === 'table').length} tabelas, ${objetos.filter((o) => o.type === 'index').length} índices`);
