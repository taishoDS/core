// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import {
    buildMonthMatrix,
    clampDateTime,
    clampMonth,
    dateTimePattern,
    dayPeriodLabels,
    formatDisplayDateTime,
    formatInputDateTime,
    from12Hour,
    parseIsoDateTime,
    resolveHourCycle,
    resolveTypedDateTime,
    to12Hour,
    toIsoDateTime,
    withTime,
    datePattern,
    monthOptions,
    yearOptions,
    displayForFocus,
    focusInView,
    monthRangeLabel,
    normalizeVisibleMonths,
    visibleMonthList,
    weekNumberOfRow,
    formatDisplay,
    formatDisplayRange,
    formatFull,
    formatInput,
    isSameDay,
    isSameMonth,
    isUnavailable,
    labelWithMarks,
    marksOn,
    marksText,
    monthYearLabel,
    moveFocusByKey,
    orderRange,
    parseDates,
    parseMarks,
    parseRange,
    parseWeekdays,
    presetAvailable,
    rangeState,
    resolvePresetAttr,
    resolveTyped,
    resolveTypedRange,
    serializeRange,
    startOfDay,
    toIsoDate,
    weekdayNames,
    type CaptionOption,
    type DateRange,
} from './logica/date-picker';
import { showClearButton } from './logica/input';
import { setVars } from './vars';
import { P, avisar, claseDS } from './dom';
import type { TsChangeDetail } from './eventos';
import { localeDe } from './textos';
import { fijar as fijarNumero } from './number-input';

const DATEPICKER = '.ts.datepicker';
const CAMPO = '.ts.datepicker-field';
const VALOR = '.ts.datepicker-value';
const DISPARADOR = '.ts.datepicker-trigger';

const iso = toIsoDate;

function desdeIso(s: string | null): Date | null {
    if (!s) return null;
    if (s.includes('T')) return parseIsoDateTime(s);
    const [a, m, d] = s.split('-').map(Number);
    return Number.isFinite(a) && Number.isFinite(m) && Number.isFinite(d)
        ? new Date(a, m - 1, d)
        : null;
}

const leerFecha = (raiz: HTMLElement, attr: string) => desdeIso(raiz.getAttribute(P + attr));

const conHora = (raiz: HTMLElement) => raiz.getAttribute(`${P}granularity`) === 'minute' && !raiz.hasAttribute(`${P}range`);
const cicloDe = (raiz: HTMLElement) => resolveHourCycle(Number(raiz.getAttribute(`${P}hour-cycle`)) as 12 | 24, raiz.getAttribute(`${P}locale`) ?? localeDe(raiz));
const conHoraVigente = (raiz: HTMLElement, dia: Date) => {
    const d = diaDe(raiz);
    return toIsoDateTime(clampDateTime(withTime(dia, d?.getHours() ?? 0, d?.getMinutes() ?? 0), leerFecha(raiz, 'min'), leerFecha(raiz, 'max')));
};

const esRango = (raiz: HTMLElement) => raiz.hasAttribute(`${P}range`);
const rangoDe = (raiz: HTMLElement): DateRange | null => (esRango(raiz) ? parseRange(raiz.getAttribute(`${P}value`)) : null);
const diaDe = (raiz: HTMLElement) => (esRango(raiz) ? null : leerFecha(raiz, 'value'));

function marcarRango(b: HTMLElement, dia: Date, r: DateRange | null, previa: boolean): void {
    const e = rangeState(dia, r);
    b.classList.toggle('is-selected', e.start || e.end);
    b.classList.toggle('is-range-start', e.start);
    b.classList.toggle('is-range-end', e.end);
    b.classList.toggle('is-in-range', e.between && !previa);
    b.classList.toggle('is-range-preview', e.between && previa);
    b.setAttribute('aria-selected', String(e.start || e.end || e.between));
}

function anunciar(raiz: HTMLElement): void {
    const estado = raiz.querySelector(`[${P}date-status]`);
    const ancla = leerFecha(raiz, 'anchor');
    if (estado) {
        estado.textContent = ancla
            ? (estado.getAttribute(`${P}end-text`) ?? '').replace('{start}', formatFull(ancla, raiz.getAttribute(`${P}locale`) ?? localeDe(raiz)))
            : '';
    }
}

function previsualizar(raiz: HTMLElement, ancla: Date, hasta: Date): void {
    const r = orderRange(ancla, hasta);
    for (const b of raiz.querySelectorAll<HTMLElement>(`[${P}date-day]`)) {
        marcarRango(b, desdeIso(b.getAttribute(`${P}value`))!, r, true);
    }
}

export function alApuntar(destino: Element): void {
    const raiz = destino.closest<HTMLElement>(`[${P}date-picker]`);
    const ancla = raiz && leerFecha(raiz, 'anchor');
    if (!raiz || !ancla) return;
    const dia = destino.closest(`[${P}date-day]`);
    previsualizar(raiz, ancla, desdeIso(dia?.getAttribute(`${P}value`) ?? null) ?? leerFecha(raiz, 'focused') ?? ancla);
}

const mesesDe = (raiz: HTMLElement) => normalizeVisibleMonths(Number(raiz.getAttribute(`${P}visible-months`)));
const zonaDias = (raiz: HTMLElement) => raiz.querySelector<HTMLElement>(`[${P}date-months], [${P}date-grid]`);

const MOLDE_VISTO = new WeakMap<HTMLElement, string>();

function rellenarSelector(disparador: HTMLElement, opciones: CaptionOption[], valor: string): void {
    const lista = disparador.closest<HTMLElement>(`[${P}listbox]`);
    const panel = lista?.querySelector<HTMLElement>('[role="listbox"]');
    const molde = panel?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    if (!lista || !panel || !molde) return;
    const clave = `${valor}|${opciones.map((o) => `${o.value}:${o.disabled}`).join()}`;
    if (MOLDE_VISTO.get(lista) === clave) return;
    MOLDE_VISTO.set(lista, clave);
    const nuevas = opciones.map((o, i) => {
        const elegida = o.value === valor;
        const n = molde.cloneNode(true) as HTMLButtonElement;
        n.id = `${panel.id}-opt-${i}`;
        n.setAttribute(`${P}value`, o.value);
        n.setAttribute('aria-selected', String(elegida));
        n.setAttribute('aria-disabled', String(o.disabled));
        n.classList.toggle('is-selected', elegida);
        n.classList.toggle('is-disabled', o.disabled);
        n.disabled = o.disabled;
        n.querySelector('[data-select-option-label]')!.textContent = o.label;
        if (!elegida) n.querySelector('[data-select-option-check]')?.remove();
        return n;
    });
    for (const o of panel.querySelectorAll('[role="option"]')) o.remove();
    panel.append(...nuevas);
    const etiqueta = lista.querySelector(`[${P}listbox-label]`);
    if (etiqueta) etiqueta.textContent = opciones.find((o) => o.value === valor)?.label ?? '';
}

function pintarSelectores(raiz: HTMLElement, mes: Date, locale: string): void {
    const parte = (nombre: string) => raiz.querySelector<HTMLElement>(`[${P}date-caption="${nombre}"]`);
    const [meses, anios] = [parte('month'), parte('year')];
    if (!meses || !anios) return;
    const min = leerFecha(raiz, 'min');
    const max = leerFecha(raiz, 'max');
    rellenarSelector(meses, monthOptions(mes.getFullYear(), locale, min, max), String(mes.getMonth()));
    rellenarSelector(anios, yearOptions(mes, new Date(), min, max), String(mes.getFullYear()));
}

function pintarHora(raiz: HTMLElement, locale: string): void {
    if (!conHora(raiz)) return;
    const d = diaDe(raiz);
    const ciclo = cicloDe(raiz);
    const h = d?.getHours() ?? 0;
    const campo = (parte: string) => raiz.querySelector<HTMLInputElement>(`input[${P}date-time="${parte}"]`);
    for (const [parte, valor] of [['hour', ciclo === 12 ? to12Hour(h).hour : h], ['minute', d?.getMinutes() ?? 0]] as const) {
        const input = campo(parte);
        const caja = input?.closest<HTMLElement>(`[${P}number]`);
        if (!input || !caja) continue;
        input.disabled = !d;
        fijarNumero(caja, valor);
    }
    const periodo = raiz.querySelector<HTMLButtonElement>(`button[${P}date-time="period"]`);
    if (periodo) {
        periodo.disabled = !d;
        const { am, pm } = dayPeriodLabels(locale);
        rellenarSelector(periodo, [{ value: 'am', label: am, disabled: false }, { value: 'pm', label: pm, disabled: false }], to12Hour(h).pm ? 'pm' : 'am');
    }
}

function cambiarHora(raiz: HTMLElement, parte: string, dato: string | number): void {
    const d = diaDe(raiz);
    if (!d) return;
    const ciclo = cicloDe(raiz);
    let [h, m] = [d.getHours(), d.getMinutes()];
    if (parte === 'hour') h = ciclo === 12 ? from12Hour(Number(dato), to12Hour(h).pm) : Number(dato);
    else if (parte === 'minute') m = Number(dato);
    else h = from12Hour(to12Hour(h).hour, dato === 'pm');
    const v = clampDateTime(withTime(d, h, m), leerFecha(raiz, 'min'), leerFecha(raiz, 'max'));
    if (v.getTime() !== d.getTime()) confirmar(raiz, toIsoDateTime(v), iso(v));
    queueMicrotask(() => pintar(raiz));
}

function celdaDow(nombre: string, texto: string): HTMLElement {
    const dow = document.createElement('span');
    dow.className = claseDS('calendar-dow');
    dow.setAttribute('role', 'columnheader');
    dow.setAttribute('aria-label', nombre);
    dow.textContent = texto;
    return dow;
}

function celdasDow(raiz: HTMLElement, locale: string, semana0: 0 | 1): HTMLElement[] {
    const dias = weekdayNames(locale, semana0).map((n) => celdaDow(n, n));
    if (!raiz.hasAttribute(`${P}week-numbers`)) return dias;
    return [celdaDow(raiz.getAttribute(`${P}week-column`) ?? '', raiz.getAttribute(`${P}week-short`) ?? ''), ...dias];
}

function celdaSemana(raiz: HTMLElement, semana: Date[], conDias: boolean): HTMLElement {
    const celda = document.createElement('span');
    celda.className = claseDS('calendar-week-number');
    celda.setAttribute('role', conDias ? 'rowheader' : 'gridcell');
    if (conDias) {
        const n = String(weekNumberOfRow(semana));
        celda.setAttribute('aria-label', (raiz.getAttribute(`${P}week-numbers`) ?? '').replace('{n}', n));
        celda.textContent = n;
    }
    return celda;
}

const inicioSemana = (raiz: HTMLElement): 0 | 1 => (raiz.getAttribute(`${P}week-start`) === '0' ? 0 : 1);

const reglas = new WeakMap<HTMLElement, (d: Date) => boolean>();

const bloqueado = (dia: Element) => dia.getAttribute('aria-disabled') === 'true';

const fuentesDe = (raiz: HTMLElement) => ({
    min: leerFecha(raiz, 'min'),
    max: leerFecha(raiz, 'max'),
    dates: parseDates(raiz.getAttribute(`${P}disabled-dates`)),
    weekdays: parseWeekdays(raiz.getAttribute(`${P}disabled-weekdays`)),
    fn: reglas.get(raiz),
});

function sincronizarAtajos(raiz: HTMLElement): void {
    const fuentes = fuentesDe(raiz);
    for (const b of raiz.closest('[popover]')?.querySelectorAll(`[${P}date-preset]`) ?? []) {
        const v = resolvePresetAttr(b.getAttribute(`${P}date-preset`), esRango(raiz), new Date(), inicioSemana(raiz));
        b.setAttribute('aria-disabled', String(!v || !presetAvailable(v, fuentes)));
    }
}

function enfocadaDeHoy(mes: Date, cantidad: number): Date {
    return focusInView(startOfDay(new Date()), mes, cantidad);
}

export function pintar(raiz: HTMLElement): void {
    const zona = zonaDias(raiz);
    if (!zona) return;

    const locale = raiz.getAttribute(`${P}locale`) ?? localeDe(raiz);
    const enRango = esRango(raiz);
    const rango = rangoDe(raiz);
    const seleccionada = diaDe(raiz);
    const ancla = leerFecha(raiz, 'anchor');
    const mes = leerFecha(raiz, 'month') ?? rango?.start ?? seleccionada ?? startOfDay(new Date());
    const cantidad = mesesDe(raiz);
    const varios = cantidad > 1;
    const meses = visibleMonthList(mes, cantidad);
    const enfocada = leerFecha(raiz, 'focused') ?? (varios ? focusInView(rango?.start ?? seleccionada ?? startOfDay(new Date()), mes, cantidad) : (rango?.start ?? seleccionada ?? enfocadaDeHoy(mes, cantidad)));
    const tramo = ancla ? orderRange(ancla, enfocada) : rango;
    const hoy = startOfDay(new Date());
    const semana0 = inicioSemana(raiz);
    const fuentes = fuentesDe(raiz);
    const marcas = parseMarks(raiz.getAttribute(`${P}day-marks`));

    const titulo = raiz.querySelector<HTMLElement>(`[${P}date-title]`);
    const rotulo = varios ? monthRangeLabel(meses[0], meses[cantidad - 1], locale) : monthYearLabel(mes, locale);
    if (titulo) titulo.textContent = rotulo;
    raiz.setAttribute('aria-label', rotulo);
    raiz.querySelector('[role="grid"]')?.setAttribute('aria-label', rotulo);

    anunciar(raiz);
    sincronizarAtajos(raiz);
    pintarSelectores(raiz, mes, locale);
    pintarHora(raiz, locale);

    const cabecera = raiz.querySelector<HTMLElement>(`[${P}date-weekdays]`);
    if (cabecera && !cabecera.dataset.pintado) {
        cabecera.replaceChildren(...celdasDow(raiz, locale, semana0));
        cabecera.dataset.pintado = '1';
    }

    const filasDe = (mesDeLaGrilla: Date) =>
        buildMonthMatrix(mesDeLaGrilla, semana0).map((semana) => {
            const fila = document.createElement('div');
            fila.className = claseDS('calendar-week');
            fila.setAttribute('role', 'row');
            if (raiz.hasAttribute(`${P}week-numbers`)) {
                fila.appendChild(celdaSemana(raiz, semana, !varios || semana.some((d) => isSameMonth(d, mesDeLaGrilla))));
            }
            for (const dia of semana) {
                const deOtroMes = !isSameMonth(dia, mesDeLaGrilla);
                if (varios && deOtroMes) {
                    const vacia = document.createElement('span');
                    vacia.className = claseDS('calendar-day-empty');
                    vacia.setAttribute('role', 'gridcell');
                    fila.appendChild(vacia);
                    continue;
                }
                const b = document.createElement('button');
                b.type = 'button';
                b.className = claseDS('calendar-day');
                b.setAttribute('role', 'gridcell');
                b.setAttribute(`${P}date-day`, '');
                b.setAttribute(`${P}value`, iso(dia));
                b.textContent = String(dia.getDate());
                const delDia = marksOn(dia, marcas);
                b.setAttribute('aria-label', labelWithMarks(formatFull(dia, locale), delDia));
                if (delDia.length) {
                    b.title = marksText(delDia);
                    const punto = document.createElement('span');
                    punto.className = `${claseDS('calendar-day-mark')} variant-${delDia[0].variant ?? 'default'}`;
                    punto.setAttribute('aria-hidden', 'true');
                    b.append(punto);
                    b.classList.add('has-mark');
                }

                const bloqueada = isUnavailable(dia, fuentes);
                b.setAttribute('aria-disabled', String(bloqueada));
                b.classList.toggle('is-outside', deOtroMes);
                b.classList.toggle('is-today', isSameDay(dia, hoy));
                if (enRango) {
                    marcarRango(b, dia, tramo, !!ancla);
                } else {
                    b.classList.toggle('is-selected', isSameDay(dia, seleccionada));
                    b.setAttribute('aria-selected', String(isSameDay(dia, seleccionada)));
                }
                b.tabIndex = isSameDay(dia, enfocada) ? 0 : -1;
                if (isSameDay(dia, enfocada)) b.setAttribute(`${P}autofocus`, '');
                fila.appendChild(b);
            }
            return fila;
        });

    if (!varios) {
        zona.replaceChildren(...filasDe(mes));
        return;
    }
    zona.replaceChildren(
        ...meses.map((m) => {
            const bloque = document.createElement('div');
            bloque.className = claseDS('calendar-month');
            const nombre = monthYearLabel(m, locale);
            const titulo2 = document.createElement('span');
            titulo2.className = claseDS('calendar-month-title');
            titulo2.setAttribute('aria-hidden', 'true');
            titulo2.textContent = nombre;
            const rejilla = document.createElement('div');
            rejilla.className = claseDS('calendar-grid');
            rejilla.setAttribute('role', 'grid');
            rejilla.setAttribute('aria-label', nombre);
            rejilla.tabIndex = -1;
            if (raiz.hasAttribute(`${P}busy`)) rejilla.setAttribute('aria-busy', 'true');
            if (enRango) rejilla.setAttribute('aria-multiselectable', 'true');
            const dows = document.createElement('div');
            dows.className = claseDS('calendar-dow-row');
            dows.setAttribute('role', 'row');
            dows.append(...celdasDow(raiz, locale, semana0));
            rejilla.append(dows, ...filasDe(m));
            bloque.append(titulo2, rejilla);
            return bloque;
        }),
    );
}

function verMes(raiz: HTMLElement, nuevo: Date, anterior: Date): void {
    raiz.setAttribute(`${P}month`, iso(nuevo));
    const enfocada = leerFecha(raiz, 'focused') ?? rangoDe(raiz)?.start ?? diaDe(raiz) ?? enfocadaDeHoy(anterior, mesesDe(raiz));
    raiz.setAttribute(`${P}focused`, iso(focusInView(enfocada, nuevo, mesesDe(raiz))));
}

export function alCambiarSelector(e: Event): void {
    const lista = e.target instanceof Element ? e.target : null;
    const raiz = lista?.closest<HTMLElement>(`[${P}date-picker]`);
    if (!lista || !raiz) return;
    const dato = (e as CustomEvent<{ value: string | number }>).detail.value;
    const parteHora = lista.querySelector(`[${P}date-time]`)?.getAttribute(`${P}date-time`);
    if (parteHora) {
        e.stopImmediatePropagation();
        cambiarHora(raiz, parteHora, dato);
        return;
    }
    const parte = lista.querySelector(`[${P}date-caption]`)?.getAttribute(`${P}date-caption`);
    if (!parte) return;
    e.stopImmediatePropagation();
    const valor = Number(dato);
    const mes = leerFecha(raiz, 'month') ?? rangoDe(raiz)?.start ?? diaDe(raiz) ?? startOfDay(new Date());
    const elegido = parte === 'month' ? new Date(mes.getFullYear(), valor, 1) : new Date(valor, mes.getMonth(), 1);
    verMes(raiz, clampMonth(elegido, leerFecha(raiz, 'min'), leerFecha(raiz, 'max')), mes);
    queueMicrotask(() => pintar(raiz));
}

function irAlMes(raiz: HTMLElement, delta: number): void {
    const mes = leerFecha(raiz, 'month') ?? rangoDe(raiz)?.start ?? diaDe(raiz) ?? startOfDay(new Date());
    verMes(raiz, new Date(mes.getFullYear(), mes.getMonth() + delta, 1), mes);
    pintar(raiz);
}

function elegir(raiz: HTMLElement, dia: string): void {
    recordar(raiz);
    let valor = dia;
    if (esRango(raiz)) {
        const ancla = leerFecha(raiz, 'anchor');
        if (!ancla) {
            raiz.setAttribute(`${P}anchor`, dia);
            raiz.setAttribute(`${P}focused`, dia);
            repintarConFoco(raiz, dia);
            return;
        }
        valor = serializeRange(orderRange(ancla, desdeIso(dia)!));
    } else if (conHora(raiz)) {
        valor = conHoraVigente(raiz, desdeIso(dia)!);
    }
    confirmar(raiz, valor, dia);
}

function confirmar(raiz: HTMLElement, valor: string, dia: string): void {
    if (!avisar(raiz, detalle(raiz, valor))) return;
    raiz.removeAttribute(`${P}anchor`);
    raiz.setAttribute(`${P}value`, valor);
    raiz.setAttribute(`${P}focused`, dia);
    const enlazados = enlaces(raiz);
    const campo = raiz.querySelector<HTMLInputElement>(`[${P}date-input]`);
    if (campo) {
        campo.value = valor;
        campo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (enlazados) {
        confirmarEnDisparador(raiz, valor, enlazados);
        sincronizarEnvio(raiz);
        sincronizarLimpiar(raiz);
        if (!conHora(raiz)) return;
    }
    repintarConFoco(raiz, dia);
}

function elegirAtajo(boton: Element): void {
    const raiz = boton.closest('[popover]')?.querySelector<HTMLElement>(`[${P}date-picker]`);
    if (!raiz || bloqueado(boton)) return;
    const v = resolvePresetAttr(boton.getAttribute(`${P}date-preset`), esRango(raiz), new Date(), inicioSemana(raiz));
    if (!v) return;
    recordar(raiz);
    const valor = v instanceof Date ? (conHora(raiz) ? conHoraVigente(raiz, v) : iso(v)) : serializeRange(v);
    confirmar(raiz, valor, conHora(raiz) ? iso(v as Date) : valor.split('/')[0]);
}

function repintarConFoco(raiz: HTMLElement, dia: string): void {
    const conFoco = !!zonaDias(raiz)?.contains(document.activeElement);
    pintar(raiz);
    if (conFoco) raiz.querySelector<HTMLElement>(`[${P}date-day][${P}value="${dia}"]`)?.focus();
}

function detalle(raiz: HTMLElement, valor: string): TsChangeDetail {
    const [inicio, fin = ''] = valor.split('/');
    return { component: 'date-picker', value: valor, ...(esRango(raiz) ? { start: inicio, end: fin } : {}) };
}

function enlaces(raiz: HTMLElement) {
    const panel = raiz.closest<HTMLElement>('[popover]');
    if (!panel?.id) return null;
    const disparador = (raiz.getRootNode() as Document | ShadowRoot).querySelector<HTMLElement>(
        `[popovertarget="${CSS.escape(panel.id)}"]`,
    );
    if (!disparador) return null;
    const ocultos: HTMLInputElement[] = [];
    for (let h = panel.parentElement?.nextElementSibling; h instanceof HTMLInputElement && h.hasAttribute(`${P}date-input`); h = h.nextElementSibling) {
        ocultos.push(h);
    }
    const fin = (h: HTMLInputElement) => h.getAttribute(`${P}date-input`) === 'end';
    return { panel, disparador, oculto: ocultos.find((h) => !fin(h)) ?? null, ocultoFin: ocultos.find(fin) ?? null };
}

function escribirOcultos(e: NonNullable<ReturnType<typeof enlaces>>, valor: string): void {
    const [inicio, fin = ''] = valor.split('/');
    if (e.oculto) e.oculto.value = inicio;
    if (e.ocultoFin) e.ocultoFin.value = fin;
}

function confirmarEnDisparador(raiz: HTMLElement, valor: string, e: NonNullable<ReturnType<typeof enlaces>>): void {
    const locale = raiz.getAttribute(`${P}locale`) ?? localeDe(raiz);
    const rango = parseRange(valor);
    const fecha = rango ? null : desdeIso(valor);
    if (fecha || rango) {
        const texto = rango ? formatDisplayRange(rango, locale) : conHora(raiz) ? formatDisplayDateTime(fecha!, locale, cicloDe(raiz)) : formatDisplay(fecha!, locale);
        const campo = e.disparador.querySelector(VALOR);
        if (campo) campo.textContent = texto;
        e.disparador.classList.remove('is-placeholder');
        if (e.disparador.hasAttribute('aria-label')) e.disparador.setAttribute('aria-label', texto);
    }
    escribirOcultos(e, valor);
    sincronizarTexto(raiz);
    if (conHora(raiz)) return;
    try {
        e.panel.hidePopover();
    } catch {
    }
    e.disparador.focus();
}

function camposDe(raiz: HTMLElement): HTMLInputElement[] {
    return [...(raiz.closest(DATEPICKER)?.querySelectorAll<HTMLInputElement>(`[${P}date-text]`) ?? [])];
}

function sincronizarTexto(raiz: HTMLElement): void {
    const [ini, fin] = camposDe(raiz);
    if (!ini) return;
    const locale = raiz.getAttribute(`${P}locale`) ?? localeDe(raiz);
    const r = rangoDe(raiz);
    const d = diaDe(raiz);
    ini.value = r ? formatInput(r.start, locale) : d ? (conHora(raiz) ? formatInputDateTime(d, locale, cicloDe(raiz)) : formatInput(d, locale)) : '';
    if (fin) fin.value = r ? formatInput(r.end, locale) : '';
}

function confirmarTexto(campo: HTMLInputElement): void {
    const raiz = campo.closest(DATEPICKER)?.querySelector<HTMLElement>(`[${P}date-picker]`);
    if (!raiz) return;
    const [ini, fin] = camposDe(raiz);
    const locale = raiz.getAttribute(`${P}locale`) ?? localeDe(raiz);
    const nuevo = fin ? resolveTypedRange(ini.value, fin.value, locale, fuentesDe(raiz)) : conHora(raiz) ? resolveTypedDateTime(ini.value, locale, fuentesDe(raiz)) : resolveTyped(ini.value, locale, fuentesDe(raiz));
    if (nuevo !== undefined) {
        const valor = !nuevo ? '' : nuevo instanceof Date ? (conHora(raiz) ? toIsoDateTime(nuevo) : iso(nuevo)) : serializeRange(nuevo);
        if (valor !== (raiz.getAttribute(`${P}value`) ?? '')) {
            recordar(raiz);
            if (avisar(raiz, detalle(raiz, valor))) {
                raiz.removeAttribute(`${P}anchor`);
                if (valor) {
                    raiz.setAttribute(`${P}value`, valor);
                    raiz.setAttribute(`${P}focused`, valor.split('/')[0]);
                } else {
                    raiz.removeAttribute(`${P}value`);
                    raiz.removeAttribute(`${P}focused`);
                }
                const e = enlaces(raiz);
                if (e) {
                    escribirOcultos(e, valor);
                    sincronizarEnvio(raiz);
                    sincronizarLimpiar(raiz);
                }
            }
        }
    }
    sincronizarTexto(raiz);
}

export function alDesenfocar(destino: Element, hacia: EventTarget | null): void {
    const parteHora = destino.getAttribute(`${P}date-time`);
    if (parteHora && destino instanceof HTMLInputElement) {
        const raiz = destino.closest<HTMLElement>(`[${P}date-picker]`);
        const n = Number(destino.value);
        if (raiz && destino.value.trim() && !Number.isNaN(n)) cambiarHora(raiz, parteHora, Math.min(Number(destino.max), Math.max(Number(destino.min), n)));
        return;
    }
    if (!destino.hasAttribute(`${P}date-text`)) return;
    if (hacia instanceof Element && hacia.hasAttribute(`${P}date-text`) && hacia.closest(CAMPO) === destino.closest(CAMPO)) return;
    confirmarTexto(destino as HTMLInputElement);
}

/**
 * Marca el DatePicker como cargando o no: Spinner en el campo, `aria-busy` en el
 * disparador y en la grilla. No bloquea: el calendario sigue abriendo y eligiendo. La app lo llama al empezar y al terminar de traer datos.
 */
export function cargando(root: HTMLElement, loading: boolean): void {
    const e = enlaces(root);
    if (!e) return;
    root.toggleAttribute(`${P}busy`, loading);
    for (const el of [e.disparador, ...root.querySelectorAll('[role="grid"]'), ...camposDe(root)]) {
        if (loading) el?.setAttribute('aria-busy', 'true');
        else el?.removeAttribute('aria-busy');
    }
    e.disparador.classList.toggle('is-loading', loading);
    e.disparador.closest(CAMPO)?.classList.toggle('is-loading', loading);
    const giro = e.panel.parentElement?.querySelector<HTMLElement>(`[${P}date-spinner]`);
    if (giro) giro.hidden = !loading;
}

/**
 * Registra (o con `null`, quita) una función que dice qué días no están disponibles
 * (`true` = no disponible), además de min/max y de `data-ts-disabled-*`. Redibuja el mes si el calendario está abierto.
 */
export function deshabilitar(root: HTMLElement, fn: ((d: Date) => boolean) | null): void {
    if (fn) reglas.set(root, fn);
    else reglas.delete(root);
    redibujar(root);
}

export function redibujar(raiz: Element): void {
    if (raiz instanceof HTMLElement && raiz.hasAttribute(`${P}date-picker`) && visible(raiz)) pintar(raiz);
}

export function sincronizarEnvio(raiz: HTMLElement): void {
    const e = enlaces(raiz);
    if (!e) return;
    const deshabilitado = (e.disparador as HTMLButtonElement).disabled;
    sincronizarRequerido(raiz, deshabilitado);
    for (const h of [e.oculto, e.ocultoFin]) if (h && h.disabled !== deshabilitado) h.disabled = deshabilitado;
}

function sincronizarRequerido(raiz: HTMLElement, deshabilitado: boolean): void {
    const proxy = enlaces(raiz)?.disparador.nextElementSibling;
    if (!(proxy instanceof HTMLInputElement) || !proxy.hasAttribute(`${P}required-proxy`)) return;
    if (proxy.disabled !== deshabilitado) proxy.disabled = deshabilitado;
    proxy.value = proxy.defaultValue = raiz.getAttribute(`${P}value`) ?? '';
}

export function sincronizarLimpiar(raiz: HTMLElement): void {
    const e = enlaces(raiz);
    const boton = e?.panel.parentElement?.querySelector<HTMLElement>(`[${P}clear]`);
    if (!e || !boton) return;
    boton.hidden = !showClearButton(!!raiz.getAttribute(`${P}value`), (e.disparador as HTMLButtonElement).disabled, false);
}

export function limpiar(raiz: HTMLElement): void {
    const e = enlaces(raiz);
    if (!e || (e.disparador as HTMLButtonElement).disabled) return;
    recordar(raiz);
    if (!avisar(raiz, detalle(raiz, ''))) return;
    raiz.removeAttribute(`${P}value`);
    raiz.removeAttribute(`${P}focused`);
    raiz.removeAttribute(`${P}anchor`);
    escribirOcultos(e, '');
    e.oculto?.dispatchEvent(new Event('change', { bubbles: true }));
    const campo = e.disparador.querySelector<HTMLElement>(VALOR);
    const placeholder = campo?.getAttribute(`${P}placeholder`) ?? '';
    if (campo) {
        campo.textContent = placeholder;
        e.disparador.classList.add('is-placeholder');
        if (e.disparador.hasAttribute('aria-label')) e.disparador.setAttribute('aria-label', placeholder);
    }
    sincronizarTexto(raiz);
    try {
        e.panel.hidePopover();
    } catch {
    }
    (camposDe(raiz)[0] ?? e.disparador).focus();
    sincronizarEnvio(raiz);
    sincronizarLimpiar(raiz);
}

export function visible(raiz: HTMLElement): boolean {
    const panel = raiz.closest('[popover]');
    if (!panel) return true;
    try {
        return panel.matches(':popover-open');
    } catch {
        return false;
    }
}

export function alAlternarPopover(panel: HTMLElement, disparador: HTMLElement | null, abierto: boolean): boolean {
    const raiz = panel.querySelector<HTMLElement>(`[${P}date-picker]`);
    if (!raiz) return false;
    if (disparador?.hasAttribute('aria-expanded')) disparador.setAttribute('aria-expanded', String(abierto));
    if (disparador?.matches(DISPARADOR)) disparador.classList.toggle('is-open', abierto);
    disparador?.closest(CAMPO)?.classList.toggle('is-open', abierto);
    raiz.removeAttribute(`${P}anchor`);
    if (abierto) {
        raiz.removeAttribute(`${P}month`);
        raiz.removeAttribute(`${P}focused`);
        pintar(raiz);
    } else {
        zonaDias(raiz)?.replaceChildren();
        anunciar(raiz);
    }
    return true;
}

export function alHacerClick(destino: Element): boolean {
    const atajo = destino.closest(`[${P}date-preset]`);
    if (atajo) {
        elegirAtajo(atajo);
        return true;
    }
    const raiz = destino.closest<HTMLElement>(`[${P}date-picker]`);
    if (!raiz) return false;

    if (destino.closest(`[${P}date-prev]`)) {
        irAlMes(raiz, -1);
        return true;
    }
    if (destino.closest(`[${P}date-next]`)) {
        irAlMes(raiz, 1);
        return true;
    }
    const dia = destino.closest<HTMLElement>(`[${P}date-day]`);
    if (dia && !bloqueado(dia)) {
        elegir(raiz, dia.getAttribute(`${P}value`) ?? '');
        return true;
    }
    return false;
}

export function alPresionarTecla(destino: Element, tecla: string, mayus = false): boolean {
    if (tecla === 'Enter' && destino.hasAttribute(`${P}date-text`)) {
        confirmarTexto(destino as HTMLInputElement);
        return false;
    }
    const raiz = destino.closest<HTMLElement>(`[${P}date-picker]`);
    const dia = destino.closest<HTMLElement>(`[${P}date-day]`);
    if (!raiz || !dia) return false;

    if (tecla === 'Enter' || tecla === ' ') {
        if (!bloqueado(dia)) elegir(raiz, dia.getAttribute(`${P}value`) ?? '');
        return true;
    }

    const actual = desdeIso(dia.getAttribute(`${P}value`));
    if (!actual) return false;
    const siguiente = moveFocusByKey(tecla, actual, inicioSemana(raiz), getComputedStyle(dia).direction === 'rtl', mayus);
    if (!siguiente) return false;

    raiz.setAttribute(`${P}focused`, iso(siguiente));
    const mes = leerFecha(raiz, 'month') ?? actual;
    const vista = displayForFocus(mes, siguiente, mesesDe(raiz));
    if (vista !== mes) raiz.setAttribute(`${P}month`, iso(vista));
    pintar(raiz);
    raiz.querySelector<HTMLElement>(`[${P}date-day][${P}value="${iso(siguiente)}"]`)?.focus();
    return true;
}

const iniciales = new WeakMap<HTMLElement, { valor: string | null; texto: string | null; etiqueta: string | null; vacio: boolean }>();

const SIGLAS = { day: 'dd', month: 'mm', year: 'aaaa' };

export function fijarAnchos(root: Document | HTMLElement): void {
    for (const campo of root.querySelectorAll<HTMLElement>(CAMPO)) {
        const raiz = campo.closest(DATEPICKER)?.querySelector<HTMLElement>(`[${P}locale]`);
        const locale = raiz?.getAttribute(`${P}locale`) ?? localeDe(campo);
        setVars(campo, { '--ts-date-ch': (raiz && conHora(raiz) ? dateTimePattern(locale, SIGLAS, cicloDe(raiz)) : datePattern(locale, SIGLAS)).length });
    }
}

export function recordar(raiz: HTMLElement): void {
    if (iniciales.has(raiz)) return;
    const e = enlaces(raiz);
    iniciales.set(raiz, {
        valor: raiz.getAttribute(`${P}value`),
        texto: e?.disparador.querySelector(VALOR)?.textContent ?? null,
        etiqueta: e?.disparador.getAttribute('aria-label') ?? null,
        vacio: !!e?.disparador.classList.contains('is-placeholder'),
    });
}

function restablecer(raiz: HTMLElement): void {
    const ini = iniciales.get(raiz);
    const e = enlaces(raiz);
    if (!ini || !e) return;
    if (ini.valor) {
        raiz.setAttribute(`${P}value`, ini.valor);
    } else {
        raiz.removeAttribute(`${P}value`);
    }
    raiz.removeAttribute(`${P}focused`);
    raiz.removeAttribute(`${P}month`);
    raiz.removeAttribute(`${P}anchor`);
    const campo = e.disparador.querySelector(VALOR);
    if (campo && ini.texto !== null) campo.textContent = ini.texto;
    e.disparador.classList.toggle('is-placeholder', ini.vacio);
    if (ini.etiqueta !== null) e.disparador.setAttribute('aria-label', ini.etiqueta);
    escribirOcultos(e, ini.valor ?? '');
    sincronizarTexto(raiz);
    try {
        e.panel.hidePopover();
    } catch {
    }
    if (visible(raiz)) pintar(raiz);
    sincronizarEnvio(raiz);
    sincronizarLimpiar(raiz);
}

export function alRestablecer(e: Event): void {
    const form = e.target as Element;
    setTimeout(() => {
        if (e.defaultPrevented) return;
        for (const raiz of form.querySelectorAll<HTMLElement>(`[${P}date-picker]`)) restablecer(raiz);
    }, 0);
}

export const ficha = {
    alAlternarPopover,
    alApuntar,
    alCambiarSelector,
    alDesenfocar,
    alHacerClick,
    alPresionarTecla,
    alRestablecer,
    fijarAnchos,
    limpiar,
    pintar,
    recordar,
    redibujar,
    sincronizarEnvio,
    sincronizarLimpiar,
    visible,
};
