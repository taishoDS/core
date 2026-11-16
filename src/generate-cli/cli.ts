#!/usr/bin/env node
// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { runInit } from './init';
import { runGenerate } from './generate';
import { runMigrate } from './migrate';
import { runMigrateTailwind } from './migrate-tailwind';
import { runCheck } from './check';
import { runWatch } from './watch';
import { versionDelCore } from './descubrir-paquetes';
import { esIdioma, m, usarIdioma } from './idioma';
import { mensajeDe } from './errores';

const pkg = { version: versionDelCore() };

function showHelp() {
	console.log(m().ayuda);
}

const FLAGS_DE_CHECK = new Set(['config', 'format', 'help', 'version', 'lang', 'other-scale']);
const FLAGS_DE_WATCH = new Set(['config', 'out', 'help', 'version', 'lang']);
const FLAGS_DE_MCP = new Set(['config', 'help', 'version', 'lang']);

const uso = (mensaje: string) => {
	console.error(mensaje);
	process.exitCode = 2;
};

function langDeArgv(argv: string[]): string | undefined {
	const i = argv.indexOf('--lang');
	return i !== -1 ? argv[i + 1] : argv.find((a) => a.startsWith('--lang='))?.slice('--lang='.length);
}

function mensajeDeArgs(err: unknown): string {
	const { code, message = String(err) } = err as { code?: string; message?: string };
	const flag = /'(-[^'\s]+)/.exec(message)?.[1];
	if (flag && code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') return m().cli.opcionDesconocida(flag);
	if (flag && code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') return message.includes('does not take') ? m().cli.sinValor(flag) : m().cli.faltaValor(flag);
	return message;
}

export async function main() {
	const pedido = langDeArgv(process.argv.slice(2));
	usarIdioma(esIdioma(pedido) ? pedido : undefined);
	let args;
	try {
		args = parseCli();
	} catch (err) {
		uso(mensajeDeArgs(err));
		return;
	}
	await ejecutar(args);
}

function parseCli() {
	return parseArgs({
		options: {
			help: { type: 'boolean', short: 'h', default: false },
			version: { type: 'boolean', short: 'v', default: false },
			config: { type: 'string' },
			out: { type: 'string' },
			yes: { type: 'boolean', short: 'y', default: false },
			'install-icons': { type: 'boolean', default: false },
			from: { type: 'string' },
			write: { type: 'boolean', default: false },
			format: { type: 'string' },
			strict: { type: 'boolean', default: false },
			'other-scale': { type: 'boolean', default: false },
			lang: { type: 'string' },
		},
		allowPositionals: true,
		strict: true,
	});
}

async function ejecutar(args: ReturnType<typeof parseCli>) {
	const { lang: pedido } = args.values;
	if (pedido !== undefined && !esIdioma(pedido)) {
		uso(m().cli.langInvalido(pedido));
		return;
	}
	const lang = esIdioma(pedido) ? pedido : undefined;
	if (args.values.version) {
		console.log(`taisho ${pkg.version}`);
		return;
	}

	if (args.values.help || args.positionals.length === 0) {
		showHelp();
		return;
	}

	const [cmd, ...rest] = args.positionals;
	if (cmd !== 'check' && cmd !== 'watch' && !(cmd === 'migrate' && args.values.from === 'tailwind') && args.values.format !== undefined) return uso(m().cli.opcionDesconocida('--format'));
	if (!['generate', 'check', 'watch'].includes(cmd) && args.values.strict) return uso(m().cli.opcionDesconocida('--strict'));
	if (cmd !== 'init' && args.values['install-icons']) return uso(m().cli.opcionDesconocida('--install-icons'));
	if (cmd !== 'check' && args.values['other-scale']) return uso(m().cli.opcionDesconocida('--other-scale'));
	switch (cmd) {
		case 'init':
			await runInit(rest[0], { yes: args.values.yes, installIcons: args.values['install-icons'], lang });
			return;
		case 'generate': {
			const configPath = args.values.config ?? rest[0];
			await runGenerate({ configPath, outDir: args.values.out, strict: args.values.strict, lang });
			return;
		}
		case 'migrate': {
			if (args.values.from === 'tailwind') {
				const { yes, format } = args.values;
				if (yes || format !== undefined) {
					console.error(m().cli.tailwindNoAcepta([yes && '--yes', format !== undefined && '--format'].filter((f): f is string => !!f)));
					process.exitCode = 2;
					return;
				}
				try {
					await runMigrateTailwind({ write: args.values.write, configPath: args.values.config, outDir: args.values.out, rutas: rest, lang });
				} catch (err) {
					console.error('Error:', mensajeDe(err));
					process.exitCode = 2;
				}
				return;
			}
			await runMigrate({ from: args.values.from, write: args.values.write, configPath: args.values.config, outDir: args.values.out, rutas: rest, lang });
			return;
		}
		case 'check': {
			const { format, yes, write, ...resto } = args.values;
			const ajenos = [...Object.entries(resto).filter(([k, v]) => v !== undefined && v !== false && !FLAGS_DE_CHECK.has(k)).map(([k]) => `--${k}`), ...(yes ? ['--yes'] : []), ...(write ? ['--write'] : [])];
			if (ajenos.length) {
				console.error(m().cli.checkNoAcepta(ajenos));
				process.exitCode = 2;
				return;
			}
			if (format !== undefined && format !== 'text' && format !== 'json') {
				console.error(m().cli.formatoInvalido(format));
				process.exitCode = 2;
				return;
			}
			try {
				await runCheck({ globs: rest, configPath: args.values.config, format, lang, otherScale: args.values['other-scale'] });
			} catch (err) {
				console.error('Error:', mensajeDe(err));
				process.exitCode = 2;
			}
			return;
		}
		case 'watch': {
			const { yes, write, ...resto } = args.values;
			const ajenos = [...Object.entries(resto).filter(([k, v]) => v !== undefined && v !== false && !FLAGS_DE_WATCH.has(k)).map(([k]) => `--${k}`), ...(yes ? ['--yes'] : []), ...(write ? ['--write'] : [])];
			if (ajenos.length) {
				console.error(m().cli.watchNoAcepta(ajenos));
				process.exitCode = 2;
				return;
			}
			await runWatch({ configPath: args.values.config ?? rest[0], outDir: args.values.out, lang });
			return;
		}
		case 'mcp': {
			const { yes, write, ...resto } = args.values;
			const ajenos = [...Object.entries(resto).filter(([k, v]) => v !== undefined && v !== false && !FLAGS_DE_MCP.has(k)).map(([k]) => `--${k}`), ...(yes ? ['--yes'] : []), ...(write ? ['--write'] : [])];
			if (ajenos.length) return uso(m().cli.mcpNoAcepta(ajenos));
			const { runMcp } = await import('./mcp/servidor');
			await runMcp({ configPath: args.values.config, lang });
			return;
		}
		default:
			uso(m().cli.comandoDesconocido(cmd));
			showHelp();
			return;
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((err) => {
		console.error('Error:', mensajeDe(err));
		process.exitCode = 1;
	});
}
