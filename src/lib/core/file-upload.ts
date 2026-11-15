// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import {
    FILE_NAME_PLACEHOLDER,
    combineFiles,
    formatFileSize,
    removeFileAt,
    toUploadedFiles,
    type UploadedFile,
} from './logica/file-upload';
import { P, avisar, contenedor } from './dom';
import { textoDe } from './textos';

const TEXTOS = {
    es: { fileTooLarge: (max: string) => `Demasiado grande (máx. ${max})`, fileTypeNotAllowed: 'Tipo de archivo no permitido' },
    en: { fileTooLarge: (max: string) => `File too large (max ${max})`, fileTypeNotAllowed: "This file type isn't allowed." },
};

const acumulados = new WeakMap<HTMLElement, UploadedFile[]>();

const listaDe = (raiz: HTMLElement) => raiz.querySelector<HTMLElement>(`[${P}file-list]`);
const inputDe = (raiz: HTMLElement) => raiz.querySelector<HTMLInputElement>(`[${P}file-input]`);

function crearFila(raiz: HTMLElement, { file, error }: UploadedFile): HTMLElement {
    const plantilla = raiz.querySelector<HTMLTemplateElement>(`template[${P}file-template]`);
    const modelo = plantilla?.content.firstElementChild;
    const li = (modelo ? modelo.cloneNode(true) : document.createElement('li')) as HTMLElement;
    li.setAttribute(`${P}file-item`, '');
    if (error) li.setAttribute(`${P}file-error`, '');

    if (!modelo) {
        li.textContent = error ? `${file.name} — ${error}` : `${file.name} (${formatFileSize(file.size)})`;
        return li;
    }
    const nombre = li.querySelector('[data-file-name]');
    if (nombre) nombre.textContent = file.name;
    const medida = li.querySelector('[data-file-size]');
    if (error) {
        const aviso = document.createElement('span');
        aviso.setAttribute('data-file-error', '');
        aviso.textContent = error;
        medida?.replaceWith(aviso);
        const icono = raiz.querySelector<HTMLTemplateElement>(`template[${P}file-error-icon]`)?.content.firstElementChild;
        if (icono) li.querySelector('svg')?.replaceWith(icono.cloneNode(true));
    } else if (medida) {
        medida.textContent = formatFileSize(file.size);
    }
    const quitar = li.querySelector('[data-file-remove]');
    const etiqueta = quitar?.getAttribute('aria-label');
    if (quitar && etiqueta) quitar.setAttribute('aria-label', etiqueta.replace(FILE_NAME_PLACEHOLDER, file.name));
    return li;
}

function pintarLista(raiz: HTMLElement, archivos: UploadedFile[]): void {
    const lista = listaDe(raiz);
    if (!lista) return;
    lista.replaceChildren(...archivos.map((a) => crearFila(raiz, a)));
    lista.hidden = archivos.length === 0;
}

function sincronizarInput(raiz: HTMLElement, archivos: UploadedFile[]): void {
    const input = inputDe(raiz);
    if (!input || typeof DataTransfer === 'undefined') return;
    const bolsa = new DataTransfer();
    for (const { file, error } of archivos) if (!error) bolsa.items.add(file);
    input.files = bolsa.files;
}

function aplicar(raiz: HTMLElement, archivos: UploadedFile[]): void {
    if (!avisar(raiz, { component: 'file-upload', files: archivos.map((a) => a.file) })) {
        sincronizarInput(raiz, acumulados.get(raiz) ?? []);
        return;
    }
    acumulados.set(raiz, archivos);
    pintarLista(raiz, archivos);
    sincronizarInput(raiz, archivos);
}

function seleccionar(raiz: HTMLElement, archivos: File[]): void {
    const input = inputDe(raiz);
    const maximo = Number(raiz.getAttribute(`${P}max-size`) ?? 0);
    const nuevos = toUploadedFiles(archivos, input?.accept ?? '', maximo, {
        tooLarge: raiz.getAttribute(`${P}file-error-size`) ?? textoDe(raiz, TEXTOS, 'fileTooLarge')(formatFileSize(maximo)),
        typeNotAllowed: raiz.getAttribute(`${P}file-error-type`) ?? textoDe(raiz, TEXTOS, 'fileTypeNotAllowed'),
    });
    aplicar(raiz, combineFiles(acumulados.get(raiz) ?? [], nuevos, input?.multiple ?? false));
}

function quitar(boton: HTMLElement): boolean {
    const raiz = contenedor(boton, 'file-upload');
    const fila = boton.closest('li');
    const lista = listaDe(raiz ?? boton);
    if (!raiz || !fila || !lista) return false;
    const indice = [...lista.children].indexOf(fila);
    aplicar(raiz, removeFileAt(acumulados.get(raiz) ?? [], indice));
    return true;
}

export function alHacerClick(destino: Element): boolean {
    const quitarBoton = destino.closest<HTMLElement>('[data-file-remove]');
    if (quitarBoton && contenedor(quitarBoton, 'file-upload')) return quitar(quitarBoton);

    const trigger = destino.closest<HTMLElement>(`[${P}file-trigger]`);
    if (!trigger || trigger.hasAttribute('disabled')) return false;
    const raiz = contenedor(trigger, 'file-upload');
    raiz?.querySelector<HTMLInputElement>(`[${P}file-input]`)?.click();
    return true;
}

export function alCambiar(destino: Element): boolean {
    if (!(destino instanceof HTMLInputElement) || !destino.hasAttribute(`${P}file-input`)) {
        return false;
    }
    const raiz = contenedor(destino, 'file-upload');
    if (!raiz) return false;
    const elegidos = [...(destino.files ?? [])];
    if (elegidos.length === 0) sincronizarInput(raiz, acumulados.get(raiz) ?? []);
    else seleccionar(raiz, elegidos);
    return true;
}

export function alArrastrar(destino: Element, tipo: string, archivos: File[] | null): boolean {
    const raiz = destino.closest<HTMLElement>(`[${P}file-upload]`);
    if (!raiz) return false;

    if (tipo === 'dragover') {
        raiz.classList.add('is-dragging');
        return true;
    }
    if (tipo === 'dragleave') {
        raiz.classList.remove('is-dragging');
        return true;
    }
    raiz.classList.remove('is-dragging');
    if (archivos?.length) seleccionar(raiz, archivos);
    return true;
}

export const ficha = {
    alArrastrar,
    alCambiar,
    alHacerClick,
};
