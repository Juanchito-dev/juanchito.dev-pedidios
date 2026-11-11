#!/usr/bin/env node
/*
 * Renderiza piezas de Instagram con la identidad de juanchito.dev_.
 *
 *   node marca/render.cjs marca/contenido/<pieza>.json [--fps 30]
 *
 * El JSON dice qué es:
 *   { "tipo": "carrusel", "nombre": "...", "slides": [...] }      → salida/<nombre>/01.png …
 *   { "tipo": "fijas",    "nombre": "...", "piezas": [...] }      → salida/<nombre>/<archivo>.png
 *   { "tipo": "motion",   "nombre": "...", "escenas": [...] }     → salida/<nombre>.mp4 (+ portada.png)
 *
 * Necesita Playwright (Chromium) y, para motion, ffmpeg.
 */
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = __dirname;
const plantilla = (n) => "file://" + path.join(RAIZ, "plantillas", n);

async function main() {
  const args = process.argv.slice(2);
  const archivo = args.find((a) => a.endsWith(".json"));
  if (!archivo) throw new Error("Uso: node marca/render.cjs marca/contenido/<pieza>.json");
  const fps = Number(args[args.indexOf("--fps") + 1]) || 30;
  const pieza = JSON.parse(fs.readFileSync(archivo, "utf8"));
  const salida = path.join(RAIZ, "salida", pieza.nombre);

  const navegador = await chromium.launch();
  try {
    if (pieza.tipo === "carrusel") await carrusel(navegador, pieza, salida);
    else if (pieza.tipo === "fijas") await fijas(navegador, pieza, salida);
    else if (pieza.tipo === "motion") await motion(navegador, pieza, salida, fps);
    else throw new Error(`tipo desconocido: ${pieza.tipo}`);
  } finally {
    await navegador.close();
  }
}

async function abrir(navegador, archivo, ancho, alto) {
  const p = await navegador.newPage({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
  await p.goto(plantilla(archivo));
  await p.evaluate(() => document.fonts.ready);
  return p;
}

async function carrusel(navegador, pieza, salida) {
  fs.mkdirSync(salida, { recursive: true });
  const p = await abrir(navegador, "carrusel.html", 1080, 1350);
  const n = pieza.slides.length;
  for (let i = 0; i < n; i++) {
    await p.evaluate(([s, i, n]) => window.pintar(s, i, n), [pieza.slides[i], i, n]);
    await p.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))]));
    const f = path.join(salida, `${String(i + 1).padStart(2, "0")}.png`);
    await p.locator("#lienzo").screenshot({ path: f });
    console.log("✓", path.relative(process.cwd(), f));
  }
}

const TAMANOS = { reel: [1080, 1920], perfil: [1080, 1080], destacada: [1080, 1920] };

async function fijas(navegador, pieza, salida) {
  fs.mkdirSync(salida, { recursive: true });
  for (const f of pieza.piezas) {
    const [w, h] = TAMANOS[f.tipo];
    const p = await abrir(navegador, "fijas.html", w, h);
    await p.evaluate((f) => window.pintar(f), f);
    await p.evaluate(() => document.fonts.ready);
    const ruta = path.join(salida, `${f.archivo}.png`);
    await p.locator("#lienzo").screenshot({ path: ruta });
    await p.close();
    console.log("✓", path.relative(process.cwd(), ruta));
  }
}

async function motion(navegador, pieza, salida, fps) {
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const p = await abrir(navegador, "motion.html", 1080, 1920);
  const dur = await p.evaluate((c) => window.pintar(c), pieza);
  const total = Math.ceil(dur * fps);
  const mp4 = salida + ".mp4";
  const ff = spawn("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
    "-movflags", "+faststart", mp4,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const lienzo = p.locator("#lienzo");
  for (let f = 0; f < total; f++) {
    await p.evaluate((t) => window.renderAt(t), f / fps);
    const png = await lienzo.screenshot({ type: "png" });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % fps === 0) process.stdout.write(`\r  ${Math.round((f / total) * 100)}%`);
  }
  ff.stdin.end();
  await new Promise((ok, mal) => ff.on("close", (c) => (c === 0 ? ok() : mal(new Error("ffmpeg falló")))));
  // portada: el gancho ya armado
  await p.evaluate((t) => window.renderAt(t), Math.min(2, dur - 0.1));
  await lienzo.screenshot({ path: salida + "-portada.png" });
  console.log(`\r✓ ${path.relative(process.cwd(), mp4)} (${dur.toFixed(1)} s, ${total} fotogramas)`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
