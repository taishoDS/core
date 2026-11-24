// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { init } from './auto';

// Un componente que un framework monta después de la carga tiene que quedar igual que el mismo HTML presente al cargar,
// y la interacción tiene que contar una sola vez.

const DIR = path.resolve(__dirname, '../../core-datos/html');
const CATALOGOS = ['progress', 'slider', 'aspect-ratio', 'scroll-area', 'date-picker', 'pagination', 'combobox', 'toc', 'number-input', 'select', 'tabs', 'table'];

/** Le agrega `sufijo` a cada id y a cada referencia a él, para que dos copias del mismo HTML convivan en un documento. */
function conSufijo(html: string, sufijo: string): string {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    let out = html;
    for (const id of new Set(ids)) {
        const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = out.replace(new RegExp(`(["\\s#])${esc}(?=["\\s])`, 'g'), `$1${id}${sufijo}`);
    }
    return out;
}

const normal = (html: string, sufijo: string) => html.replaceAll(sufijo, '').replace(/\s(?:style|data-ts-[a-z-]*seen)=""/g, '');
const esperar = (ms = 60) => new Promise((r) => setTimeout(r, ms));
/** Espera a que `cond` se cumpla (con la suite entera corriendo, cargar un módulo del Core puede tardar). */
async function hasta(cond: () => boolean, tope = 2000): Promise<void> {
    for (let t = 0; t < tope && !cond(); t += 20) await esperar(20);
}

describe('lo que se monta después de init queda igual que lo presente al cargar', { timeout: 60000 }, () => {
    const copias = new Map<string, { carga: HTMLElement; despues: HTMLElement }>();

    beforeAll(async () => {
        for (const slug of CATALOGOS) {
            const carga = document.createElement('section');
            carga.innerHTML = conSufijo(readFileSync(path.join(DIR, `${slug}.html`), 'utf8'), '-carga');
            document.body.append(carga);
            copias.set(slug, { carga, despues: carga });
        }
        await init(document);
        await esperar(200);
        for (const slug of CATALOGOS) {
            const despues = document.createElement('section');
            despues.innerHTML = conSufijo(readFileSync(path.join(DIR, `${slug}.html`), 'utf8'), '-despues');
            document.body.append(despues);
            copias.get(slug)!.despues = despues;
        }
        await esperar(300);
    }, 60000);

    it('los catálogos existen', () => {
        for (const slug of CATALOGOS) expect(readdirSync(DIR)).toContain(`${slug}.html`);
    });

    for (const slug of CATALOGOS) {
        it(slug, () => {
            const { carga, despues } = copias.get(slug)!;
            const a = normal(carga.innerHTML, '-carga'), b = normal(despues.innerHTML, '-despues');
            expect(b).toBe(a);
        });
    }
});

describe('montado después: la interacción cuenta una vez y lo que cambia por código se sigue', { timeout: 60000 }, () => {
    const montar = async (html: string) => {
        const c = document.createElement('div');
        c.innerHTML = html;
        document.body.append(c);
        await esperar();
        return c;
    };
    const NUMERO = conSufijo(readFileSync(path.join(DIR, 'number-input.html'), 'utf8'), '-n');

    it('un clic en «+» de un NumberInput montado después suma un paso y avisa una vez', async () => {
        await init(document);
        const raiz = (await montar(NUMERO)).querySelector<HTMLElement>('[data-ts-number]')!;
        const campo = raiz.querySelector<HTMLInputElement>('[data-ts-number-field]')!;
        let avisos = 0;
        const contar = () => avisos++;
        document.addEventListener('ts:change', contar);
        const antes = Number(campo.value);
        raiz.querySelector<HTMLButtonElement>('[data-ts-number-step="1"]')!.click();
        document.removeEventListener('ts:change', contar);
        expect({ suma: Number(campo.value) - antes, avisos }).toEqual({ suma: 1, avisos: 1 });
    });

    it('un segundo Slider montado después también se dibuja', async () => {
        await init(document);
        const slider = '<div class="ts slider" data-ts-slider=""><input type="range" class="ts slider-input" min="0" max="100" value="40"></div>';
        for (let k = 0; k < 2; k++) {
            const input = (await montar(slider)).querySelector<HTMLInputElement>('input')!;
            await hasta(() => input.style.getPropertyValue('--ts-slider-fill') !== '');
            expect(input.style.getPropertyValue('--ts-slider-fill')).toBe('40%');
        }
    });

    it('si el código deshabilita el campo de un NumberInput, sus botones lo siguen', async () => {
        await init(document);
        const raiz = (await montar(conSufijo(NUMERO, '-d'))).querySelector<HTMLElement>('[data-ts-number]')!;
        raiz.querySelector<HTMLInputElement>('[data-ts-number-field]')!.disabled = true;
        const botones = [...raiz.querySelectorAll<HTMLButtonElement>('[data-ts-number-step]')];
        await hasta(() => botones.every((b) => b.disabled));
        expect([...raiz.querySelectorAll<HTMLButtonElement>('[data-ts-number-step]')].map((b) => b.disabled)).toEqual([true, true]);
    });
});
