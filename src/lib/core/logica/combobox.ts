// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import type { SelectOption } from './select';
import { buildGroups, filterOptions } from './select';

export function exactMatch(options: SelectOption[], term: string): SelectOption | undefined {
    const q = term.trim().toLowerCase();
    if (!q) return undefined;
    return options.find((o) => o.label.toLowerCase() === q);
}

export function resolveCommit(
    options: SelectOption[],
    term: string,
    allowCustom: boolean,
): string | null {
    const trimmed = term.trim();
    if (!trimmed) return '';
    const match = exactMatch(options, trimmed);
    if (match) return match.value;
    return allowCustom ? trimmed : null;
}

export function resolveMultipleCommit(
    options: SelectOption[],
    term: string,
    allowCustom: boolean,
    selected: string[],
): string | null {
    const value = resolveCommit(options, term, allowCustom);
    return value && !selected.includes(value) ? value : null;
}

export function removesLastOnBackspace(key: string, text: string, count: number, readonly = false): boolean {
    return key === 'Backspace' && text === '' && count > 0 && !readonly;
}

export const TAG_LABEL_PLACEHOLDER = '{nombre}';

export const BLUR_COMMIT_MS = 120;

export type ComboboxKeyAction = 'open' | 'next' | 'prev' | 'choose' | 'commit' | 'revert';

export function comboboxKeyAction(
    key: string,
    open: boolean,
    hasActive: boolean,
    readonly = false,
): ComboboxKeyAction | null {
    if (readonly) return null;
    switch (key) {
        case 'ArrowDown':
            return open ? 'next' : 'open';
        case 'ArrowUp':
            return open ? 'prev' : 'open';
        case 'Enter':
            return open && hasActive ? 'choose' : 'commit';
        case 'Escape':
            return open ? 'revert' : null;
        case 'Tab':
            return open ? 'commit' : null;
        default:
            return null;
    }
}

export function initialActiveIndex(values: string[], selected: string): number {
    const i = selected === '' ? -1 : values.indexOf(selected);
    return i >= 0 ? i : values.length > 0 ? 0 : -1;
}

export function keepsInputFocus(pointerType: string): boolean {
    return pointerType !== 'touch';
}

export function groupsWithMatches(options: SelectOption[], term: string): Set<string> {
    return new Set(buildGroups(filterOptions(options, term)).map((g) => g.name ?? ''));
}

export function panelIndicators(optionCount: number, loading: boolean): { loading: boolean; empty: boolean } {
    return { loading, empty: !loading && optionCount === 0 };
}
