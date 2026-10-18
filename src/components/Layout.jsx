import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  Calendar, Package, Users, ShoppingBag, Plus, Menu, Cake, ShoppingCart, Tag, BarChart3, Wallet,
  Calculator, FlaskConical, PackageOpen, Box, Settings, CookingPot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const MENU = [
  {
    grupo: 'Pedidos',
    itens: [
      { rotulo: 'Agenda', rota: '/agenda', icone: Calendar },
      { rotulo: 'Pedidos', rota: '/pedidos', icone: ShoppingBag },
      { rotulo: 'Clientes', rota: '/clientes', icone: Users },
    ],
  },
  {
    grupo: 'Produção',
    itens: [
      { rotulo: 'Calc. Massas', rota: '/calculadora-massas', icone: Calculator },
      { rotulo: 'Calc. Insumos', rota: '/calculadora-insumos', icone: FlaskConical },
      { rotulo: 'Calc. Embalagens', rota: '/calculadora-embalagens', icone: PackageOpen },
    ],
  },
  {
    grupo: 'Cadastros',
    itens: [
      { rotulo: 'Produtos', rota: '/produtos', icone: Package },
      { rotulo: 'Insumos', rota: '/insumos', icone: ShoppingCart },
      { rotulo: 'Massas e doces', rota: '/massas', icone: CookingPot },
      { rotulo: 'Embalagens', rota: '/embalagens', icone: Box },
      { rotulo: 'Categorias', rota: '/categorias', icone: Tag },
      { rotulo: 'Datas festivas', rota: '/datas-festivas', icone: Cake },
    ],
  },
  {
    grupo: 'Gestão',
    itens: [
      { rotulo: 'Relatório de vendas', rota: '/relatorios', icone: BarChart3 },
      { rotulo: 'Fluxo de caixa', rota: '/fluxo-caixa', icone: Wallet },
      { rotulo: 'Configurações', rota: '/configuracoes', icone: Settings },
    ],
  },
];

function Marca({ pequena = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${pequena ? 'w-8 h-8' : 'w-10 h-10'} bg-rose-600 rounded-xl flex items-center justify-center`}>
        <Cake className={pequena ? 'w-4 h-4 text-white' : 'w-5 h-5 text-white'} aria-hidden="true" />
      </div>
      <div>
        <p className="font-semibold text-gray-900">MinhaConfeitaria</p>
        {!pequena && <p className="text-xs text-gray-600">Gestão da sua confeitaria</p>}
      </div>
    </div>
  );
}

function Navegacao({ aoNavegar }) {
  return (
    <nav aria-label="Menu principal" className="flex-1 overflow-y-auto p-4 space-y-5">
      {MENU.map(({ grupo, itens }) => (
        <div key={grupo}>
          <p className="px-4 mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{grupo}</p>
          <ul className="space-y-1">
            {itens.map(({ rotulo, rota, icone: Icone }) => (
              <li key={rota}>
                <NavLink
                  to={rota}
                  onClick={aoNavegar}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive ? 'bg-rose-50 text-rose-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <Icone className="w-5 h-5" aria-hidden="true" />
                  <span>{rotulo}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-16">
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Abrir menu">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SheetTitle className="p-6 border-b border-rose-100"><Marca /></SheetTitle>
              <Navegacao aoNavegar={() => setMenuAberto(false)} />
            </SheetContent>
          </Sheet>
          <Marca pequena />
          <Button asChild size="icon" className="h-11 w-11 bg-rose-600 hover:bg-rose-700 rounded-xl">
            <Link to="/pedidos/novo" aria-label="Novo pedido"><Plus className="w-5 h-5" /></Link>
          </Button>
        </div>
      </header>

      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-30">
        <div className="p-6 border-b border-rose-100"><Marca /></div>
        <Navegacao />
      </aside>

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8 pb-24">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
