import { Loader2 } from 'lucide-react';

export default function Carregando() {
  return (
    <div className="flex items-center justify-center h-64" role="status" aria-label="Carregando">
      <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
    </div>
  );
}
