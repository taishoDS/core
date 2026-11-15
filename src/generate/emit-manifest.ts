// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export const PREFIJOS_EXTRA: Record<string, string> = {
    calendar: 'date-picker',
    toaster: 'toast',
    command: 'command-palette',
};

export const BLOQUES_COMPARTIDOS: Record<string, readonly string[]> = { 'required-proxy': ['select', 'date-picker'] };

export const BLOQUES_SUELTOS: readonly string[] = [...Object.keys(BLOQUES_COMPARTIDOS)];

export interface ManifestComponente {
    gancho: string | null;
    bloques: string[];
    runtime: string[];
}

export interface ComponentManifest {
    componentes: Record<string, ManifestComponente>;
    sueltos: string[];
}

export interface ManifestInput {
    css: string;
    slugs: string[];
    claseDS: string[];
    hooks: string[];
}

export function nombresDeBloque(css: string): string[] {
    return [...css.matchAll(/^@utility ts-(\S+)/gm)].map((m) => m[1].replaceAll('\\', ''));
}

export function buildComponentManifest(input: ManifestInput): ComponentManifest {
    const slugs = new Set(input.slugs);
    const prefijos = new Map<string, string[]>();
    const reclamar = (prefijo: string, slug: string) => prefijos.set(prefijo, [...(prefijos.get(prefijo) ?? []), slug]);
    for (const slug of slugs) {
        reclamar(slug, slug);
        reclamar(slug.replaceAll('-', ''), slug);
    }
    for (const [prefijo, slug] of Object.entries(PREFIJOS_EXTRA)) {
        if (slugs.has(slug)) reclamar(prefijo, slug);
    }

    const duenos = (bloque: string): string[] => {
        let mejor = -1;
        let ganadores = new Set<string>();
        for (const [prefijo, lista] of prefijos) {
            if (bloque !== prefijo && !bloque.startsWith(`${prefijo}-`)) continue;
            if (prefijo.length > mejor) [mejor, ganadores] = [prefijo.length, new Set(lista)];
            else if (prefijo.length === mejor) lista.forEach((s) => ganadores.add(s));
        }
        return [...ganadores];
    };

    const bloques = [...new Set(nombresDeBloque(input.css))];
    const componentes: Record<string, ManifestComponente> = {};
    for (const slug of [...slugs].sort()) {
        componentes[slug] = { gancho: input.hooks.includes(slug) ? `data-ts-${slug}` : null, bloques: [], runtime: [] };
    }
    const sueltos: string[] = [];
    const huerfanos: string[] = [];
    const ambiguos: string[] = [];
    for (const bloque of bloques) {
        if (BLOQUES_SUELTOS.includes(bloque)) {
            sueltos.push(bloque);
            continue;
        }
        const d = duenos(bloque);
        if (d.length === 0) huerfanos.push(bloque);
        else if (d.length > 1) ambiguos.push(`${bloque} (${d.join(', ')})`);
        else componentes[d[0]].bloques.push(bloque);
    }
    const errores: string[] = [];
    if (huerfanos.length) errores.push(`bloques sin componente: ${huerfanos.join(', ')}`);
    if (ambiguos.length) errores.push(`bloques con más de un componente: ${ambiguos.join('; ')}`);

    const runtime = new Map<string, string>();
    for (const c of new Set(input.claseDS)) {
        const d = duenos(c);
        if (!input.css.includes(`.ts-${c}`) && !bloques.includes(c)) errores.push(`claseDS('${c}') no existe en components.css`);
        else if (d.length !== 1) errores.push(`claseDS('${c}') sin un único componente (${d.join(', ') || 'ninguno'})`);
        else runtime.set(c, d[0]);
    }
    if (errores.length) throw new Error(`Manifiesto de componentes inválido — ${errores.join(' | ')}`);

    for (const [c, slug] of runtime) componentes[slug].runtime.push(c);
    return { componentes, sueltos };
}

export function buildManifestJSON(manifest: ComponentManifest): string {
    return JSON.stringify(manifest, null, 2) + '\n';
}
