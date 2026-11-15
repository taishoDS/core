// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addDays(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameMonth(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isDisabled(d: Date, min?: Date | null, max?: Date | null): boolean {
    const day = startOfDay(d).getTime();
    if (min && day < startOfDay(min).getTime()) return true;
    if (max && day > startOfDay(max).getTime()) return true;
    return false;
}

export interface DayMark {
    date: Date;
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'info' | 'danger';
}

export interface UnavailableSources {
    min?: Date | null;
    max?: Date | null;
    dates?: readonly Date[] | null;
    weekdays?: readonly number[] | null;
    fn?: ((d: Date) => boolean) | null;
}

export function isUnavailable(d: Date, { min, max, dates, weekdays, fn }: UnavailableSources = {}): boolean {
    return (
        isDisabled(d, min, max) ||
        !!weekdays?.includes(d.getDay()) ||
        !!dates?.some((x) => isSameDay(x, d)) ||
        !!fn?.(startOfDay(d))
    );
}

export function marksOn(d: Date, marks?: readonly DayMark[] | null): DayMark[] {
    return marks ? marks.filter((m) => isSameDay(m.date, d)) : [];
}

export const marksText = (marks: readonly DayMark[]): string => marks.map((m) => m.label).join(', ');

export function labelWithMarks(base: string, marks: readonly DayMark[]): string {
    return marks.length ? `${base}, ${marksText(marks)}` : base;
}

export interface DateRange {
    start: Date;
    end: Date;
}

export function orderRange(a: Date, b: Date): DateRange {
    const x = startOfDay(a);
    const y = startOfDay(b);
    return x.getTime() <= y.getTime() ? { start: x, end: y } : { start: y, end: x };
}

export function rangeState(d: Date, r: DateRange | null | undefined): { start: boolean; end: boolean; between: boolean } {
    if (!r) return { start: false, end: false, between: false };
    const t = startOfDay(d).getTime();
    const a = r.start.getTime();
    const b = r.end.getTime();
    return { start: t === a, end: t === b, between: t > a && t < b };
}

export function formatDisplayRange(r: DateRange, locale: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).formatRange(r.start, r.end);
}

export const serializeRange = (r: DateRange): string => `${toIsoDate(r.start)}/${toIsoDate(r.end)}`;

export function parseRange(s: string | null | undefined): DateRange | null {
    const [a, b] = (s ?? '').split('/');
    const start = parseIsoDate(a);
    const end = parseIsoDate(b);
    return start && end ? orderRange(start, end) : null;
}

export type DatePresetKey = 'today' | 'last-7-days' | 'last-30-days' | 'this-week' | 'this-month' | 'last-month';

export interface DatePreset {
    label: string;
    value: Date | DateRange | DatePresetKey;
}

export function resolvePreset(key: string, hoy: Date, weekStartsOn: 0 | 1 = 1): Date | DateRange | null {
    const d = startOfDay(hoy);
    const mes = (n: number): DateRange => ({ start: new Date(d.getFullYear(), d.getMonth() + n, 1), end: new Date(d.getFullYear(), d.getMonth() + n + 1, 0) });
    switch (key) {
        case 'today':
            return d;
        case 'last-7-days':
            return { start: addDays(d, -6), end: d };
        case 'last-30-days':
            return { start: addDays(d, -29), end: d };
        case 'this-week': {
            const inicio = addDays(d, -((d.getDay() - weekStartsOn + 7) % 7));
            return { start: inicio, end: addDays(inicio, 6) };
        }
        case 'this-month':
            return mes(0);
        case 'last-month':
            return mes(-1);
        default:
            return null;
    }
}

export function resolvePresetValue(v: DatePreset['value'], range: boolean, hoy: Date, weekStartsOn: 0 | 1 = 1): Date | DateRange | null {
    const r = typeof v === 'string' ? resolvePreset(v, hoy, weekStartsOn) : v;
    if (!r) return null;
    const rango = r instanceof Date ? { start: startOfDay(r), end: startOfDay(r) } : orderRange(r.start, r.end);
    return range ? rango : r instanceof Date ? startOfDay(r) : null;
}

export function resolvePresetAttr(s: string | null | undefined, range: boolean, hoy: Date, weekStartsOn: 0 | 1 = 1): Date | DateRange | null {
    const v = (s ?? '').includes('/') ? parseRange(s) : parseIsoDate(s) ?? (s as DatePresetKey);
    return v ? resolvePresetValue(v, range, hoy, weekStartsOn) : null;
}

export function presetAvailable(v: Date | DateRange, src: UnavailableSources): boolean {
    const r = v instanceof Date ? { start: v, end: v } : v;
    return !isUnavailable(r.start, src) && !isUnavailable(r.end, src);
}

export function parseIsoDate(s: string | null | undefined): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

export function parseDates(s: string | null | undefined): Date[] {
    return (s ?? '').split(/\s+/).map(parseIsoDate).filter((d): d is Date => !!d);
}

export function parseWeekdays(s: string | null | undefined): number[] {
    return (s ?? '').split(/\s+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

export function parseMarks(s: string | null | undefined): DayMark[] {
    let raw: unknown;
    try {
        raw = JSON.parse(s || '[]');
    } catch {
        return [];
    }
    const out: DayMark[] = [];
    if (Array.isArray(raw)) {
        for (const r of raw) {
            const date = parseIsoDate(r?.date);
            if (date && typeof r.label === 'string' && r.label) {
                out.push({ date, label: r.label, variant: /^[\w-]+$/.test(r.variant ?? '') ? r.variant : undefined });
            }
        }
    }
    return out;
}

export function buildMonthMatrix(displayMonth: Date, weekStartsOn: 0 | 1 = 1): Date[][] {
    const first = startOfMonth(displayMonth);
    const lead = (first.getDay() - weekStartsOn + 7) % 7;
    const gridStart = addDays(first, -lead);
    const weeks: Date[][] = [];
    for (let w = 0; w < 6; w++) {
        const week: Date[] = [];
        for (let d = 0; d < 7; d++) week.push(addDays(gridStart, w * 7 + d));
        weeks.push(week);
    }
    return weeks;
}

export function weekdayNames(locale: string, weekStartsOn: 0 | 1 = 1): string[] {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const base = new Date(2021, 7, 1);
    return Array.from({ length: 7 }, (_, i) => fmt.format(addDays(base, (i + weekStartsOn) % 7)));
}

export function formatDisplay(d: Date, locale: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
}

type ParteFecha = 'day' | 'month' | 'year';

const formatosNumericos = new Map<string, { fmt: Intl.DateTimeFormat; orden: ParteFecha[] }>();

function numerico(locale: string) {
    let f = formatosNumericos.get(locale);
    if (!f) {
        const fmt = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', numberingSystem: 'latn', calendar: 'gregory' });
        const orden = fmt.formatToParts(new Date(2000, 0, 1)).flatMap((p) => (p.type === 'day' || p.type === 'month' || p.type === 'year' ? [p.type] : []));
        f = { fmt, orden };
        formatosNumericos.set(locale, f);
    }
    return f;
}

const MARCAS_BIDI = /[\u200e\u200f\u061c]/g;

export function formatInput(d: Date, locale: string): string {
    return numerico(locale).fmt.format(d).replace(MARCAS_BIDI, '');
}

export interface DateSegments {
    day: string;
    month: string;
    year: string;
}

export function datePattern(locale: string, seg: DateSegments): string {
    return numerico(locale)
        .fmt.formatToParts(new Date(2000, 0, 1))
        .map((p) => (p.type === 'day' || p.type === 'month' || p.type === 'year' ? seg[p.type] : p.type === 'literal' ? p.value : ''))
        .join('')
        .replace(MARCAS_BIDI, '');
}

export function parseDate(text: string, locale: string): Date | null {
    const limpio = text.replace(MARCAS_BIDI, '').trim();
    if (!/^[\d\s/.-]+$/.test(limpio)) return null;
    const n = limpio.split(/[\s/.-]+/).filter(Boolean);
    if (n.length !== 3) return null;
    const iso = /^\d{4}-\d{1,2}-\d{1,2}$/.test(limpio);
    const orden = iso ? (['year', 'month', 'day'] as const) : numerico(locale).orden;
    const parte = (p: ParteFecha) => n[orden.indexOf(p)];
    const [d, m, y] = [parte('day'), parte('month'), parte('year')];
    if (d.length > 2 || m.length > 2 || y.length !== 4) return null;
    const fecha = new Date(+y, +m - 1, +d);
    return fecha.getFullYear() === +y && fecha.getMonth() === +m - 1 && fecha.getDate() === +d ? fecha : null;
}

export function resolveTyped(text: string, locale: string, src: UnavailableSources = {}): Date | null | undefined {
    if (!text.trim()) return null;
    const d = parseDate(text, locale);
    return d && !isUnavailable(d, src) ? d : undefined;
}

export function resolveTypedRange(start: string, end: string, locale: string, src: UnavailableSources = {}): DateRange | null | undefined {
    if (!start.trim() && !end.trim()) return null;
    const a = resolveTyped(start, locale, src);
    const b = resolveTyped(end, locale, src);
    return a && b ? orderRange(a, b) : undefined;
}

export function toIsoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const formatosCompletos = new Map<string, Intl.DateTimeFormat>();

export function formatFull(d: Date, locale: string): string {
    let fmt = formatosCompletos.get(locale);
    if (!fmt) {
        fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'full' });
        formatosCompletos.set(locale, fmt);
    }
    return fmt.format(d);
}

export function addMonthsKeepDay(d: Date, n: number): Date {
    const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
}

export function monthYearLabel(displayMonth: Date, locale: string): string {
    const s = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(displayMonth);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function moveFocusByKey(
    key: string,
    focused: Date,
    weekStartsOn: 0 | 1 = 1,
    rtl = false,
    shift = false,
): Date | null {
    const fromWeekStart = (focused.getDay() - weekStartsOn + 7) % 7;
    switch (key) {
        case 'ArrowLeft':
            return addDays(focused, rtl ? 1 : -1);
        case 'ArrowRight':
            return addDays(focused, rtl ? -1 : 1);
        case 'ArrowUp':
            return addDays(focused, -7);
        case 'ArrowDown':
            return addDays(focused, 7);
        case 'Home':
            return addDays(focused, -fromWeekStart);
        case 'End':
            return addDays(focused, 6 - fromWeekStart);
        case 'PageUp':
            return addMonthsKeepDay(focused, shift ? -12 : -1);
        case 'PageDown':
            return addMonthsKeepDay(focused, shift ? 12 : 1);
        default:
            return null;
    }
}

export function normalizeVisibleMonths(n: number | null | undefined): number {
    return Math.max(1, Math.trunc(n ?? 1) || 1);
}

export function visibleMonthList(first: Date, n: number): Date[] {
    return Array.from({ length: n }, (_, i) => new Date(first.getFullYear(), first.getMonth() + i, 1));
}

const mesesDesde = (display: Date, d: Date) => (d.getFullYear() - display.getFullYear()) * 12 + d.getMonth() - display.getMonth();

export function displayForFocus(display: Date, focused: Date, n = 1): Date {
    const desde = mesesDesde(display, focused);
    if (desde < 0) return startOfMonth(focused);
    if (desde >= n) return new Date(focused.getFullYear(), focused.getMonth() + 1 - n, 1);
    return display;
}

export function focusInView(focused: Date, display: Date, n = 1): Date {
    const desde = mesesDesde(display, focused);
    if (desde >= 0 && desde < n) return focused;
    const ultimo = new Date(display.getFullYear(), display.getMonth() + 1, 0).getDate();
    return new Date(display.getFullYear(), display.getMonth(), Math.min(focused.getDate(), ultimo));
}

export function monthRangeLabel(first: Date, last: Date, locale: string): string {
    const s = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).formatRange(first, last);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface CaptionOption {
    value: string;
    label: string;
    disabled: boolean;
}

export function monthOptions(year: number, locale: string, min?: Date | null, max?: Date | null): CaptionOption[] {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short' });
    return Array.from({ length: 12 }, (_, m) => {
        const s = fmt.format(new Date(year, m, 1)).replace(/\.$/, '');
        const fin = new Date(year, m + 1, 0);
        return {
            value: String(m),
            label: s.charAt(0).toUpperCase() + s.slice(1),
            disabled: (!!min && fin.getTime() < startOfDay(min).getTime()) || (!!max && new Date(year, m, 1).getTime() > startOfDay(max).getTime()),
        };
    });
}

export function yearOptions(display: Date, hoy: Date, min?: Date | null, max?: Date | null): CaptionOption[] {
    const y = display.getFullYear();
    const desde = Math.min(y, min?.getFullYear() ?? hoy.getFullYear() - 100);
    const hasta = Math.max(y, max?.getFullYear() ?? hoy.getFullYear() + 10);
    return Array.from({ length: hasta - desde + 1 }, (_, i) => ({ value: String(desde + i), label: String(desde + i), disabled: false }));
}

export function clampMonth(d: Date, min?: Date | null, max?: Date | null): Date {
    if (min && new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime() < startOfDay(min).getTime()) return startOfMonth(min);
    if (max && d.getTime() > startOfDay(max).getTime()) return startOfMonth(max);
    return startOfMonth(d);
}

export function isoWeek(d: Date): number {
    const lunesBase = (x: Date) => (x.getDay() + 6) % 7;
    const jueves = addDays(d, 3 - lunesBase(d));
    const enero4 = new Date(jueves.getFullYear(), 0, 4);
    const primerJueves = addDays(enero4, 3 - lunesBase(enero4));
    return 1 + Math.round((jueves.getTime() - primerJueves.getTime()) / (7 * 86400000));
}

export function weekNumberOfRow(week: readonly Date[]): number {
    return isoWeek(week.find((d) => d.getDay() === 4) ?? week[0]);
}

export type HourCycle = 12 | 24;

export function resolveHourCycle(cycle: HourCycle | null | undefined, locale: string): HourCycle {
    if (cycle === 12 || cycle === 24) return cycle;
    return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 ? 12 : 24;
}

const dos = (n: number) => String(n).padStart(2, '0');

export function toIsoDateTime(d: Date): string {
    return `${toIsoDate(d)}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function parseIsoDateTime(s: string | null | undefined): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(s ?? '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0)) : null;
}

export function withTime(d: Date, hours: number, minutes: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes);
}

export function clampDateTime(d: Date, min?: Date | null, max?: Date | null): Date {
    if (min && d.getTime() < min.getTime()) return new Date(min.getTime());
    if (max && d.getTime() > max.getTime()) return new Date(max.getTime());
    return d;
}

export function to12Hour(hours: number): { hour: number; pm: boolean } {
    return { hour: hours % 12 || 12, pm: hours >= 12 };
}

export function from12Hour(hour: number, pm: boolean): number {
    return (hour % 12) + (pm ? 12 : 0);
}

export function dayPeriodLabels(locale: string): { am: string; pm: string } {
    const de = (h: number) => new Intl.DateTimeFormat(locale, { hour: 'numeric', hourCycle: 'h12' }).formatToParts(new Date(2000, 0, 1, h)).find((p) => p.type === 'dayPeriod')?.value ?? (h < 12 ? 'AM' : 'PM');
    return { am: de(9), pm: de(15) };
}

export function formatDisplayDateTime(d: Date, locale: string, cycle: HourCycle): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', hourCycle: cycle === 12 ? 'h12' : 'h23' }).format(d);
}

export function formatInputDateTime(d: Date, locale: string, cycle: HourCycle): string {
    const f = formatInput(d, locale);
    if (cycle === 24) return `${f} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
    const { hour, pm } = to12Hour(d.getHours());
    return `${f} ${dos(hour)}:${dos(d.getMinutes())} ${pm ? 'PM' : 'AM'}`;
}

export function dateTimePattern(locale: string, seg: DateSegments, cycle: HourCycle): string {
    return `${datePattern(locale, seg)} hh:mm${cycle === 12 ? ' AM' : ''}`;
}

export function parseDateTime(text: string, locale: string): Date | null {
    const m = /^(.*?)(?:[\s,T]+(\d{1,2}):(\d{2})\s*([ap])?\.?\s*(?:m\.?)?)?$/i.exec(text.replace(MARCAS_BIDI, '').trim());
    const dia = m && parseDate(m[1], locale);
    if (!m || !dia) return null;
    if (m[2] === undefined) return dia;
    const [h, min] = [+m[2], +m[3]];
    if (min > 59 || (m[4] ? h < 1 || h > 12 : h > 23)) return null;
    return withTime(dia, m[4] ? from12Hour(h, m[4].toLowerCase() === 'p') : h, min);
}

export function resolveTypedDateTime(text: string, locale: string, src: UnavailableSources = {}): Date | null | undefined {
    if (!text.trim()) return null;
    const d = parseDateTime(text, locale);
    return d && !isUnavailable(d, src) && d.getTime() === clampDateTime(d, src.min, src.max).getTime() ? d : undefined;
}
