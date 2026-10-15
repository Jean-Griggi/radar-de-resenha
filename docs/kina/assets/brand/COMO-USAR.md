# Assets da marca Kina — onde colocar cada arquivo

Prévia de tudo: `kina-assets-previa.png`.
Todos os logos estão **em curvas** (não dependem da fonte instalada).

## Estrutura

```
assets/brand/
├─ svg/        ← use SVG sempre que possível (nítido em qualquer tamanho)
│  ├─ kina-logo-{claro|escuro|mono-tinta|mono-papel|currentcolor}.svg
│  ├─ kina-wordmark-{claro|escuro|mono-tinta|mono-papel|currentcolor}.svg
│  ├─ kina-simbolo-{claro|escuro|mono-tinta|mono-papel|currentcolor}.svg
│  ├─ app-icon.svg · app-icon-escuro.svg · app-icon-maskable.svg
│  └─ favicon.svg   (troca de cor sozinho no modo escuro do navegador)
└─ png/        ← para onde SVG não é aceito (lojas, redes, e-mail, manifest)
   ├─ logo/      kina-logo-*-{600|1200|2400}w.png · kina-wordmark-*-{600|1200}w.png (fundo transparente)
   ├─ simbolo/   kina-simbolo-*-{64|256|512|1024}.png (fundo transparente)
   ├─ app-icon/  app-icon-{1024|512|192}.png · app-icon-escuro-{1024|512}.png
   │             app-icon-maskable-{512|192}.png · apple-touch-icon-180.png
   ├─ favicon/   favicon.ico (16+32+48) · favicon-{16|32|48}.png
   └─ social/    og-image-1200x630.png
```

## Qual versão usar

| Fundo | Logo |
| --- | --- |
| Papel / claro | `-claro` |
| Asfalto / escuro | `-escuro` |
| Foto ou fundo sódio | `-mono-papel` |
| Impressão em 1 cor, documentos | `-mono-tinta` |
| Dentro do app (componente) | `-currentcolor`, inserido inline |

Abaixo de 96 px de largura, use só o símbolo.

## Onde copiar no projeto

Os caminhos abaixo supõem uma pasta pública `public/` (Vite, Next.js, CRA). Ajuste se o projeto usar outra (ex.: `static/`).

| Arquivo do kit | Destino no projeto |
| --- | --- |
| `svg/favicon.svg` | `public/favicon.svg` |
| `png/favicon/favicon.ico` | `public/favicon.ico` (substitui o atual) |
| `png/app-icon/apple-touch-icon-180.png` | `public/apple-touch-icon.png` |
| `png/app-icon/app-icon-192.png`, `app-icon-512.png` | `public/icons/` |
| `png/app-icon/app-icon-maskable-192.png`, `-512.png` | `public/icons/` |
| `png/social/og-image-1200x630.png` | `public/og-image.png` |
| `svg/kina-logo-*.svg`, `svg/kina-simbolo-*.svg` | `public/brand/` (uso em `<img>`) |
| `svg/*-currentcolor.svg` | `src/assets/brand/` (importar como componente SVG) |
| `png/logo/*`, `png/simbolo/*` | **não vão para o código**: são para redes sociais, lojas e materiais |

## Trecho para o `<head>`

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#F3EEE4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14120F" media="(prefers-color-scheme: dark)">
<meta property="og:title" content="Kina">
<meta property="og:description" content="Te vejo na Kina. Combina o rolê, chega junto, guarda o que rolou.">
<meta property="og:image" content="/og-image.png">
<title>Kina</title>
```

## Trecho para o manifest (`manifest.webmanifest` ou `manifest.json`)

```json
{
  "name": "Kina",
  "short_name": "Kina",
  "background_color": "#F3EEE4",
  "theme_color": "#C8461A",
  "display": "standalone",
  "icons": [
    { "src": "/icons/app-icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/app-icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/app-icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/app-icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Se o projeto já tiver um manifest, troque só `name`, `short_name`, as cores e os ícones; não apague os outros campos.

## App nativo (se um dia houver)

- iOS: `png/app-icon/app-icon-1024.png` (o sistema arredonda os cantos; não arredonde a imagem).
- Android adaptive icon: fundo `#C8461A` + `svg/kina-simbolo-mono-papel.svg` como primeiro plano, dentro da zona segura de 66%.

## Regras rápidas

- Não girar, distorcer, contornar ou aplicar sombra/gradiente.
- Não mudar a posição do ponto nem arredondar o L.
- Respiro mínimo ao redor do logo: a altura do ponto do “i” em todos os lados.
