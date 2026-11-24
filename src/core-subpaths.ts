// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export const SUBPATHS_CORE: Record<string, string> = {
	'.': 'src/lib/theme/createTheme.ts',
	'./vite': 'src/generate-cli/vite.ts',
	'./mcp': 'src/generate-cli/mcp/servidor.ts',
	'./color': 'src/generate/color.ts',
	'./classes': 'src/lib/types/classes.d.ts',
	'./generate': 'src/generate/index.ts',
	'./density': 'src/lib/theme/density.ts',
	'./motion-scale': 'src/lib/theme/motion-scale.ts',
	'./icon-utils': 'src/generate/icon-utils.ts',
	'./lucide-aliases': 'src/generate/lucide-aliases.ts',
};

export const SUBPATHS_SOLO_NODE = ['./icon-utils', './lucide-aliases'];

export const SUBPATHS_COMPARTIDOS = ['./density', './motion-scale', './color', ...SUBPATHS_SOLO_NODE];

export function aliasCore(raiz: string): Record<string, string> {
	const alias: Record<string, string> = {};
	for (const [sub, fuente] of Object.entries(SUBPATHS_CORE)) {
		if (sub !== '.') alias[`@taishods/core/${sub.slice(2)}`] = `${raiz}/${fuente}`;
	}
	alias['@taishods/core'] = `${raiz}/${SUBPATHS_CORE['.']}`;
	return alias;
}
