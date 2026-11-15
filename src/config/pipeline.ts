// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { parseHex, rgbToOklch, oklchToRgb, getLuminance, getContrastColor } from '../lib/theme/palette';
import type { ColorPalette } from '../lib/theme/palette';
import fs from 'fs';
import path from 'path';
import { orchestrate, type TaishoConfig, type TaishoExtensions } from '../generate';
import { buildComponentManifest, buildManifestJSON } from '../generate/emit-manifest';
import { leerFuentesManifiesto } from '../generate/manifest-fuentes';
import { derivarVocabulario } from '../generate/compile';
import { userFonts, userFontFaces, userGridMins, defaultStates, themeList } from './taisho.user';

export { parseHex, rgbToOklch, oklchToRgb, getLuminance, getContrastColor };
export type { ColorPalette };

export const REPO_COPYRIGHT = 'Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).';

export function buildRepoConfig(): TaishoConfig {
    const themes: TaishoConfig['themes'] = {};
    for (const entry of themeList) {
        const key = entry.group === 'root' ? entry.name : `${entry.group}/${entry.name}`;
        themes[key] = entry.def;
    }

    return {
        themes,
        fontFaces: userFontFaces,
        gridMins: userGridMins,
        fonts: userFonts,
        defaultStates,
    };
}

export function generateCSS(extensions?: TaishoExtensions, internalIconDirs?: string[], copyright: string = REPO_COPYRIGHT) {
    const config = buildRepoConfig();

    orchestrate(config, {
        extensions,
        internalIconDirs,
        outDir: process.env.TAISHO_OUT_DIR,
        nodeModulesBase: process.env.TAISHO_NODE_MODULES,
        copyright,
    });

    const cssDir = path.resolve(process.env.TAISHO_OUT_DIR || process.cwd(), 'src/lib/css');
    const css = derivarVocabulario(config).components;
    const manifiesto = buildComponentManifest({ css, ...leerFuentesManifiesto(process.cwd()) });
    fs.writeFileSync(path.join(cssDir, 'manifiesto-componentes.json'), buildManifestJSON(manifiesto));
}
