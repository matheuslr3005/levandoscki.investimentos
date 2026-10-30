# Levandoscki Investimentos — site

Site institucional interativo da Levandoscki Investimentos (consórcios imobiliários e de veículos, investimentos e alavancagem patrimonial).

**Conceito: "Andar por andar".** O logo é um *L* que lembra um edifício, então o site inteiro é um prédio: cada seção é um andar e um elevador fixo na lateral sobe conforme o scroll.

## O que tem de interativo

| Andar | Seção | Interação |
|---|---|---|
| T | Hero | Monograma "L" feito de ~3 mil partículas que fogem do mouse e explodem no clique; skyline que cresce onde o cursor passa; contador de "+ R$ 150 milhões" |
| 1 | Soluções | Painéis que expandem como andares (acordeão no mobile), cada um com uma arte animada |
| 2 | Simulador | Consórcio × financiamento (imóvel e veículo) e projeção de investimentos. Uma torre ganha andares conforme a carta de crédito cresce. Premissas editáveis. O botão copia o resumo e abre o WhatsApp |
| 3 | Assembleia | Bombo de sorteio com física, 100 cotas, lance, concorrência e probabilidade calculada por Monte Carlo (1.000 grupos) em tempo real |
| 4 | Método | Prédio que acende andar por andar conforme o scroll |
| 5 | Dúvidas | FAQ em acordeão |
| C | Cobertura | CTA com botão magnético e texto girando |

Extras: preloader com o logo se desenhando, cursor customizado, botões magnéticos, spotlight nos cards, marquee guiado pela velocidade do scroll, confete dourado, `prefers-reduced-motion` respeitado, layout responsivo.

## Como rodar

Sem build, sem dependências, sem CDN (as fontes ficam em `assets/fonts`). Basta abrir o `index.html` ou servir a pasta:

```bash
python3 -m http.server 8000
```

Para publicar, qualquer hospedagem estática serve (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

## Estrutura

```
index.html          markup de todas as seções
css/fonts.css       @font-face (Bricolage Grotesque, Instrument Serif, JetBrains Mono)
css/styles.css      sistema visual e responsivo
js/core.js          preloader, cursor, elevador, reveal, painéis, FAQ, utilidades
js/hero.js          partículas do "L" e skyline (canvas)
js/simulator.js     simulador (premissas em MODES no topo do arquivo)
js/assembly.js      assembleia, bombo e Monte Carlo
assets/             favicon e fontes
```

## Pontos de personalização

- **Logo:** o monograma foi recriado em vetor (`<symbol id="lev-mark">` no `index.html`, `assets/favicon.svg` e os `Path2D` em `js/hero.js`). Para usar o arquivo oficial, troque esses paths.
- **WhatsApp:** o link `https://wa.link/2q9z90` está nos `href` do `index.html` e em `Lev.WHATS` (`js/core.js`).
- **Premissas do simulador:** taxas do consórcio, juros do financiamento e limites dos sliders ficam em `MODES` (`js/simulator.js`).
- **Concorrência da assembleia:** `level` e `rndBid` em `js/assembly.js`.

## Conteúdo e compliance

Os únicos dados reais usados vieram do perfil do Instagram: *"Alavancagem financeira e patrimonial"* e *"+ de 150 milhões sob gestão"*. Não foram inventados depoimentos, números de clientes, CNPJ, telefone ou endereço. As simulações são ilustrativas e há avisos no site e no rodapé. Recomenda-se que o responsável revise textos e avisos legais (Lei 11.795/2008, regras da administradora, CVM/ANBIMA para investimentos) antes de publicar.
