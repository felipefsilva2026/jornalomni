# Fotos de referência (login por rosto)

Coloque aqui as fotos das pessoas autorizadas a entrar com reconhecimento facial e liste os nomes dos arquivos em `manifest.json`.

## Como cadastrar uma foto

1. Copie a foto para esta pasta (ex.: `chefe.jpg`).
2. Abra `manifest.json` e adicione o nome do arquivo na lista:
   ```json
   ["chefe.jpg"]
   ```
3. Suba a foto junto com o resto de `site_para_github/` para o GitHub.

## Requisitos da foto

- Rosto de frente, bem iluminado, sem óculos escuros ou boné cobrindo o rosto.
- Um rosto por foto (se houver mais de uma pessoa na imagem, o reconhecimento pode falhar).
- Formatos aceitos: `.jpg`, `.png`.

## Aviso importante sobre privacidade

Se o repositório do GitHub for **público** (é o que acontece no plano gratuito), **qualquer pessoa com o link consegue baixar essas fotos** — elas ficam no repositório como qualquer outro arquivo. Antes de subir a foto de alguém (inclusive a sua ou a do seu chefe), vale ter certeza de que a pessoa está de acordo com isso, e considerar se um repositório privado (GitHub Pro) ou o link do Claude (privado por padrão) não seria mais adequado.

## Sobre a segurança do reconhecimento

O reconhecimento roda inteiramente no navegador (não envia nada para servidor nenhum), mas é uma comparação simples de similaridade facial, sem teste de vivacidade — ou seja, uma foto impressa ou na tela de um celular mostrada para a câmera pode, em teoria, enganar o sistema. É um método de conveniência, não uma proteção de nível bancário.
