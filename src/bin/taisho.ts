#!/usr/bin/env node
// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { nodeSirve, mensajeNodeMinimo } from '../generate-cli/node-minimo.js';

if (!nodeSirve(process.versions.node)) {
	console.error(mensajeNodeMinimo(process.versions.node, process.argv.slice(2), process.env));
	process.exitCode = 1;
} else {
	const { main } = await import('../generate-cli/cli.js');
	await main().catch((err) => {
		console.error('Error:', err instanceof Error ? err.message : err);
		process.exitCode = 1;
	});
}
