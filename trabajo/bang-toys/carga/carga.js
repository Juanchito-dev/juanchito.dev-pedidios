/*
 * Carga de los 15 productos para la demo de Bang Toys.
 *
 * Todo vive en el celular de quien la llena: los datos en localStorage y las
 * fotos en IndexedDB (así sobreviven si cierra la pestaña). Al final arma un
 * .zip con las fotos numeradas y una hoja productos.csv, y lo comparte (a
 * WhatsApp) o, si el navegador no deja compartir archivos, lo descarga.
 * No hay servidor ni cuentas. Todo se pinta con textContent.
 */
(() => {
  "use strict";

  const TOTAL = 15;
  const MAX_FOTOS = 3;
  const CATEGORIAS = ["Figuras y anime", "Funko Pop", "Hot Wheels", "Bloques", "Peluches", "Camisetas", "Llaveros y accesorios", "Cubos y juegos"];
  const MEZCLA = [["Figuras y anime", 4], ["Funko Pop", 3], ["Hot Wheels", 2], ["Peluches", 2], ["Camisetas", 2], ["Llaveros y accesorios", 2]];
  const ESTADOS = [["disponible", "Sí hay"], ["agotado", "Agotado"], ["por encargo", "Por encargo"]];
  const EJEMPLOS = ["Funko Pop Goku Super Saiyan", "Hot Wheels Nissan Skyline", "Figura Luffy Gear 5", "Peluche Stitch 30 cm", "Camiseta Spider-Man niño"];
  const CLAVE_DATOS = "bangtoys-carga-v1";

  const $ = (s, r = document) => r.querySelector(s);
  const clave = (n) => "p" + String(n).padStart(2, "0");
  const dos = (n) => String(n).padStart(2, "0");
  const pesos = (v) => "$ " + Number(v).toLocaleString("es-CO");

  /* ---------- estado ---------- */
  const filas = {};
  for (let n = 1; n <= TOTAL; n++) filas[clave(n)] = { n, nombre: "", precio: null, categoria: "", personaje: "", estado: "disponible", fotos: [] };
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_DATOS) || "null");
    if (g) for (const k in filas) if (g[k]) {
      const v = g[k];
      Object.assign(filas[k], {
        nombre: String(v.nombre || ""), precio: Number(v.precio) > 0 ? Number(v.precio) : null,
        categoria: CATEGORIAS.includes(v.categoria) ? v.categoria : "", personaje: String(v.personaje || ""),
        estado: ESTADOS.some(([e]) => e === v.estado) ? v.estado : "disponible",
        fotos: Array.isArray(v.fotos) ? v.fotos.filter((x) => typeof x === "string").slice(0, MAX_FOTOS) : [],
      });
    }
  } catch { /* sin almacenamiento: funciona igual mientras la pestaña esté abierta */ }

  function guardarDatos() {
    try { localStorage.setItem(CLAVE_DATOS, JSON.stringify(filas)); } catch {}
  }

  /* ---------- fotos en IndexedDB (con respaldo en memoria) ---------- */
  const memoria = new Map();
  const abrirBD = new Promise((ok) => {
    try {
      const r = indexedDB.open("bangtoys-carga", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("fotos");
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch { ok(null); }
  });
  async function fotoPoner(id, blob) {
    memoria.set(id, blob);
    const bd = await abrirBD;
    if (!bd) return;
    await new Promise((ok) => { const t = bd.transaction("fotos", "readwrite"); t.objectStore("fotos").put(blob, id); t.oncomplete = ok; t.onerror = ok; });
  }
  async function fotoLeer(id) {
    if (memoria.has(id)) return memoria.get(id);
    const bd = await abrirBD;
    if (!bd) return null;
    return new Promise((ok) => {
      const r = bd.transaction("fotos").objectStore("fotos").get(id);
      r.onsuccess = () => { if (r.result) memoria.set(id, r.result); ok(r.result || null); };
      r.onerror = () => ok(null);
    });
  }
  async function fotoBorrar(id) {
    memoria.delete(id);
    const bd = await abrirBD;
    if (!bd) return;
    bd.transaction("fotos", "readwrite").objectStore("fotos").delete(id);
  }

  /* achica la foto (máx. 1600 px) para que el paquete no pese tanto */
  async function achicar(file) {
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const b = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.84));
      return b || file;
    } catch { return file; }
  }

  /* ---------- tarjetas ---------- */
  const tarjetas = {};
  const urls = new Map();

  function crearTarjeta(k) {
    const f = filas[k];
    const li = $("#t-tarjeta").content.firstElementChild.cloneNode(true);
    $(".t-num", li).textContent = dos(f.n);
    for (const inp of li.querySelectorAll("[data-k]")) {
      inp.id = inp.dataset.k + "-" + k;
      const lab = li.querySelector(`label[data-for="${inp.dataset.k}"]`);
      if (lab) lab.htmlFor = inp.id;
    }
    const sel = $('[data-k="categoria"]', li);
    sel.append(new Option("Elige…", ""));
    for (const c of CATEGORIAS) sel.append(new Option(c, c));
    $('[data-k="nombre"]', li).placeholder = "Ej: " + EJEMPLOS[(f.n - 1) % EJEMPLOS.length];
    const est = $(".estados", li);
    for (const [v, t] of ESTADOS) {
      const l = document.createElement("label");
      const r = document.createElement("input");
      r.type = "radio"; r.name = "estado-" + k; r.value = v; r.id = "estado-" + k + "-" + v.replace(" ", "-");
      l.append(r, document.createTextNode(t));
      est.append(l);
    }
    $('[data-k="nombre"]', li).addEventListener("input", (e) => cambiar(k, { nombre: e.target.value }));
    $('[data-k="personaje"]', li).addEventListener("input", (e) => cambiar(k, { personaje: e.target.value }));
    sel.addEventListener("change", (e) => cambiar(k, { categoria: e.target.value }));
    const precio = $('[data-k="precio"]', li);
    precio.addEventListener("input", (e) => {
      const d = e.target.value.replace(/\D/g, "").slice(0, 9);
      cambiar(k, { precio: d ? Number(d) : null });
    });
    precio.addEventListener("blur", () => { const p = filas[k].precio; precio.value = p ? pesos(p) : ""; });
    precio.addEventListener("focus", () => { const p = filas[k].precio; precio.value = p ? String(p) : ""; });
    est.addEventListener("change", (e) => cambiar(k, { estado: e.target.value }));
    tarjetas[k] = li;
    return li;
  }

  function pintarCampos(k) {
    const f = filas[k], li = tarjetas[k];
    $('[data-k="nombre"]', li).value = f.nombre;
    $('[data-k="personaje"]', li).value = f.personaje;
    $('[data-k="categoria"]', li).value = f.categoria;
    $('[data-k="precio"]', li).value = f.precio ? pesos(f.precio) : "";
    const r = li.querySelector(`input[name="estado-${k}"][value="${f.estado}"]`);
    if (r) r.checked = true;
  }

  async function pintarFotos(k) {
    const f = filas[k], caja = $(".fotos", tarjetas[k]);
    const nodos = [];
    const validas = [];
    for (const fid of f.fotos) if (await fotoLeer(fid)) validas.push(fid);
    if (validas.length !== f.fotos.length) { f.fotos = validas; cambiar(k, {}); }
    for (const [i, fid] of f.fotos.entries()) {
      const blob = await fotoLeer(fid);
      if (!urls.has(fid)) urls.set(fid, URL.createObjectURL(blob));
      const d = document.createElement("div");
      d.className = "foto" + (i === 0 ? " principal" : "");
      const img = document.createElement("img");
      img.src = urls.get(fid);
      img.alt = (f.nombre || "Producto " + dos(f.n)) + (i === 0 ? ", foto principal" : ", foto " + (i + 1));
      const q = document.createElement("button");
      q.type = "button"; q.className = "quitar"; q.textContent = "×";
      q.setAttribute("aria-label", "Quitar esta foto");
      q.addEventListener("click", () => quitarFoto(k, fid));
      d.append(img, q);
      nodos.push(d);
    }
    if (f.fotos.length < MAX_FOTOS) {
      const primera = f.fotos.length === 0;
      const lab = document.createElement("label");
      lab.className = "subir" + (primera ? " principal" : "");
      const b = document.createElement("b"); b.textContent = "+";
      const t = document.createElement("span"); t.textContent = primera ? "tomar o subir foto" : "otra foto";
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*"; inp.id = "foto-" + k;
      inp.addEventListener("change", () => { if (inp.files[0]) agregarFoto(k, inp.files[0], lab); inp.value = ""; });
      lab.htmlFor = inp.id;
      lab.append(b, t, inp);
      nodos.push(lab);
    }
    caja.replaceChildren(...nodos);
  }

  const completo = (f) => f.fotos.length > 0 && f.nombre.trim() && f.precio > 0 && f.categoria;

  function pintarEstado(k) {
    const f = filas[k], li = tarjetas[k];
    const ok = completo(f);
    li.classList.toggle("lista-ok", !!ok);
    const falta = [];
    if (!f.fotos.length) falta.push("foto");
    if (!f.nombre.trim()) falta.push("nombre");
    if (!(f.precio > 0)) falta.push("precio");
    if (!f.categoria) falta.push("categoría");
    $(".t-estado", li).textContent = ok ? "listo ✓" : falta.length === 4 ? "por llenar" : "falta " + falta.join(", ");
  }

  function pintarResumen() {
    const todas = Object.values(filas);
    const listos = todas.filter(completo).length;
    $("#prog-listos").textContent = listos;
    $("#prog-barra").style.width = (listos / TOTAL) * 100 + "%";
    const ul = $("#mezcla");
    ul.replaceChildren(...MEZCLA.map(([cat, meta]) => {
      const hay = todas.filter((f) => f.categoria === cat).length;
      const li = document.createElement("li");
      if (hay >= meta) li.className = "lleno";
      const b = document.createElement("b"); b.textContent = `${Math.min(hay, meta)}/${meta}`;
      li.append(document.createTextNode(cat + " "), b);
      return li;
    }));
    const empezados = todas.filter((f) => f.nombre.trim() || f.fotos.length).length;
    $("#final-resumen").textContent = listos === TOTAL
      ? "¡Los 15 están listos! Toca el botón y elige mi chat en WhatsApp."
      : empezados
        ? `Llevas ${listos} de 15 listos. Puedes enviarme lo que tengas y seguir después.`
        : "Cuando termines, toca el botón. Se arma un paquete con las fotos y los datos, y lo mandas a mi WhatsApp.";
  }

  function cambiar(k, parche) {
    Object.assign(filas[k], parche);
    guardarDatos();
    pintarEstado(k);
    pintarResumen();
  }

  async function agregarFoto(k, file, lab) {
    const err = $(".error", tarjetas[k]);
    if (file.type && !file.type.startsWith("image/")) { err.hidden = false; err.textContent = "Ese archivo no es una foto."; return; }
    lab.setAttribute("aria-busy", "true");
    lab.querySelector("span").textContent = "guardando…";
    const blob = await achicar(file);
    const fid = k + "-" + Date.now().toString(36);
    await fotoPoner(fid, blob);
    err.hidden = true;
    filas[k].fotos = [...filas[k].fotos, fid];
    cambiar(k, {});
    await pintarFotos(k);
  }

  async function quitarFoto(k, fid) {
    filas[k].fotos = filas[k].fotos.filter((x) => x !== fid);
    if (urls.has(fid)) { URL.revokeObjectURL(urls.get(fid)); urls.delete(fid); }
    await fotoBorrar(fid);
    cambiar(k, {});
    await pintarFotos(k);
  }

  /* ---------- el paquete: .zip sin compresión (las fotos ya vienen comprimidas) ---------- */
  const TABLA_CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zip(archivos) {
    const enc = new TextEncoder();
    const partes = [], central = [];
    let desplaz = 0;
    const d = new Date();
    const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const fecha = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const { nombre, datos } of archivos) {
      const n = enc.encode(nombre), crc = crc32(datos), tam = datos.length;
      const loc = new DataView(new ArrayBuffer(30));
      loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true);
      loc.setUint16(8, 0, true); loc.setUint16(10, hora, true); loc.setUint16(12, fecha, true);
      loc.setUint32(14, crc, true); loc.setUint32(18, tam, true); loc.setUint32(22, tam, true);
      loc.setUint16(26, n.length, true); loc.setUint16(28, 0, true);
      partes.push(new Uint8Array(loc.buffer), n, datos);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true); cen.setUint16(12, hora, true); cen.setUint16(14, fecha, true);
      cen.setUint32(16, crc, true); cen.setUint32(20, tam, true); cen.setUint32(24, tam, true);
      cen.setUint16(28, n.length, true); cen.setUint32(42, desplaz, true);
      central.push(new Uint8Array(cen.buffer), n);
      desplaz += 30 + n.length + tam;
    }
    const tamCentral = central.reduce((s, p) => s + p.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
    fin.setUint32(12, tamCentral, true); fin.setUint32(16, desplaz, true);
    return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: "application/zip" });
  }

  const limpio = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "producto";
  const celda = (v) => { const s = String(v ?? ""); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

  async function armarPaquete() {
    const archivos = [];
    const filasCsv = [["numero", "nombre", "precio", "categoria", "personaje", "estado", "fotos"]];
    for (const f of Object.values(filas)) {
      if (!f.nombre.trim() && !f.fotos.length) continue;
      const nombresFotos = [];
      for (const [i, fid] of f.fotos.entries()) {
        const blob = await fotoLeer(fid);
        if (!blob) continue;
        const ext = blob.type === "image/png" ? "png" : "jpg";
        const nombre = `${dos(f.n)}-${limpio(f.nombre)}${i ? "-" + (i + 1) : ""}.${ext}`;
        archivos.push({ nombre: "fotos/" + nombre, datos: new Uint8Array(await blob.arrayBuffer()) });
        nombresFotos.push(nombre);
      }
      filasCsv.push([dos(f.n), f.nombre.trim(), f.precio ?? "", f.categoria, f.personaje.trim(), f.estado, nombresFotos.join(" | ")]);
    }
    const csv = "﻿" + filasCsv.map((r) => r.map(celda).join(",")).join("\r\n") + "\r\n";
    archivos.unshift({ nombre: "productos.csv", datos: new TextEncoder().encode(csv) });
    return { blob: zip(archivos), productos: filasCsv.length - 1, fotos: archivos.length - 1 };
  }

  let urlPaquete = null;
  async function enviar(boton) {
    const estado = $("#estado-envio");
    const listos = Object.values(filas).filter(completo).length;
    const algo = Object.values(filas).some((f) => f.nombre.trim() || f.fotos.length);
    estado.className = "estado-envio";
    if (!algo) { estado.classList.add("mal"); estado.textContent = "Todavía no hay nada para enviar. Empieza por el producto 01."; $("#producto-p01")?.scrollIntoView({ behavior: "smooth" }); return; }
    boton.disabled = true;
    estado.textContent = "armando el paquete…";
    try {
      const { blob, productos, fotos } = await armarPaquete();
      const archivo = new File([blob], `bang-toys-productos-${new Date().toISOString().slice(0, 10)}.zip`, { type: "application/zip" });
      const texto = `Juan, aquí van ${productos} productos (${listos} completos) y ${fotos} fotos para la demo de Bang Toys.`;
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: "Productos Bang Toys", text: texto });
          estado.classList.add("bien");
          estado.textContent = "Listo. Si lo mandaste a mi chat, ya me llegó. Puedes seguir llenando y enviar otra vez.";
          return;
        } catch (e) {
          if (e && e.name === "AbortError") { estado.textContent = "No se envió. Toca el botón cuando quieras."; return; }
        }
      }
      // sin compartir archivos: se descarga y se adjunta a mano en WhatsApp
      if (urlPaquete) URL.revokeObjectURL(urlPaquete);
      urlPaquete = URL.createObjectURL(archivo);
      const a = $("#descargar");
      a.href = urlPaquete; a.download = archivo.name; a.hidden = false;
      a.click();
      estado.classList.add("bien");
      estado.textContent = "El paquete se descargó. Ábrelo desde WhatsApp en mi chat: clip → Documento → el archivo .zip.";
    } catch {
      estado.classList.add("mal");
      estado.textContent = "No se pudo armar el paquete. Intenta otra vez o mándame las fotos directo por WhatsApp.";
    } finally {
      boton.disabled = false;
    }
  }

  /* ---------- arranque ---------- */
  const lista = $("#lista");
  for (let n = 1; n <= TOTAL; n++) {
    const li = crearTarjeta(clave(n));
    li.id = "producto-" + clave(n);
    lista.append(li);
  }
  for (const k in filas) { pintarCampos(k); pintarEstado(k); pintarFotos(k); }
  pintarResumen();
  $("#enviar").addEventListener("click", (e) => enviar(e.currentTarget));
  $("#enviar-arriba").addEventListener("click", () => {
    $(".final").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
})();
