// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { MENSAJES, type Lang } from './mensajes';

export type { Lang };

export const IDIOMAS: readonly Lang[] = ['es', 'en'];

export const esIdioma = (valor: unknown): valor is Lang => valor === 'es' || valor === 'en';

export function idiomaDelSistema(env: NodeJS.ProcessEnv = process.env): Lang {
	const valor = env.LC_ALL || env.LC_MESSAGES || env.LANG || '';
	return /^es/i.test(valor) ? 'es' : 'en';
}

let fijado: Lang | undefined;

export function usarIdioma(flag?: Lang, config?: { lang?: unknown } | null): Lang {
	const deConfig = config?.lang;
	fijado = flag ?? (esIdioma(deConfig) ? deConfig : undefined) ?? idiomaDelSistema();
	return fijado;
}

export const idioma = (): Lang => fijado ?? idiomaDelSistema();

export const m = () => MENSAJES[idioma()];
