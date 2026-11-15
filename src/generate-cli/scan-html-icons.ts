// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import path from 'node:path';
import { lucideToEntry, parseSvgIcon, suggestClosest, type IconEntry } from '../generate/icon-utils';
import { loadLucideAliases } from '../generate/lucide-aliases';
import { buildIconSprite } from '../generate/emit-icon-sprite';
import { m } from './idioma';

const USE_HREF = /(?:xlink:href|href)=["'][^"']*#ts-([a-z0-9]+(?:-[a-z0-9]+)*)["']/g;
const ICON_ATTR = /data-ts-icon=["']([^"']+)["']/g;
const MARKUP = /\.(html|svelte|vue|astro|jsx|tsx)$/;

function findHtmlFiles(roots: string[], skip: string): string[] {
	const found: string[] = [];
	const walk = (dir: string) => {
		if (!fs.existsSync(dir)) return;
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (path.resolve(full) === path.resolve(skip)) continue;
			if (entry.isDirectory()) {
				if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
				walk(full);
			} else if (entry.isFile() && entry.name.endsWith('.html')) {
				found.push(full);
			}
		}
	};
	for (const root of roots) walk(root);
	return found;
}

export function scanIconNames(html: string): Set<string> {
	const sinComentarios = html.replace(/<!--[\s\S]*?-->/g, '');
	const names = new Set<string>();
	let m: RegExpExecArray | null;
	USE_HREF.lastIndex = 0;
	while ((m = USE_HREF.exec(sinComentarios)) !== null) names.add(m[1]);
	ICON_ATTR.lastIndex = 0;
	while ((m = ICON_ATTR.exec(sinComentarios)) !== null) names.add(m[1]);
	return names;
}

export interface ScanHtmlIconsOptions {
	roots?: string[];
	files?: Array<{ file: string; content: string }>;
	skip: string;
	customIconsDir: string;
	cwd: string;
	nodeModulesBase?: string;
	safelist?: string[];
}

export function usoDeIconos(file: string, content: string): UsoDeIconos {
	return { origen: file, nombres: [...scanIconNames(content)], soloAviso: !MARKUP.test(file) };
}

export interface RecursosIconos {
	lucideNodes: Record<string, Array<[string, Record<string, string | number>]>>;
	lucideAliases: Record<string, string>;
	customIcons: Record<string, IconEntry>;
}

export function cargarLucide(nodeModulesBase: string): Pick<RecursosIconos, 'lucideNodes' | 'lucideAliases'> {
	const nodesPath = path.resolve(nodeModulesBase, 'node_modules/lucide-static/icon-nodes.json');
	if (!fs.existsSync(nodesPath)) {
		console.warn(m().generate.lucideFalta);
		return { lucideNodes: {}, lucideAliases: {} };
	}
	const lucideNodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));
	return { lucideNodes, lucideAliases: loadLucideAliases(path.dirname(nodesPath), lucideNodes) };
}

export function cargarIconosPropios(cwd: string, customIconsDir: string): Record<string, IconEntry> {
	const customIcons: Record<string, IconEntry> = {};
	const customDir = path.resolve(cwd, customIconsDir);
	if (fs.existsSync(customDir)) {
		for (const f of fs.readdirSync(customDir)) {
			if (!f.endsWith('.svg')) continue;
			const name = f.slice(0, -4);
			customIcons[name] = parseSvgIcon(fs.readFileSync(path.join(customDir, f), 'utf8'));
		}
	}
	return customIcons;
}

export interface UsoDeIconos {
	origen: string;
	nombres: Iterable<string>;
	soloAviso?: boolean;
}

export function spriteDeUsos(recursos: RecursosIconos, usos: Iterable<UsoDeIconos>, safelist: string[], customIconsDir: string): string {
	const { lucideNodes, lucideAliases, customIcons } = recursos;
	const isKnown = (name: string) => !!lucideNodes[name] || !!lucideAliases[name] || !!customIcons[name];

	const used = new Set<string>();
	const unknown: Array<{ name: string; origen: string }> = [];
	for (const name of safelist) {
		if (isKnown(name)) used.add(name);
		else unknown.push({ name, origen: 'taisho.config.ts (icons)' });
	}
	for (const { origen, nombres, soloAviso } of usos) {
		for (const name of nombres) {
			if (isKnown(name)) used.add(name);
			else if (!soloAviso) unknown.push({ name, origen });
			else console.warn(m().generate.iconoIgnorado(name, origen));
		}
	}

	if (unknown.length > 0) {
		const candidates = [...Object.keys(lucideNodes), ...Object.keys(lucideAliases), ...Object.keys(customIcons)];
		const lines = unknown.map(({ name, origen }) => {
			const sug = suggestClosest(name, candidates);
			return `  • "${name}"${sug ? m().generate.quisisteDecir(sug) : ''}  (${origen})`;
		});
		throw new Error(m().generate.iconosInexistentes(lines, customIconsDir));
	}

	const resueltos: Record<string, IconEntry> = {};
	for (const name of used) {
		const nodes = lucideNodes[lucideAliases[name] ?? name];
		resueltos[name] = nodes ? lucideToEntry(nodes) : customIcons[name];
	}
	return buildIconSprite(resueltos);
}

export function scanHtmlIcons(options: ScanHtmlIconsOptions): string {
	const { files = [], roots = files.length ? [] : ['.'], skip, customIconsDir, cwd, nodeModulesBase = cwd, safelist = [] } = options;

	const recursos: RecursosIconos = { ...cargarLucide(nodeModulesBase), customIcons: cargarIconosPropios(cwd, customIconsDir) };

	const usos: UsoDeIconos[] = [];
	for (const file of findHtmlFiles(roots.map((r) => path.resolve(cwd, r)), skip)) {
		usos.push({ origen: path.relative(cwd, file), nombres: scanIconNames(fs.readFileSync(file, 'utf8')) });
	}
	for (const { file, content } of files) usos.push(usoDeIconos(file, content));

	return spriteDeUsos(recursos, usos, safelist, customIconsDir);
}
