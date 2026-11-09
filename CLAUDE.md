# Marketing — espacio de trabajo de Juan Rodríguez (juanchito.dev)

Este repo existe para trabajar marketing con las skills de
`coreyhaines31/marketingskills`, instaladas en `.claude/skills/` (53 skills).
En español, directo.

## Cómo se trabaja

- Usa las skills libremente: cuando una tarea encaje con una skill, cárgala y
  síguela. Si encajan varias, combínalas.
- Contexto compartido: todas las skills leen `.agents/product-marketing.md`
  (producto, público, posicionamiento, voz). Si no existe o está vacío,
  empieza con la skill `product-marketing` para crearlo y mantenlo al día.
- Los entregables (planes, copys, auditorías, investigaciones) se guardan en
  `trabajo/<tema>/` como Markdown, para que queden versionados.
- Los scripts de las skills se pueden ejecutar directamente (por ejemplo
  `node .claude/skills/reverse-engineer-marketing/scripts/teardown.mjs`).
- Las claves de API van en variables de entorno, nunca en el repo.

## Mantenimiento

- Actualizar skills: `npx -y skills update -p -y`
- Reinstalar desde el lock: `npx -y skills experimental_install`
