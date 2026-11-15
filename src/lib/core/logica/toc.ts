// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
export function pickActiveId(
    tops: readonly { id: string; top: number }[],
    offset: number,
    atBottom = false,
): string | null {
    if (tops.length === 0) return null;
    if (atBottom) return tops[tops.length - 1].id;
    let active = tops[0].id;
    for (const { id, top } of tops) {
        if (top - offset <= 1) active = id;
        else break;
    }
    return active;
}

export function isAtBottom(
    viewportHeight: number,
    scrollY: number,
    scrollHeight: number,
    margin = 2,
): boolean {
    return scrollHeight > viewportHeight && viewportHeight + scrollY >= scrollHeight - margin;
}
