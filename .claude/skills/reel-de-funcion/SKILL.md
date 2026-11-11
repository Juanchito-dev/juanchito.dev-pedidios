---
name: reel-de-funcion
description: "Convierte una función, script o feature de bot recién terminado en un Reel de Instagram listo para grabar. Úsala cuando Juan diga que terminó algo ('terminé', 'ya quedó', 'nueva función', 'nuevo script', 'acabo de hacer'), pegue código, un diff, un commit o un repo, o pida 'documéntalo para un reel', 'hazme el reel', 'guion de esto'. Produce guion por segundos, plan de grabación con el código real a mostrar, caption y hashtags."
---

# Reel de función

Cada función o script terminado se vuelve un Reel. Esta skill lo arma de punta a punta.

## Antes de escribir

1. Lee `.agents/product-marketing.md`, sobre todo **Marca personal** y **Learnings**.
2. Lee el código que hizo Juan: el diff, el archivo o el repo. Si sólo hay una descripción, pide el código o el commit. El Reel muestra código real y tiene que salir del código real.
3. Saca del código estos datos, sin inventar ninguno:
   - **Tarea tediosa que elimina:** qué hacía una persona a mano antes.
   - **Truco técnico:** la línea o el patrón que un dev querría copiar.
   - **Resultado visible:** qué se ve en pantalla cuando corre.
   - **Números reales:** tiempo, líneas, llamadas o costo, sólo si salen del código o de una prueba. Si no hay, marca `[NEED: medir X]`.
4. Elige el público principal del Reel. **B2B** si la tarea es de negocio (pedidos, facturas, respuestas, reportes) o **dev** si lo interesante es el truco. El otro público entra en el CTA.

## Estructura (30–45 s)

| Bloque | Duración | Qué pasa |
|---|---|---|
| Gancho | 0–3 s | La tarea tediosa o el dolor de código, dicho en una frase que se pueda imaginar. Sobre productividad o automatización. Sin saludo ni introducción. |
| Solución rápida | 3–15 s | La idea en una o dos frases, con el código real en pantalla (zoom a las 3–6 líneas clave). |
| Demo en vivo | 15–35 s | El bot o la herramienta corriendo de verdad: grabación de pantalla o del teléfono, sin cortes que escondan cómo funciona. |
| CTA | últimos 5–8 s | Uno solo. B2B: "¿Tu equipo hace esto a mano? Escríbeme, link en la bio." Dev: "Sígueme para la parte 2" o "Comenta CÓDIGO". |

Reglas:
- Nada de explicaciones largas. Si una frase no sirve al gancho, la demo o el CTA, se quita.
- Una sola idea por Reel. Si la función hace tres cosas, son tres Reels.
- Aplica las reglas de **No AI Tells** de la skill `copywriting`: sin "no es X, es Y", sin listas de "sin X, sin Y, sin Z", sin rayas en textos cortos.
- Subtítulos quemados en el video y texto sobreimpreso legible a 390 px. El código en pantalla debe tener fuente grande, tema oscuro y máximo unas 8 líneas visibles.

## Entregable

Guárdalo en `trabajo/reels/AAAA-MM-DD-<nombre-corto>.md` con:

1. **Ficha:** función, repo o commit, público principal, tarea tediosa, truco técnico.
2. **Guion por segundos:** tabla con Tiempo | En pantalla | Voz en off | Texto sobreimpreso.
3. **3 ganchos alternativos**, con una línea de por qué funciona cada uno.
4. **Plan de grabación:** qué archivo y qué líneas mostrar, qué comando correr para la demo, qué datos de prueba usar (nunca datos reales de clientes ni claves en pantalla).
5. **Caption** de 2–4 líneas, la primera repite el gancho, más 5–8 hashtags en español e inglés mezclados según el público.
6. **Pendientes:** todos los `[NEED: ...]`.
7. **Piezas visuales con la marca** (ver `marca/README.md`): un JSON en `marca/contenido/` con el motion de apertura y cierre (`gancho` + `codigo` con las líneas reales + `cierre`) y la portada del reel (`fijas`, tipo `reel`). Renderízalos con `node marca/render.cjs` y revisa los fotogramas antes de entregar.

Después del Reel, ofrece en una línea las piezas derivadas: carrusel con el código (skill `social`), versión para anuncio (skill `ad-creative`) o entrada en el calendario (skill `content-strategy`).

Cuando Juan cuente cómo le fue a un Reel (vistas, retención, guardados, mensajes), propón una fila para **Learnings** en `.agents/product-marketing.md`.
