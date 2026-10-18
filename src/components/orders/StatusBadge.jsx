import React from 'react';
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  ChefHat, 
  Package, 
  Truck, 
  XCircle 
} from 'lucide-react';

const statusConfig = {
  orcamento: {
    label: 'Orçamento',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: FileText
  },
  aguardando_sinal: {
    label: 'Aguardando Sinal',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock
  },
  confirmado: {
    label: 'Confirmado',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: CheckCircle
  },
  em_producao: {
    label: 'Em Produção',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: ChefHat
  },
  pronto: {
    label: 'Pronto',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Package
  },
  entregue: {
    label: 'Entregue',
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: Truck
  },
  entregue_nao_pago: {
    label: 'Entregue e não pago',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Truck
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle
  }
};

export default function StatusBadge({ status, size = 'default' }) {
  const config = statusConfig[status] || statusConfig.orcamento;
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.color} border font-medium ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
      }`}
    >
      <Icon className={`${size === 'sm' ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'}`} />
      {config.label}
    </Badge>
  );
}

export { statusConfig };