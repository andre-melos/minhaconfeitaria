import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import BloqueioPin from '@/components/BloqueioPin';
import Layout from '@/components/Layout';
import Agenda from '@/pages/Agenda';
import Pedidos from '@/pages/Pedidos';
import FormularioPedido from '@/pages/FormularioPedido';
import DetalhesPedido from '@/pages/DetalhesPedido';
import Clientes from '@/pages/Clientes';
import Produtos from '@/pages/Produtos';
import Insumos from '@/pages/Insumos';
import Embalagens from '@/pages/Embalagens';
import Massas from '@/pages/Massas';
import Categorias from '@/pages/Categorias';
import DatasFestivas from '@/pages/DatasFestivas';
import CalculadoraMassas from '@/pages/CalculadoraMassas';
import CalculadoraInsumos from '@/pages/CalculadoraInsumos';
import CalculadoraEmbalagens from '@/pages/CalculadoraEmbalagens';
import Relatorios from '@/pages/Relatorios';
import FluxoCaixa from '@/pages/FluxoCaixa';
import Configuracoes from '@/pages/Configuracoes';
import PaginaNaoEncontrada from '@/pages/PaginaNaoEncontrada';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BloqueioPin>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/agenda" replace />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="pedidos" element={<Pedidos />} />
              <Route path="pedidos/novo" element={<FormularioPedido />} />
              <Route path="pedidos/:id" element={<DetalhesPedido />} />
              <Route path="pedidos/:id/editar" element={<FormularioPedido key="editar" />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="produtos" element={<Produtos />} />
              <Route path="insumos" element={<Insumos />} />
              <Route path="embalagens" element={<Embalagens />} />
              <Route path="massas" element={<Massas />} />
              <Route path="categorias" element={<Categorias />} />
              <Route path="datas-festivas" element={<DatasFestivas />} />
              <Route path="calculadora-massas" element={<CalculadoraMassas />} />
              <Route path="calculadora-insumos" element={<CalculadoraInsumos />} />
              <Route path="calculadora-embalagens" element={<CalculadoraEmbalagens />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="fluxo-caixa" element={<FluxoCaixa />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="*" element={<PaginaNaoEncontrada />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </BloqueioPin>
      <Toaster />
    </QueryClientProvider>
  );
}
