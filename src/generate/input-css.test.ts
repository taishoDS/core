// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(__dirname, '../lib/css/components.css'), 'utf8');
const input = css.match(/@utility ts-input \{\n([\s\S]*?)\n\}\n/)?.[1] ?? '';

describe('Input: radios de los extremos por clase de slot', () => {
    it('no usa :last-child, que dependía del markup de cada puerta', () => {
        expect(input).not.toContain(':last-child');
    });

    it('el campo redondea el extremo final cuando ningún slot visible lo sigue', () => {
        expect(input).toContain('.ts-input-field:not(:has(~ .ts-input-suffix-block, ~ .ts-input-kbd-block, ~ .ts-input-actions:has(> :not([hidden]))))');
    });
});
