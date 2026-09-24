# Artwork and type sources

## Character

`assets/source/mascot.png` was generated with the built-in imagegen tool using the user-supplied Warm Terminal screenshot and the user’s GitHub avatar as references. The aim was to preserve the existing illustrated character’s appearance and peeking pose. The selected output is retained unmodified; `assets/mascot.png` is its resized, optimized delivery copy. The final prompt is in `design/mascot-prompt.md`.

## Typography

The terminal uses **PP Neue Montreal Mono**. Headings, chips and contact labels use **PP Mori**, by Pangram Pangram Foundry. The regular weights are rendered to SVG outlines. Native Markdown paragraphs follow GitHub typography.

Sources inspected on 2026-09-24:

- [Mori official specimen and product page](https://pangrampangram.com/products/mori).
- [Neue Montreal Mono official specimen and product page](https://pangrampangram.com/products/neue-montreal-mono).
- [Foundry FAQ, including personal portfolios](https://pangrampangram.com/pages/faq#free-fonts-and-personal-use).

The local build inputs were the public WOFF2 specimen files served by the foundry’s own CDN, with only the regular instances used:

- `PPMori-Variable_1b739cad-396d-457b-a4e6-addb15e8e13b.woff2` from the Mori page.
- `PPNeueMontrealMono-Variable.woff2` from the Neue Montreal Mono page.

No third-party font download site, mailing-list submission or font purchase was used. Font files remain in the ignored `.fonts/` directory and are not redistributed. This repository does not grant a font license; consult the linked foundry terms for other uses.

## Technology icons

Brand symbols come from [Simple Icons](https://github.com/simple-icons/simple-icons), version **16.32.0**, distributed under [CC0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md). Brand names and marks belong to their respective owners. Very dark icon fills use cream for visibility on the dark chips. Technologies without an available icon use an explicitly labeled typographic monogram, not an invented brand logo.

Codex, Grok and OpenAI marks come from [Lobe Icons](https://github.com/lobehub/lobe-icons), package `@lobehub/icons-static-svg` version **1.95.1**, under MIT. The selected vector geometry and pinned source URLs are saved in `design/brand-icons.json`, and the upstream license is in `design/LICENSE-lobe-icons.txt`. Grok CLI uses the plain Grok mark. Grokbot has a separate local icon variant: the same Grok mark in dark ink on a cream rounded tile, so the two tools are visually distinct. This framing is a local presentation choice, not a separate official Grokbot logo. Claude Code uses the dedicated Simple Icons mark. Tool names were supplied by the profile owner. No affiliation with the vendors is implied.

The envelope symbol is local SVG geometry. All badge and contact symbols are static. GitHub-native rendering in the local preview is styled by [github-markdown-css](https://github.com/sindresorhus/github-markdown-css), version **5.9.0**, under its MIT license; those preview files are not part of the profile artwork.
