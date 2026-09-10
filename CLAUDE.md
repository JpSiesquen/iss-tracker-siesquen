# iss-tracker-siesquen

Seguimiento en tiempo real de la Estación Espacial Internacional sobre un globo 3D. La posición
se obtiene de una API pública, la órbita se propaga con SGP4 y se dibuja con WebGL.

**Producción:** https://iss-tracker-siesquen.vercel.app

## Estado

**Fases 0 a 3 cerradas** (35 issues). La ISS se sigue en vivo: su posición real llega de la
API, se valida, se refresca cada cinco segundos y se dibuja interpolada sobre el globo, con
sus estados de carga y error cubiertos.

La Fase 3 era el **corte natural**: a partir de aquí todo es mejora, no necesidad.

| Fase | | |
|---|---|---|
| 0 · Three.js puro | 7/7 | ✅ |
| 1 · Andamiaje | 10/10 | ✅ |
| 1.5 · Automatización | 3/3 | ✅ |
| 2 · El globo | 8/8 | ✅ |
| 3 · La ISS en vivo | 7/7 | ✅ |
| 4 · El BFF | 0/5 | |
| 5 · Órbita e interfaz | 0/8 | |
| 6 · Cierre | 0/5 | |

## Comandos

```bash
npm ci                 # instalar (nunca npm install, ver abajo)
npm run dev            # servidor en :5173
npm run build          # tsc -b && vite build
npm run lint           # oxlint
npm run format         # prettier --write .
npm run format:check   # lo que corre el CI
```

Antes de un `npm ci`, parar el servidor de desarrollo: `ci` borra `node_modules` y Windows
bloquea los archivos que otro proceso tiene abiertos.

## Stack

React 19 · TypeScript · Vite 8 · oxlint (no ESLint) · Prettier

**Ya instalado:** Three.js 0.186 con React Three Fiber 9.7 y drei · satellite.js 7.1
(adelantada de la Fase 5: `gstime` orienta la Tierra por GMST) · TanStack Query 5.102
(datos remotos) · Zod 4.5 (validación).

**Por fase, según se vaya necesitando:** Zustand (estado de UI) · Material UI (interfaz) ·
funciones serverless de Vercel (BFF que cachea los TLE).

⚠️ **React está fijado en 19.2.8**, no 19.3: `@react-three/fiber` exige `>=19 <19.3` y ninguna
versión suya lo soporta todavía.

Sin base de datos: no hay estado que persistir.

## Estructura

```
src/api/       capa de datos: cliente, esquema de Zod y hooks de Query
src/lib/       funciones puras sin React ni Three (conversión de coordenadas)
src/scene/     todo lo que vive dentro del <Canvas>
src/ui/        HTML superpuesto al globo, fuera del <Canvas>
sandbox/       experimentos de la Fase 0 en Three.js puro, sin bundler
docs/          documentación técnica del proyecto
api/           funciones serverless (a partir de la Fase 4)
public/        estáticos, incluidas las texturas
```

La frontera entre `scene/` y `ui/` no es estética: dentro del `<Canvas>` solo valen objetos
de Three.js, y una etiqueta HTML ahí lanza un error. El contexto de React sí lo atraviesa,
así que un componente 3D puede usar los hooks de `api/`.

`vite.config.ts` excluye `sandbox/` del escaneo de dependencias: usa un import map contra un
CDN, que Vite no sabe resolver.

## Seguridad de dependencias

⚠️ **No es teórico.** En 2025 el gusano **Shai-Hulud** comprometió unos 640 paquetes de npm: se
ejecutaba solo al instalar, robaba tokens de npm, GitHub y nube, y con ellos publicaba versiones
infectadas de los paquetes de la víctima.

1. **`npm ci`, nunca `npm install`** para instalar lo existente. `install` queda reservado para
   añadir un paquete nuevo, deliberadamente.
2. **`.npmrc` con `ignore-scripts=true`.** Instalar un paquete ejecuta sus scripts por defecto,
   y ese es el vector. Si un paquete necesita compilar binarios nativos (`esbuild`, `sharp`):
   `npm install <pkg> --ignore-scripts=false`.
3. **Versiones exactas, sin `^` ni `~`** (`save-exact=true`).
4. **No instalar versiones recién publicadas.** Los paquetes comprometidos se detectan en horas
   o días.
5. **`package-lock.json` siempre commiteado.**
6. **Antes de añadir una dependencia**, comprobar que está mantenida y que es necesaria.

Detalle en la issue #24.

## Flujo de trabajo

```
issue → rama → commits → PR → CI verde → merge → issue cerrada
```

`main` está protegida: **rechaza push directo**, incluido el del dueño, y exige el check
`verificar` en verde.

- **La issue existe antes que la rama.** Si aparece algo que no cabe en ella, va en otra rama
  aunque sea pequeño. **Un merge = una issue.**
- Ramas: `feat/12-descripcion-corta`, `fix/…`, `chore/…`, `docs/…`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Cierre automático **solo en inglés**: `Closes #12`. `Cierra #12` no hace nada.
- Títulos de issue: `F-N · Descripción`, donde `F` es la fase y `N` el orden dentro de ella.

⚠️ **Los milestones no se cierran solos** al cerrarse su última issue.

Convenciones completas en `CONTRIBUTING.md`; el criterio de etiquetado, en el skill
`etiquetar-issue`.

## Convenciones de código

- **Constantes con nombre, no números sueltos** en la escena 3D: `EARTH_TILT`,
  `ISS_ALTITUDE_KM`. Un `0.41` suelto no se puede revisar.
- **Rotación en radianes.** `THREE.MathUtils.degToRad()` para convertir.
- **Movimiento siempre con delta time**, nunca por fotograma: atarlo al framerate falsea las
  velocidades reales.
- **Texturas de color en sRGB; texturas de datos (normal, rugosidad) en lineal.** Confundirlo es
  la causa habitual de un render lavado.
- **Las texturas van en `public/`**, redimensionadas y por debajo de 1.5 MB. El coste real de
  una textura es la VRAM, no la descarga.
- **`THREE.Timer`, no `THREE.Clock`** (deprecado en r186). Timer exige `update()` antes de
  `getDelta()`, o devuelve 0 sin avisar.
- **La orientación de la Tierra se deriva del GMST**, no de una velocidad:
  `rotation.y = gstime(new Date())`. La posición de la ISS y la orientación del globo están
  acopladas — acelerar la rotación pondría el marcador sobre el país equivocado.
- **La ISS va dentro del `<group>` de inclinación pero fuera del mesh que rota** — y aun así
  **aplica `gstime()` a su propio vector**. Su lat/lon está en ECEF, un sistema que gira con la
  Tierra: Greenwich no está quieto en la escena. Medido: sin esa rotación el marcador aparece a
  89.5° del punto correcto, casi 10 000 km. Un punto fijo de la superficie sí es hijo del mesh.
- **Todo lo que entra de fuera se valida con Zod, no con `as`.** Los tipos desaparecen al
  compilar; un `as` sobre una respuesta de red es una promesa, no una comprobación. Sin validar,
  un `latitude: null` no lanza nada: `null * Math.PI / 180` es 0 y el fallo aparece tres archivos
  después.
- **Convertir primero, interpolar después.** En cartesianas las longitudes 179.9 y −179.9 son
  vecinas (0.0053 unidades); en grados el salto sería de 359.8° y el marcador cruzaría el planeta
  al revés. El orden elimina el problema del antimeridiano en vez de tener que tratarlo.
- **En datos en vivo, la antigüedad del dato es parte del dato.** Si la conexión se corta, la
  última posición conocida se queda en pantalla como si fuera actual. Siempre se muestra cuándo
  se actualizó.
- **`worker: { format: 'es' }` en `vite.config.ts` es necesario**, no opcional: satellite.js
  incluye una build de WASM con top-level await, y el formato `iife` por defecto de los workers
  no lo admite.

## CI y despliegue

`.github/workflows/ci.yml` corre en cada PR: `npm ci` → `lint` → `format:check` → `build`.

⚠️ El job se llama **`verificar`** y ese nombre exacto lo exige la protección de rama. Si se
renombra uno sin el otro, todos los PR quedan bloqueados esperando un check que nunca llega.

Cada merge a `main` se despliega solo; cada PR genera una URL de preview.

## Archivos locales, fuera del repo

Existen en la máquina de Jonathan pero **no se suben** (están en `.gitignore`). Si se mencionan
en una sesión, no buscar su contenido en GitHub:

- `PLAN.md` — plan de trabajo interno: fases, presupuesto, riesgos.
- `ProyectosPotenciales.md` — proyectos siguientes y sus fuentes de datos.
- `Notas/` — **notas personales de estudio.** Cuando Jonathan pida «anota esto para
  estudiarlo», va aquí, no a `docs/`.
- `.env.local`, `.vercel/` — credenciales de despliegue. **Nunca commitear.**

## Cómo se presenta el proyecto

El repositorio es público. Todo texto visible —README, descripción, títulos de issues y
commits, `CONTRIBUTING.md`— se escribe como el de cualquier proyecto profesional.

**No aparece en textos públicos:** presupuesto, costes, «gratis», «plan gratuito», «proyecto de
aprendizaje», «practicando», «mi primer proyecto con…».

Las decisiones se explican por lo que son: el BFF serverless existe porque cachea los TLE y
evita golpear a Celestrak en cada carga, no porque no cueste dinero.

Las secciones `## Concepto` y `## Qué aprendes` de las issues son excepción: documentan
decisiones técnicas y ahí sí aportan.

El README destacará, en este orden: qué es y demo en vivo → lo técnicamente difícil (SGP4,
conversión de coordenadas, render en tiempo real) → arquitectura → stack.
