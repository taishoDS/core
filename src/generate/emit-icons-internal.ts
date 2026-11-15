// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'fs';
import path from 'path';

const LITERAL = /['"]([a-z][a-z0-9]*(?:-[a-z0-9]+)*)['"]/g;

export function collectInternalIcons(componentsDir: string, known: Set<string>): string[] {
    const found = new Set<string>();

    const walk = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
                continue;
            }
            if (!/\.(svelte|ts)$/.test(entry.name) || /\.(test|fixture|core)\./.test(entry.name))
                continue;
            const code = fs.readFileSync(full, 'utf-8');
            for (const m of code.matchAll(LITERAL)) {
                if (known.has(m[1])) found.add(m[1]);
            }
        }
    };

    walk(componentsDir);
    return [...found].sort();
}

export function buildIconsInternalTS(names: string[]): string {
    let ts = '// Archivo auto-generado: ÍCONOS INTERNOS DE LOS COMPONENTES\n';
    ts += '// Lo genera emit-icons-internal.ts escaneando los componentes.\n';
    ts += '// NO editar a mano: `npm run generate` lo sobrescribe.\n//\n';
    ts += '// El plugin taisho-icons los agrega siempre al bundle, porque en un proyecto\n';
    ts += '// consumidor los componentes vienen precompilados en node_modules y su uso de\n';
    ts += '// íconos es invisible para el escáner.\n\n';
    ts += `export const internalIcons: readonly string[] = ${JSON.stringify(names, null, 4).replace(/"/g, "'")};\n`;
    return ts;
}
