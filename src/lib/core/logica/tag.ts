// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export function focusTargetAfterDismiss(tag: HTMLElement): HTMLElement | null {
  const hermanos = [...(tag.parentElement?.children ?? [])].filter(
    (h): h is HTMLElement => h instanceof HTMLElement && h !== tag && h.hasAttribute('data-ts-dismissible') && !h.hidden,
  );
  const siguiente = hermanos.find((h) => tag.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING);
  const elegido = siguiente ?? hermanos[hermanos.length - 1];
  return elegido?.querySelector<HTMLElement>('[data-ts-dismiss]:not([disabled])') ?? null;
}
