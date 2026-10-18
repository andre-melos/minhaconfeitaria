// Conexão única com o banco SQLite local.
// No Android/iOS usa o SQLite nativo; no navegador (desenvolvimento) usa o jeep-sqlite (sql.js + IndexedDB).
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { aplicarMigracoes } from './migracoes';

const NOME_BANCO = 'minhaconfeitaria';
const sqlite = new SQLiteConnection(CapacitorSQLite);
const ehWeb = () => Capacitor.getPlatform() === 'web';

let conexao = null;
let inicializacao = null;
let emTransacao = false;

async function abrirConexao() {
  if (ehWeb()) {
    await customElements.whenDefined('jeep-sqlite');
    await sqlite.initWebStore();
  }
  const consistente = (await sqlite.checkConnectionsConsistency()).result;
  const existe = (await sqlite.isConnection(NOME_BANCO, false)).result;
  if (consistente && existe) {
    return sqlite.retrieveConnection(NOME_BANCO, false);
  }
  return sqlite.createConnection(NOME_BANCO, false, 'no-encryption', 1, false);
}

async function persistirWeb() {
  if (ehWeb()) await sqlite.saveToStore(NOME_BANCO);
}

/** Executa um SELECT e devolve as linhas. */
export async function consultar(sql, parametros = []) {
  const resultado = await conexao.query(sql, parametros);
  return resultado.values ?? [];
}

/** Executa um SELECT e devolve a primeira linha (ou null). */
export async function consultarUm(sql, parametros = []) {
  const linhas = await consultar(sql, parametros);
  return linhas[0] ?? null;
}

/** Executa INSERT/UPDATE/DELETE. Dentro de transacao() não abre transação própria. */
export async function executar(sql, parametros = []) {
  const resultado = await conexao.run(sql, parametros, !emTransacao);
  if (!emTransacao) await persistirWeb();
  return resultado.changes;
}

/** Executa vários comandos SQL de uma vez (usado nas migrações). */
export async function executarScript(sql) {
  await conexao.execute(sql, !emTransacao);
  if (!emTransacao) await persistirWeb();
}

/** Executa a função dentro de uma transação: tudo é gravado ou nada é gravado. */
export async function transacao(funcao) {
  if (emTransacao) return funcao();
  await conexao.beginTransaction();
  emTransacao = true;
  try {
    const retorno = await funcao();
    await conexao.commitTransaction();
    return retorno;
  } catch (erro) {
    await conexao.rollbackTransaction();
    throw erro;
  } finally {
    emTransacao = false;
    await persistirWeb();
  }
}

export function gerarId() {
  return crypto.randomUUID();
}

export function agoraIso() {
  return new Date().toISOString();
}

/** Abre o banco, liga as chaves estrangeiras e aplica as migrações pendentes. */
export function iniciarBanco() {
  if (inicializacao) return inicializacao;
  inicializacao = (async () => {
    conexao = await abrirConexao();
    await conexao.open();
    await conexao.execute('PRAGMA foreign_keys = ON;', false);
    const tarefas = await aplicarMigracoes({ consultar, executar, executarScript, transacao });
    if (tarefas.includes('recalcular-custos')) {
      const { produtoServico } = await import('@/servicos/produtoServico');
      await produtoServico.recalcularTodos();
    }
    await persistirWeb();
  })();
  return inicializacao;
}
