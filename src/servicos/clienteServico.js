// UC01 – Manter Clientes (RF01)
import { clienteRepositorio } from '@/dados/repositorios/clienteRepositorio';
import { pedidoRepositorio } from '@/dados/repositorios/pedidoRepositorio';
import { gerarId, agoraIso } from '@/dados/conexao';
import { ErroDeNegocio, exigirTexto, textoLimpo } from './erros';

function validar(dados) {
  const nome = exigirTexto(dados.nome, 'o nome', 100);
  const telefone = exigirTexto(dados.telefone, 'o telefone', 20);
  if (telefone.replace(/\D/g, '').length < 8) {
    throw new ErroDeNegocio('O telefone deve ter pelo menos 8 dígitos.');
  }
  return {
    nome,
    telefone,
    endereco: textoLimpo(dados.endereco),
    observacoes: textoLimpo(dados.observacoes),
  };
}

export const clienteServico = {
  listar() {
    return clienteRepositorio.listar();
  },

  buscarPorId(id) {
    return clienteRepositorio.buscarPorId(id);
  },

  async salvar(dados) {
    const validado = validar(dados);
    if (dados.id) {
      await clienteRepositorio.atualizar({ id: dados.id, ...validado });
      return clienteRepositorio.buscarPorId(dados.id);
    }
    const novo = { id: gerarId(), criado_em: agoraIso(), ...validado };
    await clienteRepositorio.inserir(novo);
    return novo;
  },

  /** Quantidade de pedidos de cada cliente: { [clienteId]: total } */
  contarPedidosPorCliente() {
    return pedidoRepositorio.contarPorCliente();
  },

  async excluir(id) {
    const pedidos = (await this.contarPedidosPorCliente())[id] || 0;
    if (pedidos > 0) {
      throw new ErroDeNegocio(`Este cliente tem ${pedidos} pedido(s) e não pode ser excluído.`);
    }
    await clienteRepositorio.excluir(id);
  },
};
