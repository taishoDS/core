// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { compile, DEFAULT_COPYRIGHT, type ContentFile, type CompileCache } from './compile';
import { tokenizar } from './emit-flat';
import { buildRepoConfig, REPO_COPYRIGHT } from '../config/pipeline';
import { warningLine } from '../generate-cli/mensajes-avisos';
import type { EngineWarning } from './avisos-tipos';

const es = (ws: EngineWarning[]) => ws.map((w) => warningLine(w, 'es'));

vi.mock('./emit-flat', async (importOriginal) => {
    const original = await importOriginal<typeof import('./emit-flat')>();
    return { ...original, tokenizar: vi.fn(original.tokenizar) };
});

const RAIZ = path.resolve(__dirname, '../..');
const config = buildRepoConfig();

function svelteDeSrc(): ContentFile[] {
    const out: ContentFile[] = [];
    const rec = (d: string) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) rec(p);
            else if (p.endsWith('.svelte')) {
                out.push({
                    file: path.relative(RAIZ, p).split(path.sep).join('/'),
                    content: fs.readFileSync(p, 'utf8'),
                });
            }
        }
    };
    rec(path.join(RAIZ, 'src'));
    return out;
}

describe('compile', () => {
    const files = svelteDeSrc();

    it('mismo resultado sin caché, con caché vacía, tibia y con files invertidos', () => {
        const opts = { copyright: REPO_COPYRIGHT };
        const base = compile(config, files, opts);
        const conHash = files.map((f, i) => ({ ...f, hash: `h${i}` }));
        const cache: CompileCache = new Map();
        const fria = compile(config, conHash, { ...opts, cache });
        const tibia = compile(config, conHash, { ...opts, cache });
        const invertido = compile(config, [...files].reverse(), opts);
        expect(fria).toEqual(base);
        expect(tibia).toEqual(base);
        expect(invertido).toEqual(base);
    });

    it('con caché tibia no se re-extrae', () => {
        const spy = vi.mocked(tokenizar);
        const conHash = files.map((f, i) => ({ ...f, hash: `h${i}` }));
        const cache: CompileCache = new Map();
        spy.mockClear();
        compile(config, conHash, { cache });
        expect(spy).toHaveBeenCalledTimes(files.length);
        spy.mockClear();
        compile(config, conHash, { cache });
        expect(spy).not.toHaveBeenCalled();
    });

    it('una ruta duplicada lanza Error', () => {
        const f = { file: 'src/a.svelte', content: '' };
        expect(() => compile(config, [f, { ...f }])).toThrow(/duplicada/);
    });

    it('el contenido agrega variantes (sólo lo que el markup usa) y compile no muta sus entradas', () => {
        const regla = ':where(.ts).md\\:p-double {';
        const f = { file: 'src/a.svelte', content: '<div class="ts md:p-double"></div>' };
        const antesConfig = JSON.stringify(config);
        const antesFiles = JSON.stringify([f]);
        expect(compile(config, []).css).not.toContain(regla);
        expect(compile(config, [f]).css).toContain(regla);
        expect(JSON.stringify(config)).toBe(antesConfig);
        expect(JSON.stringify([f])).toBe(antesFiles);
    });

    it('copyright: default MIT y override', () => {
        expect(compile(config, []).css.startsWith(`/* TaishoDS — ${DEFAULT_COPYRIGHT} */\n`)).toBe(true);
        expect(DEFAULT_COPYRIGHT).toContain('MIT');
        expect(compile(config, [], { copyright: 'Acme' }).css.startsWith('/* TaishoDS — Acme */\n')).toBe(true);
    });

    it('es puro: el grafo transitivo de imports relativos de compile.ts no toca fs, path, child_process, process ni console', () => {
        const visitados = new Set<string>();
        const pendientes = [path.join(__dirname, 'compile.ts')];
        const prohibidos: string[] = [];
        while (pendientes.length) {
            const archivo = pendientes.pop()!;
            if (visitados.has(archivo)) continue;
            visitados.add(archivo);
            const fuente = fs.readFileSync(archivo, 'utf8');
            const nombre = path.relative(RAIZ, archivo);
            if (/from\s+['"](node:)?(fs|path|child_process)['"]/.test(fuente)) prohibidos.push(`${nombre}: importa fs/path/child_process`);
            if (/\bprocess\./.test(fuente)) prohibidos.push(`${nombre}: usa process.`);
            if (/\bconsole\./.test(fuente)) prohibidos.push(`${nombre}: usa console.`);
            for (const m of fuente.matchAll(/(?:from|import)\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
                const base = path.resolve(path.dirname(archivo), m[1]);
                const real = [base + '.ts', path.join(base, 'index.ts'), base].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
                if (real && real.endsWith('.ts')) pendientes.push(real);
            }
        }
        expect(visitados.size).toBeGreaterThan(5);
        expect(prohibidos).toEqual([]);
    });
});

describe('compile a demanda', () => {
    it('mover las clases de carpeta no cambia un byte del CSS', () => {
        const contenidos = ['<a class="ts md:p-double md:hidden"></a>', '<a class="ts md:inline-flex md:px-base"></a>', '<a class="ts hover:underline aria-selected:underline"></a>', '<a class="ts md:flex hover:no-underline"></a>'];
        const rutas = ['a/uno.svelte', 'b/dos.svelte', 'c/tres.svelte', 'd/cuatro.svelte'];
        const con = (corte: number) => compile(config, rutas.map((file, i) => ({ file, content: contenidos[(i + corte) % contenidos.length] })), { onDemand: true }).css;
        for (let corte = 1; corte < contenidos.length; corte++) expect(con(corte)).toBe(con(0));
    });

    const f = (content: string, file = 'a.html') => ({ file, content });

    it('el modo completo no cambia: onDemand:false es el default', () => {
        const files = [f('<p class="ts md:p-double">')];
        expect(compile(config, files, { onDemand: false }).css).toBe(compile(config, files).css);
    });

    it('sólo las utilidades usadas, la base fija siempre, y mucho más liviano que el completo', () => {
        const r = compile(config, [f('<p class="ts flex gap-base">')], { onDemand: true });
        expect(r.css).toContain('@layer base, components, utilities, states, utility-states, print;');
        expect(r.css).toContain('@keyframes');
        expect(r.css).toContain(':where(.ts).flex {');
        expect(r.css).toContain(':where(.ts).gap-base {');
        expect(r.css).not.toContain(':where(.ts).grid {');
        expect(r.css).not.toContain(':where(.ts).button {');
        expect(r.css.length).toBeLessThan(compile(config, []).css.length / 5);
        expect(r.warnings).toEqual([]);
    });

    it('sin archivos: sólo la base (sin reglas de clase)', () => {
        const base = compile(config, [], { onDemand: true });
        expect(base.css).toContain('@layer base {');
        expect(base.css).not.toContain(':where(.ts).flex {');
        expect(base.variants).toEqual([]);
    });

    it('la clase corta entra aunque el atributo no lleve la llave; el nombre con ts- ya no es un nombre', () => {
        const r = compile(config, [f('<p class:hidden={x} class="flex md:gap-base">')], { onDemand: true });
        expect(r.css).toContain(':where(.ts).flex {');
        expect(r.css).toContain(':where(.ts).hidden {');
        expect(r.css).toContain(':where(.ts).md\\:gap-base {');
        expect(r.css).not.toContain(':where(.ts).grid {');
        expect(compile(config, [f('<p class="ts-flex">')], { onDemand: true }).css).not.toContain('.flex {');
    });

    it('una regla renombrada entra por su nombre vigente; el viejo ya no es un nombre', () => {
        expect(compile(config, [f('ms-half')], { onDemand: true }).css).toContain(':where(.ts).ms-half {');
        const viejo = compile(config, [f('ml-half')], { onDemand: true }).css;
        expect(viejo).not.toContain('ms-half');
        expect(viejo).not.toContain('ml-half');
    });

    it('cualquier utilidad × cualquier prefijo literal, sin la curaduría responsive', () => {
        const r = compile(config, [f('md:p-double lg:w-1/4')], { onDemand: true });
        expect(r.css).toContain(':where(.ts).md\\:p-double {');
        expect(r.css).toContain(':where(.ts).lg\\:w-1\\/4 {');
        expect(r.css).not.toContain(':where(.ts).sm\\:flex {');
        expect(r.css).not.toContain(':where(.ts).p-double {');
    });

    it('H1: `@md:` produce @container y no @media; `md:` sigue siendo @media', () => {
        const r = compile(config, [f('<div class="ts @md:grid-cols-2 md:p-double">')], { onDemand: true });
        expect(r.css).toContain('@container (width >= 28rem) {\n  :where(.ts).\\@md\\:grid-cols-2 {');
        expect(r.css).toContain('@media (width >= 48rem) {\n  :where(.ts).md\\:p-double {');
        expect(r.css).not.toContain(':where(.ts).md\\:grid-cols-2 {');
        expect(r.variants).toEqual(['@md:grid-cols-2', 'md:p-double']);
        const completo = compile(config, [f('@md:p-double')]);
        expect(completo.css).toContain(':where(.ts).\\@md\\:p-double {');
        expect(completo.css).not.toContain(':where(.ts).md\\:p-double {');
    });

    it('avisa de una clase armada en runtime', () => {
        const r = compile(config, [f('<div class="ts grid-cols-{n} md:gap-${gap}">', 'src/a.svelte'), f('const x = `grid-cols-${n}`', 'b.ts')], { onDemand: true });
        expect(es(r.warnings)).toEqual([
            'b.ts: "grid-cols-" parece compuesta en runtime; se agrega a safelist.',
            'src/a.svelte: "grid-cols-" parece compuesta en runtime; se agrega a safelist.',
            'src/a.svelte: "gap-" parece compuesta en runtime; se agrega a safelist.',
        ]);
        expect(compile(config, [f('const x = `item-${n}` // {a}')], { onDemand: true }).warnings).toEqual([]);
    });

    it('avisa de un prefijo desconocido sobre una base válida, con sugerencia', () => {
        const r = compile(config, [f('<p class="mdd:p-double hovr:flex class:hidden={x} https://nada">')], { onDemand: true });
        expect(es(r.warnings)).toEqual([
            'a.html: el prefijo "mdd:" no existe (en "mdd:p-double"). ¿Se quiso decir "md:"?',
            'a.html: el prefijo "hovr:" no existe (en "hovr:flex"). ¿Se quiso decir "hover:"?',
        ]);
        expect(r.css).not.toContain('hovr\\:');
        expect(r.css).toContain(':where(.ts).hidden {');
    });

    it('es independiente del orden de los archivos y de la caché', () => {
        const files = [f('<p class="ts flex md:p-double">', 'z.html'), f('<p class="ts grid gap-base">', 'a.html'), f('grid-cols-${n} mdd:flex', 'm.ts')];
        const hashed = files.map((x, i) => ({ ...x, hash: `h${i}` }));
        const base = compile(config, files, { onDemand: true });
        const cache: CompileCache = new Map();
        expect(compile(config, [...files].reverse(), { onDemand: true })).toEqual(base);
        expect(compile(config, hashed, { onDemand: true, cache })).toEqual(base);
        expect(compile(config, hashed, { onDemand: true, cache })).toEqual(base);
        expect(compile(config, hashed, { cache })).toEqual(compile(config, files));
    });
});
