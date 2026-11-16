// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { scanHtmlIcons } from './scan-html-icons';

process.env.LC_ALL = 'es_AR.UTF-8';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-icons-scan-'));
	tmpDirs.push(dir);
	return dir;
}

afterEach(() => {
	while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

describe('scanHtmlIcons — sprite standalone para HTML plano', () => {
	it('un alias viejo de lucide (trash-2) sigue funcionando y se emite con el SVG del canónico', () => {
		const cwd = makeTmpDir();
		fs.writeFileSync(path.join(cwd, 'index.html'), `<svg><use href="taisho/taisho.icons.svg#ts-trash-2"></use></svg>`);

		const sprite = scanHtmlIcons({
			roots: ['.'],
			skip: path.join(cwd, 'taisho'),
			customIconsDir: 'src/icons',
			cwd,
			nodeModulesBase: process.cwd(),
		});

		expect(sprite).toContain('id="ts-trash-2"');
		expect(sprite).not.toContain('id="ts-trash"');
	});

	it('un nombre inexistente sigue fallando, alias o no', () => {
		const cwd = makeTmpDir();
		fs.writeFileSync(path.join(cwd, 'index.html'), `<svg><use href="taisho/taisho.icons.svg#ts-trash-9"></use></svg>`);

		expect(() =>
			scanHtmlIcons({
				roots: ['.'],
				skip: path.join(cwd, 'taisho'),
				customIconsDir: 'src/icons',
				cwd,
				nodeModulesBase: process.cwd(),
			}),
		).toThrow(/trash-9/);
	});

	it('detecta desde <use href="…#ts-nombre">, la forma que de verdad renderiza — fuente única', () => {
		const cwd = makeTmpDir();
		fs.writeFileSync(
			path.join(cwd, 'index.html'),
			`<svg><use href="taisho/taisho.icons.svg#ts-sun"></use></svg>\n` +
				`<svg><use href="taisho/taisho.icons.svg#ts-search"></use></svg>`,
		);

		const sprite = scanHtmlIcons({
			roots: ['.'],
			skip: path.join(cwd, 'taisho'),
			customIconsDir: 'src/icons',
			cwd,
			nodeModulesBase: process.cwd(),
		});

		expect(sprite).toContain('id="ts-sun"');
		expect(sprite).toContain('id="ts-search"');
		expect(sprite).not.toContain('id="ts-moon"');
	});

	it('también detecta xlink:href (SVG viejo)', () => {
		const cwd = makeTmpDir();
		fs.writeFileSync(
			path.join(cwd, 'index.html'),
			`<svg><use xlink:href="taisho/taisho.icons.svg#ts-star"></use></svg>`,
		);

		const sprite = scanHtmlIcons({
			roots: ['.'],
			skip: path.join(cwd, 'taisho'),
			customIconsDir: 'src/icons',
			cwd,
			nodeModulesBase: process.cwd(),
		});

		expect(sprite).toContain('id="ts-star"');
	});

	it('arma el sprite solo con los data-ts-icon del HTML, ignora lo que no se usa', () => {
		const cwd = makeTmpDir();
		fs.writeFileSync(
			path.join(cwd, 'index.html'),
			`<svg data-ts-icon="sun"></svg><svg data-ts-icon="moon"></svg>`,
		);

		const sprite = scanHtmlIcons({
			roots: ['.'],
			skip: path.join(cwd, 'taisho'),
			customIconsDir: 'src/icons',
			cwd,
			nodeModulesBase: process.cwd(),
		});

		expect(sprite).toContain('id="ts-sun"');
		expect(sprite).toContain('id="ts-moon"');
		expect(sprite).not.toContain('id="ts-house"');
	});

	it('salta la carpeta `skip` (la salida de taisho generate)', () => {
		const cwd = makeTmpDir();
		fs.writeFileSync(path.join(cwd, 'index.html'), `<svg data-ts-icon="sun"></svg>`);
		fs.mkdirSync(path.join(cwd, 'taisho'));
		fs.writeFileSync(path.join(cwd, 'taisho', 'stale.html'), `<svg data-ts-icon="moon"></svg>`);

		const sprite = scanHtmlIcons({
			roots: ['.'],
			skip: path.join(cwd, 'taisho'),
			customIconsDir: 'src/icons',
			cwd,
			nodeModulesBase: process.cwd(),
		});

		expect(sprite).toContain('id="ts-sun"');
		expect(sprite).not.toContain('id="ts-moon"');
	});

	it('respeta la escotilla `safelist` para íconos dinámicos', () => {
		const cwd = makeTmpDir();
		fs.writeFileSync(path.join(cwd, 'index.html'), `<p>sin íconos literales</p>`);

		const sprite = scanHtmlIcons({
			roots: ['.'],
			skip: path.join(cwd, 'taisho'),
			customIconsDir: 'src/icons',
			cwd,
			nodeModulesBase: process.cwd(),
			safelist: ['star'],
		});

		expect(sprite).toContain('id="ts-star"');
	});

	it('tira un error claro con sugerencia si el nombre no existe', () => {
		const cwd = makeTmpDir();
		fs.writeFileSync(path.join(cwd, 'index.html'), `<svg data-ts-icon="sunn"></svg>`);

		expect(() =>
			scanHtmlIcons({
				roots: ['.'],
				skip: path.join(cwd, 'taisho'),
				customIconsDir: 'src/icons',
				cwd,
				nodeModulesBase: process.cwd(),
			}),
		).toThrow(/sunn.*se quiso decir "sun"/s);
	});

	it('con content: un ícono inexistente en .md o .ts avisa y sigue; en markup corta', () => {
		const cwd = makeTmpDir();
		const base = { skip: path.join(cwd, 'taisho'), customIconsDir: 'src/icons', cwd, nodeModulesBase: process.cwd() };
		const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const sprite = scanHtmlIcons({
			...base,
			files: [
				{ file: 'README.md', content: 'Se escribe `<use href="#ts-nombre">`.' },
				{ file: 'src/ejemplo.ts', content: `const x = '<svg data-ts-icon="nombre"></svg>';` },
				{ file: 'index.html', content: '<svg><use href="#ts-sun"></use></svg>' },
			],
		});
		expect(sprite).toContain('id="ts-sun"');
		expect(aviso).toHaveBeenCalledWith(expect.stringContaining('"nombre" no existe; se ignora (README.md'));
		aviso.mockRestore();

		for (const file of ['App.svelte', 'Card.tsx', 'index.html']) {
			expect(() => scanHtmlIcons({ ...base, files: [{ file, content: '<svg data-ts-icon="sunn"></svg>' }] })).toThrow(/sunn/);
		}
	});
});

describe('aviso de lucide-static ausente', () => {
	const sinLucide = (cwd: string, html: string) => {
		fs.writeFileSync(path.join(cwd, 'index.html'), html);
		return () =>
			scanHtmlIcons({ roots: ['.'], skip: path.join(cwd, 'taisho'), customIconsDir: 'src/icons', cwd, nodeModulesBase: cwd });
	};

	it('sin íconos usados no avisa nada', () => {
		const cwd = makeTmpDir();
		const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
		sinLucide(cwd, '<p>sin íconos</p>')();
		expect(aviso).not.toHaveBeenCalled();
		aviso.mockRestore();
	});

	it('con íconos que no se resuelven avisa la consecuencia, una sola vez', () => {
		const cwd = makeTmpDir();
		const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(sinLucide(cwd, '<svg><use href="#ts-sun"></use></svg><svg><use href="#ts-moon"></use></svg>')).toThrow(/sun/);
		expect(aviso).toHaveBeenCalledTimes(1);
		expect(aviso).toHaveBeenCalledWith(expect.stringContaining('2 íconos no se resuelven: falta lucide-static. Se instala con npm i -D lucide-static'));
		aviso.mockRestore();
	});
});
