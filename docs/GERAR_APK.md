# Como gerar o APK do MinhaConfeitaria (Android)

## 1. Pré-requisitos (uma vez só)

1. **Node.js 20 ou superior** – https://nodejs.org (versão LTS).
2. **Android Studio** (versão recente) – https://developer.android.com/studio
   - Na primeira abertura, aceite a instalação padrão (Android SDK, Platform Tools e emulador).
   - O Android Studio já traz o JDK 21 exigido pelo Capacitor 7.
3. Dependências do projeto, no terminal dentro da pasta do projeto:
   ```
   npm install
   ```

## 2. Criar o projeto Android (uma vez só)

```
npm run build
npx cap add android
```

Isso cria a pasta `android/`, que deve ser versionada no Git.

## 3. A cada nova versão do app

```
npm run build
npx cap sync android
npx cap open android
```

O último comando abre o projeto no Android Studio. Espere a barra inferior terminar o "Gradle sync" (alguns minutos na primeira vez).

## 4. Testar no celular

1. No celular: **Configurações › Sobre o telefone** e toque 7 vezes em **Número da versão** para ativar o modo desenvolvedor.
2. Em **Opções do desenvolvedor**, ative **Depuração USB** e conecte o cabo.
3. No Android Studio, escolha o aparelho na barra superior e clique em **Run ▶**.

## 5. Gerar o APK para distribuir (assinado)

1. **Build › Generate Signed App Bundle / APK…** › **APK** › Next.
2. Na primeira vez, clique em **Create new…** para criar a chave (keystore):
   - salve o arquivo **fora da pasta do projeto** (ex.: `Documentos/chaves/minhaconfeitaria.jks`);
   - anote as senhas. Sem essa chave não é possível publicar atualizações do mesmo app.
3. Escolha **release** › **Create**.
4. O APK fica em `android/app/release/app-release.apk`.

Para um teste rápido sem assinatura própria, use **Build › Build App Bundle(s) / APK(s) › Build APK(s)**; o arquivo sai em
`android/app/build/outputs/apk/debug/app-debug.apk`.

## 6. Publicar o link do APK (entrega da AS)

1. No GitHub, abra o repositório › **Releases** › **Draft a new release**.
2. Tag `v1.0.0`, título `MinhaConfeitaria 1.0.0`, anexe o `app-release.apk` e publique.
3. O link de download do arquivo é o link público do aplicativo.

Para instalar no celular a partir do link, o Android pede permissão para "instalar apps desconhecidos" para o navegador.

## Problemas comuns

| Sintoma | Solução |
|---|---|
| `JAVA_HOME` ou versão do Java incorreta | Android Studio › Settings › Build Tools › Gradle › Gradle JDK: escolha o JDK 21 embutido. |
| Tela branca ao abrir o app | Rode `npm run build` e `npx cap sync android` antes de gerar o APK. |
| Mudanças no código não aparecem | Sempre `npm run build` + `npx cap sync android` depois de alterar o código. |
