import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function EstadoVazio({ icone: Icone, titulo, descricao, rotuloAcao, aoAgir, rotaAcao }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Icone className="w-8 h-8 text-gray-500" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{titulo}</h2>
      <p className="text-gray-600 mb-6 max-w-sm">{descricao}</p>
      {rotuloAcao && rotaAcao && (
        <Button asChild className="bg-rose-600 hover:bg-rose-700"><Link to={rotaAcao}>{rotuloAcao}</Link></Button>
      )}
      {rotuloAcao && !rotaAcao && aoAgir && (
        <Button onClick={aoAgir} className="bg-rose-600 hover:bg-rose-700">{rotuloAcao}</Button>
      )}
    </div>
  );
}
