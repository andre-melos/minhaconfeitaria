# MinhaConfeitaria – Aplicativo de Gestão de Confeitaria Artesanal

Aplicativo móvel (Android) para confeiteiras que trabalham sob encomenda. Ele reúne:

- clientes e agenda de pedidos (status, pagamentos, sinal e saldo, envio pelo WhatsApp);
- fichas técnicas dos produtos com custo, mão de obra, preço sugerido e margem real;
- calculadoras de massas (inclusive caixa degustação), insumos e embalagens a partir dos pedidos;
- relatório de vendas (faturamento, custo, lucro, margem, produtos mais vendidos) e fluxo de caixa;
- backup em arquivo e acesso protegido por PIN.

Os dados ficam em um banco **SQLite no próprio aparelho**: o app funciona sem internet e não tem servidor.

Projeto Tecnológico em Desenvolvimento de Sistemas – ADS/ULBRA EaD – André Luís Pereira de Melos (andre_melos@rede.ulbra.br).

## Instalar o aplicativo

- **Download do APK:** https://github.com/andre-melos/minhaconfeitaria/releases/download/v1.0.0/app-release.apk
  (página da versão: https://github.com/andre-melos/minhaconfeitaria/releases/tag/v1.0.0)
- **Requisitos mínimos:** Android 6.0 (API 23) ou superior. Não precisa de internet depois de instalado.
- **Instalação:** abra o link no celular, baixe o arquivo, toque nele e, se o Android pedir, permita "instalar apps desta fonte"; depois toque em **Instalar** e **Abrir**.
- **Acesso:** não há login nem usuário/senha de teste, porque não existe servidor nem contas. No primeiro acesso o app pede para **criar um PIN** de 4 a 6 números (por exemplo, 1234), exigido ao abrir o app e após 5 minutos em segundo plano.
- **Dados para teste:** importe `banco/backup_exemplo.json` em **Configurações › Backup › Importar backup** (12 clientes, 17 insumos, 7 produtos com ficha técnica, 53 pedidos de agosto a dezembro de 2026, pagamentos e despesas). No celular, baixe antes o arquivo pelo link
  https://github.com/andre-melos/minhaconfeitaria/raw/main/banco/backup_exemplo.json

## Tecnologias e versões

| Tecnologia | Versão | Uso |
|---|---|---|
| React / React DOM | 18.3.1 | interface |
| Vite | 6.4.3 | build e servidor de desenvolvimento |
| Capacitor (core, android, cli) | 7.6.8 | aplicativo Android a partir do código web |
| @capacitor-community/sqlite | 7.0.3 | banco SQLite nativo no aparelho |
| sql.js / jeep-sqlite | 1.12.0 / 2.8.0 | SQLite no navegador (desenvolvimento e testes) |
| @capacitor/filesystem, share, app | 7.1.9, 7.0.4, 7.1.2 | backup em arquivo, compartilhamento, botão voltar |
| Tailwind CSS + Radix UI | 3.4.19 | estilos e componentes acessíveis |
| TanStack Query / React Router | 5.101.4 / 6.30.4 | dados na interface e navegação |
| date-fns / Recharts | 3.6.0 / 2.15.4 | datas e gráficos |
| Vitest / ESLint | 3.2.7 / 9.39.5 | testes e análise do código |
| Android | minSdk 23, targetSdk 35 | plataforma |

## Banco de dados

- **Script de criação:** `banco/script_banco.sql` (18 tabelas com chaves estrangeiras, restrições e índices, mais os registros iniciais de configuração e categorias). Pode ser executado em qualquer SQLite: `sqlite3 teste.db < banco/script_banco.sql`.
- No app, o mesmo esquema é criado pelas migrações versionadas em `src/dados/migracoes.js` na primeira execução; o script é gerado a partir delas com `npm run script-banco`.
- Não há credenciais de banco: o SQLite é local e não usa usuário/senha. Nenhum arquivo de configuração com senha ou chave faz parte do repositório; as chaves de assinatura do Android ficam fora dele (ver `.gitignore`).

## Executar localmente

Pré-requisito: Node.js 20 ou superior.

```bash
git clone https://github.com/andre-melos/minhaconfeitaria.git
cd minhaconfeitaria
npm install        # instala as dependências e copia o SQLite (WebAssembly) para public/assets
npm run dev        # abre em http://localhost:5173 (use o modo celular do navegador, F12)
npm test           # 38 testes das regras de cálculo
npm run lint       # verificação do código
```

## Gerar o APK

Pré-requisito: Android Studio recente (com JDK 21). Passo a passo completo em `docs/GERAR_APK.md`.

```bash
npm run build:mobile    # gera a interface e copia para o projeto Android
npx cap open android    # no Android Studio: Build › Generate Signed App Bundle / APK › APK › release
```

## Organização do código (camadas)

```
src/
  pages/            telas (uma por caso de uso ou grupo de casos de uso)
  components/       layout, bloqueio por PIN, gesto "voltar" do Android, componentes comuns
  servicos/         regras de negócio e validações (não dependem da interface)
    testes/         testes automatizados das regras
  dados/
    conexao.js      conexão SQLite, transações
    migracoes.js    criação e evolução do esquema (versões v1 a v5)
    repositorios/   consultas SQL de cada entidade
banco/
  script_banco.sql      script completo do banco (18 tabelas), gerado a partir das migrações
  backup_exemplo.json   dados fictícios para avaliação
android/            projeto Android gerado pelo Capacitor (MainActivity com ajuste do Android 15)
```

A interface chama apenas os **serviços**; os serviços validam e aplicam as regras e chamam os **repositórios**,
que executam o SQL. Erros de validação (`ErroDeNegocio`) são exibidos para o usuário em português.

## Onde encontrar cada requisito

| Requisito | Tela (`src/pages`) | Regras (`src/servicos`) |
|---|---|---|
| RF01 Clientes | Clientes.jsx | clienteServico.js |
| RF02 Categorias | Categorias.jsx | categoriaServico.js |
| RF03–RF04 Insumos e recálculo | Insumos.jsx | insumoServico.js, produtoServico.js (`recalcularTodos`) |
| RF05–RF07 Produtos, custos e preço | Produtos.jsx | produtoServico.js, custoServico.js (`calcularCustosProduto`) |
| RF08 Revisão de preços | Produtos.jsx | custoServico.js (`produtosAbaixoDoSugerido`) |
| RF09–RF10 Massas e doces | Massas.jsx | massaServico.js |
| RF11 Embalagens | Embalagens.jsx, Produtos.jsx | embalagemServico.js |
| RF12 Datas festivas | DatasFestivas.jsx | dataFestivaServico.js |
| RF13–RF14 Pedidos | Pedidos.jsx, FormularioPedido.jsx, DetalhesPedido.jsx | pedidoServico.js, regrasPedido.js |
| RF15 Agenda | Agenda.jsx | pedidoServico.js |
| RF16–RF18 Calculadoras | CalculadoraMassas/Insumos/Embalagens.jsx | producaoServico.js |
| RF19 Relatório de vendas | Relatorios.jsx | financeiroServico.js (`montarRelatorioVendas`) |
| RF20 Fluxo de caixa | FluxoCaixa.jsx | financeiroServico.js (`montarFluxoCaixa`) |
| RF21–RF22 Backup | Configuracoes.jsx | backupServico.js |
| RF23 Margem padrão | Configuracoes.jsx | configuracaoServico.js |
| RF24 PIN | components/BloqueioPin.jsx, Configuracoes.jsx | configuracaoServico.js, backupServico.js (`apagarTudo`) |

## Pontos de atenção para a análise do código

- **Regras de cálculo** (RN01–RN17 do documento de Projeto): funções puras em `custoServico.js`,
  `producaoServico.js`, `regrasPedido.js` e `financeiroServico.js`, cobertas por `servicos/testes/regras.test.js`.
- **Integridade dos dados:** chaves estrangeiras com `ON DELETE RESTRICT/CASCADE`, restrições `CHECK` e
  operações compostas (pedido com itens, backup, recálculo de custos) em transação.
- **Custo histórico:** cada item de pedido grava o preço e o custo vigentes, para que os relatórios não mudem
  quando o preço de um insumo é alterado.
- **Segurança:** o PIN é guardado como hash SHA-256 com sal; o arquivo de backup não contém o PIN.
- **Desempenho (RNF01):** testado com 2.000 pedidos; telas abaixo de 3 segundos.
- **Acessibilidade e uso no celular:** textos de 16 px, áreas de toque de 44 px, verificação automática WCAG
  (axe-core) sem violações, teclado e barras do sistema tratados no Android 15.
