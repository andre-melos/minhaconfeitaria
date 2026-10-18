// UC19 – Configurar Aplicativo (margem padrão e PIN)
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Percent, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CabecalhoPagina from '@/components/comum/CabecalhoPagina';
import Carregando from '@/components/comum/Carregando';
import { configuracaoServico } from '@/servicos/configuracaoServico';
import { useAcao } from '@/hooks/useAcao';

const PIN_VAZIO = { atual: '', novo: '', confirmacao: '' };
const somenteNumeros = (valor) => valor.replace(/\D/g, '');

export default function Configuracoes() {
  const { data: config, isLoading } = useQuery({ queryKey: ['configuracao'], queryFn: configuracaoServico.obter });
  const [margem, setMargem] = useState('');
  const [pin, setPin] = useState(PIN_VAZIO);

  useEffect(() => {
    if (config) setMargem(String(config.margem_padrao));
  }, [config]);

  const salvarMargem = useAcao((valor) => configuracaoServico.salvarMargemPadrao(valor), {
    invalidar: ['configuracao'], mensagemSucesso: 'Margem padrão salva.',
  });
  const trocarPin = useAcao((p) => configuracaoServico.definirPin(p.novo, p.confirmacao, p.atual), {
    invalidar: ['configuracao'], mensagemSucesso: 'PIN alterado.', aoConcluir: () => setPin(PIN_VAZIO),
  });

  if (isLoading) return <Carregando />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <CabecalhoPagina titulo="Configurações" />

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Percent className="w-5 h-5 text-rose-600" aria-hidden="true" /> Margem de lucro padrão
        </h2>
        <p className="text-sm text-gray-600">Usada como sugestão ao cadastrar novos produtos (de 0% a 95%).</p>
        <form className="flex gap-3 items-end" onSubmit={(e) => { e.preventDefault(); salvarMargem.mutate(margem); }}>
          <div className="flex-1">
            <Label htmlFor="margem">Margem (%)</Label>
            <Input id="margem" inputMode="decimal" value={margem} onChange={(e) => setMargem(e.target.value)} required />
          </div>
          <Button type="submit" className="h-10 bg-rose-600 hover:bg-rose-700" disabled={salvarMargem.isPending}>
            {salvarMargem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
          </Button>
        </form>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-rose-600" aria-hidden="true" /> Alterar PIN de acesso
        </h2>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); trocarPin.mutate(pin); }}>
          {[
            ['atual', 'PIN atual'],
            ['novo', 'Novo PIN (4 a 6 números)'],
            ['confirmacao', 'Confirme o novo PIN'],
          ].map(([campo, rotulo]) => (
            <div key={campo}>
              <Label htmlFor={`pin-${campo}`}>{rotulo}</Label>
              <Input id={`pin-${campo}`} type="password" inputMode="numeric" autoComplete="off" maxLength={6} required
                value={pin[campo]} onChange={(e) => setPin({ ...pin, [campo]: somenteNumeros(e.target.value) })} />
            </div>
          ))}
          <Button type="submit" className="h-11 bg-rose-600 hover:bg-rose-700" disabled={trocarPin.isPending}>
            {trocarPin.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Alterar PIN
          </Button>
        </form>
      </Card>
    </div>
  );
}
