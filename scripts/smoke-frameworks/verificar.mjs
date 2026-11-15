// TaishoDS Core — Copyright (c) 2026 Pablo Di Filippo. Licencia MIT (ver LICENSE).
// Prueba en el navegador de un proyecto de Astro o de Next con el Core instalado.
// Uso: node verificar.mjs <url-base> <etiqueta> [chromium,firefox,webkit]
// Abre la página de la URL y otra (navegando con el enlace #ir-otra, y también de vuelta),
// y en cada una: abre y cierra el Modal, abre el Select, elige una opción y comprueba el valor.
// Falla (salida 1) ante cualquier mensaje de error o aviso en la consola.
import { chromium, firefox, webkit } from '@playwright/test';

const [base, etiqueta = 'proyecto', lista = 'chromium,firefox,webkit'] = process.argv.slice(2);
if (!base) {
	console.error('Uso: node verificar.mjs <url-base> <etiqueta> [motores]');
	process.exit(2);
}
const MOTORES = { chromium, firefox, webkit };
const fallas = [];

async function funcional(page, donde) {
	const f = (msg) => fallas.push(`${donde}: ${msg}`);
	const dialogo = page.locator('dialog#confirmar');
	await page.locator('#abrir-modal').click();
	if (!(await dialogo.evaluate((d) => d.open))) f('el Modal no abrió');
	else if (!(await dialogo.isVisible())) f('el Modal abrió pero no se ve');
	await page.locator('#cerrar-modal').click();
	if (await dialogo.evaluate((d) => d.open)) f('el Modal no cerró con el botón');
	await page.locator('#abrir-modal').click();
	await page.keyboard.press('Escape');
	if (await dialogo.evaluate((d) => d.open)) f('el Modal no cerró con Escape');

	const disparador = page.locator('[data-ts-listbox-trigger]');
	try {
		await disparador.waitFor({ state: 'visible', timeout: 5000 });
	} catch {
		return f('el Select nunca reemplazó al <select> nativo (el JS del Core no lo inicializó)');
	}
	await disparador.click();
	if ((await disparador.getAttribute('aria-expanded')) !== 'true') f('el Select no abrió (aria-expanded)');
	const opcion = page.locator('[data-ts-listbox-panel] [role="option"][data-ts-value="editor"]');
	if (!(await opcion.isVisible())) f('las opciones del Select no se ven');
	await opcion.click();
	const etiquetaTxt = (await page.locator('[data-ts-listbox-label]').innerText()).trim();
	const valor = await page.locator('[data-ts-listbox-value]').inputValue();
	if (etiquetaTxt !== 'Editor') f(`el Select muestra «${etiquetaTxt}» y no «Editor»`);
	if (valor !== 'editor') f(`el valor del Select es «${valor}» y no «editor»`);
	if ((await disparador.getAttribute('aria-expanded')) !== 'false') f('el Select no cerró al elegir');
}

for (const nombre of lista.split(',')) {
	const navegador = await MOTORES[nombre].launch();
	const page = await navegador.newPage();
	const consola = [];
	page.on('console', (m) => {
		if (['error', 'warning'].includes(m.type())) consola.push(`[${m.type()}] ${m.text()}`);
	});
	page.on('pageerror', (e) => consola.push(`[pageerror] ${e.message}`));
	// Una petición abortada al navegar (los prefetch de Next, por ejemplo) no es un fallo: sí lo es cualquier otra.
	page.on('requestfailed', (r) => {
		const error = r.failure()?.errorText ?? '';
		if (!/abort|cancel/i.test(error)) consola.push(`[requestfailed] ${r.url()} ${error}`);
	});
	page.on('response', (r) => {
		if (r.status() >= 400) consola.push(`[http ${r.status()}] ${r.url()}`);
	});

	const antes = fallas.length;
	let navegacion = '?';
	page.setDefaultTimeout(8000);
	try {
		await page.goto(base, { waitUntil: 'networkidle' });
		const inicio = new URL(page.url()).pathname;
		await funcional(page, `${nombre} ${inicio}`);
		await page.evaluate(() => (window.__marcaTaisho = 1));
		await page.locator('#ir-otra').click();
		await page.waitForURL((u) => u.pathname !== inicio);
		navegacion = (await page.evaluate(() => window.__marcaTaisho === 1)) ? 'de cliente' : 'con recarga';
		await page.waitForLoadState('networkidle');
		await funcional(page, `${nombre} ${new URL(page.url()).pathname} (tras navegar con el enlace)`);
		await page.goBack();
		await page.waitForURL((u) => u.pathname === inicio);
		await page.waitForLoadState('networkidle');
		await funcional(page, `${nombre} ${inicio} (tras volver)`);
	} catch (e) {
		fallas.push(`${nombre}: se cortó la prueba — ${String(e.message).split('\n')[0]}`);
	}

	for (const c of consola) fallas.push(`${nombre} consola: ${c}`);
	console.log(`${nombre} (${navegador.version()}): ${fallas.length === antes ? 'ok' : 'FALLA'}${consola.length ? `, ${consola.length} mensajes de consola` : ', consola limpia'}, navegación ${navegacion}`);
	await navegador.close();
}

if (fallas.length) {
	console.error(`\nFALLA en ${etiqueta}:\n- ${fallas.join('\n- ')}`);
	process.exit(1);
}
console.log(`ok: ${etiqueta} — Modal y Select abren, eligen y cierran en ${lista}, sin mensajes en consola`);
