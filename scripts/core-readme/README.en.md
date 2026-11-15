[Español](README.md) · **English**

# @taishods/core

*Consistency that scales.*

TaishoDS Core: the system CSS, the tokens, and the behavior JavaScript, for any HTML page. Free, MIT license. No
Svelte, no React.

There are two ways to add it to your project. It's the same Core either way, and you can switch whenever you want.

## 1. Via CDN: paste three lines

It's the shortest path, with nothing to install. The version is pinned in the URL:

```html
<link rel="stylesheet" href="https://taisho.design/core/{{version}}/taisho.tokens.css" integrity="{{integrity:taisho.tokens.css}}" crossorigin="anonymous">
<link rel="stylesheet" href="https://taisho.design/core/{{version}}/taisho.full.css" integrity="{{integrity:taisho.full.css}}" crossorigin="anonymous">
<script type="module" src="https://taisho.design/core/{{version}}/taisho.core.js" integrity="{{integrity:taisho.core.js}}" crossorigin="anonymous"></script>
```

Order matters. The theme goes first, because it defines the variables; then the system CSS, which reads them; and
the JS last, which initializes itself. Classes go on the same element as the `ts` scope class:
`class="ts button size-md variant-primary"`.

## 2. With the package and CLI: your brand in the CSS

To get your colors and fonts into the CSS, and only the classes you use, install the package and run the `taisho`
command from your project root (Node 22.18 or later):

```bash
npm i -D @taishods/core
npx taisho init       # asks for the language, brand, theme name, fonts, and your own icons, and writes taisho.config.ts
npx taisho generate   # compiles your CSS to ./taisho/
```

When it's done, `generate` prints the exact `<link>` tags to paste into your HTML. The behavior JS lives in
`node_modules/@taishods/core/core.js` and loads with `<script type="module">`.

If you'd rather not generate anything, you can also link the system theme and the full CSS straight from
`node_modules`, in this order:

```html
<link rel="stylesheet" href="node_modules/@taishods/core/css/tokens/taisho.css">
<link rel="stylesheet" href="node_modules/@taishods/core/css/taisho.full.css">
<script type="module" src="node_modules/@taishods/core/core.js"></script>
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
