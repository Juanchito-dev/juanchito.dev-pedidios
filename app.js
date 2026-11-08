/*
 * pedidos — catálogo con pedidos por WhatsApp, sin servidor.
 *
 * El catálogo entero viaja dentro del link: JSON comprimido (deflate) y en
 * base64url, después de `#c=`. Lo que va detrás de `#` nunca llega a ningún
 * servidor, así que no hay nada que guardar, pagar ni mantener.
 *
 * Tres vistas según el hash:
 *   (vacío)  el armador, para el dueño del negocio
 *   #c=…     el catálogo, para sus clientes
 *   #demo    el catálogo de ejemplo (Tostado, que no existe)
 *
 * SEGURIDAD: el link lo puede escribir cualquiera, así que todo lo que sale
 * de él se valida (`validar`) y se pinta con textContent. Aquí no hay
 * innerHTML ni una sola vez.
 */

"use strict";

/* ---------------- datos ---------------- */

const VERSION = 1;
const MAX_PRODUCTOS = 60;
/** Por encima de esto el link funciona, pero se ve feo pegado en un chat. */
const LINK_LARGO = 1800;

/** El ejemplo. Un café inventado: los precios son de muestra. */
const DEMO = {
  v: 1,
  n: "Tostado",
  w: "570000000000",
  t: "Café de barrio. Tostamos el grano aquí mismo, los martes.",
  c: 0,
  p: [
    ["Café filtrado", 6000, "Del grano de la semana, colado en V60.", ["pequeño", "grande"]],
    ["Capuchino", 8500, "Doble espresso y leche texturizada.", ["leche entera", "leche de avena"]],
    ["Pandebono", 3500, "Recién horneado, sale a las 7 y a las 3.", []],
    ["Croissant de almendras", 9000, "", []],
    ["Bolsa de café en grano", 38000, "340 g, tostado medio.", ["en grano", "molido para filtro", "molido para greca"]],
  ],
};

/* ---------------- utilidades ---------------- */

const $ = (sel, raiz = document) => raiz.querySelector(sel);

const PESOS = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const plata = (n) => PESOS.format(n);

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* modo privado o almacenamiento lleno: el borrador no se guarda, nada más */
  }
}

function leer(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave) || "null");
  } catch {
    return null;
  }
}

/* ---------------- codificar el catálogo en el link ---------------- */

function aBase64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64url(texto) {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** "z" = comprimido, "j" = JSON plano (navegadores sin CompressionStream). */
async function codificar(datos) {
  const bytes = new TextEncoder().encode(JSON.stringify(datos));
  if ("CompressionStream" in window) {
    const flujo = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const comprimido = new Uint8Array(await new Response(flujo).arrayBuffer());
    return "z" + aBase64url(comprimido);
  }
  return "j" + aBase64url(bytes);
}

async function decodificar(texto) {
  const tipo = texto[0];
  const bytes = deBase64url(texto.slice(1));
  let json;
  if (tipo === "z") {
    if (!("DecompressionStream" in window)) throw new Error("navegador");
    const flujo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    json = await new Response(flujo).text();
  } else if (tipo === "j") {
    json = new TextDecoder().decode(bytes);
  } else {
    throw new Error("formato");
  }
  return validar(JSON.parse(json));
}

/**
 * Todo lo que entra por el link pasa por aquí. Devuelve una copia limpia o
 * lanza error: nunca se usa un dato del link sin pasar por esta función.
 */
function validar(d) {
  const texto = (v, max, obligatorio = false) => {
    if (typeof v !== "string") throw new Error("dato");
    const limpio = v.trim().slice(0, max);
    if (obligatorio && !limpio) throw new Error("dato");
    return limpio;
  };
  if (!d || typeof d !== "object" || d.v !== VERSION) throw new Error("version");
  const w = String(d.w);
  if (!/^\d{8,15}$/.test(w)) throw new Error("telefono");
  if (!Array.isArray(d.p) || d.p.length < 1 || d.p.length > MAX_PRODUCTOS) throw new Error("productos");
  return {
    v: VERSION,
    n: texto(d.n, 60, true),
    w,
    t: texto(d.t ?? "", 90),
    c: [0, 1, 2, 3].includes(d.c) ? d.c : 0,
    p: d.p.map((p) => {
      if (!Array.isArray(p)) throw new Error("producto");
      const precio = Number(p[1]);
      if (!Number.isInteger(precio) || precio < 0 || precio > 100_000_000) throw new Error("precio");
      const opciones = Array.isArray(p[3]) ? p[3].slice(0, 8).map((o) => texto(o, 30, true)) : [];
      return [texto(p[0], 60, true), precio, texto(p[2] ?? "", 140), opciones];
    }),
  };
}

/* ---------------- vistas ---------------- */

const VISTAS = ["armador", "catalogo", "roto"];

function mostrar(vista) {
  for (const v of VISTAS) $("#" + v).hidden = v !== vista;
  document.body.dataset.vista = vista;
}

async function enrutar() {
  const hash = location.hash;
  if (hash === "#demo") return pintarCatalogo(DEMO, true);
  if (hash.startsWith("#c=")) {
    try {
      return pintarCatalogo(await decodificar(hash.slice(3)), false);
    } catch (e) {
      $("#roto-texto").textContent =
        e.message === "navegador"
          ? "Tu navegador es muy antiguo para abrir este catálogo. Prueba con Chrome, Safari o Firefox actualizados."
          : "Puede que se haya cortado al copiarlo. Pídele al negocio que te lo vuelva a mandar completo.";
      document.title = "link roto — pedidos";
      return mostrar("roto");
    }
  }
  if (hash === "" || hash === "#") return pintarArmador();
  // otros anclajes (#app, #form-pedido): no cambian de vista
}

/* ---------------- el armador ---------------- */

const BORRADOR = "pedidos:borrador";

function filaArmador(valores = {}) {
  const fila = $("#t-producto-armador").content.firstElementChild.cloneNode(true);
  for (const input of fila.querySelectorAll("[data-k]")) {
    input.value = valores[input.dataset.k] ?? "";
  }
  fila.querySelector(".quitar").addEventListener("click", () => {
    if ($("#lista-armador").children.length > 1) fila.remove();
    else for (const i of fila.querySelectorAll("input")) i.value = "";
    guardarBorrador();
  });
  $("#lista-armador").append(fila);
  return fila;
}

function leerArmador() {
  const f = $("#form-armador");
  const productos = [...$("#lista-armador").children]
    .map((li) => {
      const v = (k) => li.querySelector(`[data-k="${k}"]`).value.trim();
      return {
        nombre: v("nombre"),
        precio: v("precio"),
        opciones: v("opciones"),
        desc: v("desc"),
      };
    })
    .filter((p) => p.nombre || p.precio || p.opciones || p.desc);
  return {
    nombre: f.nombre.value.trim(),
    whatsapp: f.whatsapp.value,
    frase: f.frase.value.trim(),
    color: Number(f.color.value),
    productos,
  };
}

function guardarBorrador() {
  guardar(BORRADOR, leerArmador());
}

function pintarArmador() {
  document.title = "pedidos — tu catálogo, pedidos directo a tu WhatsApp";
  document.body.dataset.color = $("#form-armador").color.value;
  mostrar("armador");
}

function iniciarArmador() {
  const f = $("#form-armador");
  const borrador = leer(BORRADOR);
  if (borrador) {
    f.nombre.value = borrador.nombre ?? "";
    f.whatsapp.value = borrador.whatsapp ?? "";
    f.frase.value = borrador.frase ?? "";
    const color = f.querySelector(`[name=color][value="${borrador.color}"]`);
    if (color) color.checked = true;
    (borrador.productos?.length ? borrador.productos : [{}]).forEach((p) => filaArmador(p));
  } else {
    filaArmador();
    filaArmador();
  }

  $("#agregar").addEventListener("click", () => {
    if ($("#lista-armador").children.length >= MAX_PRODUCTOS) return;
    filaArmador().querySelector("input").focus();
  });

  f.addEventListener("input", () => {
    document.body.dataset.color = f.color.value;
    $("#resultado").hidden = true;
    guardarBorrador();
  });

  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const aviso = $("#aviso-armador");
    const d = leerArmador();
    const problema = revisarArmador(d);
    if (problema) {
      aviso.textContent = problema;
      aviso.hidden = false;
      $("#resultado").hidden = true;
      return;
    }
    aviso.hidden = true;

    const datos = validar({
      v: VERSION,
      n: d.nombre,
      w: d.whatsapp.replace(/\D/g, ""),
      t: d.frase,
      c: d.color,
      p: d.productos.map((p) => [
        p.nombre,
        precioNumero(p.precio),
        p.desc,
        p.opciones.split(",").map((o) => o.trim()).filter(Boolean),
      ]),
    });
    const base = location.href.split("#")[0];
    const link = `${base}#c=${await codificar(datos)}`;
    $("#link").value = link;
    $("#abrir").href = link;
    $("#aviso-largo").hidden = link.length <= LINK_LARGO;
    $("#copiado").textContent = "";
    $("#resultado").hidden = false;
    $("#link").select();
  });

  $("#copiar").addEventListener("click", async () => {
    const link = $("#link").value;
    try {
      await navigator.clipboard.writeText(link);
      $("#copiado").textContent = "Copiado. Ya lo puedes pegar donde quieras.";
    } catch {
      $("#link").select();
      $("#copiado").textContent = "Selecciónalo y cópialo a mano: tu navegador no dejó copiarlo solo.";
    }
  });
}

/** Acepta "12.000", "12000" o "$ 12.000": los pesos no llevan decimales. */
function precioNumero(texto) {
  return Number(String(texto).replace(/\D/g, "")) || 0;
}

function revisarArmador(d) {
  if (!d.nombre) return "Falta el nombre de tu negocio.";
  const tel = d.whatsapp.replace(/\D/g, "");
  if (tel.length < 8 || tel.length > 15)
    return "El WhatsApp no parece completo. Ponlo con el indicativo del país, por ejemplo 57 300 123 4567.";
  if (tel.length === 10 && tel.startsWith("3"))
    return "Parece un celular de Colombia sin el indicativo: ponle 57 adelante (57 " + tel + ").";
  if (!d.productos.length) return "Agrega al menos un producto.";
  const sinNombre = d.productos.findIndex((p) => !p.nombre);
  if (sinNombre >= 0) return `Al producto ${sinNombre + 1} le falta el nombre.`;
  const sinPrecio = d.productos.findIndex((p) => !precioNumero(p.precio));
  if (sinPrecio >= 0) return `A "${d.productos[sinPrecio].nombre}" le falta el precio.`;
  return null;
}

/* ---------------- el catálogo ---------------- */

/** Lo que el cliente lleva: clave "índice|opción" → cantidad. */
let carrito = new Map();
let catalogo = null;
let esDemo = false;

function pintarCatalogo(datos, demo) {
  catalogo = datos;
  esDemo = demo;
  carrito = new Map();
  document.body.dataset.color = String(datos.c);
  document.title = `${datos.n} — pedidos`;

  $("#cat-ejemplo").hidden = !demo;
  $("#cat-nombre").textContent = datos.n;
  $("#cat-frase").textContent = datos.t;
  $("#cat-frase").hidden = !datos.t;
  $(".vista-titulo").textContent = `así le llegaría a ${datos.n} por WhatsApp:`;
  $("#vista-mensaje").hidden = true;

  const lista = $("#cat-lista");
  lista.replaceChildren();
  datos.p.forEach(([nombre, precio, desc, opciones], i) => {
    const li = $("#t-producto").content.firstElementChild.cloneNode(true);
    li.style.setProperty("--i", i);
    $(".producto-nombre", li).textContent = nombre;
    $(".producto-desc", li).textContent = desc;
    $(".producto-desc", li).hidden = !desc;
    $(".producto-precio", li).textContent = plata(precio);

    const select = $("select", li);
    if (opciones.length) {
      $(".producto-opcion", li).hidden = false;
      $(".producto-opcion .sr", li).textContent = `opción de ${nombre}`;
      for (const o of opciones) select.append(new Option(o, o));
    }
    const clave = () => `${i}|${opciones.length ? select.value : ""}`;
    const salida = $(".cantidad", li);
    const refrescar = () => {
      const n = carrito.get(clave()) ?? 0;
      salida.textContent = n;
      li.classList.toggle("elegido", n > 0);
    };
    $(".menos", li).setAttribute("aria-label", `quitar un ${nombre}`);
    $(".mas", li).setAttribute("aria-label", `agregar un ${nombre}`);
    $(".mas", li).addEventListener("click", () => {
      carrito.set(clave(), (carrito.get(clave()) ?? 0) + 1);
      refrescar();
      latido(salida);
      pintarResumen();
    });
    $(".menos", li).addEventListener("click", () => {
      const n = (carrito.get(clave()) ?? 0) - 1;
      if (n <= 0) carrito.delete(clave());
      else carrito.set(clave(), n);
      refrescar();
      pintarResumen();
    });
    select.addEventListener("change", refrescar);
    lista.append(li);
  });

  pintarResumen();
  mostrar("catalogo");
}

/** El número salta un poco al cambiar. Sólo transform (ver estilos.css). */
function latido(el) {
  el.classList.remove("late");
  void el.offsetWidth;
  el.classList.add("late");
}

function lineas() {
  return [...carrito.entries()].map(([clave, cantidad]) => {
    const [i, opcion] = clave.split("|");
    const [nombre, precio] = catalogo.p[Number(i)];
    return { nombre, opcion, cantidad, subtotal: precio * cantidad };
  });
}

function pintarResumen() {
  const items = lineas();
  const total = items.reduce((s, l) => s + l.subtotal, 0);
  const unidades = items.reduce((s, l) => s + l.cantidad, 0);

  const ul = $("#resumen");
  ul.replaceChildren(
    ...items.map((l) => {
      const li = document.createElement("li");
      const izq = document.createElement("span");
      izq.textContent = `${l.cantidad} × ${l.nombre}${l.opcion ? ` (${l.opcion})` : ""}`;
      const der = document.createElement("span");
      der.textContent = plata(l.subtotal);
      li.append(izq, der);
      return li;
    }),
  );
  $("#resumen-vacio").hidden = items.length > 0;
  $("#total-pedido").textContent = plata(total);

  $("#barra-total").hidden = unidades === 0;
  $("#barra-cuenta").textContent = `${unidades} ${unidades === 1 ? "producto" : "productos"}`;
  $("#barra-monto").textContent = plata(total);
}

function mensaje(cliente, entrega, direccion, nota) {
  const items = lineas();
  const total = items.reduce((s, l) => s + l.subtotal, 0);
  const partes = [
    `Hola ${catalogo.n}, quiero hacer este pedido:`,
    "",
    ...items.map((l) => `• ${l.cantidad} × ${l.nombre}${l.opcion ? ` (${l.opcion})` : ""} — ${plata(l.subtotal)}`),
    "",
    `Total: ${plata(total)}`,
    "",
    `Nombre: ${cliente}`,
    entrega === "domicilio" ? `Entrega: a domicilio — ${direccion}` : "Entrega: paso a recogerlo",
  ];
  if (nota) partes.push(`Nota: ${nota}`);
  return partes.join("\n");
}

function iniciarPedido() {
  const f = $("#form-pedido");
  f.addEventListener("change", () => {
    const domicilio = f.entrega.value === "domicilio";
    $("#campo-direccion").hidden = !domicilio;
  });

  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const aviso = $("#aviso-pedido");
    const cliente = f.cliente.value.trim();
    const entrega = f.entrega.value;
    const direccion = f.direccion.value.trim();
    let problema = null;
    if (!carrito.size) problema = "Elige al menos un producto con el +.";
    else if (!cliente) problema = "Escribe tu nombre, para que sepan de quién es el pedido.";
    else if (entrega === "domicilio" && !direccion) problema = "Falta la dirección para el domicilio.";
    if (problema) {
      aviso.textContent = problema;
      aviso.hidden = false;
      return;
    }
    aviso.hidden = true;

    const texto = mensaje(cliente, entrega, direccion, f.nota.value.trim());
    if (esDemo) {
      // El ejemplo no le escribe a nadie: enseña el mensaje y ya.
      $("#mensaje-ejemplo").textContent = texto;
      $("#vista-mensaje").hidden = false;
      irA($("#vista-mensaje"));
      return;
    }
    location.href = `https://wa.me/${catalogo.w}?text=${encodeURIComponent(texto)}`;
  });
}

/* ---------------- moverse sin tocar el hash ----------------
   En el catálogo el hash ES el catálogo (#c=…). Un enlace a un ancla
   (#form-pedido, #app) lo reemplazaría, y al recargar el cliente perdería
   la página. Así que estos dos se mueven con JS y no cambian la dirección. */

function irA(el) {
  const suave = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
  el.focus({ preventScroll: true });
}

$("#barra-ir").addEventListener("click", () => irA($("#form-pedido")));
$(".saltar").addEventListener("click", (e) => {
  e.preventDefault();
  irA($("#app"));
});

/* La barra del total sobra cuando el formulario del pedido ya está en
   pantalla: ahí se ve el total, y la barra taparía los campos. */
new IntersectionObserver(([e]) => {
  $("#barra-total").classList.toggle("fuera", e.isIntersecting);
}).observe($("#form-pedido"));

/* ---------------- arranque ---------------- */

iniciarArmador();
iniciarPedido();
addEventListener("hashchange", enrutar);
enrutar();
