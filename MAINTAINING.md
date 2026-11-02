# Maintaining this profile

The deliverable is `README.md` plus `assets/`. It is prepared for the public profile repository **NikroZorkin/NikroZorkin**, with `README.md` at its root. The preview and build tools are local development conveniences; no website needs to be deployed. This workspace does not publish or change the GitHub profile automatically.

## Update the content

- Edit `design/profile.json` for the name, introduction, command, displayed technology IDs, AI coding tools, capability descriptions and contact destinations.
- Edit `design/technologies.json` for the underlying audit inventory and badge definitions. Only IDs selected in `profile.json` appear in the README. Each entry uses a Simple Icons slug, a local brand icon or an explicit monogram. `npm` and `python` arrays map dependency aliases to that technology; they never appear in the profile.
- Edit `design/tokens.json` for colors, font files, chip sizing and the mobile breakpoint. Terminal composition and glyph animation live in `scripts/artwork.mjs`.
- Keep the public stack compact: one section, currently 29 core technologies, followed by four AI coding tools. The design tool selection is Figma. C#, Markdown, long library lists, category headings and the former “How I work” block were explicitly removed.
- The “Automation & integrations” section describes workflow automation, APIs, webhooks, AI features, Stripe payments and subscriptions. Keep it short and concrete. Do not add individual projects, screenshots of work, rates or visitor counters. The requested contribution skyline below the contacts uses real daily GitHub totals.

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

- The command animates in a ten-second typing/pause loop. The contribution skyline cycles between a flat calendar and a 3D city over 18 seconds. Names, descriptions, the character and other graphics are static. Both animations have separate static reduced-motion exports.
- Screens at or below 600 px use the mobile composition. Reduced motion selects a separate static SVG; the animated files also contain a reduced-motion CSS rule for direct use.
- The terminal, stack badges and contact cards keep their warm dark surfaces in both GitHub themes. Contacts stand out through slightly lighter brown surfaces, peach icons and borders, larger labels and short action captions. Their sizing and colors are in `tokens.contact`; captions are in `profile.contacts`. Heading artwork adapts to the theme; native body copy uses GitHub’s fonts and colors. GitHub owns the surrounding page background.
- Individual badge images wrap naturally. The four contact links fill the available width, switching to two columns at 600 px through GitHub-compatible picture sources. Their fluid SVGs keep lettering at a fixed readable size; desktop and mobile exports preserve the outer alignment and inner gutters. Keep the links adjacent in the generated HTML so whitespace cannot wrap the last card. Contact cards have accessible image labels. Body copy remains native Markdown, and the terminal’s description is repeated in its image alt text.
- The README uses local paths and no external badge, typing-animation, statistics or visitor-counter service. Only the four intentional contact links leave the repository.

To place this on GitHub, keep `README.md` and the entire `assets/` directory together at the root of **NikroZorkin/NikroZorkin**. Include `design/`, `scripts/`, the lockfile and these maintenance notes if future regeneration should be possible. Keep `.fonts/`, `.cache/`, `node_modules/` and `preview/` ignored.

## Contribution skyline and automatic updates

`design/contributions.json` is a dated snapshot from the GitHub GraphQL contribution calendar. Only dates and daily totals are stored, never repository names or contribution details. The SVG shows the snapshot's full date range and update date; no demo activity is generated. Counts reflect the calendar returned to the authenticated GitHub account.

Run `npm run skyline:refresh` to fetch current data, rebuild the artwork and refresh the local preview. A failed fetch stops the command and preserves the existing snapshot. Identical calendar data keeps the existing timestamp and produces no update commit.

`.github/workflows/update-skyline.yml` updates the published profile at 00:17, 06:17, 12:17 and 18:17 UTC, using a standard Ubuntu runner and the built-in `GITHUB_TOKEN`. No personal token, paid service, Actions artifacts or dependency caches are configured. The job has a ten-minute limit and serializes runs. Only the snapshot, skyline SVGs and README are staged; commits use `github-actions[bot]`. If another commit reaches main during a build, the normal push is rejected safely rather than overwriting it; run again against the latest main.

To update immediately, open the repository's **Actions → Update contribution skyline → Run workflow**. The optional **rebuild** checkbox also exercises the renderer when the calendar is unchanged. A failed fetch, checksum or validation stops publication and leaves the last working profile intact. GitHub may delay scheduled jobs; check this workflow's run history if the update date looks stale.

`scripts/fetch-fonts.mjs` downloads the exact existing build fonts from the foundry's CDN and verifies the SHA-256 values in `design/font-sources.json`. They remain temporary ignored build inputs and are not redistributed. If the foundry removes or changes these files, inspect the failure and update the font configuration before rerunning.

`scripts/skyline.mjs` adapts the supplied component's grid, relative bar heights, streak calculation, projection and wave progression into self-contained outlined SVG. The same daily box faces morph with native SVG (SMIL) path animation, including in Safari, without embedded JavaScript or interactive controls. Desktop and mobile compositions use separate exports. Reduced motion selects the fully raised static city. All four variants are generated by the standard build.

The local preview additionally loads `scripts/preview-skyline.js`: it pauses the same geometry as a flat calendar until 35% of the card enters the viewport, plays a single ascent, and holds the city. This uses IntersectionObserver and the SVG animation timeline in the preview page only. GitHub README cannot run this script and retains the autonomous SVG loop. The preview note calls out this difference; reduced motion keeps the static image. No scroll-trigger behavior is claimed for the published README.
