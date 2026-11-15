// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { type Plugin } from 'vite';
import path from 'path';
import { scanVariantes } from './emit-flat.ts';
import { leerDir } from './leer-dir.ts';

export function taishoCss(): Plugin {
    const src = path.resolve(process.cwd(), 'src');
    let conocidas = new Set<string>();

    return {
        name: 'taisho-css',
        apply: 'serve',

        configureServer() {
            conocidas = scanVariantes(src, leerDir);
        },

        async handleHotUpdate({ file }) {
            if (!file.endsWith('.svelte')) return;

            const actuales = scanVariantes(src, leerDir);
            const nuevas = [...actuales].filter((v) => !conocidas.has(v));
            conocidas = actuales;
            if (!nuevas.length) return;

            console.log(`\n\x1b[35m[taisho-css]\x1b[0m Variantes nuevas: ${nuevas.join(', ')}. Regenerando el CSS...`);
            const { exec } = await import('child_process');
            await new Promise<void>((resolve) => {
                exec('npx tsx src/config/pipeline.ts', (err) => {
                    if (err) console.error('\x1b[31m[taisho-css]\x1b[0m Error regenerando el CSS:', err);
                    resolve();
                });
            });
        },
    };
}
