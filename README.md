# foot-landingpage

Site do **VárzeaScore** (`varzeascore.app`): landing de marketing + páginas
legais exigidas pelas lojas (App Store / Google Play).

Estático puro — HTML + CSS, zero build, zero framework. Identidade visual
extraída do app (`foot-mobile/src/theme`): carvão quente `#1B1A16`, lime
`#C6F24E`, Hanken Grotesk.

## Páginas

| Rota | O quê |
|---|---|
| `/` | Landing de venda (SEO: meta/OG/JSON-LD `SoftwareApplication`+`FAQPage`) |
| `/termos/` | Termos de uso |
| `/privacidade/` | Política de privacidade (LGPD) — URL exigida pelas lojas |
| `/assinatura/retorno/` | Retorno do checkout de assinatura do Mercado Pago (`MP_BACK_URL` do foot-api) |

## Deploy

GitHub Pages via Actions (`.github/workflows/deploy.yml`) a cada push na
`main`. Domínio custom no `CNAME` (`varzeascore.app`) — apontar o DNS:

```
A     @    185.199.108.153 (+ .109/.110/.111)
CNAME www  cloudninecode.github.io
```

> Pages gratuito exige repositório público — este repo não contém segredos,
> é conteúdo público por definição.

## Desenvolvimento

Qualquer servidor estático serve:

```bash
python3 -m http.server 8090
```

## Pendências

- Trocar `contato@varzeascore.app` / `privacidade@varzeascore.app` pelos
  e-mails reais quando existirem.
- Badges das lojas: linkar quando o app for publicado.
- Revisão jurídica dos textos legais antes do lançamento público.
- Imagem OG (`og:image`) com o card do app pra compartilhamento bonito.
