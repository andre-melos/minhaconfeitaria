import React from 'react';
import ReactDOM from 'react-dom/client';
import { defineCustomElements as definirJeepSqlite } from 'jeep-sqlite/loader';
import App from '@/App.jsx';
import '@/index.css';
import { iniciarBanco, obterTarefasPosMigracao, executar } from '@/dados/conexao';
import { produtoServico } from '@/servicos/produtoServico';

definirJeepSqlite(window);
const raiz = ReactDOM.createRoot(document.getElementById('root'));

async function iniciar() {
  await iniciarBanco();
  if (obterTarefasPosMigracao().includes('recalcular-custos')) {
    await produtoServico.recalcularTodos();
    // Itens de pedidos migrados antes do cálculo dos custos recebem o custo atual do produto.
    await executar(`UPDATE item_pedido SET custo_unitario =
      (SELECT custo_unitario FROM produto WHERE produto.id = item_pedido.produto_id) WHERE custo_unitario = 0`);
  }
}

iniciar()
  .then(() => raiz.render(<React.StrictMode><App /></React.StrictMode>))
  .catch((erro) => {
    console.error('Falha ao iniciar o banco de dados:', erro);
    raiz.render(
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>MinhaConfeitaria</h1>
        <p>Não foi possível iniciar o banco de dados local.</p>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#b91c1c' }}>{String(erro?.message ?? erro)}</pre>
      </div>
    );
  });
