// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import { describe, it, expect } from 'vitest';
import { combineFiles, formatFileSize, removeFileAt, toUploadedFiles, validateFile } from './file-upload';

const ERR = { tooLarge: 'Demasiado grande (máx. 1.0 MB)', typeNotAllowed: 'Tipo de archivo no permitido' };

describe('formatFileSize', () => {
  it('formatea bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formatea kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formatea megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});

describe('validateFile', () => {
  function makeFile(name: string, type: string, size: number): File {
    return new File(['x'.repeat(size)], name, { type });
  }

  it('acepta archivo válido sin restricciones', () => {
    const f = makeFile('foto.jpg', 'image/jpeg', 100);
    expect(validateFile(f, '', 0, ERR)).toBeNull();
  });

  it('rechaza archivo que excede maxSize', () => {
    const f = makeFile('video.mp4', 'video/mp4', 2 * 1024 * 1024);
    expect(validateFile(f, '', 1024 * 1024, ERR)).toMatch(/grande/);
  });

  it('acepta tipo MIME exacto', () => {
    const f = makeFile('foto.jpg', 'image/jpeg', 100);
    expect(validateFile(f, 'image/jpeg', 0, ERR)).toBeNull();
  });

  it('rechaza tipo MIME incorrecto', () => {
    const f = makeFile('doc.pdf', 'application/pdf', 100);
    expect(validateFile(f, 'image/*', 0, ERR)).toMatch(/no permitido/);
  });

  it('acepta wildcard de tipo', () => {
    const f = makeFile('foto.png', 'image/png', 100);
    expect(validateFile(f, 'image/*', 0, ERR)).toBeNull();
  });

  it('acepta por extensión', () => {
    const f = makeFile('doc.pdf', 'application/pdf', 100);
    expect(validateFile(f, '.pdf', 0, ERR)).toBeNull();
  });
});

describe('selección de archivos', () => {
  const f = (name: string, size = 1) => new File(['x'.repeat(size)], name, { type: 'text/plain' });

  it('toUploadedFiles deja el error junto al archivo, sin descartarlo', () => {
    const [ok, grande] = toUploadedFiles([f('a.txt'), f('b.txt', 10)], '', 5, { ...ERR, tooLarge: `Demasiado grande (máx. ${formatFileSize(5)})` });
    expect(ok).toEqual({ file: expect.any(File), error: undefined });
    expect(grande.error).toBe('Demasiado grande (máx. 5 B)');
  });

  it('combineFiles acumula con multiple y reemplaza sin multiple', () => {
    expect(combineFiles(['a'], ['b', 'c'], true)).toEqual(['a', 'b', 'c']);
    expect(combineFiles(['a'], ['b', 'c'], false)).toEqual(['b', 'c']);
  });

  it('removeFileAt saca sólo el índice pedido y no muta', () => {
    const lista = ['a', 'b', 'c'];
    expect(removeFileAt(lista, 1)).toEqual(['a', 'c']);
    expect(lista).toEqual(['a', 'b', 'c']);
  });
});
