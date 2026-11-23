// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minifyCss } from './minify-css';
import { cssDelCoreSolo } from './css-core-solo';
import { BANNER_CORE_JS, BANNER_CORE_CSS } from './banner';
import { SUBPATHS_CORE, SUBPATHS_COMPARTIDOS, SUBPATHS_SOLO_NODE } from '../src/core-subpaths';
import { MODULOS, archivoDe, type NombreModulo } from '../src/lib/core/modulos';
import { construirCoreDirecto } from './build-core-directo';
import { tiposConExtension } from './tipos-esm';
import { PISO_JS } from '../src/generate-cli/piso';
import { rellenarReadme } from './cdn-integridad';

const RAIZ = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SALIDA = path.join(RAIZ, 'dist-core');
const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));

const AÑO = new Date().getFullYear();

const LICENCIA = `MIT License

Copyright (c) ${AÑO} Pablo Di Filippo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

const NOTICE = `TaishoDS Core
Copyright (c) ${AÑO} Pablo Di Filippo

Este producto se distribuye bajo la licencia MIT (ver LICENSE).

El nombre "Taisho", el logo y la identidad visual NO están cubiertos por esa
licencia. El código se puede usar, modificar y redistribuir; no se puede presentar una
versión propia como si fuera Taisho ni usar el nombre para identificarla.

--------------------------------------------------------------------------------

Íconos de terceros

core.js y los ejemplos de mcp/ incluyen trazos de íconos de Lucide
(https://lucide.dev). Se distribuyen bajo la licencia de ese proyecto, que sigue:

${fs.readFileSync(path.join(RAIZ, 'node_modules/lucide-static/LICENSE'), 'utf8').trim()}
`;

const leerReadme = (idioma: 'es' | 'en') =>
	rellenarReadme(fs.readFileSync(path.join(RAIZ, `scripts/core-readme/README.${idioma}.md`), 'utf8'), pkg.version);

function copiar(desde: string, hasta: string): void {
	fs.mkdirSync(path.dirname(hasta), { recursive: true });
	fs.copyFileSync(desde, hasta);
}

async function main(): Promise<void> {
	fs.rmSync(SALIDA, { recursive: true, force: true });
	fs.mkdirSync(SALIDA, { recursive: true });

	const cssDelCore = cssDelCoreSolo();
	const escribirCss = async (css: string, hasta: string): Promise<void> => {
		fs.mkdirSync(path.dirname(hasta), { recursive: true });
		fs.writeFileSync(hasta, await minifyCss(css, BANNER_CORE_CSS));
	};
	await escribirCss(cssDelCore.full, path.join(SALIDA, 'css/taisho.full.css'));
	const temas: string[] = [];
	for (const [rel, css] of Object.entries(cssDelCore.temas)) {
		await escribirCss(css, path.join(SALIDA, 'css/tokens', rel));
		temas.push(rel.replace(/\.css$/, ''));
	}

	const { build } = await import('esbuild');
	const comun = {
		bundle: true,
		format: 'esm' as const,
		minify: true,
		target: PISO_JS,
		logLevel: 'warning' as const,
		banner: { js: BANNER_CORE_JS.trimEnd() },
	};
	for (const { ruta, texto } of await construirCoreDirecto({ prefijo: 'core', minify: true, banner: BANNER_CORE_JS.trimEnd() })) {
		fs.writeFileSync(path.join(SALIDA, ruta), texto);
	}
	await build({
		...comun,
		entryPoints: [path.join(RAIZ, 'src/lib/theme/createTheme.ts')],
		outfile: path.join(SALIDA, 'theme.js'),
	});

	await build({
		...comun,
		minify: false,
		platform: 'node',
		target: 'es2022',
		entryPoints: [path.join(RAIZ, 'src/generate/index.ts')],
		outfile: path.join(SALIDA, 'generate.js'),
	});
	await build({
		...comun,
		minify: false,
		platform: 'node',
		target: 'es2022',
		entryPoints: [path.join(RAIZ, 'src/generate-cli/cli.ts')],
		outfile: path.join(SALIDA, 'cli.js'),
		external: ['jiti', 'esbuild'],
	});
	await build({
		...comun,
		minify: false,
		platform: 'node',
		target: 'es2022',
		entryPoints: [path.join(RAIZ, 'src/generate-cli/vite.ts')],
		outfile: path.join(SALIDA, 'vite.js'),
		external: ['jiti', 'esbuild'],
	});
	const entradas = (subpaths: string[]) =>
		Object.fromEntries(subpaths.map((s) => [s.slice(2), path.join(RAIZ, SUBPATHS_CORE[s])]));
	await build({
		...comun,
		splitting: true,
		entryPoints: entradas(SUBPATHS_COMPARTIDOS.filter((s) => !SUBPATHS_SOLO_NODE.includes(s))),
		outdir: path.join(SALIDA, 'shared'),
	});
	await build({
		...comun,
		platform: 'node',
		target: 'es2022',
		entryPoints: entradas(SUBPATHS_SOLO_NODE),
		outdir: path.join(SALIDA, 'shared'),
	});
	await build({
		...comun,
		minify: false,
		splitting: true,
		entryPoints: Object.fromEntries(
			[...(Object.keys(MODULOS) as NombreModulo[]).map(archivoDe), 'nucleo', 'registro', 'roving', 'textos', 'aviso-llave', 'desarrollo-local'].map((n) => [n, path.join(RAIZ, `src/lib/core/${n}.ts`)]),
		),
		outdir: path.join(SALIDA, 'core-modules'),
		// El núcleo pide el aviso de los diálogos sin nombre con `import()`: apunta al módulo hermano, no lo mete adentro.
		plugins: [{ name: 'aviso-hermano', setup: (b) => b.onResolve({ filter: /^\.\/pesados\/key-warning$/ }, () => ({ path: './aviso-llave.js', external: true })) }],
	});
	// Los datos que lee `taisho mcp`: los ejemplos HTML y la prosa de cada componente del Core (sin variantes), por idioma.
	for (const [origen, destino] of [['src/core-datos/ejemplos', 'mcp/ejemplos'], ['src/core-datos/prosa', 'mcp/prosa']]) {
		for (const idioma of ['es', 'en']) {
			const dir = path.join(SALIDA, destino, idioma);
			fs.mkdirSync(dir, { recursive: true });
			for (const archivo of fs.readdirSync(path.join(RAIZ, 'src/core-datos/prosa', idioma))) {
				fs.writeFileSync(path.join(dir, archivo), JSON.stringify(JSON.parse(fs.readFileSync(path.join(RAIZ, origen, idioma, archivo), 'utf8'))));
			}
		}
	}
	fs.mkdirSync(path.join(SALIDA, 'bin'), { recursive: true });
	// El bin lleva la guardia de versión de Node adentro y carga `cli.js` recién después (import dinámico): en un Node viejo el
	// `cli.js` no llega a evaluarse, y el usuario ve el mensaje en vez de un error crudo.
	await build({
		bundle: true,
		format: 'esm',
		platform: 'node',
		target: 'es2022',
		logLevel: 'warning',
		entryPoints: [path.join(RAIZ, 'src/bin/taisho.ts')],
		outfile: path.join(SALIDA, 'bin/taisho'),
		plugins: [{ name: 'cli-hermano', setup: (b) => b.onResolve({ filter: /generate-cli\/cli\.js$/ }, () => ({ path: '../cli.js', external: true })) }],
	});
	fs.chmodSync(path.join(SALIDA, 'bin/taisho'), 0o755);

	const { ejecutar } = await import('./ejecutar');
	ejecutar('npx', ['tsc', '-p', 'tsconfig.core.json'], { cwd: RAIZ, stdio: 'inherit' });
	ejecutar('npx', ['tsc', '-p', 'tsconfig.cli.json'], { cwd: RAIZ, stdio: 'inherit' });
	// `classes.d.ts` lo emite `generate` con el encabezado del repo («Todos los derechos reservados»): en el Core va el de MIT.
	const clasesDts = fs.readFileSync(path.join(RAIZ, 'src/lib/types/classes.d.ts'), 'utf8');
	fs.mkdirSync(path.join(SALIDA, 'types'), { recursive: true });
	fs.writeFileSync(
		path.join(SALIDA, 'types/classes.d.ts'),
		clasesDts.replace(/^\/\/ TaishoDS — Copyright[^\n]*\n/, `// TaishoDS — Copyright (c) ${AÑO} Pablo Di Filippo. Licencia MIT (ver LICENSE).\n`),
	);
	tiposConExtension(path.join(SALIDA, 'types'));

	fs.writeFileSync(
		path.join(SALIDA, 'package.json'),
		JSON.stringify(
			{
				name: '@taishods/core',
				version: pkg.version,
				description:
					'Consistency that scales. A framework-free design system: CSS, tokens, and behavior JavaScript.',
				license: 'MIT',
				author: 'Pablo Di Filippo',
				repository: { type: 'git', url: 'git+https://github.com/taishoDS/core.git' },
				homepage: 'https://taisho.design',
				bugs: { url: 'https://github.com/taishoDS/core/issues' },
				keywords: ['design-system', 'css', 'html', 'ui', 'accessibility', 'oklch'],
				type: 'module',
				engines: pkg.engines,
				// El Core se publica en npm público; `access: public` es obligatorio para un paquete con scope.
				publishConfig: { registry: 'https://registry.npmjs.org/', access: 'public' },
				sideEffects: ['**/*.css', './core.js'],
				bin: { taisho: './bin/taisho' },
				exports: {
					'.': { types: './types/lib/theme/createTheme.d.ts', default: './theme.js' },
					'./core': { types: './types/lib/core/auto.d.ts', default: './core.js' },
					'./generate': { types: './types/generate/index.d.ts', default: './generate.js' },
					'./vite': { types: './types/generate-cli/vite.d.ts', default: './vite.js' },
					'./classes': { types: './types/classes.d.ts' },
					...Object.fromEntries(
						SUBPATHS_COMPARTIDOS.map((s) => [
							s,
							{
								types: `./types/${SUBPATHS_CORE[s].replace(/^src\//, '').replace(/\.ts$/, '.d.ts')}`,
								default: `./shared/${s.slice(2)}.js`,
							},
						]),
					),
					'./css/*': './css/*',
					'./package.json': './package.json',
				},
				peerDependencies: { vite: '>=6' },
				peerDependenciesMeta: { vite: { optional: true } },
				dependencies: { jiti: pkg.dependencies.jiti, esbuild: pkg.devDependencies.esbuild },
				files: ['css', 'core.js', 'core.*.js', 'core-modules', 'theme.js', 'generate.js', 'cli.js', 'vite.js', 'mcp', 'shared', 'bin', 'types', 'NOTICE', 'TRADEMARK.md', 'README.en.md'],
			},
			null,
			2,
		) + '\n',
	);
	fs.writeFileSync(path.join(SALIDA, 'LICENSE'), LICENCIA);
	fs.writeFileSync(path.join(SALIDA, 'NOTICE'), NOTICE);
	copiar(path.join(RAIZ, 'TRADEMARK.md'), path.join(SALIDA, 'TRADEMARK.md'));
	fs.writeFileSync(path.join(SALIDA, 'README.md'), leerReadme('es'));
	fs.writeFileSync(path.join(SALIDA, 'README.en.md'), leerReadme('en'));

	const kb = (f: string) => (fs.statSync(path.join(SALIDA, f)).size / 1024).toFixed(1);
	console.log(`✅ @taishods/core v${pkg.version} armado en dist-core/`);
	console.log(`   core.js            ${kb('core.js')} KB`);
	console.log(`   theme.js           ${kb('theme.js')} KB`);
	console.log(`   css/taisho.full.css ${kb('css/taisho.full.css')} KB`);
	console.log(`   temas: ${temas.join(', ')}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
