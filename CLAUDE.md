# pedidos — cómo se trabaja aquí

Herramienta de Juan Rodríguez (juanchito.dev): catálogo con pedidos por
WhatsApp, sin servidor. Juan decide; yo escribo el código y señalo los
problemas. En español, directo.

Detalle de cómo funciona y por qué: `README.md`.

## Reglas

- **HTML + CSS + JS a mano, cero dependencias.** Es una sola página. No se
  agrega framework, bundler ni librería sin que Juan lo pida.
- **El link es entrada hostil.** Todo dato del link pasa por `validar()` y se
  pinta con `textContent`. Nunca `innerHTML`, ni para "algo pequeño".
- **Nada de scripts ni estilos en línea**: rompen la CSP de `vercel.json`. Las
  variables CSS por elemento van con `el.style.setProperty` (eso sí se permite).
- **No cambiar el hash con anclas** (`href="#algo"`): en el catálogo el hash
  ES el catálogo, y un ancla lo borra. Para moverse, `irA()` en `app.js`.
- Cambiar el formato del link rompe los links que los negocios ya
  compartieron. Si hay que cambiarlo, se sube `VERSION` y se sigue leyendo la
  anterior.
- Colores sólo en `:root` de `estilos.css`. Los acentos con texto blanco
  encima tienen que pasar 4.5:1.
- Sólo se animan `transform` y `opacity`; todo tiene su variante
  `prefers-reduced-motion`; hover detrás de `@media (hover: hover)`.
- El ejemplo (`#demo`) no le escribe a nadie: enseña el mensaje y ya.

## Comprobar

Servir con `python3 -m http.server 8123` y probar de punta a punta en un
teléfono (390px): armar un catálogo, abrir el link, pedir, mirar el mensaje
de WhatsApp. Si se tocó el link o `validar()`, probar también un link con
HTML en el nombre y un link cortado.
