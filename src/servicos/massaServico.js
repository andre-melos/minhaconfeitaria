// UC06 – Manter Massas e Configuração dos Doces (RF09, RF10)
import { massaRepositorio } from '@/dados/repositorios/massaRepositorio';
import { gerarId } from '@/dados/conexao';
import { ErroDeNegocio, exigirNumero, exigirTexto, textoLimpo } from './erros';

export const massaServico = {
  listar() {
    return massaRepositorio.listar();
  },

  async salvar(dados) {
    const massa = {
      id: dados.id || gerarId(),
      nome: exigirTexto(dados.nome, 'o nome da massa', 60),
      rendimento_g: exigirNumero(dados.rendimento_g, 'O rendimento da receita', { maiorQueZero: true }),
      observacoes: textoLimpo(dados.observacoes),
      ativa: dados.ativa !== false,
    };
    if (dados.id) await massaRepositorio.atualizar(massa);
    else await massaRepositorio.inserir(massa);
    return massa;
  },

  async excluir(id) {
    const usos = await massaRepositorio.contarUso(id);
    if (usos > 0) throw new ErroDeNegocio(`Esta massa está na composição de ${usos} doce(s).`);
    await massaRepositorio.excluir(id);
  },

  listarConfiguracoes() {
    return massaRepositorio.listarConfiguracoes();
  },

  /** RN09: peso unitário do doce e composição em massas; a soma dos percentuais deve ser 100%. */
  async salvarConfiguracao(dados) {
    if (!dados.produto_id) throw new ErroDeNegocio('Selecione o doce (produto).');
    const peso = exigirNumero(dados.peso_unitario_g, 'O peso de cada unidade', { maiorQueZero: true });
    const massas = (dados.massas || []).filter((m) => m.massa_id).map((m) => ({
      massa_id: m.massa_id,
      percentual: exigirNumero(m.percentual, 'O percentual', { maiorQueZero: true }),
    }));
    if (massas.length === 0) throw new ErroDeNegocio('Adicione pelo menos uma massa.');
    if (new Set(massas.map((m) => m.massa_id)).size !== massas.length) throw new ErroDeNegocio('Há massas repetidas.');
    const soma = massas.reduce((total, m) => total + m.percentual, 0);
    if (Math.abs(soma - 100) > 0.01) {
      throw new ErroDeNegocio(`A soma dos percentuais deve ser 100% (está em ${soma.toLocaleString('pt-BR')}%).`);
    }
    const existente = await massaRepositorio.buscarConfiguracaoPorProduto(dados.produto_id);
    if (existente && existente.id !== dados.id) throw new ErroDeNegocio('Este doce já está configurado.');

    const config = { id: dados.id || gerarId(), produto_id: dados.produto_id, peso_unitario_g: peso };
    await massaRepositorio.salvarConfiguracao(config, massas, !dados.id);
    return config;
  },

  excluirConfiguracao(id) {
    return massaRepositorio.excluirConfiguracao(id);
  },
};
