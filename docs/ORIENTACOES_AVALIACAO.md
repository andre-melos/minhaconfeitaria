# Orientações para análise e avaliação do código-fonte

**Projeto:** Aplicativo de Gestão de Confeitaria Artesanal (MinhaConfeitaria)
**Aluno:** André Luís Pereira de Melos – andre_melos@rede.ulbra.br

## 1. Visão geral

Aplicativo Android, offline, para confeiteiras que trabalham sob encomenda. Todos os dados ficam em um banco
**SQLite** no próprio aparelho.

| Item | Tecnologia |
|---|---|
| Interface | React 18 + Vite, Tailwind CSS, componentes Radix/shadcn |
| Aplicativo nativo | Capacitor 7 (gera o projeto Android em `android/`) |
| Banco de dados | SQLite via `@capacitor-community/sqlite` (no navegador: `sql.js`, para testes) |
| Testes | Vitest (regras de negócio) |

## 2. Como executar

Pré-requisito: Node.js 20 ou superior.

```bash
npm install      # dependências (também copia o SQLite WebAssembly para public/assets)
npm run dev      # abre em http://localhost:5173 (use o modo celular do navegador, F12)
npm test         # 38 testes das regras de cálculo
npm run lint     # verificação do código
```

No primeiro acesso o app pede para criar um PIN de 4 a 6 números (não há usuário/senha pré-definidos).
Para gerar o APK, ver `docs/GERAR_APK.md`.

**Dados de exemplo:** em **Configurações › Backup › Importar backup**, escolha `banco/backup_exemplo.json`
(12 clientes, 17 insumos, 7 produtos com ficha técnica, 53 pedidos, pagamentos e despesas).

## 3. Organização em camadas

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

## 4. Onde encontrar cada requisito

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

## 5. Pontos de atenção na avaliação

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
