import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PaginaNaoEncontrada() {
  return (
    <div className="max-w-md mx-auto text-center space-y-4 py-16">
      <p className="text-6xl font-light text-gray-400">404</p>
      <h1 className="text-2xl font-semibold text-gray-900">Página não encontrada</h1>
      <Button asChild className="bg-rose-600 hover:bg-rose-700"><Link to="/agenda">Ir para a agenda</Link></Button>
    </div>
  );
}
