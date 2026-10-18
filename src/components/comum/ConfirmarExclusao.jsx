import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ConfirmarExclusao({ aberto, titulo, descricao, aoConfirmar, aoCancelar, rotuloConfirmar = 'Excluir' }) {
  return (
    <AlertDialog open={aberto} onOpenChange={(abrir) => !abrir && aoCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao || 'Esta ação não pode ser desfeita.'}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={aoConfirmar} className="bg-red-600 hover:bg-red-700">{rotuloConfirmar}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
