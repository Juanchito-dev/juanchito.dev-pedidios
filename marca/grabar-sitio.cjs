#!/usr/bin/env node
/*
 * Graba un sitio en vertical (1080x1920, vista de teléfono) bajando por la página,
 * para meterlo en un reel entre el gancho y el cierre.
 *
 *   node marca/grabar-sitio.cjs <url> <salida.mp4> [--segundos 10] [--paradas 0,0.25,0.5]
 *
 * --paradas: puntos de la página (0 = arriba, 1 = abajo) donde la cámara se detiene
 * un momento. Las animaciones CSS del sitio se ralentizan mientras se captura, así
 * que en el video se ven a su velocidad real.
 */
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");

const FPS = 30;
const LENTO = 0.2; // el sitio corre a 1/5 mientras se toma cada fotograma

async function main() {
  const [url, salida] = process.argv.slice(2);
  if (!url || !salida) throw new Error("Uso: node marca/grabar-sitio.cjs <url> <salida.mp4> [--segundos 10] [--paradas 0,0.3,0.6]");
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
  const segundos = Number(arg("--segundos", 10));
  const paradas = arg("--paradas", "0,0.33,0.66,1").split(",").map(Number);

  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: LENTO });
  const alto = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);

  // recorrido: se queda quieto en cada parada y baja suave entre una y otra
  const tramos = paradas.length - 1;
  const quieto = 0.35; // fracción de cada tramo detenida
  const suave = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const posicion = (k) => {
    if (tramos <= 0) return paradas[0] * alto;
    const i = Math.min(tramos - 1, Math.floor(k * tramos));
    const local = k * tramos - i;
    const m = local < quieto ? 0 : suave((local - quieto) / (1 - quieto));
    return (paradas[i] + (paradas[i + 1] - paradas[i]) * m) * alto;
  };

  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", salida], { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(segundos * FPS);
  for (let f = 0; f < total; f++) {
    const y = posicion(f / (total - 1));
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
    const png = await p.screenshot({ type: "png" });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % FPS === 0) process.stdout.write(`\r  ${Math.round((f / total) * 100)}%`);
  }
  ff.stdin.end();
  await new Promise((ok, mal) => ff.on("close", (c) => (c === 0 ? ok() : mal(new Error("ffmpeg falló")))));
  await b.close();
  // los sonidos de la grabación: un deslizamiento en cada bajada
  const tramo = segundos / Math.max(1, tramos);
  const señales = Array.from({ length: tramos }, (_, i) => ({ t: (i + quieto) * tramo, tipo: "desliza", dur: (1 - quieto) * tramo }));
  require("node:fs").writeFileSync(salida + ".sonidos.json", JSON.stringify(señales));
  console.log(`\r✓ ${salida} (${segundos} s)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
