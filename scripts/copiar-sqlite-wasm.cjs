// Copia o motor SQLite em WebAssembly para public/assets, usado pelo jeep-sqlite
// quando o aplicativo roda no navegador durante o desenvolvimento.
const fs = require('fs');
const path = require('path');

const origem = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const destino = path.join(__dirname, '..', 'public', 'assets', 'sql-wasm.wasm');

if (fs.existsSync(origem)) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origem, destino);
}
