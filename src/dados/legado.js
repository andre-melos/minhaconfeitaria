// Acesso TEMPORÁRIO às tabelas do protótipo que ainda guardam cada registro como JSON
// (despesas, migradas no Sprint 4).
// Cada sprint migra uma parte para tabelas relacionais; este arquivo deixa de existir no Sprint 4.
import { consultar, executar, gerarId, agoraIso } from './conexao';

const TABELAS = {
  Expense: 'expenses',
};

function ordenar(itens, campoOrdenacao) {
  if (!campoOrdenacao) return itens;
  const decrescente = campoOrdenacao.startsWith('-');
  const campo = decrescente ? campoOrdenacao.slice(1) : campoOrdenacao;
  return [...itens].sort((a, b) => {
    const va = a[campo];
    const vb = b[campo];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = typeof va === 'number' && typeof vb === 'number'
      ? va - vb
      : String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' });
    return decrescente ? -cmp : cmp;
  });
}

function converter(linha) {
  return { id: linha.id, created_date: linha.created_date, ...JSON.parse(linha.payload) };
}

function tabelaLegada(tabela) {
  const todos = async () => (await consultar(`SELECT id, created_date, payload FROM ${tabela}`)).map(converter);
  return {
    async list(ordem) {
      return ordenar(await todos(), ordem);
    },
    async filter(criterios = {}, ordem) {
      const itens = (await todos()).filter((item) =>
        Object.entries(criterios).every(([chave, valor]) => valor === undefined || item[chave] === valor));
      return ordenar(itens, ordem);
    },
    async get(id) {
      const linhas = await consultar(`SELECT id, created_date, payload FROM ${tabela} WHERE id = ?`, [id]);
      return linhas.length ? converter(linhas[0]) : null;
    },
    async create(dados) {
      const id = gerarId();
      const criado = agoraIso();
      await executar(`INSERT INTO ${tabela} (id, created_date, payload) VALUES (?, ?, ?)`, [id, criado, JSON.stringify(dados)]);
      return { id, created_date: criado, ...dados };
    },
    async update(id, dados) {
      const atual = await this.get(id);
      if (!atual) throw new Error('Registro não encontrado.');
      const { id: _id, created_date, ...resto } = { ...atual, ...dados };
      await executar(`UPDATE ${tabela} SET payload = ? WHERE id = ?`, [JSON.stringify(resto), id]);
      return { id, created_date, ...resto };
    },
    async delete(id) {
      await executar(`DELETE FROM ${tabela} WHERE id = ?`, [id]);
    },
  };
}

export const db = {
  entities: Object.fromEntries(Object.entries(TABELAS).map(([nome, tabela]) => [nome, tabelaLegada(tabela)])),
};

/** Lê todos os registros de uma tabela legada (usado pelas regras de "registro em uso"). */
export async function lerLegado(nomeEntidade) {
  return db.entities[nomeEntidade].list();
}
