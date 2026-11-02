# MinhaConfeitaria

Aplicativo móvel de gestão para confeitaria artesanal: pedidos e agenda, fichas técnicas com custo e preço sugerido, calculadoras de massas, insumos e embalagens, relatórios de vendas e fluxo de caixa. Os dados ficam no próprio aparelho (SQLite), e o app funciona sem internet.

Projeto Tecnológico em Desenvolvimento de Sistemas – ADS/ULBRA – André Luís Pereira de Melos.

## Tecnologias

- React 18 + Vite (interface)
- Capacitor 7 (aplicativo Android/iOS a partir do mesmo código)
- SQLite via `@capacitor-community/sqlite` (no navegador, `jeep-sqlite` + `sql.js`)
- Tailwind CSS e componentes Radix UI
- TanStack Query, React Router, date-fns e Recharts
- Vitest (testes das regras de cálculo)

## Estrutura do código

```
src/
  pages/        telas (camada de interface)
  components/   componentes reutilizáveis, layout e bloqueio por PIN
  servicos/     regras de negócio e validações (sem dependência da interface)
  dados/        conexão SQLite, migrações do esquema e repositórios com SQL
  hooks/, lib/  utilitários
```

O esquema do banco é criado e atualizado pelas migrações em `src/dados/migracoes.js`.
O script completo do banco (18 tabelas, chaves estrangeiras e índices) está em `banco/script_banco.sql`;
ele é gerado a partir das migrações com `npm run script-banco`.

## Como executar

Pré-requisito: Node.js 20 ou superior.

```bash
npm install        # instala as dependências e copia o SQLite (WebAssembly) para public/assets
npm run dev        # abre em http://localhost:5173
npm test           # executa os testes das regras
npm run lint       # verifica o código
```

## Dados de exemplo para avaliação

O arquivo `banco/backup_exemplo.json` traz dados fictícios (12 clientes, 17 insumos, 7 produtos com ficha técnica,
53 pedidos de agosto a dezembro de 2026, pagamentos e despesas), com custos calculados pelas mesmas regras do app.
Para usar: abra o app, crie um PIN, vá em **Configurações > Backup > Importar backup** e escolha o arquivo.
No celular, copie o arquivo para o aparelho antes (por exemplo, pela pasta Downloads).
O arquivo é gerado por `npm run backup-exemplo`.

## Gerar o aplicativo Android (APK)

Pré-requisito: Android Studio recente com JDK 21.

```bash
npm run build
npx cap add android     # somente na primeira vez
npx cap sync android
npx cap open android    # no Android Studio: Build > Build App Bundle(s) / APK(s) > Build APK(s)
```
