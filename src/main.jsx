import React from 'react';
import ReactDOM from 'react-dom/client';
import { defineCustomElements as definirJeepSqlite } from 'jeep-sqlite/loader';
import App from '@/App.jsx';
import '@/index.css';
import { iniciarBanco } from '@/dados/conexao';

definirJeepSqlite(window);
const raiz = ReactDOM.createRoot(document.getElementById('root'));

iniciarBanco()
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
