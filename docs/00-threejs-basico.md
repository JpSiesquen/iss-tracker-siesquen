# Fundamentos de Three.js

Lo aprendido en la Fase 0, construyendo una escena 3D desde cero sin bundler.
Código: [`sandbox/00-threejs/index.html`](../sandbox/00-threejs/index.html)

## Qué es Three.js

Una librería de JavaScript para dibujar en 3D en el navegador, sobre WebGL.

Se carga desde un CDN mediante un **import map**, que traduce el nombre `'three'` a una URL —
sin eso, el navegador no sabría qué es `'three'`, porque no hay `node_modules` que consultar.
La descarga la hace el navegador de cada visitante, no nosotros.

⚠️ **`three.module.js` no es autocontenido**: importa `three.core.js` como archivo hermano.
Funciona porque el CDN sirve los dos desde la misma carpeta.

## Es programación orientada a objetos

Three.js **es POO**, igual que en Java. Cada `new THREE.Algo()` instancia una clase.

```js
const material = new THREE.MeshStandardMaterial({
  color: 0x4da3ff,
  roughness: 0.8,
});
```

Eso no le da atributos *a la clase*: le pasa argumentos **al constructor** de un objeto nuevo.
La clase ya tenía definidos `color` y `roughness`; aquí se les asigna valor en *esta*
instancia. Otro material del mismo molde puede tener otros valores.

### La herencia explica por qué todo se parece

```
Mesh              ->  Object3D  ->  EventDispatcher
DirectionalLight  ->  Light  ->  Object3D  ->  EventDispatcher
AmbientLight      ->  Light  ->  Object3D  ->  EventDispatcher
PerspectiveCamera ->  Camera  ->  Object3D  ->  EventDispatcher
```

Es `class Mesh extends Object3D` de toda la vida. De ahí salen dos cosas útiles:

- **Todo lo que se coloca en la escena hereda de `Object3D`**, y por eso `mesh.position`,
  `light.position` y `camera.position` funcionan igual.
- **Las luces heredan de `Light`**, y por eso todas tienen `color` e `intensity`.

Saber esto ahorra memorizar: si algo es un `Object3D`, ya sabes que tiene `position`,
`rotation` y `scale`.

## Los tres objetos base

Como un rodaje:

| Objeto | En un rodaje | Qué hace |
|---|---|---|
| `Scene` | El plató | Contiene todo lo que existe |
| `Camera` | La cámara | Desde dónde y con qué apertura se mira |
| `WebGLRenderer` | El equipo que graba | Toma escena + cámara y pinta un fotograma |

⚠️ **La escena no se dibuja sola.** Sin `renderer.render(scene, camera)` la pantalla queda en
blanco por muchos objetos que se hayan creado.

### La cámara

```js
new THREE.PerspectiveCamera(75, ancho / alto, 0.1, 1000)
//                          FOV   aspect      near  far
```

- **FOV** — campo de visión vertical en grados. 50-75 es lo habitual.
- **aspect** — proporción del canvas. Si no coincide, la imagen sale estirada.
- **near / far** — lo más cerca y lo más lejos que se dibuja.

⚠️ **La cámara nace en `(0,0,0)`.** Si se pone un objeto también ahí, la cámara queda *dentro*
y no se ve nada. Por eso `camera.position.z = 5`.

Al redimensionar hay que actualizar `camera.aspect` **y** llamar a `updateProjectionMatrix()`:
sin esa llamada el cambio no surte efecto, porque la matriz ya estaba calculada.

### Sistema de coordenadas

Three.js usa **Y-up**: X a la derecha, Y arriba, **Z hacia el espectador**.

Importa recordarlo: en la issue 3-4 hay que convertir latitud y longitud a este sistema.

## Objetos visibles: geometry + material = mesh

| Pieza | Qué define | Analogía |
|---|---|---|
| **Geometry** | La forma: dónde están los vértices | El esqueleto |
| **Material** | El aspecto: color, brillo, cómo responde a la luz | La piel |
| **Mesh** | Geometry + Material, ya colocable | El cuerpo |

Se separan para poder reutilizar: una geometría puede compartirse entre varios meshes con
materiales distintos.

⚠️ **`scene.add(mesh)` es obligatorio.** Sin esa línea el objeto existe en memoria pero no está
en la escena: no se dibuja, y **no hay ningún error** que lo avise.

### Los segmentos

```js
new THREE.SphereGeometry(radio, widthSegments, heightSegments)
```

Una esfera perfecta no existe en 3D: se aproxima con triángulos, y los segmentos dicen
cuántos. Con 8 se ve poligonal; 32 es el equilibrio; 128 apenas mejora y pesa mucho más.

## Luces y materiales

| Material | ¿Responde a la luz? | Para qué |
|---|---|---|
| `MeshBasicMaterial` | **No** | Color plano, wireframes, marcadores |
| `MeshStandardMaterial` | Sí (PBR) | El de uso general |

**PBR** = *Physically Based Rendering*: simula cómo se comporta la luz en el mundo real.

- **`roughness`** (0-1) — 0 es un espejo pulido, 1 es tiza.
- **`metalness`** (0-1) — si el material es metálico. Un planeta: 0.

⚠️ **Un `MeshStandardMaterial` sin luces se ve NEGRO.** No está roto: un objeto que solo se ve
por la luz que refleja, sin luz, no refleja nada.

### Los dos tipos de luz usados

- **`DirectionalLight`** — rayos paralelos desde una dirección, como el Sol a distancia
  infinita. Lo que importa es la **dirección**, no la distancia.
- **`AmbientLight`** — ilumina todo por igual, sin dirección. No crea volumen; solo evita que
  la sombra sea negro absoluto. Intensidad baja (~0.15).

### El día y la noche son geometría

Una esfera con luz direccional tiene, por pura geometría, una mitad iluminada y otra en sombra
con un degradado entre ambas. **Ese degradado es el terminador terrestre.**

En la Fase 2 no habrá que programar ningún ciclo día/noche: basta con colocar la luz.

## El bucle de animación

```js
function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const delta = timer.getDelta();
  sphere.rotation.y += ROTATION_SPEED * delta;
  renderer.render(scene, camera);
}
animate();
```

**Por qué `requestAnimationFrame` y no `setInterval`:** se sincroniza con el refresco real de
la pantalla, **se pausa solo** cuando la pestaña pasa a segundo plano, y se adapta a pantallas
de 120 o 144 Hz.

### Delta time — lo más importante de la fase

`rotation.y += 0.01` **por fotograma** hace que la esfera gire al doble de velocidad en un
monitor de 120 Hz que en uno de 60 Hz. Multiplicando por el tiempo transcurrido, el número
pasa a expresar **velocidad por segundo**:

```
--- SIN delta time ---        --- CON delta time ---
 30 fps -> 0.19 vueltas        30 fps -> 0.40 vueltas
144 fps -> 0.92 vueltas       144 fps -> 0.40 vueltas
```

No es cosmético: en la Fase 3, con posiciones reales de la ISS, un movimiento atado al
framerate daría una velocidad orbital equivocada.

### Radianes, no grados

`rotation` se mide en radianes. Una vuelta son `2π ≈ 6.28`, no 360.
Para convertir: `THREE.MathUtils.degToRad(45)`.

### `Timer`, no `Clock`

`THREE.Clock` está **deprecado** desde r186. `THREE.Timer` ya viene en el build principal.

⚠️ Timer exige `update()` **antes** de `getDelta()`. Sin esa llamada, `getDelta()` devuelve
siempre 0 y la animación se congela **sin dar ningún error**.

## Tropiezos reales de la Fase 0

| Qué pasó | Causa | Dónde |
|---|---|---|
| `ERR_MODULE_NOT_FOUND` al verificar la versión | `three.module.js` no es autocontenido | `Notas/01-autocontenido.md` |
| Error rojo sobre `file:` URLs en la consola | Una **extensión del navegador**, no el código | `Notas/03-file-protocol-y-origenes.md` |
| `&&` no funciona en la terminal | PowerShell no es bash | `Notas/04-shells-powershell-vs-bash.md` |
| La esfera parecía 2D | `MeshBasicMaterial` ignora la luz | Issue 0-5 |
| No se podía cambiar de rama al mergear | Cambios sin guardar por el formateo del editor | Issue 0-3 |

La lección transversal: **el error casi nunca está donde parece.** Antes de perseguir uno,
comprobar si el código siquiera tiene lo que el mensaje menciona.

## Equivalencias con React Three Fiber

R3F traduce cada clase de Three.js a un componente en camelCase, y `args` son los argumentos
del constructor **en orden**. No hay magia: es una traducción mecánica.

| Three.js puro | R3F | Comprobado en |
|---|---|---|
| `new THREE.Scene()` | lo crea `<Canvas>` | |
| `new THREE.PerspectiveCamera(...)` | `<Canvas camera={{ ... }}>` | |
| `new THREE.WebGLRenderer()` | lo crea `<Canvas>` | |
| `new THREE.Mesh(geo, mat)` | `<mesh>` | |
| `new THREE.SphereGeometry(1, 32, 32)` | `<sphereGeometry args={[1, 32, 32]} />` | |
| `new THREE.MeshStandardMaterial({...})` | `<meshStandardMaterial ... />` | |
| `new THREE.DirectionalLight(0xfff, 3)` | `<directionalLight intensity={3} />` | |
| `scene.add(obj)` | anidar el JSX | |
| El bucle `animate()` | `useFrame((state, delta) => ...)` | |
| `renderer.render(...)` | automático | |

> **Completar la última columna en la Fase 2**, al ir traduciendo cada pieza (issues 2-1 y 2-2).

## Lo que hace `<Canvas>` por ti

Escena, cámara, renderer, el `<canvas>` en el DOM, el listener de resize y el bucle de
animación. Por eso el equivalente de toda la Fase 0 en R3F son unas pocas líneas.

**Y por eso se hizo la Fase 0**: sin ella, `<Canvas>` sería una caja negra.
