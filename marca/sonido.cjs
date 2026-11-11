/*
 * Efectos de sonido de la marca, sintetizados (sin samples ni licencias).
 * Cada efecto se genera desde ruido y ondas, con semilla fija: el mismo reel
 * suena igual cada vez que se renderiza.
 *
 *   mezclar([{ t: 1.2, tipo: "golpe" }, …], duracion) → Buffer WAV (48 kHz, estéreo)
 *
 * Tipos: barrido, subida, golpe, tecla, enter, tic, pop, desliza.
 */
const SR = 48000;

function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* filtro pasabanda (biquad RBJ) con frecuencia que puede cambiar en cada muestra */
function pasabanda(x, frec, q) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const f = typeof frec === "function" ? frec(i / SR) : frec;
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
    const al = Math.sin(w) / (2 * q);
    const a0 = 1 + al;
    const b0 = al / a0, b2 = -al / a0, a1 = (-2 * Math.cos(w)) / a0, a2 = (1 - al) / a0;
    const v = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

function pasaaltos(x, f) {
  const y = new Float32Array(x.length);
  const rc = 1 / (2 * Math.PI * f), a = rc / (rc + 1 / SR);
  let px = 0, py = 0;
  for (let i = 0; i < x.length; i++) { py = a * (py + x[i] - px); px = x[i]; y[i] = py; }
  return y;
}

const ruido = (n, r) => Float32Array.from({ length: n }, () => r() * 2 - 1);
const muestras = (s) => Math.max(1, Math.round(s * SR));

/* Cada generador devuelve { l, r } (canales) */
const EFECTOS = {
  // barrido en ácido: viaja de izquierda a derecha, como la franja en pantalla
  barrido(r, o = {}) {
    const d = o.dur ?? 0.42, n = muestras(d);
    const b = pasabanda(ruido(n, r), (t) => 350 + 3200 * Math.sin(Math.PI * Math.min(1, t / d)) ** 1.5, 1.1);
    return paneo(b, (k) => Math.sin(Math.PI * k) ** 2 * 1.6, (k) => -0.85 + 1.7 * k);
  },
  // cada línea de título que sube
  subida(r, o = {}) {
    const d = o.dur ?? 0.24, n = muestras(d);
    const b = pasabanda(ruido(n, r), (t) => 300 + 1500 * (t / d), 1.4);
    return paneo(b, (k) => Math.sin(Math.PI * k) ** 2 * 0.45, () => 0);
  },
  // la palabra en grafiti cae como un sello
  golpe(r) {
    const n = muestras(0.32), x = new Float32Array(n);
    let fase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      fase += (2 * Math.PI * (48 + 120 * Math.exp(-t * 22))) / SR;
      x[i] = Math.sin(fase) * Math.exp(-t * 11) * 0.95;
    }
    const chasquido = pasabanda(ruido(n, r), 2200, 0.9);
    for (let i = 0; i < n; i++) x[i] += chasquido[i] * Math.exp(-(i / SR) * 70) * 0.55;
    return paneo(x, () => 1, () => 0);
  },
  // tecla mecánica (cada una distinta)
  tecla(r, o = {}) {
    const n = muestras(0.06), x = new Float32Array(n);
    const clic = pasaaltos(ruido(n, r), 1800);
    const reso = pasabanda(ruido(n, r), 2600 + r() * 1900, 6);
    const tono = 150 + r() * 60;
    const g = (o.fuerza ?? 1) * (0.55 + r() * 0.45);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      x[i] = g * (clic[i] * Math.exp(-t * 700) * 0.7 + reso[i] * Math.exp(-t * 160) * 1.4 + Math.sin(2 * Math.PI * tono * t) * Math.exp(-t * 90) * 0.18);
    }
    const p = (r() - 0.5) * 0.5;
    return paneo(x, () => 0.5, () => p);
  },
  enter(r) { return EFECTOS.tecla(r, { fuerza: 1.7 }); },
  // cada letra de juanchito.dev
  tic(r) {
    const n = muestras(0.05), x = new Float32Array(n);
    const f = 1700 + r() * 250;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      x[i] = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * Math.exp(-t * 95) * 0.22;
    }
    return paneo(x, () => 1, () => 0);
  },
  // la píldora del CTA
  pop(r) {
    const n = muestras(0.18), x = new Float32Array(n);
    let fase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      fase += (2 * Math.PI * (380 + 900 * Math.min(1, t / 0.07))) / SR;
      const ataque = Math.min(1, t / 0.003);
      x[i] = Math.sin(fase) * ataque * Math.exp(-t * 26) * 0.7;
    }
    const c = pasaaltos(ruido(n, r), 3000);
    for (let i = 0; i < n; i++) x[i] += c[i] * Math.exp(-(i / SR) * 400) * 0.3;
    return paneo(x, () => 1, () => 0);
  },
  // la página bajando en la grabación del sitio
  desliza(r, o = {}) {
    const d = o.dur ?? 0.7, n = muestras(d);
    const b = pasabanda(ruido(n, r), (t) => 220 + 700 * Math.sin(Math.PI * Math.min(1, t / d)), 0.9);
    return paneo(b, (k) => Math.sin(Math.PI * k) ** 2 * 0.5, () => 0);
  },
};

function paneo(x, volumen, pan) {
  const l = new Float32Array(x.length), rr = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const k = i / x.length, v = volumen(k), p = Math.max(-1, Math.min(1, pan(k)));
    const ang = ((p + 1) * Math.PI) / 4;
    l[i] = x[i] * v * Math.cos(ang) * 1.41;
    rr[i] = x[i] * v * Math.sin(ang) * 1.41;
  }
  return { l, r: rr };
}

const VOLUMEN = { barrido: 0.8, subida: 0.85, golpe: 0.9, tecla: 0.8, enter: 0.8, tic: 0.6, pop: 0.7, desliza: 0.45 };

function mezclar(señales, duracion, semilla = 7) {
  const r = azar(semilla);
  const n = muestras(duracion);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (const s of señales) {
    const gen = EFECTOS[s.tipo];
    if (!gen || s.t < 0 || s.t >= duracion) continue;
    const { l, r: rr } = gen(r, s);
    const v = VOLUMEN[s.tipo] * (s.vol ?? 1);
    const i0 = muestras(s.t);
    for (let i = 0; i < l.length && i0 + i < n; i++) { L[i0 + i] += l[i] * v; R[i0 + i] += rr[i] * v; }
  }
  // limitador suave y techo a -3 dB
  let pico = 1e-9;
  for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2); pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i])); }
  const g = Math.min(1, 0.708 / pico);
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  return buf;
}

module.exports = { mezclar, EFECTOS };
