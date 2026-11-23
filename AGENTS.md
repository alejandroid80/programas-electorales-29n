# Reglas del proyecto — programas-electorales-29n

Web estática que compara los 22 programas electorales para las elecciones del 29N de 2026.
Todo el texto de la interfaz va en castellano y `scripts/check-encoding.py` rechaza cualquier
carácter de alfabeto no latino.

## Antes de dar por terminado un cambio

```bash
node scripts/check-data.js        # 22 partidos, 8 ejes, 176 posiciones
python3 scripts/check-encoding.py # ningún carácter no latino
node --check scripts/*.mjs        # sintaxis de los scripts tocados
```

**No hacer `push` sin que lo pida.** Commitear en local está bien; publicar, no.

**Si se cambia `index.html`, bumpear `?v=N`** en los assets: GitHub Pages cachea 10 minutos.

## Context & Token Efficiency Rules

- Never read entire files if a targeted search (`grep`/`glob`) or reading specific line ranges (`offset` and `limit`) will answer the question.
- Before running shell commands (`npm test`, `git diff`, logs), pipe or filter output (e.g., `head -n 50`, `--silent`) so massive logs do not flood context.
- Avoid re-reading files already inspected in the current session unless you just modified them.
- Keep explanations concise; output code diffs or direct answers without conversational filler.
