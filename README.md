# iss-tracker-siesquen

_(Descripción del proyecto: qué hace, para quién, cómo se instala y se usa.)_

## Configuración de Claude Code

El repo usa [Claude Code](https://claude.com/claude-code) como agente de código. La
configuración vive en `.claude/`, separada entre lo del equipo (se commitea) y lo
personal (ignorado en `.gitignore`).

| Archivo | ¿Se commitea? | Qué es |
| --- | --- | --- |
| `CLAUDE.md` (raíz) | Sí | Instrucciones del proyecto que Claude Code carga en cada sesión. |
| `.claude/settings.json` | Sí | Ajustes del equipo: permisos, hooks, variables de entorno. |
| `.claude/agents/` | Sí | Subagentes del proyecto, un `.md` por agente. |
| `.claude/skills/` | Sí | Skills del proyecto, una subcarpeta con su `SKILL.md`. |
| `.claude/commands/` | Sí | Slash commands, un `.md` por comando (`foo.md` → `/foo`). |
| `.claude/settings.local.json` | No | Tus ajustes personales, solo tuyos. |
| `.claude/CLAUDE.local.md` | No | Tus instrucciones personales para Claude Code. |

Las carpetas `agents/`, `skills/` y `commands/` están vacías por ahora y se mantienen
en git con un `.gitkeep`.

> **No pongas un `README.md` dentro de `agents/`, `skills/` ni `commands/`.** Claude Code
> escanea esas carpetas buscando definiciones reales, así que un `.md` de documentación
> se registra como un agente, skill o comando fantasma llamado `README`. Si hay algo que
> documentar sobre ellas, va en este archivo.
