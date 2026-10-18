// UC08 – Manter Datas Festivas (RF12) e regra RN17
import { addDays, format } from 'date-fns';
import { dataFestivaRepositorio } from '@/dados/repositorios/dataFestivaRepositorio';
import { gerarId } from '@/dados/conexao';
import { ErroDeNegocio, exigirTexto, textoLimpo } from './erros';

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const iso = (data) => format(data, 'yyyy-MM-dd');

function enesimoDomingo(ano, mes, n) {
  const primeiro = new Date(ano, mes - 1, 1);
  const deslocamento = (7 - primeiro.getDay()) % 7;
  return new Date(ano, mes - 1, 1 + deslocamento + 7 * (n - 1));
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function domingoDePascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/** Datas comuns do ramo, com a semana anterior como período de pico. */
export function datasPadrao(ano = new Date().getFullYear()) {
  const periodo = (nome, data, recorrente, diasAntes = 7) => ({
    nome, data_inicio: iso(addDays(data, -diasAntes)), data_fim: iso(data), recorrente, observacoes: null,
  });
  return [
    periodo('Páscoa', domingoDePascoa(ano), false),
    periodo('Dia das Mães', enesimoDomingo(ano, 5, 2), false),
    periodo('Dia dos Namorados', new Date(ano, 5, 12), true, 11),
    periodo('Dia dos Pais', enesimoDomingo(ano, 8, 2), false),
    periodo('Dia das Crianças', new Date(ano, 9, 12), true, 11),
    periodo('Natal', new Date(ano, 11, 25), true, 15),
    periodo('Ano Novo', new Date(ano, 11, 31), true, 5),
  ];
}

function validar(dados) {
  const inicio = textoLimpo(dados.data_inicio);
  const fim = textoLimpo(dados.data_fim);
  if (!inicio || !DATA_ISO.test(inicio)) throw new ErroDeNegocio('Informe a data de início.');
  if (fim && !DATA_ISO.test(fim)) throw new ErroDeNegocio('Data de fim inválida.');
  if (fim && fim < inicio) throw new ErroDeNegocio('A data de fim não pode ser anterior à data de início.');
  return {
    nome: exigirTexto(dados.nome, 'o nome da data', 60),
    data_inicio: inicio,
    data_fim: fim,
    recorrente: dados.recorrente !== false,
    observacoes: textoLimpo(dados.observacoes),
  };
}

/** RN17: devolve a data festiva que cobre o dia informado (AAAA-MM-DD), ou null. */
export function encontrarDataFestiva(datasFestivas, diaIso) {
  return datasFestivas.find((d) => {
    const fim = d.data_fim || d.data_inicio;
    if (!d.recorrente) return diaIso >= d.data_inicio && diaIso <= fim;
    const dia = diaIso.slice(5);
    const ini = d.data_inicio.slice(5);
    const f = fim.slice(5);
    return ini <= f ? dia >= ini && dia <= f : dia >= ini || dia <= f; // período que atravessa o ano
  }) || null;
}

export const dataFestivaServico = {
  listar() {
    return dataFestivaRepositorio.listar();
  },

  async salvar(dados) {
    const data = { id: dados.id || gerarId(), ...validar(dados) };
    if (dados.id) await dataFestivaRepositorio.atualizar(data);
    else await dataFestivaRepositorio.inserir(data);
    return data;
  },

  async adicionarDatasPadrao() {
    // Datas móveis (Páscoa, Mães, Pais) valem só para o ano: a chave inclui o ano.
    const chave = (d) => `${d.nome.toLowerCase()}|${d.recorrente ? '' : d.data_inicio.slice(0, 4)}`;
    const existentes = new Set((await dataFestivaRepositorio.listar()).map(chave));
    const ano = new Date().getFullYear();
    const candidatas = [...datasPadrao(ano), ...datasPadrao(ano + 1).filter((d) => !d.recorrente)];
    const novas = candidatas.filter((d) => !existentes.has(chave(d)));
    for (const d of novas) await dataFestivaRepositorio.inserir({ id: gerarId(), ...d });
    return novas.length;
  },

  excluir(id) {
    return dataFestivaRepositorio.excluir(id);
  },
};
