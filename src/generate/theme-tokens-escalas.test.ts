// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { deriveThemeVocabulary, type TaishoConfig } from './vocabulary';
import { resolveThemeTokens, buildTokensCSS } from './emit-tokens';
import { buildTokensDTCG } from './emit-dtcg';
import { buildThemeCss } from '../lib/theme/createTheme';
import { buildRepoConfig } from '../config/pipeline';
import { ConfigError } from './errores-config';
import type { ThemeDef } from '../config/taisho.types';

const repo = buildRepoConfig();
const MIO: ThemeDef = { colors: { brand: '#3b82f6' } };
const conTema = (def: Partial<ThemeDef>, extra: Partial<TaishoConfig> = {}): TaishoConfig => ({
    ...repo, ...extra, themes: { ...repo.themes, mio: { ...MIO, ...def } },
});
const errores = (config: TaishoConfig) => {
    try { deriveThemeVocabulary(config); } catch (e) { if (e instanceof ConfigError) return e.errors; throw e; }
    return [];
};
const mensaje = (config: TaishoConfig) => {
    try { deriveThemeVocabulary(config); } catch (e) { return (e as Error).message; }
    return '';
};
const entradaDe = (config: TaishoConfig, nombre: string) => {
    const v = deriveThemeVocabulary(config);
    return { v, entry: v.themeEntries.find((e) => e.name === nombre)! };
};
const tokensDe = (config: TaishoConfig, nombre = 'mio') => {
    const { v, entry } = entradaDe(config, nombre);
    return buildTokensCSS(resolveThemeTokens(entry, v.userFonts, v.defaultStates, v.userScales));
};

describe('tramo 2: extend de borderWidths, blurs, opacities, shadows y motion', () => {
    const extend = {
        borderWidths: { '5': '5px' },
        blurs: { xxl: '96px' },
        opacities: { '35': '0.35', '85': 'var(--ts-opacity-80)' },
        shadows: { huge: '0 40px 80px rgba(0,0,0,0.2)' },
        motion: { durations: { slowest: '800ms' }, easings: { snappy: 'cubic-bezier(0.2, 0, 0, 1)' } },
    };
    const config = conTema({}, { extend });
    const css = compile(config, []).css;

    it('genera las clases de cada familia', () => {
        for (const clase of [
            'border-5', 'border-t-5', 'border-b-5', 'border-s-5', 'border-e-5', 'ring-5', 'blur-xxl', 'backdrop-blur-xxl', 'opacity-35', 'opacity-85',
            'shadow-huge', 'surface-huge', 'floating-huge', 'duration-slowest', 'ease-snappy',
        ]) expect(css, clase).toContain(`:where(.ts).${clase} {`);
    });
    it('los tokens salen en todos los temas, también los locked', () => {
        const v = deriveThemeVocabulary(config);
        expect(v.themeEntries.some((e) => e.def.locked)).toBe(true);
        for (const e of v.themeEntries) {
            const t = tokensDe(config, e.name);
            for (const linea of [
                '--ts-border-width-5: 5px;', '--ts-blur-xxl: 96px;', '--ts-opacity-35: 0.35;', '--ts-opacity-85: var(--ts-opacity-80);',
                '--ts-shadow-huge: 0 40px 80px rgba(0,0,0,0.2);', '--ts-duration-slowest: 800ms;', '--ts-ease-snappy: cubic-bezier(0.2, 0, 0, 1);',
            ]) expect(t, linea).toContain(linea);
        }
    });
    it('la duración sumada también baja a 1 ms con reduced-motion', () => {
        const t = tokensDe(config);
        const media = t.slice(t.indexOf('@media (prefers-reduced-motion: reduce)'));
        expect(media).toContain('--ts-duration-slowest: 1ms;');
    });
    it('el DTCG trae los niveles sumados', () => {
        const { v, entry } = entradaDe(config, 'mio');
        const arbol = JSON.parse(buildTokensDTCG(entry, resolveThemeTokens(entry, v.userFonts, v.defaultStates, v.userScales)));
        expect(arbol.borderWidth['5'].$value).toEqual({ value: 5, unit: 'px' });
        expect(arbol.blur.xxl.$value).toEqual({ value: 96, unit: 'px' });
        expect(arbol.opacity['35'].$value).toBe(0.35);
        expect(arbol.shadow.huge.$type).toBe('shadow');
        expect(arbol.duration.slowest.$value).toEqual({ value: 800, unit: 'ms' });
        expect(arbol.easing.snappy.$value).toEqual([0.2, 0, 0, 1]);
    });
    it('las sombras sumadas no llegan a los materiales', () => {
        const material = (c: string) => c.split('\n').filter((l) => l.includes('.material-')).join('\n');
        expect(material(css)).not.toContain('huge');
        expect(material(css)).toBe(material(compile(repo, []).css));
    });
    it('desde el tema se cambia el valor de un nivel sumado', () => {
        const t = tokensDe(conTema({ borderWidths: { '5': '6px' }, opacities: { '35': '0.4' }, motion: { durations: { slowest: '900ms' } } }, { extend }));
        for (const linea of ['--ts-border-width-5: 6px;', '--ts-opacity-35: 0.4;', '--ts-duration-slowest: 900ms;']) expect(t).toContain(linea);
    });
    it('createTheme repite reduced-motion para una duración sumada que el tema cambia', () => {
        const css = buildThemeCss({ ...MIO, motion: { durations: { slowest: '900ms' } } });
        expect(css).toContain('@media (prefers-reduced-motion:reduce){:root{--ts-duration-slowest:1ms;}}');
    });
    it('un tema locked ignora los valores y recibe extend', () => {
        const c: TaishoConfig = { ...repo, extend, themes: { ...repo.themes, taisho: { ...repo.themes.taisho, borderWidths: { '5': '77px' }, opacities: { '35': '0.77' } } } };
        const t = tokensDe(c, 'taisho');
        expect(t).toContain('--ts-border-width-5: 5px;');
        expect(t).toContain('--ts-opacity-35: 0.35;');
    });
    it('sin extend la salida es la de siempre: los niveles sumados no aparecen', () => {
        const base = compile(repo, []).css;
        expect(base).not.toContain('border-5');
        expect(tokensDe(conTema({}))).not.toContain('--ts-border-width-5');
    });
});

describe('tramo 2: validación de extend', () => {
    const ext = (extend: NonNullable<TaishoConfig['extend']>) => conTema({}, { extend });

    it('extend que pisa un nombre del DS es un Error y manda a themes', () => {
        const e = errores(ext({
            borderWidths: { '2': '2px' }, blurs: { sm: '1px' }, opacities: { '30': '0.3' }, shadows: { md: 'none' },
            motion: { durations: { fast: '1ms' }, easings: { out: 'ease' } },
        }));
        expect(e.map((x) => [x.path, x.code])).toEqual([
            ['extend.borderWidths.2', 'scale-exists'], ['extend.blurs.sm', 'scale-exists'], ['extend.opacities.30', 'scale-exists'],
            ['extend.shadows.md', 'scale-exists'], ['extend.motion.durations.fast', 'scale-exists'], ['extend.motion.easings.out', 'scale-exists'],
        ]);
        expect(mensaje(ext({ motion: { durations: { fast: '1ms' } } }))).toContain('themes.<tema>.motion.durations.fast');
    });
    it('nombres numéricos: borderWidths 1 a 999, opacities 0 a 100', () => {
        expect(errores(ext({ borderWidths: { grueso: '9px' } }))[0].code).toBe('scale-name-numeric');
        expect(errores(ext({ borderWidths: { '0': '0px' } }))[0].code).toBe('scale-name-numeric');
        expect(errores(ext({ opacities: { '101': '1' } }))[0].code).toBe('scale-name-numeric');
        expect(errores(ext({ opacities: { half: '0.5' } }))[0].code).toBe('scale-name-numeric');
        expect(errores(ext({ opacities: { '0': '0', '100': '1', '5': '0.05' } })).map((x) => x.path)).toEqual(['extend.opacities.0', 'extend.opacities.100']);
    });
    it('nombres de escala: blurs, shadows y motion en minúsculas con guiones', () => {
        for (const extend of [{ blurs: { XL: '1px' } }, { shadows: { Huge: 'none' } }, { motion: { durations: { Slow2: '1s' } } }, { motion: { easings: { snap_py: 'ease' } } }]) {
            expect(errores(ext(extend))[0].code, JSON.stringify(extend)).toBe('scale-name-invalid');
        }
    });
    it('tipos de valor: opacidad de 0 a 1 o var(), duración en ms o s', () => {
        for (const valor of ['1.5', '35%', '-0.1', 'media']) expect(errores(ext({ opacities: { '35': valor } }))[0].code, valor).toBe('value-type-invalid');
        for (const valor of ['800', '0.5', 'rápido', '1m']) expect(errores(ext({ motion: { durations: { slowest: valor } } }))[0].code, valor).toBe('value-type-invalid');
        expect(errores(ext({ motion: { durations: { slowest: '0.8s' } } }))).toEqual([]);
    });
    it('un valor CSS inseguro es un Error en cualquier escala', () => {
        expect(errores(ext({ shadows: { huge: '0 0 1px red; x' } }))[0].code).toBe('unsafe-value');
        expect(errores(ext({ motion: { easings: { snappy: 'ease}' } } }))[0].code).toBe('unsafe-value');
        expect(errores(ext({ blurs: { xxl: '' } }))[0].code).toBe('empty-value');
    });
    it('un nombre sumado en extend ya no es desconocido para el tema; uno sin sumar sí', () => {
        expect(errores(conTema({ shadows: { huge: 'none' } }, { extend: { shadows: { huge: '0 0 1px red' } } }))).toEqual([]);
        const e = errores(conTema({ shadows: { huge: 'none' } }));
        expect(e[0]).toMatchObject({ path: 'themes.mio.shadows.huge', code: 'theme-name-unknown', params: { extendPath: 'extend.shadows' } });
    });
    it('motion.iterations acepta infinite o un número, rechaza otro valor y no se amplía', () => {
        expect(errores(conTema({ motion: { iterations: { loop: 'infinite' } } }))).toEqual([]);
        expect(errores(conTema({ motion: { iterations: { loop: '2' } } }))).toEqual([]);
        expect(errores(conTema({ motion: { iterations: { loop: 'paused' } } }))[0]).toMatchObject({ path: 'themes.mio.motion.iterations.loop', code: 'value-type-invalid' });
        expect(errores(conTema({ motion: { iterations: { otro: '1' } } }))[0]).toMatchObject({ code: 'theme-name-unknown' });
        expect(errores(ext({ motion: { iterations: { otro: '1' } } } as never))[0]).toMatchObject({ path: 'extend.motion.iterations', code: 'extend-key-excluded' });
    });
    it('los loops y zIndex no se amplían: ni extend.motion.loops ni extend.zIndex existen para el tema', () => {
        const e = errores(conTema({ motion: { loops: { spin2: '1s' } }, zIndex: { mio: '3' } }));
        expect(e.map((x) => [x.path, x.code, (x.params as { extendPath?: string }).extendPath])).toEqual([
            ['themes.mio.zIndex.mio', 'theme-name-unknown', undefined], ['themes.mio.motion.loops.spin2', 'theme-name-unknown', undefined],
        ]);
    });
});
