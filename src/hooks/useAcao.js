import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

/**
 * Executa uma ação de gravação, atualiza as listas indicadas e mostra o resultado ao usuário.
 * Erros de regra de negócio (ErroDeNegocio) aparecem com a mensagem explicando o motivo.
 */
export function useAcao(funcao, { invalidar = [], mensagemSucesso, aoConcluir } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: funcao,
    onSuccess: (resultado, variaveis) => {
      invalidar.forEach((chave) => queryClient.invalidateQueries({ queryKey: [chave] }));
      if (mensagemSucesso) toast({ title: mensagemSucesso });
      aoConcluir?.(resultado, variaveis);
    },
    onError: (erro) => {
      toast({
        variant: 'destructive',
        title: 'Não foi possível concluir',
        description: erro.name === 'ErroDeNegocio' ? erro.message : 'Erro inesperado. Tente novamente.',
      });
      if (erro.name !== 'ErroDeNegocio') console.error(erro);
    },
  });
}
