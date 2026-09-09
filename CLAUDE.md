# iss-tracker-siesquen

Instrucciones de proyecto para Claude Code. Se commitea: esto lo lee todo el equipo y
Claude Code lo carga en cada sesión. Lo personal va en `.claude/CLAUDE.local.md`, que no
se commitea.

## Qué es este proyecto

Seguimiento en tiempo real de la Estación Espacial Internacional sobre un globo 3D. La
posición se obtiene de una API pública, se propaga la órbita con SGP4 y se dibuja con
WebGL en el navegador.

## Stack

- **React 19 + TypeScript + Vite**
- **Three.js** con React Three Fiber y `@react-three/drei` — el globo y la escena 3D
- **TanStack Query** — datos remotos y refresco por intervalo
- **Zod** — validación de las respuestas de la API
- **Zustand** — estado de UI
- **Material UI** con tema oscuro propio
- **satellite.js** — propagación orbital SGP4
- **Funciones serverless de Vercel** (Node + TS) — BFF que cachea los TLE

Sin base de datos: no hay estado que persistir.

## Cómo se corre

```bash
npm ci        # nunca npm install (ver Seguridad)
npm run dev
```

## Cómo se testea

```bash
npm run lint
npm run build
```

## Seguridad de dependencias

⚠️ **Esto no es opcional ni teórico.** En septiembre y noviembre de 2025 el gusano
**Shai-Hulud** comprometió unos 640 paquetes de npm: se ejecutaba solo al instalar,
robaba tokens de npm, GitHub y nube, y con ellos publicaba versiones infectadas de los
paquetes de la víctima. La segunda oleada borraba el directorio del usuario si no lograba
propagarse.

Reglas de este repo:

1. **`npm ci`, nunca `npm install`** para instalar lo existente. `ci` respeta el lockfile
   exactamente; `install` puede resolver versiones nuevas por su cuenta.
2. **`.npmrc` con `ignore-scripts=true`.** Instalar un paquete ejecuta sus scripts por
   defecto, y ese es el vector del ataque. Si un paquete legítimo los necesita (binarios
   nativos: `esbuild`, `sharp`), se instala **puntualmente y a conciencia**:
   `npm install <pkg> --ignore-scripts=false`.
3. **Versiones exactas, sin `^` ni `~`** (`save-exact=true`). Cada actualización debe ser
   una decisión, no un efecto secundario.
4. **No instalar versiones recién publicadas.** Los paquetes comprometidos se detectan en
   horas o días; esperar una semana elimina casi toda la ventana.
5. **`package-lock.json` siempre commiteado.** Nunca en `.gitignore`.
6. **Antes de añadir una dependencia nueva**, comprobar que se mantiene y se usa de verdad.
   Cada una arrastra su propio árbol.

Detalle completo y fuentes en la issue #24.

## Flujo de trabajo

```
issue → rama → commits → PR → CI verde → merge → issue cerrada
```

`main` está protegida: no acepta push directo y exige el CI en verde.

- **La issue existe antes que la rama.** Si aparece algo que no cabe en ella, va en otra
  rama, aunque sea pequeño. **Un merge = una issue.**
- Ramas: `feat/12-descripcion-corta`, `fix/...`, `chore/...`, `docs/...`
- Commits en Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Cierre automático **en inglés**: `Closes #12`. En español no funciona.

Las convenciones de etiquetado están en `CONTRIBUTING.md`; el criterio completo, en el
skill `etiquetar-issue`.

## Convenciones

- **Constantes con nombre, no números sueltos** en la escena 3D: `EARTH_TILT`,
  `ISS_ALTITUDE_KM`. Un `0.41` suelto no se puede revisar.
- **Rotación en radianes.** `THREE.MathUtils.degToRad()` para convertir.
- **Movimiento siempre con delta time**, nunca por fotograma: atarlo al framerate falsea
  las velocidades reales.
- **Texturas de color en sRGB; texturas de datos (normal, rugosidad) en lineal.** Confundirlo
  es la causa habitual de un render lavado.
- **Las texturas van en `public/`**, redimensionadas y por debajo de 1.5 MB cada una. El
  coste real de una textura es la VRAM, no la descarga.

## Cómo se presenta el proyecto

El repo es público. Todo texto visible —README, descripción, títulos de issues y commits—
se escribe como el de cualquier proyecto técnico.

**No aparece en textos públicos:** presupuesto, costes, "gratis", "plan gratuito",
"proyecto de aprendizaje", "practicando", "mi primer proyecto con…".

Las decisiones se explican por lo que son: el BFF serverless existe porque cachea los TLE
y evita golpear a Celestrak en cada carga, no porque no cueste dinero.

El README destaca, en este orden: qué es y demo en vivo → lo técnicamente difícil (SGP4,
conversión de coordenadas, render en tiempo real) → arquitectura → stack.
