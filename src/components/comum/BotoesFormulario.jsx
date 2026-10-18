import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BotoesFormulario({ salvando, aoCancelar, rotulo = 'Salvar' }) {
  return (
    <div className="flex gap-3 pt-4">
      <Button type="button" variant="outline" className="flex-1 h-11" onClick={aoCancelar}>Cancelar</Button>
      <Button type="submit" className="flex-1 h-11 bg-rose-600 hover:bg-rose-700" disabled={salvando}>
        {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {rotulo}
      </Button>
    </div>
  );
}
