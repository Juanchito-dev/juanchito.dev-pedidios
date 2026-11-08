# pedidos

Un negocio arma su catálogo en un minuto y recibe un link. Sus clientes lo
abren, eligen, y el pedido le llega por WhatsApp ya ordenado: productos,
opciones, total, nombre y entrega.

Sin servidor, sin base de datos, sin cuentas y sin comisiones: el catálogo
entero viaja **dentro del link**.

Un proyecto de [juanchito.dev](https://juanchito.dev).

## Cómo funciona

| Dirección  | Qué muestra                                            |
| ---------- | ------------------------------------------------------ |
| `/`        | El armador: el dueño escribe su negocio y sus productos |
| `/#c=…`    | El catálogo de un negocio, para sus clientes           |
| `/#demo`   | El ejemplo: Tostado, un café que no existe             |

El catálogo se guarda como JSON, se comprime (`deflate-raw`, con
`CompressionStream` del navegador) y va en base64url detrás de `#c=`. Lo que
va detrás de `#` no llega a ningún servidor. El ejemplo (cinco productos,
con descripciones y opciones) ocupa unos 420 caracteres.

El pedido sale por `https://wa.me/<número>?text=<mensaje>`: se abre WhatsApp
con el mensaje listo y el cliente decide si lo envía.

## Archivos

- `index.html` — las tres vistas y las plantillas de cada fila.
- `estilos.css` — todos los colores están arriba, en `:root`.
- `app.js` — todo lo demás. Empieza por el comentario de arriba.
- `vercel.json` — cabeceras de seguridad, CSP incluida.

## Correrlo

No hay nada que instalar ni que compilar:

```bash
python3 -m http.server 8123
```

y abrir `http://localhost:8123`. Para publicarlo, cualquier hosting de
archivos estáticos sirve. Las cabeceras de `vercel.json` sólo las aplica Vercel.

## Seguridad

El link lo puede escribir cualquiera, así que se trata como entrada hostil:

- Todo lo que sale del link pasa por `validar()` en `app.js`: tipos, largos,
  número de teléfono sólo con dígitos, precios enteros, máximo 60 productos.
- Todo se pinta con `textContent` o `new Option()`. **No hay `innerHTML`.**
- La CSP no deja correr ningún script que no sea `app.js`. No hay scripts
  en línea, así que no hace falta `'unsafe-inline'`.

Probado: un link con `<img onerror>` y `<script>` en el nombre se muestra como
texto y no ejecuta nada.

## Límites honestos

- Los precios son en pesos colombianos, sin decimales.
- No hay fotos de producto: no caben en un link.
- Si el negocio cambia un precio, tiene que crear y compartir un link nuevo.
  El viejo sigue funcionando con los precios viejos.
- Los navegadores sin `DecompressionStream` (anteriores a 2023) no abren los
  links comprimidos y ven un aviso. Chrome, Safari y Firefox actuales sí.
