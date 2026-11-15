// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { oklchToLinear } from './color-math';
import { contrastNeutrals } from './palette';
import type { Scale } from './palette';
import type { NeutralMap } from './neutrals';

const encode = (x: number): number => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export function apcaLuminance(L: number, C: number, H: number): number {
    const [r, g, b] = oklchToLinear(L, C, H).map(x => Math.pow(clamp01(encode(clamp01(x))), 2.4));
    return 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
}

export function apcaContrast(textY: number, bgY: number): number {
    const soft = (y: number) => (y < 0.022 ? y + Math.pow(0.022 - y, 1.414) : y);
    const t = soft(textY), b = soft(bgY);
    if (Math.abs(b - t) < 0.0005) return 0;
    if (b > t) { const s = (Math.pow(b, 0.56) - Math.pow(t, 0.57)) * 1.14; return s < 0.1 ? 0 : (s - 0.027) * 100; }
    const s = (Math.pow(b, 0.65) - Math.pow(t, 0.62)) * 1.14;
    return s > -0.1 ? 0 : (s + 0.027) * 100;
}

export function apcaDeEscala(scale: Scale, isDark: boolean, eff?: { light: NeutralMap; dark: NeutralMap }): number[] {
    const [claro, oscuro] = contrastNeutrals(isDark, eff);
    return scale.steps.map(s => {
        const n = s.contrast === claro.ref ? claro : oscuro;
        return apcaContrast(apcaLuminance(n.l, n.c, n.h), apcaLuminance(s.l, s.c, s.h));
    });
}
