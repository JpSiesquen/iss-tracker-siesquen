# Contribuir

Convenciones de desarrollo del proyecto.

## Puesta en marcha

```bash
npm ci          # nunca npm install (ver más abajo)
npm run dev     # servidor en http://localhost:5173
```

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprueba tipos y compila a `dist/` |
| `npm run lint` | oxlint |
| `npm run format` | Aplica el formato con Prettier |
| `npm run format:check` | Solo comprueba el formato. Lo usa el CI |
| `npm run preview` | Sirve el build de producción en local |

### `npm ci`, no `npm install`

Para instalar lo existente se usa `npm ci`: respeta el lockfile y falla si no coincide con
`package.json`. `npm install` queda reservado para añadir un paquete nuevo.

En Windows, parar el servidor de desarrollo antes: `ci` borra `node_modules` y el sistema
bloquea los archivos que otro proceso tiene abiertos.

## Seguridad de dependencias

El `.npmrc` del repositorio fija dos opciones:

```ini
ignore-scripts=true    # instalar un paquete NO ejecuta sus scripts
save-exact=true        # versiones exactas, sin ^ ni ~
```

**Por qué:** en 2025 el gusano *Shai-Hulud* comprometió unos 640 paquetes de npm. Se ejecutaba
solo al instalar, robaba tokens de npm y GitHub, y con ellos publicaba versiones infectadas de
los paquetes de la víctima.

Si un paquete necesita sus scripts para compilar binarios nativos (`esbuild`, `sharp`), se
habilitan solo para esa instalación:

```bash
npm install <paquete> --ignore-scripts=false
```

En consecuencia:

- **`package-lock.json` se commitea siempre.** Nunca en `.gitignore`.
- **Sin `^` ni `~`** en `package.json`: cada actualización es una decisión, no un efecto
  secundario.
- **No instalar versiones recién publicadas.** Los paquetes comprometidos se detectan en horas o
  días; esperar una semana elimina casi toda la ventana.
- **Antes de añadir una dependencia**, comprobar que está mantenida y que es necesaria.

## Flujo de trabajo

```
issue → rama → commits → PR → CI verde → merge → issue cerrada
```

`main` está protegida: **no acepta push directo** y exige el CI en verde. La protección aplica
también a los administradores: una regla con excepciones para quien tiene prisa no protege en el
único momento en que hace falta.

```bash
git checkout -b feat/12-descripcion-corta
# ... trabajo ...
git add <archivos>
git commit -m "feat: descripcion

Closes #12"
git push -u origin HEAD
gh pr create
gh pr merge --squash --delete-branch
git fetch --prune
```

### Una issue por merge

**Cada merge corresponde a una issue.** Ni dos temas juntos, ni una issue partida en varios
merges. Sirve para tres cosas concretas:

- Todo lo que está en `main` se rastrea a una razón documentada.
- Si hay que revertir, se revierte **exactamente** un cambio sin llevarse otro por delante.
- El `Closes #NN` funciona limpio.

En la práctica: **la issue existe antes que la rama**, y si aparece algo que no cabe en ella, va
en otra rama aunque sea pequeño.

### Nombres de rama

`tipo/NN-descripcion-corta`, donde `NN` es el número de la issue en GitHub:

```
feat/28-conversion-coordenadas
fix/34-cache-tle
chore/12-ci-github-actions
docs/15-contributing
```

### Mensajes de commit

Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`.

El cuerpo explica el porqué, no el qué.

### ⚠️ El cierre automático solo funciona en inglés

```
Closes #12      ✅ cierra la issue
Fixes #12       ✅
Resolves #12    ✅
Cierra #12      ❌ no hace nada
```

## Cómo se etiqueta una issue

### Título: `F-N · Descripción`

`F` es la fase (el milestone) y `N` el orden dentro de esa fase:

```
0-4 · Bucle de animación con requestAnimationFrame y delta time
3-4 · Convertir latitud, longitud y altitud a coordenadas 3D
```

GitHub ya numera las issues (`#28`), pero ese número dice **cuándo se creó**, no **dónde
encaja**. El milestone guarda la fase, pero no se ve en la lista: el prefijo la pone delante.

`N` va por **orden de trabajo**, no por número de GitHub.

### Tipo — una sola

| Etiqueta | Cuándo |
| --- | --- |
| `bug` | Algo no funciona como debería. También si el defecto aún no se nota |
| `enhancement` | Funcionalidad nueva o mejora |
| `chore` | Configuración, herramientas, mantenimiento. **No cambia lo que el producto hace** |
| `documentation` | Solo documentación |
| `question` | Es una duda, no trabajo |

La distinción entre `enhancement` y `chore` es una pregunta: **¿un usuario notaría la
diferencia?** El panel de telemetría, sí. Configurar Prettier, no.

### Dificultad — una sola

**Mide riesgo de equivocarse, no volumen de trabajo.** Una migración puede ser diez líneas y ser
difícil.

| Etiqueta | Cuándo |
| --- | --- |
| `dificultad:facil` | Poco riesgo: si sale mal se ve enseguida |
| `dificultad:media` | Riesgo moderado: un error se nota al probar |
| `dificultad:dificil` | Alto riesgo: un error se arrastra y corregirlo cuesta caro |

### Área — puede ser más de una

| Etiqueta | Qué cubre |
| --- | --- |
| `area:3d` | Escena, cámara, geometrías, materiales, texturas, coordenadas |
| `area:datos` | APIs externas, TanStack Query, Zod, propagación orbital |
| `area:bff` | Funciones serverless, caché de TLE |
| `area:ui` | MUI, tema, paneles, iconos, responsive |
| `area:infra` | Vite, CI/CD, deploy, configuración |
| `area:seguridad` | Dependencias, tokens, permisos, cadena de suministro |
| `area:docs` | README, documentación |

`area:3d` y `area:ui` van separadas a propósito: un `area:frontend` único mezclaría el trabajo
de geometría y shaders con el de paneles y botones, que no se parecen en nada. **Se separa donde
el trabajo es distinto, no donde el código está en carpetas distintas.**

### Prioridad — una sola

| Etiqueta | Criterio |
| --- | --- |
| `priority:critical` | Bloquea todo lo demás, o pone en riesgo datos |
| `priority:high` | Necesario para que la entrega salga bien |
| `priority:medium` | Valioso, no bloquea |
| `priority:low` | Cuando haya tiempo |

⚠️ **Prioridad ≠ gravedad.** Un defecto que puede corromper datos pero solo se dispara dentro de
un año es grave y **no** urgente. Y si hay más de dos o tres `critical` abiertas, la escala dejó
de significar algo.

### Milestone y dependencias

Cada issue lleva **un milestone** (la fase). No es una etiqueta: da la barra de progreso.

⚠️ **Un milestone no se cierra solo** al cerrarse su última issue. Hay que cerrarlo a mano.

Las dependencias van **en el cuerpo**, como texto: `Depende de #12`. La prioridad dice en qué
orden se atiende; la dependencia, en qué orden **se puede** hacer.

## El cuerpo de una issue

```markdown
## Contexto
Por qué existe esto. El problema, no la solución.
Depende de #12.

## Tareas
- [ ] Pasos concretos, en orden

## Criterio de aceptación
Cómo se sabe que está terminada. Observable, no «que funcione bien».
```

El criterio de aceptación tiene que ser verificable mirando la pantalla o corriendo un comando.
Si no, no es un criterio.

| ❌ | ✅ |
| --- | --- |
| Que el globo se vea bien | Se ve una esfera texturizada, girable, sin errores en consola |
| Mejorar el rendimiento | Carga en menos de 3 s con la red simulada a 4G |

Las issues incluyen además una sección **`## Concepto`** cuando tocan una técnica no evidente
—propagación orbital, conversión de coordenadas, caché en serverless— con la explicación y un
ejemplo mínimo. El historial de issues documenta las decisiones técnicas, no solo las tareas.

## Convenciones de código

- **Constantes con nombre, no números sueltos** en la escena 3D: `EARTH_TILT`,
  `ISS_ALTITUDE_KM`. Un `0.41` suelto no se puede revisar.
- **Rotación en radianes.** `THREE.MathUtils.degToRad()` para convertir.
- **Movimiento siempre con delta time**, nunca por fotograma: atarlo al framerate falsea las
  velocidades reales.
- **Texturas de color en sRGB; texturas de datos (normal, rugosidad) en lineal.** Confundirlo es
  la causa habitual de un render lavado.
- **Las texturas van en `public/`**, redimensionadas y por debajo de 1.5 MB. El coste real de una
  textura es la VRAM, no la descarga.

### Finales de línea

El `.gitattributes` fija `* text=auto eol=lf`. Sin eso, Windows entrega los archivos
con CRLF, Prettier los marca como mal formateados y **el CI falla por un problema que solo
existe en máquinas Windows**.

## El CI

`.github/workflows/ci.yml` corre en cada PR contra `main`, en una máquina Ubuntu limpia:

```
npm ci  →  npm run lint  →  npm run format:check  →  npm run build
```

⚠️ El job se llama **`verificar`**, y ese nombre exacto es el que exige la protección de rama.
Si se renombra el job, hay que actualizar también la protección — si no coinciden, GitHub espera
para siempre un check que nunca llega y **todos los PR quedan bloqueados** sin explicación clara.

## Despliegue

Cada merge a `main` se publica en **https://iss-tracker-siesquen.vercel.app**, y cada PR genera
su propia URL de preview.

`vercel.json` fija `installCommand: npm ci`, para que el despliegue instale exactamente lo mismo
que el CI.
