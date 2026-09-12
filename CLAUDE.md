# iss-tracker-siesquen

Seguimiento en tiempo real de la Estación Espacial Internacional sobre un globo 3D. La posición
se obtiene de una API pública, la órbita se propaga con SGP4 y se dibuja con WebGL.

**Producción:** https://iss-tracker-siesquen.vercel.app

⚠️ **Contexto histórico.** El estado activo, la arquitectura vigente y el siguiente trabajo
están en `AGENTS.md`. Este archivo conserva el contexto de la etapa anterior a Codex; no se
usa para decidir qué hacer ahora. Las convenciones de abajo se alinean con el código para no
contradecir los comentarios del repositorio.

## Estado

**Registro al cerrar la Fase 5:** el proyecto calcula la posición de la ISS con SGP4 a partir
de los elementos que sirve su propio BFF, dibuja la traza orbital, y el Sol ilumina el globo
donde lo hace de verdad. La Fase 5.5 y el cierre actual viven en `AGENTS.md`.

**Ya no depende de ninguna API de terceros en el cliente**: la única URL externa está en
`api/tle.ts`, en el servidor.

| Fase | | |
|---|---|---|
| 0 · Three.js puro | 7/7 | ✅ |
| 1 · Andamiaje | 10/10 | ✅ |
| 1.5 · Automatización | 3/3 | ✅ |
| 2 · El globo | 8/8 | ✅ |
| 3 · La ISS en vivo | 7/7 | ✅ |
| 4 · El BFF | 5/5 | ✅ |
| 5 · Órbita e interfaz | 8/8 | ✅ |
| 6 · Cierre | ver `AGENTS.md` | |

**Siguiente:** ver `AGENTS.md` (Fase 6 tras cerrar 5.5).

⚠️ **Para #45:** el tamaño del bundle y sus partidas medidas viven en `AGENTS.md`; no
duplicarlos aquí para que no vuelvan a divergir.

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

Three.js 0.186 con React Three Fiber 9.7 y drei · satellite.js 7.1 (SGP4 y GMST) ·
TanStack Query 5.102 (estado de servidor) · Zod 4.5 (validación) · Zustand 5.0 (estado de
interfaz) · Material UI 9.4 con Emotion · Lucide (iconos) · Motion (transiciones).

El stack está completo: no queda nada por instalar.

⚠️ **React está fijado en 19.2.8**, no 19.3: `@react-three/fiber` exige `>=19 <19.3` y ninguna
versión suya lo soporta todavía.

Sin base de datos: no hay estado que persistir.

## Estructura

```
src/api/       capa de datos: cliente, esquema de Zod y hooks de Query
src/lib/       funciones puras: coordenadas, propagación SGP4, traza, posición solar
src/store/     estado de interfaz (Zustand)
src/scene/     todo lo que vive dentro del <Canvas>
src/ui/        HTML superpuesto al globo, fuera del <Canvas>
shared/        contratos de datos ejecutables compartidos por api/ y src/
sandbox/       experimentos de la Fase 0 en Three.js puro, sin bundler
docs/          documentación técnica del proyecto
api/           funciones serverless: /api/health, /api/tle y /api/locate
public/        estáticos, incluidas las texturas
```

La frontera entre `scene/` y `ui/` no es estética: dentro del `<Canvas>` solo valen objetos
de Three.js, y una etiqueta HTML ahí lanza un error. El contexto de React sí lo atraviesa,
así que un componente 3D puede usar los hooks de `api/`.

`vite.config.ts` excluye `sandbox/` del escaneo de dependencias: usa un import map contra un
CDN, que Vite no sabe resolver.

## El BFF

Tres endpoints en `api/`. **El nombre del archivo es la ruta**, y los módulos internos que
empiezan por `_` quedan excluidos del enrutado. El esquema OMM vive en `shared/omm.ts`,
fuera de `api/`, para que el servidor y el cliente lo importen sin depender uno del otro.

| | |
|---|---|
| `/api/health` | comprobación de vida |
| `/api/tle` | elementos orbitales de la ISS, cacheados |
| `/api/locate?lat=&lon=` | país, mar u océano para unas coordenadas |

**Se usa `Request`/`Response` del estándar web, no `@vercel/node`.** Ese paquete solo aporta
tipos pero arrastra `undici`, `ajv` y `path-to-regexp`: cinco avisos de `npm audit`, tres de
gravedad alta. Ninguna versión lo evita. Además, el estándar no ata el código a Vercel.

⚠️ **`api/` necesita su propio `tsconfig.api.json`**, ya presente como tercera referencia.
`tsconfig.app.json` no incluye `api/`, así que sin él `tsc -b` decía OK **sin haber mirado la
carpeta**. Ambos `tsconfig` incluyen también `shared/`, cada uno bajo las reglas de su entorno.

⚠️ **Exportar solo `GET` hace que Vercel responda 405** a los demás métodos por sí mismo. No
hace falta comprobar `req.method`.

### Caché

`s-maxage=21600, stale-while-revalidate=3600` — seis horas en la CDN, una hora sirviendo el
dato viejo mientras refresca. Los elementos se publican una o dos veces al día, así que un
TTL corto solo añadiría ruido. Medido en producción: `MISS` 1.016 s, `HIT` ~0.47 s.

La caché en memoria es **oportunista, nunca el mecanismo principal**: una función serverless
vive por petición y cada instancia tiene su copia. En `vercel dev` nunca acierta, porque el
entorno recarga el módulo en cada petición.

### Datos de Celestrak

Se pide `FORMAT=JSON` (formato **OMM**), no las dos líneas de texto. `satellite.js` acepta
ambos —`twoline2satrec` y `json2satrec`— y dan la misma posición, pero el JSON se valida
campo a campo y evita el CRLF del texto.

⚠️ **Ante un NORAD inexistente, Celestrak responde `No GP data found` en texto plano con
status 200.** Ni 404 ni JSON de error. Por eso el cuerpo se lee como texto y se parsea a
mano.

⚠️ **Un conjunto de elementos malformado es peor que ninguno.** Con una inclinación de 200°
—imposible— `json2satrec` devuelve `error: 0` y `propagate` calcula una posición de aspecto
normal. No lanza nada. De ahí que el esquema valide **rangos físicos**, no solo tipos.

Si Celestrak falla y hay un dato previo, se sirve marcado con su antigüedad y un TTL corto
de 60 s. Los elementos envejecen despacio: uno de ayer da una posición razonable, uno de
hace una semana ya no.

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
- **La orientación terrestre se deriva del GMST**, no de una velocidad.
  `EcefFrame` es el único componente que escribe esa rotación y la Tierra, la ISS y la traza
  la heredan por estructura. Acelerar el giro por estética pondría el marcador sobre el país
  equivocado.
- **La inclinación envuelve a `EcefFrame`, y este envuelve la Tierra, la ISS y la traza.** El
  orden es `Rz(inclinación) × Ry(GMST)`. La luz queda fuera: `useSceneTime` ya entrega su
  dirección en coordenadas de escena y envolverla la rotaría dos veces.
- **Todo lo que entra de fuera se valida con Zod, no con `as`.** Los tipos desaparecen al
  compilar; un `as` sobre una respuesta de red es una promesa, no una comprobación. Sin validar,
  un `latitude: null` no lanza nada: `null * Math.PI / 180` es 0 y el fallo aparece tres archivos
  después.
- **Conectar posiciones en cartesianas, no en grados.** En la traza orbital, las longitudes
  179.9 y −179.9 son vecinas después de convertirlas (0.0053 unidades); en grados el salto
  sería de 359.8°. El orden elimina el problema del antimeridiano en vez de tener que tratarlo.
- **En datos en vivo, la antigüedad del dato es parte del dato.** Si la conexión se corta, la
  última posición conocida se queda en pantalla como si fuera actual. Siempre se muestra cuándo
  se actualizó.
- **Un solo instante para toda la escena.** `useSceneTime` calcula la fecha y el GMST una vez
  por fotograma; también calcula una única dirección solar en coordenadas de escena. La Tierra,
  la ISS, la traza, la luz y el shader nocturno leen ese estado. Medido: el desfase entre
  dos `new Date()` en el mismo fotograma es de 7 metros, así que el motivo no es la precisión
  sino que la fuente sea única y se pueda controlar desde un sitio.
  ⚠️ Lo que viaja por el contexto es el **ref**, no el valor: pasar el valor re-renderizaría a
  todos los consumidores sesenta veces por segundo.
- **Todo vector calculado en lat/lon nace en ECEF y se convierte una sola vez.** Tierra, ISS y
  traza viven dentro de `EcefFrame`; la dirección solar se convierte al actualizar el tiempo y
  permanece fuera. Omitir o duplicar GMST produce un error consistente y creíble a la vista —el
  peor tipo—.
- **Estado de servidor en Query, estado de interfaz en Zustand.** Nunca un dato de API en el
  store: duplicarlo crea dos fuentes de verdad que se desincronizan. Y siempre con selectores
  (`useUiStore((s) => s.campo)`), no el store entero — medido: con selectores, alternar una
  capa produce 0 renders en los componentes que miran otra.
- **Ocultar una capa la desmonta** (`{cond && <X/>}`), no la esconde. Con `visible={false}` la
  traza seguiría propagando SGP4 cada 30 s para nadie.
- **Cada cálculo a su ritmo.** La escena 3D propaga 60 veces por segundo mutando objetos de
  Three.js; el panel, 1 vez por segundo con render de React; la traza se rehace cada 30 s. No
  es duplicar trabajo: es el mismo cálculo al ritmo que cada uno necesita.
- **`prefers-reduced-motion` se respeta en el tema.** No es estético: hay personas a quienes el
  movimiento les provoca mareo o migraña. Se usa `0.01ms` y no `0` para que `AnimatePresence`
  siga recibiendo los eventos de fin de animación.
- **Los iconos acompañan al texto, nunca lo sustituyen**, y van con `aria-hidden` porque el
  texto ya dice lo que hay.
- **`worker: { format: 'es' }` en `vite.config.ts` es necesario**, no opcional: satellite.js
  incluye una build de WASM con top-level await, y el formato `iife` por defecto de los workers
  no lo admite.

## CI y despliegue

`.github/workflows/ci.yml` corre en cada PR: `npm ci` → `lint` → `format:check` → tests →
`build` → `test:bundle`. La lista exacta de scripts está en `AGENTS.md`.

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
