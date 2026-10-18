// UC18 – Importar Backup: valida o arquivo, mostra um resumo e só substitui os dados após confirmação.
import { useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { backupServico } from '@/servicos/backupServico';

export default function ImportarBackup({ apagarPin = false, aoConcluir, rotulo = 'Importar backup', variante = 'outline' }) {
  const entrada = useRef(null);
  const [lido, setLido] = useState(null);
  const [erro, setErro] = useState('');
  const [restaurando, setRestaurando] = useState(false);

  const escolher = async (e) => {
    setErro('');
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      setLido(await backupServico.lerArquivo(arquivo));
    } catch (falha) {
      setErro(falha.message);
    }
  };

  const confirmar = async () => {
    setRestaurando(true);
    try {
      await backupServico.restaurar(lido.dados, { apagarPin });
      setLido(null);
      aoConcluir?.();
    } catch (falha) {
      setErro(falha.name === 'ErroDeNegocio' ? falha.message : 'Não foi possível importar. Os dados atuais foram mantidos.');
      console.error(falha);
      setLido(null);
    } finally {
      setRestaurando(false);
    }
  };

  const r = lido?.resumo;
  return (
    <div className="space-y-2">
      <input ref={entrada} type="file" accept=".json,application/json" className="sr-only" onChange={escolher}
        aria-label="Arquivo de backup" tabIndex={-1} />
      <Button type="button" variant={variante} className="h-11" onClick={() => entrada.current?.click()} disabled={restaurando}>
        {restaurando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} {rotulo}
      </Button>
      {erro && <p className="text-sm text-red-700" role="alert">{erro}</p>}
      <AlertDialog open={!!lido} onOpenChange={(a) => !a && setLido(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir os dados atuais?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-gray-700">
                {r && (
                  <p>
                    Backup de {format(parseISO(r.gerado_em), "dd/MM/yyyy 'às' HH:mm")} com {r.clientes} cliente(s), {r.produtos} produto(s),{' '}
                    {r.insumos} insumo(s), {r.pedidos} pedido(s) e {r.despesas} despesa(s).
                  </p>
                )}
                <p className="font-medium text-red-700">Todos os dados atuais deste aparelho serão apagados e trocados pelos do arquivo.</p>
                {apagarPin && <p>Depois da importação, você vai criar um novo PIN.</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmar} className="bg-red-600 hover:bg-red-700">Importar e substituir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
