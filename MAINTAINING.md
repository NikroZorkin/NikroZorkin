# Maintaining this profile

The deliverable is `README.md` plus `assets/`. It is prepared for the public profile repository **NikroZorkin/NikroZorkin**, with `README.md` at its root. The preview and build tools are local development conveniences; no website needs to be deployed. This workspace does not publish or change the GitHub profile automatically.

## Update the content

- Edit `design/profile.json` for the name, introduction, command, displayed technology IDs, AI coding tools, capability descriptions and contact destinations.
- Edit `design/technologies.json` for the underlying audit inventory and badge definitions. Only IDs selected in `profile.json` appear in the README. Each entry uses a Simple Icons slug, a local brand icon or an explicit monogram. `npm` and `python` arrays map dependency aliases to that technology; they never appear in the profile.
- Edit `design/tokens.json` for colors, font files, chip sizing and the mobile breakpoint. Terminal composition and glyph animation live in `scripts/artwork.mjs`.
- Keep the public stack compact: one section, currently 29 core technologies, followed by four AI coding tools. The design tool selection is Figma. C#, Markdown, long library lists, category headings and the former “How I work” block were explicitly removed.
- The “Automation & integrations” section describes workflow automation, APIs, webhooks, AI features, Stripe payments and subscriptions. Keep it short and concrete. Do not add individual projects, screenshots of work, rates, statistics or visitor counters.

`design/dependencies.json` records the 103 direct npm dependencies and 16 direct Python dependencies found in the original audit. It contains no private repository names or source code. The 112-entry audit inventory remains available as a source of evidence; it is not the public badge list. Packages such as Radix subpackages, font packages, framework adapters and type definitions are explicitly mapped to their parent technology. AI tool experience was supplied by the owner separately.

## Rebuild

Requires Node.js 22 or newer.

```sh
npm ci
npm run build
npm run check
```

The graphics use **PP Mori Regular (400)** and **PP Neue Montreal Mono Regular (450)**. Their official font files are stored locally at the paths in `design/tokens.json`, under the ignored `.fonts/` directory. Both are currently variable WOFF2 files; the builder decodes them and selects those regular weights before outlining the text.

For a fresh checkout, obtain the fonts from [Mori](https://pangrampangram.com/products/mori) and [Neue Montreal Mono](https://pangrampangram.com/products/neue-montreal-mono), place them locally, and update the two `file` paths if necessary. The builder also accepts OTF and TTF files. Follow the foundry’s [personal-use terms](https://pangrampangram.com/pages/faq#free-fonts-and-personal-use). No font software is committed, embedded in SVGs, or served by the preview. The checked-in artwork already contains outlined lettering and displays without font installation.

The high-resolution, transparent character source is `assets/source/mascot.png`. Its reference-guided generation prompt and provenance are recorded in `design/mascot-prompt.md`. The build creates an optimized transparent PNG and embeds it into each terminal SVG, so the terminal has no external resource dependencies. Keep the original source when adjusting export settings.

`design/brand-icons.json` stores local SVG geometry for additional AI brand marks, with pinned source URLs. Its upstream license is retained alongside it. Generated SVG directories are pruned during the build, so removing a visible badge or section also removes its obsolete artwork.

## Preview and verify

```sh
npm run preview
```

Open the printed localhost URL. The first render uses `gh api markdown`, so the GitHub CLI must be authenticated and online. This is a render request, not a publication. HTML is cached by README content hash. `npm run preview -- --refresh` refreshes that cache; `npm run preview -- --render-only` exports the local preview without starting a server. `preview/index.html` can also be opened as a local file after rendering.

```sh
npm run check:visual
```

This verifies the GitHub-sanitized HTML in Chromium at **375, 768 and 1280 px**, in light and dark themes, with both normal and reduced motion. It checks every image, overflow, all four contact destinations, variant selection, and animation confinement to the command. It also compares static-mode pixels over time. Playwright uses its installed Chromium, with an installed Google Chrome as a fallback; `npx playwright install chromium` installs the pinned browser if needed.

Screenshots and the validation report are written to the ignored `preview/` directory. The browser preview uses `github-markdown-css`; it is not a claim that a live profile has been published. The GitHub Markdown API preserves the responsive, theme and reduced-motion `<source>` rules.

## Display behavior

- Only the command animates, in a ten-second typing/pause loop. Names, descriptions, the character and all other graphics are static.
- Screens at or below 600 px use the mobile composition. Reduced motion selects a separate static SVG; the animated files also contain a reduced-motion CSS rule for direct use.
- The terminal, stack badges and contact cards keep their warm dark surfaces in both GitHub themes. Contacts stand out through slightly lighter brown surfaces, peach icons and borders, larger labels and short action captions. Their sizing and colors are in `tokens.contact`; captions are in `profile.contacts`. Heading artwork adapts to the theme; native body copy uses GitHub’s fonts and colors. GitHub owns the surrounding page background.
- Individual badge images wrap naturally. The four contact links fill the available width, switching to two columns at 600 px through GitHub-compatible picture sources. Their fluid SVGs keep lettering at a fixed readable size; desktop and mobile exports preserve the outer alignment and inner gutters. Keep the links adjacent in the generated HTML so whitespace cannot wrap the last card. Contact cards have accessible image labels. Body copy remains native Markdown, and the terminal’s description is repeated in its image alt text.
- The README uses local paths and no external badge, typing-animation, statistics or visitor-counter service. Only the four intentional contact links leave the repository.

To place this on GitHub, keep `README.md` and the entire `assets/` directory together at the root of **NikroZorkin/NikroZorkin**. Include `design/`, `scripts/`, the lockfile and these maintenance notes if future regeneration should be possible. Keep `.fonts/`, `.cache/`, `node_modules/` and `preview/` ignored.
