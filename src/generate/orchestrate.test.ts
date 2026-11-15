// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { orchestrate, type TaishoConfig } from './index';
import { createPaletteFromHex } from '../lib/theme/palette';
import { marcaAjenaConfig, MARCA_AJENA_BRAND_HEX } from '../../tests/fixture-marca-ajena/taisho.config.fixture';
import { acme, configMinima } from './extension-acme.fixture';
import { userFonts, userFontFaces, userGridMins, defaultStates, themeList } from '../config/taisho.user';

const tmpDirs: string[] = [];

function makeOutDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    tmpDirs.push(dir);
    return dir;
}

afterEach(() => {
    while (tmpDirs.length) {
        const dir = tmpDirs.pop()!;
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

describe('orchestrate — Entrega B: compila una marca ajena', () => {
    it('no tira error con una TaishoConfig de un consumidor externo', () => {
        const outDir = makeOutDir('taisho-marca-ajena-');
        expect(() => {
            orchestrate(marcaAjenaConfig, { outDir, nodeModulesBase: process.cwd() });
        }).not.toThrow();
    });

    it('el CSS de tokens emitido refleja la semilla de marca del consumidor, no la nuestra', () => {
        const outDir = makeOutDir('taisho-marca-ajena-');
        orchestrate(marcaAjenaConfig, { outDir, nodeModulesBase: process.cwd() });

        const tokensCSS = fs.readFileSync(
            path.join(outDir, 'src/lib/css/tokens/principal.css'),
            'utf8',
        );

        const paletaEsperada = createPaletteFromHex(MARCA_AJENA_BRAND_HEX, false);
        expect(tokensCSS).toContain(paletaEsperada['500']);

        const paletaBackend = createPaletteFromHex('#3b82f6', false);
        expect(tokensCSS).not.toContain(paletaBackend['500']);
    });

    it('la salida de la marca ajena difiere de la salida de nuestra propia config', () => {
        const outAjena = makeOutDir('taisho-ajena-');
        const outNuestra = makeOutDir('taisho-nuestra-');

        orchestrate(marcaAjenaConfig, { outDir: outAjena, nodeModulesBase: process.cwd() });

        const themes: TaishoConfig['themes'] = {};
        for (const entry of themeList) {
            const key = entry.group === 'root' ? entry.name : `${entry.group}/${entry.name}`;
            themes[key] = entry.def;
        }
        const nuestraConfig: TaishoConfig = {
            themes,
            fontFaces: userFontFaces,
            gridMins: userGridMins,
            fonts: userFonts,
            defaultStates,
        };
        orchestrate(nuestraConfig, { outDir: outNuestra, nodeModulesBase: process.cwd() });

        const tokensAjena = fs.readFileSync(path.join(outAjena, 'src/lib/css/tokens/principal.css'), 'utf8');
        const tokensBackend = fs.readFileSync(path.join(outNuestra, 'src/lib/css/tokens/taisho.css'), 'utf8');

        expect(tokensAjena).not.toEqual(tokensBackend);
    });
});

describe('orchestrate — header de copyright', () => {
    const primerCss = (outDir: string): string => {
        const dir = path.join(outDir, 'src/lib/css');
        const f = fs.readdirSync(dir).find((n) => n.endsWith('.css'))!;
        return fs.readFileSync(path.join(dir, f), 'utf8');
    };

    it('por defecto estampa el header MIT del Core', () => {
        const outDir = makeOutDir('taisho-copy-default-');
        orchestrate(marcaAjenaConfig, { outDir, nodeModulesBase: process.cwd() });
        const css = primerCss(outDir);
        expect(css.startsWith('/* TaishoDS — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE). */\n')).toBe(true);
        expect(css).not.toContain('Todos los derechos reservados');
    });

    it('`copyright` reemplaza el texto del header', () => {
        const outDir = makeOutDir('taisho-copy-override-');
        orchestrate(marcaAjenaConfig, { outDir, nodeModulesBase: process.cwd(), copyright: 'Acme' });
        expect(primerCss(outDir).startsWith('/* TaishoDS — Acme */\n')).toBe(true);
    });
});

describe('orchestrate — extensiones', () => {
    it('escribe los bloques, los tokens y el grupo DTCG de la extensión; sin ella, nada', () => {
        const con = makeOutDir('taisho-ext-con-');
        const sin = makeOutDir('taisho-ext-sin-');
        orchestrate(configMinima(), { outDir: con, nodeModulesBase: process.cwd(), extensions: { '@acme/ui': acme } });
        orchestrate(configMinima(), { outDir: sin, nodeModulesBase: process.cwd() });
        const leer = (dir: string, rel: string) => fs.readFileSync(path.join(dir, rel), 'utf8');
        expect(leer(con, 'src/lib/css/components.css')).toContain('@utility ts-acme-card {');
        expect(leer(con, 'src/lib/css/utilities.css')).toContain('@utility ts-acme-glow {');
        expect(leer(con, 'src/lib/css/taisho.full.css')).toContain(':where(.ts).acme-card {');
        expect(leer(con, 'src/lib/css/tokens/taisho.css')).toContain('--ts-acme-card-pad: 12px;');
        expect(JSON.parse(leer(con, 'src/lib/tokens/taisho.tokens.json')).components['acme-card'].pad.$type).toBe('dimension');
        for (const rel of ['src/lib/css/components.css', 'src/lib/css/utilities.css', 'src/lib/css/taisho.full.css', 'src/lib/css/tokens/taisho.css', 'src/lib/tokens/taisho.tokens.json']) {
            expect(leer(sin, rel)).not.toContain('acme');
        }
    });
});
