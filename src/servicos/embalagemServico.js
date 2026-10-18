// UC07 – Manter Embalagens (RF11)
import { embalagemRepositorio } from '@/dados/repositorios/embalagemRepositorio';
import { gerarId } from '@/dados/conexao';
import { ErroDeNegocio, exigirTexto, textoLimpo } from './erros';

export const embalagemServico = {
  listar() {
    return embalagemRepositorio.listar();
  },

  async listarAtivas() {
    return (await embalagemRepositorio.listar()).filter((e) => e.ativa);
  },

  async salvar(dados) {
    const embalagem = {
      id: dados.id || gerarId(),
      nome: exigirTexto(dados.nome, 'o nome da embalagem', 80),
      descricao: textoLimpo(dados.descricao),
      ativa: dados.ativa !== false,
    };
    if (dados.id) await embalagemRepositorio.atualizar(embalagem);
    else await embalagemRepositorio.inserir(embalagem);
    return embalagem;
  },

  async excluir(id) {
    if (await embalagemRepositorio.contarUso(id)) {
      throw new ErroDeNegocio('Esta embalagem está configurada em produtos. Inative-a em vez de excluí-la.');
    }
    await embalagemRepositorio.excluir(id);
  },
};
