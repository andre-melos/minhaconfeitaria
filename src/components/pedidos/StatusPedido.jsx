import { FileText, Clock, CheckCircle, ChefHat, Package, Truck, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { STATUS_PEDIDO } from '@/servicos/regrasPedido';

// O status é sempre indicado por texto e ícone, além da cor (RNF08).
export const ESTILO_STATUS = {
  orcamento: { classe: 'bg-gray-100 text-gray-800 border-gray-300', borda: 'border-l-gray-400', icone: FileText },
  aguardando_sinal: { classe: 'bg-amber-50 text-amber-900 border-amber-300', borda: 'border-l-amber-500', icone: Clock },
  confirmado: { classe: 'bg-blue-50 text-blue-900 border-blue-300', borda: 'border-l-blue-500', icone: CheckCircle },
  em_producao: { classe: 'bg-purple-50 text-purple-900 border-purple-300', borda: 'border-l-purple-500', icone: ChefHat },
  pronto: { classe: 'bg-emerald-50 text-emerald-900 border-emerald-300', borda: 'border-l-emerald-500', icone: Package },
  entregue: { classe: 'bg-green-50 text-green-900 border-green-300', borda: 'border-l-green-600', icone: Truck },
  entregue_nao_pago: { classe: 'bg-orange-50 text-orange-900 border-orange-300', borda: 'border-l-orange-500', icone: AlertCircle },
  cancelado: { classe: 'bg-red-50 text-red-900 border-red-300', borda: 'border-l-red-500', icone: XCircle },
};

export default function StatusPedido({ status, pequeno = false }) {
  const estilo = ESTILO_STATUS[status] ?? ESTILO_STATUS.orcamento;
  const Icone = estilo.icone;
  return (
    <Badge variant="outline" className={`${estilo.classe} font-medium ${pequeno ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'}`}>
      <Icone className={pequeno ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} aria-hidden="true" />
      {STATUS_PEDIDO[status]}
    </Badge>
  );
}
