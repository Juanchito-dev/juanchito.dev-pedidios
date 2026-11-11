# juanchito.dev_ — identidad para Instagram

La misma identidad del portafolio (juanchito-dev.vercel.app) y de raspa_: asfalto, ácido, cartel y grafiti. Todo sale de `tokens.css`, y nada se diseña a mano fuera de las plantillas.

## Colores

| Nombre | Hex | Uso |
|---|---|---|
| asfalto | `#0b0b0d` | Fondo de **todo**. No hay piezas con fondo claro. |
| carbón | `#141417` | Paneles y bloques de código |
| línea | `#3a3a40` | Bordes, separadores, números grandes de fondo |
| humo | `#9a9aa3` | Texto secundario |
| tiza | `#f2f0ea` | Texto principal |
| **ácido** | `#c6ff3d` | El acento: la palabra clave, el botón, la barra de progreso. **Uno o dos usos por pieza.** |
| fuego | `#ff5a1f` | Sólo el cursor `_` y las palabras clave del código |

## Fuentes

| Fuente | Para qué | Regla |
|---|---|---|
| **Anton** | Títulos | En minúscula, apretado, grande |
| **Sedgwick Ave Display** (grafiti) | **Una** palabra por pieza, la que importa | Siempre en ácido y girada −6°. Se marca con `*asteriscos*` en el JSON. |
| **Archivo** | Texto corrido y subtítulos | Humo para el cuerpo, tiza para la **negrita** |
| **Space Mono** | Código, contadores, etiquetas | Las etiquetas van en ácido y en minúscula |

Todas tienen licencia SIL Open Font License: se pueden usar en comercial.

## Firma

- Logo: **`juanchito.dev_`** en Anton, con el `_` en fuego. Va arriba a la izquierda en el carrusel y en el cierre de cada reel.
- Foto de perfil: `j_` (o tu cara: en marcas personales, una foto suele generar más confianza; si usas foto, fondo oscuro y luz lateral).
- Tono: técnico pero accesible. Se enseña **código real** y la cosa funcionando. Ganchos sobre la tarea tediosa que desaparece.

## Formatos

| Pieza | Tamaño | Zona segura |
|---|---|---|
| Carrusel | 1080×1350 (4:5) | La portada es la miniatura del perfil: el título tiene que leerse en pequeño |
| Reel | 1080×1920 (9:16) | La interfaz tapa ~250 px arriba, ~420 abajo y ~130 a la derecha |
| Portada de reel | 1080×1920 | El perfil la recorta a 3:4: lo importante va entre y=240 y y=1680 (`portada-reel-guia.png` lo marca) |
| Destacadas | 1080×1920 | Sólo se ve el círculo del centro |
| Perfil | 1080×1080 | Se ve en círculo, diminuta |

## Movimiento (reels)

Copia el lenguaje del sitio: los títulos **suben desde una máscara** con la curva `--out`, la palabra en grafiti **entra con rebote**, el código **se escribe** con un cursor ácido, y entre escenas pasa un **barrido en ácido**. El cierre siempre es `juanchito.dev_` escribiéndose, un CTA en píldora ácida y el @.

Escenas disponibles (`plantillas/motion.html`):

| Escena | Campos | Duración |
|---|---|---|
| `gancho` | `kicker`, `titulo`, `sub` | 2,8 s |
| `codigo` | `titulo`, `codigo`, `cps` (caracteres por segundo) | lo que tarde en escribirse + 1,4 s |
| `texto` | `titulo`, `sub` | 2,4 s |
| `cierre` | `cta`, `handle` | 3 s |

Todas aceptan `dur` para cambiar la duración. El motion sirve para la apertura y el cierre del reel, o completo como reel sin cámara. Encima de la grabación de pantalla o de cámara se ponen los subtítulos en Archivo bold, en tiza, con la palabra clave en ácido.

## Carrusel

Tipos de slide (`plantillas/carrusel.html`): `portada`, `texto` (con `numero`), `codigo` (con `archivo`), `lista` (`items`), `cierre` (`cta`). Cualquier slide acepta `"foto": "juan.jpg"` (de `marca/fotos/`), que sale en círculo con borde ácido. En `cuerpo` e `items`, `**así**` es negrita. En `titulo`, `\n` parte línea y `*así*` va en grafiti.

## Cómo se hace una pieza

1. Copia un JSON de `contenido/` y cambia los textos.
2. Renderiza:

```bash
node marca/render.cjs marca/contenido/carrusel-raspa-01.json
```

3. Sale en `marca/salida/`: PNG por slide, o MP4 + portada para el motion.

Necesita Node, Playwright con Chromium y ffmpeg (para motion). Un motion de 16 s tarda unos 3 minutos.

## Grabar un sitio para un reel

```bash
node marca/grabar-sitio.cjs https://juanchito-dev.vercel.app/ marca/salida/tomas.mp4 --segundos 12 --paradas 0,0.22,0.39,0.55,0.92
```

Graba en vertical, en vista de teléfono, bajando por la página con pausas en las `--paradas` (0 = arriba, 1 = abajo). Después se une con la apertura y el cierre del motion:

```bash
ffmpeg -i intro.mp4 -i tomas.mp4 -i cierre.mp4 -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p reel.mp4
```

## Muestras incluidas

- `salida/carrusel-raspa-01/` — primer carrusel (6 slides) sobre raspa_.
- `salida/motion-raspa-01.mp4` — reel de 16 s: gancho, código escribiéndose, firma y cierre.
- `salida/carrusel-presentacion/` — carrusel de presentación (7 slides).
- `salida/reel-portafolio.mp4` — tour del portafolio (18 s) y su portada.
- `salida/perfil/` — foto de perfil, 5 destacadas (bots, webs, herramientas, animaciones, hablemos) y la portada del reel.
