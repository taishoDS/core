// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { pruneTheme, varsReferenciadas, CORE_JS_THEME_VARS } from './podar-tema';
import { buildRepoConfig } from '../config/pipeline';
import { deriveThemeVocabulary, resolveThemeTokens, buildTokensCSS } from '.';

const TEMA = `/* c */

:root {
  --a: 1px;
  --b: var(--a);
  --c: 2px;
  --d: var(--e);
  --e: red;
}

.dark {
  --c: 3px;
}

.compact {
  --a: 9px;
  --f: 4px;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --c: 1ms;
  }
}
`;

describe('pruneTheme', () => {
	it('conserva lo referenciado, con cierre transitivo, y la declaración en cada contexto', () => {
		const css = pruneTheme(TEMA, '.x { margin: var(--b); }');
		expect(css).toContain('--b: var(--a);');
		expect(css).toContain('--a: 1px;');
		expect(css).toContain('--a: 9px;');
		expect(css).not.toMatch(/--[cdef]:/);
	});

	it('quita los bloques que se vacían y deja el comentario', () => {
		const css = pruneTheme(TEMA, '.x { margin: var(--b); }');
		expect(css).toContain('/* c */');
		expect(css).not.toContain('.dark');
		expect(css).not.toContain('@media');
	});

	it('una variable viva conserva .dark y @media', () => {
		const css = pruneTheme(TEMA, '.x { margin: var(--c); }');
		expect(css).toContain('.dark {\n  --c: 3px;');
		expect(css).toContain('@media (prefers-reduced-motion: reduce) {\n  :root {\n    --c: 1ms;');
	});

	it('extras cuentan como usadas; lo que no es del tema se ignora', () => {
		const css = pruneTheme(TEMA, '', ['--d', '--no-existe']);
		expect(css).toContain('--d: var(--e);');
		expect(css).toContain('--e: red;');
	});

	it('varsReferenciadas lee var() con fallback anidado', () => {
		expect([...varsReferenciadas('a{b:var(--x, var(--y))}')].sort()).toEqual(['--x', '--y']);
	});
});

describe('CORE_JS_THEME_VARS: las custom properties del tema que lee el JS del Core', () => {
	const ROOT = path.resolve(__dirname, '..');
	const archivos = (dir: string): string[] =>
		fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? archivos(path.join(dir, e.name)) : e.name.endsWith('.ts') && !/\.test\.ts$/.test(e.name) ? [path.join(dir, e.name)] : []));

	const v = deriveThemeVocabulary(buildRepoConfig());
	const tema = buildTokensCSS(resolveThemeTokens(v.themeEntries[0], v.userFonts, v.defaultStates, v.userScales));
	const declaradas = new Set([...tema.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]));

	it('toda --ts-* del tema que el código del Core lee por CSSOM está en la lista, y viceversa', () => {
		const fuentes = archivos(path.join(ROOT, 'lib/core'));
		const leidas = new Set<string>();
		for (const f of fuentes) {
			for (const m of fs.readFileSync(f, 'utf8').matchAll(/getPropertyValue\(\s*['"`](--[\w-]+)['"`]\s*\)/g)) leidas.add(m[1]);
		}
		expect([...leidas].filter((n) => declaradas.has(n)).sort()).toEqual([...CORE_JS_THEME_VARS].sort());
	});

	it('la lista existe en el tema (no quedó una variable renombrada)', () => {
		for (const n of CORE_JS_THEME_VARS) expect(declaradas.has(n)).toBe(true);
	});

	it('el tema podado sobre el CSS vacío igual conserva las del JS y su valor', () => {
		const css = pruneTheme(tema, '', CORE_JS_THEME_VARS);
		expect(css).toContain('--ts-space-quarter:');
		expect(css).toContain('--ts-sizing-4:');
	});
});
