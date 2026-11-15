// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
import fs from 'fs';
import path from 'path';
import { buildTokensCSS, materialDeSecciones, resolveThemeTokens } from './emit-tokens';
import { buildTokensDTCG } from './emit-dtcg';
import { buildClassTypes, buildClassTypesExtension } from './emit-classes';
import { tablaPrefijos } from './variantes';
import { parseUtilities } from './emit-flat';
import { tablaRenombres } from './naming-renames';
import { compilarCon, derivarVocabulario, DEFAULT_COPYRIGHT, type ContentFile } from './compile';
import { leerDir } from './leer-dir';
import type { TaishoExtensions } from './extension';
import { cssDeExtensiones } from './registro';
import { buildFontsCSS } from './emit-fonts';
import { respaldosDeFuentes, validarEstilosDeFuentes } from './respaldo-fuentes';
import { loadLucideAliases } from './lucide-aliases';
import { collectInternalIcons, buildIconsInternalTS } from './emit-icons-internal';
import { deriveThemeVocabulary, splitKey, type TaishoConfig, type ThemeVocabulary } from './vocabulary';
import { warningText } from '../generate-cli/mensajes-avisos';

export { deriveThemeVocabulary, splitKey };
export type { TaishoConfig, ThemeVocabulary };

/** Directorio (relativo al proyecto) donde van los SVGs personalizados del consumidor. */
export const DEFAULT_CUSTOM_ICONS_DIR = 'src/icons';

/** Opciones del orquestador. */
export interface OrchestrationOptions {
    /** Directorio base donde se escribe la salida. Default: cwd. */
    outDir?: string;
    /** Directorio base para resolver node_modules (tipos de íconos Lucide). Default: cwd. */
    nodeModulesBase?: string;
    /**
     * Texto de copyright/licencia que se estampa en el header de cada archivo
     * CSS/TS emitido. Default: MIT, el del Core.
     */
    copyright?: string;
    /** Extensiones por nombre de paquete: sus bloques salen en `components.css`/`utilities.css`/`taisho.full.css` y sus tokens en cada tema. */
    extensions?: TaishoExtensions;
    /** Carpetas (relativas a `outDir`) donde buscar los íconos internos que el código usa por nombre. Default: ninguna. */
    internalIconDirs?: string[];
}

/**
 * Motor de Generación de Sistema de Diseño: recibe la config del consumidor
 * (`TaishoConfig`), deriva el vocabulario compartido (userColors/userStates) y
 * llama a los emitters (tokens/atomic/components/utilities/safelist/reset,
 * cada uno en su emit-*.ts como función pura), genera los tipos y escribe todo
 * a disco.
 */
export function orchestrate(config: TaishoConfig, options: OrchestrationOptions = {}): void {
    const tema = deriveThemeVocabulary(config, options.extensions);
    const { themeEntries, userColors, defaultStates, userStates, userFonts, userScales } = tema;

    const vocab = derivarVocabulario(config, tema, options.extensions);
    const { atomic: atomicCSS, utilities: utilitiesCSS, components: componentsCSS, reset: resetCSS } = vocab;

    const baseDir = options.outDir || process.env.TAISHO_OUT_DIR || process.cwd();
    const cssDir = path.resolve(baseDir, 'src/lib/css');
    if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
    const COPYRIGHT = options.copyright ?? DEFAULT_COPYRIGHT;
    const CSS_HEADER = `/* TaishoDS — ${COPYRIGHT} */\n`;
    const TS_HEADER = `// TaishoDS — ${COPYRIGHT}\n`;
    const writeCss = (p: string, c: string) => fs.writeFileSync(p, CSS_HEADER + c);
    const writeTs = (p: string, c: string) => fs.writeFileSync(p, TS_HEADER + c);
    writeCss(path.join(cssDir, 'reset.css'), resetCSS);
    validarEstilosDeFuentes(config.fontFaces, baseDir);
    writeCss(path.join(cssDir, 'fonts.css'), buildFontsCSS(config.fontFaces, respaldosDeFuentes(config.fontFaces, baseDir)));
    const tokensDir = path.join(cssDir, 'tokens');
    const dtcgDir = path.resolve(baseDir, 'src/lib/tokens');
    if (!fs.existsSync(tokensDir)) fs.mkdirSync(tokensDir, { recursive: true });
    if (!fs.existsSync(dtcgDir)) fs.mkdirSync(dtcgDir, { recursive: true });
    for (const entry of themeEntries) {
        const model = resolveThemeTokens(entry, userFonts, defaultStates, userScales, options.extensions);
        for (const aviso of model.warnings) console.warn(`⚠ ${warningText(aviso, 'es')}`);

        const outDir = entry.group === 'root' ? tokensDir : path.join(tokensDir, entry.group);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        writeCss(path.join(outDir, `${entry.name}.css`), buildTokensCSS(model, config.darkMode) + materialDeSecciones(model));

        const jsonDir = entry.group === 'root' ? dtcgDir : path.join(dtcgDir, entry.group);
        if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });
        fs.writeFileSync(path.join(jsonDir, `${entry.name}.tokens.json`), buildTokensDTCG(entry, model));
    }
    writeCss(path.join(cssDir, 'atomic.css'), atomicCSS);
    writeCss(path.join(cssDir, 'components.css'), componentsCSS);
    writeCss(path.join(cssDir, 'utilities.css'), utilitiesCSS);

    const srcDir = path.resolve(baseDir, 'src');
    const archivos: ContentFile[] = [];
    const recorrer = (d: string) => {
        for (const entrada of leerDir(d)) {
            if (entrada.esDirectorio) recorrer(entrada.ruta);
            else if (entrada.ruta.endsWith('.svelte')) {
                const content = entrada.contenido();
                archivos.push({
                    file: path.relative(baseDir, entrada.ruta).split(path.sep).join('/'),
                    content,
                });
            }
        }
    };
    recorrer(srcDir);
    const resultado = compilarCon(vocab, config, archivos, { copyright: options.copyright });
    fs.writeFileSync(path.join(cssDir, 'taisho.full.css'), resultado.css);
    console.log(`✅ taisho.full.css (CSS plano) — ${resultado.variants.length} variantes halladas en el markup`);

    const typesDir = path.resolve(baseDir, 'src/lib/types');
    if (!fs.existsSync(typesDir)) fs.mkdirSync(typesDir, { recursive: true });

    const shadeKeys = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'];
    const STATUS = Object.keys(defaultStates);
    const allVariantKeys = [...Object.keys(userStates), ...Object.keys(userColors)];
    let variantsDTS = `// Archivo auto-generado: TIPOS DINÁMICOS para TaishoDS\n\n`;

    const statusUnion = STATUS.map(s => `"${s}"`).join(' | ');
    variantsDTS += `export type CoreButtonVariant = "primary" | "secondary" | "ghost" | "tertiary" | "danger";\n`;
    variantsDTS += `export type StatusVariant = "default" | ${statusUnion};\n`;
    variantsDTS += `export type InputVariant = StatusVariant;\n`;
    variantsDTS += `export type BannerVariant = StatusVariant;\n`;
    variantsDTS += `export type NoteVariant = StatusVariant;\n`;
    variantsDTS += `export type ToastVariant = StatusVariant;\n`;
    variantsDTS += `export type ProgressVariant = StatusVariant | "brand";\n\n`;

    if (allVariantKeys.length > 0) {
        variantsDTS += `export type BrandButtonVariant = \n  | "${allVariantKeys.join('"\n  | "')}";\n\n`;

        const shadeVariants: string[] = [];
        allVariantKeys.forEach(name => {
            shadeKeys.forEach(shade => {
                shadeVariants.push(`${name}-${shade}`);
            });
        });
        variantsDTS += `export type BrandShadeButtonVariant = \n  | "${shadeVariants.join('"\n  | "')}";\n\n`;

        variantsDTS += `export type ButtonVariant = CoreButtonVariant | BrandButtonVariant | BrandShadeButtonVariant;\n\n`;
        variantsDTS += `export type ToggleVariant = "primary" | "${allVariantKeys.join('"\n  | "')}";\n\n`;
        variantsDTS += `export type CheckboxVariant = "primary" | "${allVariantKeys.join('"\n  | "')}";\n\n`;
        variantsDTS += `export type RadioVariant = "primary" | "${allVariantKeys.join('"\n  | "')}";\n\n`;

        const badgeCustomKeys = allVariantKeys.filter(name => !STATUS.includes(name));
        if (badgeCustomKeys.length > 0) {
            variantsDTS += `export type BadgeVariant = StatusVariant | "${badgeCustomKeys.join('"\n  | "')}";\n\n`;
        } else {
            variantsDTS += `export type BadgeVariant = StatusVariant;\n\n`;
        }
    } else {
        variantsDTS += `export type ButtonVariant = CoreButtonVariant;\n\n`;
        variantsDTS += `export type ToggleVariant = "primary";\n\n`;
        variantsDTS += `export type CheckboxVariant = "primary";\n\n`;
        variantsDTS += `export type RadioVariant = "primary";\n\n`;
        variantsDTS += `export type BadgeVariant = StatusVariant;\n\n`;
    }

    writeTs(path.join(typesDir, 'variants.d.ts'), variantsDTS);

    const extra = cssDeExtensiones(options.extensions);
    const deExtension = [extra.components, extra.utilities].flatMap((css) => parseUtilities(css).map((b) => b.name));
    const sonDeExtension = new Set(deExtension);
    const nombresEmitidos = [atomicCSS, utilitiesCSS, componentsCSS].flatMap((css) => parseUtilities(css).map((b) => b.name)).filter((n) => !sonDeExtension.has(n));
    writeTs(path.join(typesDir, 'classes.d.ts'), buildClassTypes(nombresEmitidos, tablaRenombres(nombresEmitidos.map((n) => n.replaceAll('\\', ''))), tablaPrefijos(userScales.screens)));
    if (deExtension.length) writeTs(path.join(typesDir, 'extension-classes.d.ts'), buildClassTypesExtension(deExtension));
    console.log('✅ Types re-generated in src/lib/types/');

    const nodeModulesBase = options.nodeModulesBase || process.env.TAISHO_NODE_MODULES || process.cwd();
    const nodesPath = path.resolve(nodeModulesBase, 'node_modules/lucide-static/icon-nodes.json');
    let iconsDTS = `// Archivo auto-generado: TIPOS DE ICONOS para TaishoDS\n\n`;
    let knownIcons = new Set<string>();
    if (fs.existsSync(nodesPath)) {
        try {
            const lucideNodes = JSON.parse(fs.readFileSync(nodesPath, 'utf-8'));
            knownIcons = new Set(Object.keys(lucideNodes));
            const iconNames = [...knownIcons, ...Object.keys(loadLucideAliases(path.dirname(nodesPath), lucideNodes))].sort();
            iconsDTS += `export type LucideIconName =\n`;
            iconNames.forEach(name => {
                iconsDTS += `  | "${name}"\n`;
            });
            iconsDTS += `  | (string & {});\n\n`;
        } catch (e) {
            console.error('Error generating icon types:', e);
            iconsDTS += `export type LucideIconName = string;\n\n`;
        }
    } else {
        iconsDTS += `export type LucideIconName = string;\n\n`;
    }

    const customDir = path.resolve(baseDir, DEFAULT_CUSTOM_ICONS_DIR);
    if (fs.existsSync(customDir)) {
        for (const f of fs.readdirSync(customDir)) {
            if (f.endsWith('.svg')) knownIcons.add(f.slice(0, -4));
        }
    }

    iconsDTS += `declare module 'virtual:taisho-icons' {\n`;
    iconsDTS += `  export const icons: Record<string, { viewBox: string; stroke: boolean; body: string }>;\n`;
    iconsDTS += `}\n`;

    writeTs(path.join(typesDir, 'icons.d.ts'), iconsDTS);
    console.log('✅ Icon types generated in src/lib/types/icons.d.ts');

    const internos = [...new Set((options.internalIconDirs ?? []).flatMap((d) => collectInternalIcons(path.resolve(baseDir, d), knownIcons)))].sort();
    writeTs(path.resolve(baseDir, 'src/lib/icons-internal.ts'), buildIconsInternalTS(internos));
    console.log(`✅ Íconos internos: ${internos.length} en src/lib/icons-internal.ts`);

    console.log('✅ CSS System re-generated in src/lib/css/');
}
