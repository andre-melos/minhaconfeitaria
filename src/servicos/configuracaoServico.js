// UC19 – Configurar Aplicativo (RF23, RF24) e UC20 – Desbloquear Aplicativo (RF24)
import { configuracaoRepositorio } from '@/dados/repositorios/configuracaoRepositorio';
import { ErroDeNegocio, exigirNumero } from './erros';

const PIN_VALIDO = /^\d{4,6}$/;

async function gerarHash(pin, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function gerarSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const configuracaoServico = {
  async obter() {
    const c = await configuracaoRepositorio.obter();
    return { margem_padrao: c.margem_padrao, tem_pin: !!c.pin_hash, ultimo_backup_em: c.ultimo_backup_em };
  },

  async salvarMargemPadrao(valor) {
    const margem = exigirNumero(valor, 'A margem padrão', { minimo: 0 });
    if (margem > 95) throw new ErroDeNegocio('A margem padrão deve ser de no máximo 95%.');
    await configuracaoRepositorio.salvarMargemPadrao(margem);
  },

  async verificarPin(pin) {
    const c = await configuracaoRepositorio.obter();
    if (!c.pin_hash) return true;
    return (await gerarHash(String(pin), c.pin_salt)) === c.pin_hash;
  },

  /** Cria o PIN (primeiro uso) ou troca o PIN, exigindo o atual. */
  async definirPin(novoPin, confirmacao, pinAtual) {
    const c = await configuracaoRepositorio.obter();
    if (c.pin_hash && !(await this.verificarPin(pinAtual ?? ''))) {
      throw new ErroDeNegocio('O PIN atual está incorreto.');
    }
    if (!PIN_VALIDO.test(String(novoPin))) throw new ErroDeNegocio('O PIN deve ter de 4 a 6 números.');
    if (String(novoPin) !== String(confirmacao)) throw new ErroDeNegocio('A confirmação não confere com o PIN.');
    const salt = gerarSalt();
    await configuracaoRepositorio.salvarPin(await gerarHash(String(novoPin), salt), salt);
  },
};
