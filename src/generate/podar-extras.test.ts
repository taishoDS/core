// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { compile } from './compile';
import { buildRepoConfig } from '../config/pipeline';
import type { TaishoConfig } from './vocabulary';

const config: TaishoConfig = buildRepoConfig();
const demanda = (html: string) => compile(config, [{ file: 'a.html', content: html }], { onDemand: true }).css;
const tiene = (css: string) => ({
    spotlight: css.includes('[data-card-spotlight] {'),
    glow: css.includes('has-glow:hover'),
    ambilight: css.includes('[data-card-ambilight] {'),
    ambilightHover: css.includes('has-ambilight'),
    grayscale: css.includes('has-grayscale'),
    aspectos: [...css.matchAll(/&\.aspect-(\d+\\\/\d+)/g)].map((m) => m[1].replace('\\', '')),
});
const NADA = { spotlight: false, glow: false, ambilight: false, ambilightHover: false, grayscale: false, aspectos: [] };
const TODO = '<div class="ts card has-glow" data-card-grid><span data-card-spotlight></span><div class="ts card-media aspect-16/9 aspect-4/3 aspect-1/1 aspect-16/10 has-ambilight has-grayscale"><div data-card-ambilight></div><img data-card-image></div></div>';

describe('Card: los extras a demanda', () => {
    it('un card sin extras no trae spotlight, ambilight, grayscale ni aspectos', () => {
        expect(tiene(demanda('<div class="ts card"></div>'))).toEqual(NADA);
    });

    it('con todo nombrado, la salida es la misma que la del archivo completo para el card', () => {
        const completo = compile(config, []).css;
        const bloque = (css: string, sel: string) => css.slice(css.indexOf(sel), css.indexOf('\n}\n', css.indexOf(sel)));
        for (const sel of [':where(.ts).card {', ':where(.ts).card-media {']) expect(bloque(demanda(TODO), sel)).toBe(bloque(completo, sel));
        expect(tiene(demanda(TODO))).toEqual({ ...NADA, spotlight: true, glow: true, ambilight: true, ambilightHover: true, grayscale: true, aspectos: ['16/9', '4/3', '1/1', '16/10'] });
    });

    it('cada extra entra por su clase o su atributo', () => {
        expect(tiene(demanda('<div class="ts card has-glow"></div>'))).toMatchObject({ spotlight: true, glow: true, ambilight: false });
        expect(tiene(demanda('<div class="ts card"><span data-card-spotlight></span></div>'))).toMatchObject({ spotlight: true });
        expect(tiene(demanda('<div class="ts card"><div class="ts card-media has-ambilight"></div></div>'))).toMatchObject({ ambilight: true, ambilightHover: true, grayscale: false });
        expect(tiene(demanda('<div class="ts card"><div class="ts card-media has-grayscale"></div></div>'))).toMatchObject({ grayscale: true, ambilight: false });
        expect(tiene(demanda('<div class="ts card"><div class="ts card-media aspect-4/3"></div></div>')).aspectos).toEqual(['4/3']);
    });

    it('las props de un componente que arma las clases adentro de su paquete cuentan', () => {
        expect(tiene(demanda('<div class="ts card"></div><Card glow />'))).toMatchObject({ spotlight: true, glow: true });
        expect(tiene(demanda('<div class="ts card card-media"></div><CardMedia ambilight grayscale aspect="1/1" />'))).toMatchObject({ ambilight: true, grayscale: true });
        expect(tiene(demanda('<div class="ts card card-media"></div><CardMedia aspect="1/1" />')).aspectos).toEqual(['16/9', '1/1']);
        expect(tiene(demanda('<div class="ts card card-media"></div><CardMedia src="x.jpg" />')).aspectos).toEqual(['16/9']);
    });

    it('el archivo completo no cambia', () => {
        expect(tiene(compile(config, []).css)).toEqual({ ...NADA, spotlight: true, glow: true, ambilight: true, ambilightHover: true, grayscale: true, aspectos: ['16/9', '4/3', '1/1', '16/10'] });
    });
});

describe('Card: aspectos armados en runtime y el safelist', () => {
    it('`aspect-${r}` trae todos los aspectos de card-media', () => {
        expect(tiene(demanda('<div class="ts card"><div class={`ts card-media aspect-${r}`}></div></div>')).aspectos).toEqual(['16/9', '4/3', '1/1', '16/10']);
    });
});
