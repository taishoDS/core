// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ejecutar } from './ejecutar';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PAQUETE = path.join(RAIZ, 'dist-core');
const TSC = path.join(RAIZ, 'node_modules/typescript/bin/tsc');
const RESOLUCIONES = [
	{ module: 'nodenext', moduleResolution: 'nodenext' },
	{ module: 'node16', moduleResolution: 'node16' },
	{ module: 'esnext', moduleResolution: 'bundler' },
];

const correr = (cmd: string, args: string[], cwd: string) =>
	ejecutar(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) as string;

function main(): void {
	if (!fs.existsSync(PAQUETE)) {
		console.error('Falta dist-core/. Corré `npm run build:core` antes.');
		process.exit(1);
	}
	const exportados = JSON.parse(fs.readFileSync(path.join(PAQUETE, 'package.json'), 'utf8')).exports as Record<string, { types?: string } | string>;
	const subpaths = Object.entries(exportados)
		.filter(([, v]) => typeof v === 'object' && v.types)
		.map(([k]) => `@taishods/core${k.slice(1)}`);

	const base = fs.mkdtempSync(path.join(os.tmpdir(), 'taisho-tipos-'));
	try {
		const salida = correr('npm', ['pack', '--pack-destination', base], PAQUETE);
		const tgz = path.join(base, salida.trim().split('\n').pop()!.trim());
		const fuente =
			subpaths.map((s, i) => `import * as m${i} from '${s}';\nvoid m${i};`).join('\n') +
			"\nimport { init, toast, setTexts } from '@taishods/core/core';\nimport type { CoreTexts } from '@taishods/core/core';\nimport { buildThemeCss } from '@taishods/core';\nconst textos: Partial<CoreTexts> = { closeNotification: 'Fermer' };\nsetTexts('fr', textos);\nvoid [init, toast, buildThemeCss];\n";

		for (const r of RESOLUCIONES) {
			const dir = path.join(base, r.moduleResolution);
			fs.mkdirSync(dir);
			fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'prueba', private: true, type: 'module' }));
			correr('npm', ['install', '--no-audit', '--no-fund', tgz], dir);
			for (const dep of ['vite', '@types/node']) {
				fs.mkdirSync(path.dirname(path.join(dir, 'node_modules', dep)), { recursive: true });
				fs.symlinkSync(path.join(RAIZ, 'node_modules', dep), path.join(dir, 'node_modules', dep));
			}
			fs.writeFileSync(path.join(dir, 'tipos.ts'), fuente);
			fs.writeFileSync(
				path.join(dir, 'tsconfig.json'),
				JSON.stringify({
					compilerOptions: { ...r, target: 'es2022', strict: true, noEmit: true, skipLibCheck: false, types: ['node'] },
					include: ['tipos.ts', 'node_modules/@taishods/core/types/**/*.d.ts'],
				}),
			);
			try {
				correr(process.execPath, [TSC, '-p', '.'], dir);
			} catch (e) {
				const err = e as { stdout?: string; stderr?: string };
				throw new Error(`Los tipos no compilan con moduleResolution ${r.moduleResolution}:\n${err.stdout ?? ''}${err.stderr ?? ''}`, { cause: e });
			}
			console.log(`   moduleResolution ${r.moduleResolution}: ok (${subpaths.length} entradas, skipLibCheck: false)`);
		}
		console.log('✅ @taishods/core: los tipos resuelven con nodenext, node16 y bundler.');
	} finally {
		fs.rmSync(base, { recursive: true, force: true });
	}
}

main();
