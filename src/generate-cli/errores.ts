// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { ConfigError } from '../generate/errores-config';
import { idioma } from './idioma';
import { configErrorLine } from '../generate/mensajes-errores';

export function mensajeDe(err: unknown): unknown {
	if (err instanceof ConfigError) return err.errors.map((e) => configErrorLine(e, idioma())).join('\n');
	return err instanceof Error ? err.message : err;
}
