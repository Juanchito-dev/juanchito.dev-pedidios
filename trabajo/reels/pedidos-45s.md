# Reel 45 s — Cómo hice `pedidos`

**Diagnóstico:** A (brief de una línea). Todos los datos salen del README de pedidos; no hay cifras inventadas.
**Público:** desarrolladores (el gancho es técnico) y, de rebote, dueños de negocio que ven la demo.
**Estructura:** dolor de código → solución rápida → demo visual → CTA a la bio.
**Voz en off:** unas 115 palabras, ritmo normal para 45 s.

| Tiempo | En pantalla | Voz en off | Texto sobreimpreso |
|---|---|---|---|
| 0–3 s | Tú frente al editor. Corte rápido a un diagrama: servidor + base de datos + factura mensual tachados. | "¿Dónde guardas el catálogo de un negocio si no quieres pagar un servidor?" | ¿Y si no hay servidor? |
| 3–13 s | Código: `JSON.stringify` → `CompressionStream('deflate-raw')` → base64url. La URL se arma letra por letra detrás de `#c=`. | "Lo metí entero en el link. El catálogo se vuelve JSON, el navegador lo comprime y queda detrás del numeral. Lo que va después del numeral nunca llega a ningún servidor." | todo el catálogo cabe en el link |
| 13–20 s | Pegas en el link un nombre con `<script>alert(1)</script>`. Se abre y aparece como texto plano. | "Como cualquiera puede escribir ese link, lo trato como entrada hostil. Le metí un script en el nombre y sale como texto." | entrada hostil → `textContent` |
| 20–38 s | Grabación de teléfono: armas "Tostado" con 5 productos, copias el link, lo abres como cliente, eliges un capuchino con su opción, ves el total, tocas pedir y se abre WhatsApp con el mensaje ordenado. | "Así se usa. El dueño arma su menú, comparte el link, el cliente elige, y el pedido le llega a WhatsApp con productos, total, nombre y entrega. Cinco productos ocupan unos 420 caracteres." | 5 productos = ~420 caracteres |
| 38–45 s | Tú a cámara, señalando arriba. | "Si tienes un negocio, arma tu catálogo gratis con el link de mi bio. Y si eres dev, sígueme: el próximo te muestro cómo lo comprimí." | link en la bio |

## Ganchos alternativos (0–3 s)

- **A (el del guion):** "¿Dónde guardas el catálogo de un negocio si no quieres pagar un servidor?" La pregunta es un dolor real de dev y obliga a esperar la respuesta.
- **B:** "Hice una tienda que cabe entera en un link." Es más corto y visual; sirve mejor si el público es mixto.
- **C:** "Base de datos: cero. Servidor: cero. Pedidos: llegan a WhatsApp." Es para texto en pantalla sin voz. Es más fuerte para scroll en silencio, pero se parece más a una plantilla.

## CTA alternativos

- "Arma tu catálogo con el link de mi bio." Es el más directo para negocios.
- "Comenta CATÁLOGO y te paso el link." Sube los comentarios. Necesita que respondas o tener un bot de DM.

## Pendientes

- `[NEED: confirmar]` que pedidos es gratis y que el link de la bio lleva al armador.
- `[NEED: confirmar]` que habrá un segundo reel técnico, si se mantiene el "el próximo te muestro".
- Grabar la demo en un teléfono real a 390 px. Los subtítulos tienen que quemarse en el video porque la mayoría lo ve sin sonido.
