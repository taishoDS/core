[Español](README.md) · **English**

# @taishods/core

*Consistency that scales.*

TaishoDS Core: the system CSS, the tokens, and the behavior JavaScript, for any HTML page. Free, MIT license. No
Svelte, no React.

There are two ways to add it to your project. It's the same Core either way, and you can switch whenever you want.

## 1. Via CDN: paste three lines

It's the shortest path, with nothing to install. The version is pinned in the URL:

```html
<link rel="stylesheet" href="https://taisho.design/core/0.15.1/taisho.tokens.css" integrity="sha384-+2WHAtu42BCWEq7KajKLeexi0n+E4UXhDgH4f5iQLZWhC0WJf3DNRH2uBr4FrdIV" crossorigin="anonymous">
<link rel="stylesheet" href="https://taisho.design/core/0.15.1/taisho.full.css" integrity="sha384-ZKmW+Qt250kHVvsit6RM7serrbDXvLttvBIKzHlrhKnFV7Bal6NSFc0Ld16k/m0l" crossorigin="anonymous">
<script type="module" src="https://taisho.design/core/0.15.1/taisho.core.js" integrity="sha384-AEROM85MrEJoTq8ilp/I9le3EX6EntjfccTSSC3IVEbsaAE9s19OTFb6us6oEuKP" crossorigin="anonymous"></script>
```

Order matters. The theme goes first, because it defines the variables; then the system CSS, which reads them; and
the JS last, which initializes itself. Classes go on the same element as the `ts` scope class:
`class="ts button size-md variant-primary"`.

## 2. With the package and CLI: your brand in the CSS

To get your colors and fonts into the CSS, and only the classes you use, install the package and run the `taisho`
command from your project root (Node 22.18 or later):

```bash
npm i -D @taishods/core
npx taisho init       # asks for the language, brand, theme name, fonts, your own icons, and the output folder, and writes taisho.config.ts
npx taisho generate   # compiles your CSS and copies the behavior JS to that folder
```

The output folder is the one that ships with your site (for example `public/taisho`, `static/taisho`, or
`./taisho`); `init` suggests one based on your project layout and saves it in `taisho.config.ts`. When it's
done, `generate` prints the exact `<link>` and `<script>` lines to paste into your HTML. Both the CSS and the
behavior JS end up in that folder, side by side:

```html
<link rel="stylesheet" href="taisho/theme.css">
<link rel="stylesheet" href="taisho/taisho.css">
<script type="module" src="taisho/taisho.core.js"></script>
```

### With a bundler (Vite and similar)

If the project already uses a bundler, the CSS and the JS are imported by name from the package, with no
files to copy or link:

```js
import '@taishods/core/css/tokens/taisho.css'; // the system theme
import '@taishods/core/css/taisho.full.css';   // the full CSS
import '@taishods/core/core';                  // the behavior
```

## What's included

- **Full CSS** — `css/taisho.full.css`, with every component and utility.
- **System theme** — `css/tokens/taisho.css`.
- **Behavior** — `core.js`: accordions, tabs, select, combobox, calendar, sortable table, and command palette,
  wired up through `data-ts-*` attributes.
- **Theming in the browser** — `createTheme()`: pass it a hex color and everything repaints, with dark mode and
  accessible contrast derived for you.
- **The `taisho` command** — `init`, `generate`, `watch`, `check`, and `migrate`: they compile the CSS with your brand, rebuild it on save, check your classes, and migrate from other systems.

## What's not included

Components for any particular framework: Core is HTML, CSS, and JavaScript, and works the same on any page. With a framework in the middle, it was tested in Astro, Next (App Router), and SvelteKit: the versions, the steps, and what wasn't tested are at https://taisho.design/docs/compatibility#frameworks.

## Documentation

Installation, every component, the tokens, and the utilities: https://taisho.design/en/docs/installation

## License

MIT. The “Taisho” trademark isn't included—see TRADEMARK.md.
