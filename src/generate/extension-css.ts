// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
const CARACTERISTICA_PERMITIDA = /^(?:prefers-[a-z-]+|forced-colors|hover|pointer)$/;

export function mediaPermitida(consulta: string): boolean {
    return consulta
        .toLowerCase()
        .split(',')
        .every((alternativa) => {
            const reducida = alternativa.replace(/\(\s*([a-z-]+)\s*(?::\s*[a-z0-9-]+\s*)?\)/g, (_, f: string) => (CARACTERISTICA_PERMITIDA.test(f) ? '#' : '!'));
            return /^\s*(?:not\s+)?#(?:\s+(?:and|or)\s+#)*\s*$/.test(reducida);
        });
}

export const AT_RULES_PERMITIDOS: readonly string[] = ['media', 'supports', 'container', 'starting-style'];

const NOMBRES_DE_COLOR = new Set(
    ('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue ' +
        'chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey ' +
        'darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray ' +
        'darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen ' +
        'fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
        'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen ' +
        'lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime ' +
        'limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue ' +
        'mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive ' +
        'olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
        'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver ' +
        'skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white ' +
        'whitesmoke yellow yellowgreen').split(' '),
);

const FUNCION_DE_COLOR = /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|device-cmyk)\s*\(/gi;

export interface ColorLiteral {
    kind: 'hex' | 'name' | 'function';
    value: string;
}

function argumentos(t: string, abre: number): string {
    let depth = 0;
    for (let i = abre; i < t.length; i++) {
        if (t[i] === '(') depth++;
        else if (t[i] === ')' && --depth === 0) return t.slice(abre + 1, i);
    }
    return t.slice(abre + 1);
}

export function colorLiteral(declaracion: string): ColorLiteral | undefined {
    const i = declaracion.indexOf(':');
    const valor = i < 0 ? declaracion : declaracion.slice(i + 1);
    const hex = /#[0-9a-fA-F]{3,8}\b/.exec(valor);
    if (hex) return { kind: 'hex', value: hex[0] };
    for (const m of valor.matchAll(FUNCION_DE_COLOR)) {
        const abre = m.index! + m[0].length - 1;
        if (!/var\s*\(/i.test(argumentos(valor, abre))) return { kind: 'function', value: `${m[0].replace(/\s*\($/, '')}(${argumentos(valor, abre)})` };
    }
    for (const m of valor.matchAll(/(?<![\w-])([a-zA-Z]+)(?![\w-])(?!\s*\()/g)) {
        if (NOMBRES_DE_COLOR.has(m[1].toLowerCase())) return { kind: 'name', value: m[1] };
    }
    return undefined;
}

export const variablesLeidas = (texto: string): string[] => [...texto.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((m) => m[1]);
