#!/usr/bin/env node
/*
 * Renderiza piezas de Instagram con la identidad de juanchito.dev_.
 *
 *   node marca/render.cjs marca/contenido/<pieza>.json [--fps 30]
 *
 * El JSON dice qué es:
 *   { "tipo": "carrusel", "nombre": "...", "slides": [...] }      → salida/<nombre>/01.png …
 *   { "tipo": "fijas",    "nombre": "...", "piezas": [...] }      → salida/<nombre>/<archivo>.png
 *   { "tipo": "motion",   "nombre": "...", "escenas": [...] }     → salida/<nombre>.mp4 con sonido (+ portada.png)
 *   { "tipo": "reel",     "nombre": "...", "partes": [...] }      → motion + grabaciones unidas, con sonido
 *
 * Necesita Playwright (Chromium) y, para motion, ffmpeg.
 */
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { mezclar } = require("./sonido.cjs");

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
    else if (pieza.tipo === "reel") await reel(navegador, pieza, salida, fps);
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

/* Renderiza escenas de motion a un MP4 sin audio. Devuelve { dur, señales, portada } */
async function motionVideo(navegador, escenas, mp4, fps) {
  const p = await abrir(navegador, "motion.html", 1080, 1920);
  const dur = await p.evaluate((c) => window.pintar(c), { escenas });
  const señales = await p.evaluate(() => window.sonidos());
  const total = Math.ceil(dur * fps);
  const ff = spawn("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", mp4,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const lienzo = p.locator("#lienzo");
  for (let f = 0; f < total; f++) {
    await p.evaluate((t) => window.renderAt(t), f / fps);
    const png = await lienzo.screenshot({ type: "png" });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % fps === 0) process.stdout.write(`\r  ${Math.round((f / total) * 100)}%`);
  }
  ff.stdin.end();
  await esperar(ff);
  // portada: el gancho ya armado
  await p.evaluate((t) => window.renderAt(t), Math.min(2, dur - 0.1));
  const portada = await lienzo.screenshot({ type: "png" });
  await p.close();
  return { dur: total / fps, señales, portada };
}

const esperar = (proc) => new Promise((ok, mal) => proc.on("close", (c) => (c === 0 ? ok() : mal(new Error("ffmpeg falló")))));
const ffmpeg = (args) => esperar(spawn("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" }));

/* Une video sin audio + efectos sincronizados → MP4 final con AAC */
async function conSonido(videoMudo, señales, dur, mp4) {
  const wav = mp4.replace(/\.mp4$/, ".tmp.wav");
  fs.writeFileSync(wav, mezclar(señales, dur));
  await ffmpeg(["-i", videoMudo, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", mp4]);
  fs.rmSync(wav);
}

async function motion(navegador, pieza, salida, fps) {
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const mudo = salida + ".mudo.mp4";
  const { dur, señales, portada } = await motionVideo(navegador, pieza.escenas, mudo, fps);
  if (pieza.sonido !== false) await conSonido(mudo, señales, dur, salida + ".mp4");
  else fs.copyFileSync(mudo, salida + ".mp4");
  fs.rmSync(mudo);
  fs.writeFileSync(salida + "-portada.png", portada);
  console.log(`\r✓ ${path.relative(process.cwd(), salida + ".mp4")} (${dur.toFixed(1)} s, ${señales.length} sonidos)`);
}

/* reel: partes de motion y grabaciones, en orden, con un barrido sonoro en cada corte.
   { "tipo": "reel", "nombre": "...", "partes": [ { "escenas": [...] }, { "video": "salida/tomas.mp4" }, ... ] }
   Una grabación puede traer sus sonidos en <video>.sonidos.json (grabar-sitio.cjs lo escribe). */
async function reel(navegador, pieza, salida, fps) {
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const tmp = [];
  const tramos = [];
  let portada = null;
  for (const [i, parte] of pieza.partes.entries()) {
    if (parte.escenas) {
      const mp4 = `${salida}.parte${i}.mp4`;
      tmp.push(mp4);
      const r = await motionVideo(navegador, parte.escenas, mp4, fps);
      portada ??= r.portada;
      tramos.push({ mp4, dur: r.dur, señales: r.señales });
    } else {
      const mp4 = path.join(RAIZ, parte.video);
      const dur = await duracion(mp4);
      const lado = mp4 + ".sonidos.json";
      tramos.push({ mp4, dur, señales: fs.existsSync(lado) ? JSON.parse(fs.readFileSync(lado, "utf8")) : [] });
    }
  }
  let t0 = 0;
  const señales = [];
  for (const [i, tr] of tramos.entries()) {
    if (i) señales.push({ t: Math.max(0, t0 - 0.12), tipo: "barrido" });
    for (const s of tr.señales) señales.push({ ...s, t: s.t + t0 });
    t0 += tr.dur;
  }
  const mudo = salida + ".mudo.mp4";
  tmp.push(mudo);
  const entradas = tramos.flatMap((t) => ["-i", t.mp4]);
  const filtro = tramos.map((_, i) => `[${i}:v]setsar=1,fps=${fps}[v${i}]`).join(";") + ";" + tramos.map((_, i) => `[v${i}]`).join("") + `concat=n=${tramos.length}:v=1:a=0[v]`;
  await ffmpeg([...entradas, "-filter_complex", filtro, "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", mudo]);
  await conSonido(mudo, señales, t0, salida + ".mp4");
  if (portada) fs.writeFileSync(salida + "-portada.png", portada);
  for (const f of tmp) fs.rmSync(f, { force: true });
  console.log(`\r✓ ${path.relative(process.cwd(), salida + ".mp4")} (${t0.toFixed(1)} s, ${señales.length} sonidos)`);
}

function duracion(mp4) {
  return new Promise((ok, mal) => {
    const p = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]);
    let o = "";
    p.stdout.on("data", (d) => (o += d));
    p.on("close", (c) => (c === 0 ? ok(Number(o)) : mal(new Error("ffprobe falló: " + mp4))));
  });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
