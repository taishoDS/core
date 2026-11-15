// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { transform } from 'esbuild';

export async function minifyCss(css: string, banner: string): Promise<string> {
    const { code } = await transform(css, { loader: 'css', minify: true });
    return code.startsWith(banner) ? code : banner + code;
}
