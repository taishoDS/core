// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { execFileSync, type ExecFileSyncOptions } from 'node:child_process';

export function armarComando(
	cmd: string,
	args: readonly string[],
	plataforma: NodeJS.Platform = process.platform,
): { cmd: string; args: string[]; shell: boolean } {
	if (plataforma !== 'win32') return { cmd, args: [...args], shell: false };
	return { cmd, args: args.map((a) => (/^[\w./:@=+-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`)), shell: true };
}

export function ejecutar(cmd: string, args: readonly string[], opciones: ExecFileSyncOptions = {}): string | Buffer {
	const a = armarComando(cmd, args);
	return execFileSync(a.cmd, a.args, { ...opciones, shell: a.shell });
}
