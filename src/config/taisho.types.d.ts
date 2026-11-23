// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export interface ThemeDef {
    colors: { brand: string; [slot: string]: string };
    seedFit?: Record<string, 'shift' | 'keep'>;
    primary?: string;
    states?: Record<string, string>;
    fonts?: Partial<Record<'sans' | 'mono' | 'display', string>>;
    radius?: Record<string, string>;
    cornerShape?: 'round' | 'squircle';
    borderWidths?: Record<string, string>;
    blurs?: Record<string, string>;
    zIndex?: Record<string, string>;
    opacities?: Record<string, string>;
    screens?: Record<string, string>;
    components?: Record<string, Record<string, string>>;
    focusRing?: string;
    contrastThreshold?: string;
    spotlight?: { light?: string; dark?: string };
    spacing?: {
        gaps?: Record<string, string>;
        spaces?: Record<string, string>;
    };
    shadows?: Record<string, string>;
    motion?: { durations?: Record<string, string>; loops?: Record<string, string>; iterations?: Record<string, string>; easings?: Record<string, string> };
    semantic?: Partial<Record<'heading' | 'copy' | 'subtle' | 'label' | 'btn', string>>;
    neutral?: {
        tint?: {
            c: number;
            h: number;
        };
        light?: Partial<Record<'gray' | 'background' | 'grayAlpha' | 'overlay', Record<string, string>>>;
        dark?: Partial<Record<'gray' | 'background' | 'grayAlpha' | 'overlay', Record<string, string>>>;
        /** Blanco y negro fijos (`--color-white`, `--color-black`): el mismo valor en claro y en oscuro, sin tinte ni P3. */
        fixed?: Partial<Record<'white' | 'black', string>>;
    };
    material?: {
        light?: {
            bg?: string;
            border?: string;
            shadowRgb?: string;
        };
        dark?: {
            bg?: string;
            border?: string;
            shadowRgb?: string;
        };
    };
    locked?: boolean;
}
export interface ThemeEntry {
    name: string;
    group: 'root' | 'frontend';
    def: ThemeDef;
}
