// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// Sin imports a propósito: el bin lo carga ANTES que el resto del CLI, que usa APIs de Node nuevas (`fs.globSync`, `path.matchesGlob`). El piso es la LTS activa.
export const NODE_MINIMO = '26';

export function nodeSirve(version: string): boolean {
	return Number(version.split('.')[0]) >= 26;
}

function idiomaDelArranque(argv: readonly string[], env: Record<string, string | undefined>): 'es' | 'en' {
	const i = argv.indexOf('--lang');
	const pedido = i !== -1 ? argv[i + 1] : argv.find((a) => a.startsWith('--lang='))?.slice('--lang='.length);
	if (pedido === 'es' || pedido === 'en') return pedido;
	return /^es/i.test(env.LC_ALL || env.LC_MESSAGES || env.LANG || '') ? 'es' : 'en';
}

export function mensajeNodeMinimo(version: string, argv: readonly string[], env: Record<string, string | undefined>): string {
	return idiomaDelArranque(argv, env) === 'es'
		? `taisho: hace falta Node ${NODE_MINIMO} o superior (esta es la ${version}). Actualiza Node y vuelve a correr el comando.`
		: `taisho: Node ${NODE_MINIMO} or newer is required (this is ${version}). Update Node and run the command again.`;
}
