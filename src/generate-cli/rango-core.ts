// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// Rango semver acotado, sin dependencias: lo justo para que un paquete de extensión declare qué Core acepta.
// Forma: una versión exacta (`0.16.0`) o comparadores separados por espacio (todos deben cumplirse):
// `=`, `>=`, `>`, `<=`, `<`, `^` y `~` seguidos de `x.y.z[-pre]`. Sin parciales (`0.17`), sin `x`/`*`, sin `||`.
type Version = { n: [number, number, number]; pre: string[] };
type Comparador = { op: '=' | '>=' | '>' | '<=' | '<'; v: Version };

const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const COMPARADOR = /^(\^|~|>=|<=|>|<|=)?(.+)$/;

function leerVersion(texto: string): Version | null {
	const r = VERSION.exec(texto);
	return r && { n: [Number(r[1]), Number(r[2]), Number(r[3])], pre: r[4] ? r[4].split('.') : [] };
}

function comparar(a: Version, b: Version): number {
	for (let i = 0; i < 3; i++) if (a.n[i] !== b.n[i]) return a.n[i] < b.n[i] ? -1 : 1;
	if (!a.pre.length || !b.pre.length) return a.pre.length === b.pre.length ? 0 : a.pre.length ? -1 : 1;
	for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
		const x = a.pre[i];
		const y = b.pre[i];
		if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
		if (x === y) continue;
		const nx = /^\d+$/.test(x);
		const ny = /^\d+$/.test(y);
		if (nx && ny) return Number(x) < Number(y) ? -1 : 1;
		if (nx !== ny) return nx ? -1 : 1;
		return x < y ? -1 : 1;
	}
	return 0;
}

const sinPre = (n: [number, number, number]): Version => ({ n, pre: [] });

// Semver estándar: `^` fija el primer número que no es cero (^0.17.0 = >=0.17.0 <0.18.0); `~` fija el minor.
function expandir(token: string): Comparador[] | null {
	const partes = COMPARADOR.exec(token);
	if (!partes) return null;
	const v = leerVersion(partes[2]);
	if (!v) return null;
	const op = partes[1] ?? '=';
	const [M, mi, p] = v.n;
	if (op === '^') return [{ op: '>=', v }, { op: '<', v: sinPre(M > 0 ? [M + 1, 0, 0] : mi > 0 ? [0, mi + 1, 0] : [0, 0, p + 1]) }];
	if (op === '~') return [{ op: '>=', v }, { op: '<', v: sinPre([M, mi + 1, 0]) }];
	return [{ op: op as Comparador['op'], v }];
}

function leerRango(rango: string): Comparador[] | null {
	const tokens = rango.trim().replace(/(>=|<=|[<>=^~])\s+/g, '$1').split(/\s+/);
	const todos: Comparador[] = [];
	for (const t of tokens) {
		const c = expandir(t);
		if (!c) return null;
		todos.push(...c);
	}
	return todos;
}

export const rangoValido = (rango: string): boolean => leerRango(rango) !== null;

/** `null` si el rango está mal escrito o la versión no es semver; si no, si la versión lo cumple. */
export function cumpleRango(version: string, rango: string): boolean | null {
	const v = leerVersion(version);
	const cs = leerRango(rango);
	if (!v || !cs) return null;
	// Como npm: una prerelease sólo entra si algún comparador nombra una prerelease de la misma x.y.z.
	if (v.pre.length && !cs.some((c) => c.v.pre.length && c.v.n.every((x, i) => x === v.n[i]))) return false;
	return cs.every(({ op, v: w }) => {
		const r = comparar(v, w);
		return op === '=' ? r === 0 : op === '>=' ? r >= 0 : op === '>' ? r > 0 : op === '<=' ? r <= 0 : r < 0;
	});
}
