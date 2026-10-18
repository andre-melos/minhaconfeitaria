import { consultarUm, executar } from '../conexao';

export const configuracaoRepositorio = {
  obter() {
    return consultarUm('SELECT margem_padrao, pin_hash, pin_salt, ultimo_backup_em FROM configuracao WHERE id = 1');
  },
  salvarMargemPadrao(margem) {
    return executar('UPDATE configuracao SET margem_padrao = ? WHERE id = 1', [margem]);
  },
  salvarPin(hash, salt) {
    return executar('UPDATE configuracao SET pin_hash = ?, pin_salt = ? WHERE id = 1', [hash, salt]);
  },
  registrarBackup(dataIso) {
    return executar('UPDATE configuracao SET ultimo_backup_em = ? WHERE id = 1', [dataIso]);
  },
};
