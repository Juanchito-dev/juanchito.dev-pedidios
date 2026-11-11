# raspa_ — auditoría de conversión (CRO + copy + SEO)

Rama con los cambios: `claude/mejoras-conversion` en `Juanchito-dev/juanchito.dev-raspa`.

## Hecho

| Problema | Cambio | Por qué |
|---|---|---|
| Al raspar la demo (el momento "ajá") sólo salía "raspar otra" | Puente: "Esto mismo, con tus premios y tu WhatsApp." + botón "arma la tuya" | Pedir la acción justo cuando el visitante acaba de sentir el producto |
| La portada no tenía botón | "arma tu promoción" + "Gratis y sin crear cuenta." | Quien ya entendió no tiene que bajar hasta el formulario |
| El mayor diferenciador (no se puede hacer trampa) sólo estaba en el pie | Sección "así funciona": 3 pasos + 3 garantías | Responde a "¿y si me hacen trampa?" antes del formulario |
| Cada cliente que juega es un negocio potencial, y no se le invitaba | "¿Tienes un negocio? Haz tu propio raspa y gana, gratis." después de jugar | Bucle de crecimiento: cada promoción trae nuevos negocios |
| Ningún camino hacia trabajos pagados de Juan | Pie: "¿Tu negocio necesita un bot o una herramienta a la medida? Escríbeme en juanchito.dev." | Lleva clientes B2B a juanchito.dev |
| El link compartido no tenía vista previa | Open Graph (título, descripción, idioma) | Se ve mejor en WhatsApp e Instagram |
| A 390 px el ejemplo del premio salía cortado | Columna del selector más angosta y ejemplo "Pan gratis" | Pulido del formulario |

## Pendiente (necesita a Juan)

1. **Imagen para compartir (`og:image`)** de 1200×630 y el dominio final, para poner `og:url` y una URL absoluta. Sin eso, WhatsApp muestra la vista previa sin imagen.
2. **Medición:** hoy no hay forma de saber cuántos crean una promoción o cuántos llegan desde "Haz tu propio raspa y gana". Opción sin dependencias: Vercel Web Analytics (habría que permitirlo en la CSP).
3. **Prueba social:** cuando haya negocios usándolo, una línea como "N promociones creadas" o el nombre de un negocio real.
4. **Datos estructurados (JSON-LD):** el CLAUDE.md de raspa prohíbe scripts en línea. Se puede servir como archivo aparte si se quiere.
