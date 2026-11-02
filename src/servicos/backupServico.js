// UC17 – Exportar Backup e UC18 – Importar Backup (RF21, RF22, RNF10)
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { consultar, executar, transacao, agoraIso } from '@/dados/conexao';
import { configuracaoRepositorio } from '@/dados/repositorios/configuracaoRepositorio';
import { ErroDeNegocio } from './erros';

const APP = 'MinhaConfeitaria';
const FORMATO = 1;
// Ordem de inserção: tabelas referenciadas antes das que as referenciam (chaves estrangeiras).
export const TABELAS_DO_BACKUP = [
  'categoria', 'cliente', 'insumo', 'embalagem', 'data_festiva', 'massa', 'produto', 'produto_insumo', 'produto_componente',
  'config_doce', 'doce_massa', 'produto_embalagem', 'pedido', 'item_pedido', 'pagamento', 'despesa',
];
const CONFIG_EXPORTADA = ['margem_padrao', 'endereco_retirada', 'mensagem_pagamento']; // o PIN nunca vai no arquivo
const DIAS_LEMBRETE = 7;

async function versaoDoBanco() {
  return (await consultar('SELECT MAX(versao) AS versao FROM migracao'))[0].versao;
}

async function colunasDe(tabela) {
  return (await consultar(`PRAGMA table_info(${tabela})`)).map((c) => c.name);
}

/** Valida o conteúdo de um arquivo de backup e devolve os dados e um resumo para confirmação. */
export function validarConteudo(texto, versaoAtual) {
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new ErroDeNegocio('O arquivo não é um backup válido (formato inválido).');
  }
  if (dados?.app !== APP || dados?.formato !== FORMATO || typeof dados.tabelas !== 'object') {
    throw new ErroDeNegocio('O arquivo não é um backup do MinhaConfeitaria.');
  }
  if (dados.versao_banco > versaoAtual) {
    throw new ErroDeNegocio('Este backup foi gerado por uma versão mais nova do aplicativo. Atualize o app antes de importar.');
  }
  for (const tabela of TABELAS_DO_BACKUP) {
    if (dados.tabelas[tabela] !== undefined && !Array.isArray(dados.tabelas[tabela])) {
      throw new ErroDeNegocio('O arquivo de backup está corrompido.');
    }
  }
  const contar = (t) => dados.tabelas[t]?.length ?? 0;
  return {
    dados,
    resumo: {
      gerado_em: dados.gerado_em,
      clientes: contar('cliente'), produtos: contar('produto'), pedidos: contar('pedido'), insumos: contar('insumo'),
      despesas: contar('despesa'),
    },
  };
}

function baixarNoNavegador(nome, conteudo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const backupServico = {
  /** Gera o JSON com todas as tabelas (sem o PIN). */
  async gerarConteudo() {
    const tabelas = {};
    for (const tabela of TABELAS_DO_BACKUP) tabelas[tabela] = await consultar(`SELECT * FROM ${tabela}`);
    const config = (await consultar(`SELECT ${CONFIG_EXPORTADA.join(', ')} FROM configuracao WHERE id = 1`))[0];
    return JSON.stringify({ app: APP, formato: FORMATO, versao_banco: await versaoDoBanco(), gerado_em: agoraIso(), configuracao: config, tabelas });
  },

  /** Exporta e abre o compartilhamento do aparelho (no navegador, baixa o arquivo). */
  async exportar() {
    const conteudo = await this.gerarConteudo();
    const nome = `minhaconfeitaria-backup-${agoraIso().slice(0, 16).replace(/[T:]/g, '-')}.json`;
    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.writeFile({ path: nome, data: conteudo, directory: Directory.Cache, encoding: Encoding.UTF8 });
      await Share.share({ title: 'Backup MinhaConfeitaria', files: [uri], dialogTitle: 'Salvar backup' });
    } else {
      baixarNoNavegador(nome, conteudo);
    }
    await configuracaoRepositorio.registrarBackup(agoraIso());
    return nome;
  },

  async lerArquivo(arquivo) {
    if (!arquivo) throw new ErroDeNegocio('Selecione o arquivo de backup.');
    return validarConteudo(await arquivo.text(), await versaoDoBanco());
  },

  /** Substitui todos os dados pelos do backup, numa única transação (tudo ou nada). */
  async restaurar(dados, { apagarPin = false } = {}) {
    await transacao(async () => {
      for (const tabela of [...TABELAS_DO_BACKUP].reverse()) await executar(`DELETE FROM ${tabela}`);
      for (const tabela of TABELAS_DO_BACKUP) {
        const linhas = dados.tabelas[tabela] ?? [];
        if (linhas.length === 0) continue;
        const existentes = await colunasDe(tabela);
        for (const linha of linhas) {
          const colunas = Object.keys(linha).filter((c) => existentes.includes(c));
          await executar(`INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`,
            colunas.map((c) => linha[c]));
        }
      }
      if (dados.configuracao) {
        const campos = CONFIG_EXPORTADA.filter((c) => c in dados.configuracao);
        if (campos.length) {
          await executar(`UPDATE configuracao SET ${campos.map((c) => `${c} = ?`).join(', ')} WHERE id = 1`,
            campos.map((c) => dados.configuracao[c]));
        }
      }
      if (apagarPin) await executar('UPDATE configuracao SET pin_hash = NULL, pin_salt = NULL WHERE id = 1');
      // Os dados restaurados já estão guardados no arquivo importado.
      await executar('UPDATE configuracao SET ultimo_backup_em = ? WHERE id = 1', [dados.gerado_em ?? agoraIso()]);
    });
  },

  /**
   * "Esqueci o PIN" sem backup: apaga todos os dados locais e o PIN, voltando o app ao estado inicial.
   * Mantém só as categorias iniciais, como numa instalação nova.
   */
  async apagarTudo(confirmacao) {
    if (String(confirmacao ?? '').trim().toUpperCase() !== 'APAGAR') {
      throw new ErroDeNegocio('Digite APAGAR para confirmar.');
    }
    await transacao(async () => {
      for (const tabela of [...TABELAS_DO_BACKUP].reverse()) await executar(`DELETE FROM ${tabela}`);
      await executar(`UPDATE configuracao SET pin_hash = NULL, pin_salt = NULL, ultimo_backup_em = NULL,
        margem_padrao = 50, endereco_retirada = NULL WHERE id = 1`);
      for (const [nome, emoji] of [['Bolos', '🎂'], ['Doces', '🍬'], ['Salgados', '🥟']]) {
        await executar('INSERT INTO categoria (id, nome, emoji, ativa) VALUES (?, ?, ?, 1)', [crypto.randomUUID(), nome, emoji]);
      }
    });
  },

  /** Lembrete quando há dados e o último backup tem mais de 7 dias (ou nunca foi feito). */
  async precisaLembrar() {
    const config = await configuracaoRepositorio.obter();
    const [{ total }] = await consultar('SELECT (SELECT COUNT(*) FROM pedido) + (SELECT COUNT(*) FROM produto) AS total');
    if (total === 0) return null;
    if (!config.ultimo_backup_em) return { dias: null };
    const dias = Math.floor((Date.now() - new Date(config.ultimo_backup_em).getTime()) / 86400000);
    return dias > DIAS_LEMBRETE ? { dias } : null;
  },
};
