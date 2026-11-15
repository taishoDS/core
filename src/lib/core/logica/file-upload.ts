// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export interface UploadedFile {
  file: File;
  error?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FILE_NAME_PLACEHOLDER = '{nombre}';

export interface FileErrorTexts {
  tooLarge: string;
  typeNotAllowed: string;
}

export function toUploadedFiles(files: File[], accept: string, maxSize: number, errors: FileErrorTexts): UploadedFile[] {
  return files.map((file) => ({ file, error: validateFile(file, accept, maxSize, errors) ?? undefined }));
}

export function combineFiles<T>(current: T[], incoming: T[], multiple: boolean): T[] {
  return multiple ? [...current, ...incoming] : incoming;
}

export function removeFileAt<T>(items: T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}

export function validateFile(file: File, accept: string, maxSize: number, errors: FileErrorTexts): string | null {
  if (maxSize > 0 && file.size > maxSize) {
    return errors.tooLarge;
  }
  if (accept && !matchesAccept(file, accept)) {
    return errors.typeNotAllowed;
  }
  return null;
}

function matchesAccept(file: File, accept: string): boolean {
  const types = accept.split(',').map((t) => t.trim());
  return types.some((type) => {
    if (type === '*/*') return true;
    if (type.endsWith('/*')) return file.type.startsWith(type.slice(0, -2));
    if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type.toLowerCase());
    return file.type === type;
  });
}
