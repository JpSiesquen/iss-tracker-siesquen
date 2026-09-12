import { create } from 'zustand';

/**
 * El estado de la interfaz: qué se ve y qué no.
 *
 * ## La distinción que ordena la aplicación
 *
 * Hay dos tipos de estado y no se mezclan:
 *
 *   **Estado de servidor** — datos que vienen de fuera: los elementos
 *   orbitales, la posición calculada. Manda el servidor. Vive en **TanStack
 *   Query**, con su caché, su refresco y su manejo de errores.
 *
 *   **Estado de cliente** — decisiones de quien mira: si la traza se ve, qué
 *   capa está activa. Manda el usuario. Vive **aquí**.
 *
 * ⚠️ **Ningún dato de una API entra en este store.** Duplicar la posición de
 * la ISS aquí crearía dos fuentes de verdad que se desincronizan en cuanto una
 * se actualice y la otra no. Es el error clásico al usar ambas librerías
 * juntas, y el motivo de que Query y Zustand no compitan: resuelven problemas
 * distintos.
 *
 * ## Por qué Zustand y no useContext
 *
 * Con un contexto, **todo componente que lo consume se re-renderiza cuando
 * cambia cualquier parte de él**: alternar la traza volvería a renderizar lo
 * que solo mira las luces nocturnas.
 *
 * Zustand permite suscribirse a una porción:
 *
 *     const verOrbita = useUiStore((s) => s.verOrbita);
 *
 * Ese componente solo se re-renderiza si cambia `verOrbita`. En una aplicación
 * de formularios se notaría poco; con una escena 3D a 60 fps detrás, un render
 * de más sí se nota.
 *
 * No hay proveedor que montar: es un hook que se importa donde haga falta.
 */
interface UiState {
  /** La traza orbital pasada y futura (#38). */
  verOrbita: boolean;

  /** Los marcadores de puntos geográficos conocidos, solo en desarrollo. */
  verReferencias: boolean;

  /** El panel de telemetría (#40). */
  verPanel: boolean;

  /** Las luces de las ciudades sobre el lado nocturno. */
  verLucesNocturnas: boolean;

  /**
   * Giro lento y continuo de la cámara.
   *
   * Activado por defecto para que la escena se presente en movimiento desde
   * la primera carga. El control permite detenerlo al explorar una zona.
   */
  rotacionAutomatica: boolean;

  alternarOrbita: () => void;
  alternarReferencias: () => void;
  alternarPanel: () => void;
  alternarLucesNocturnas: () => void;
  alternarRotacionAutomatica: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  /**
   * Todo visible de entrada.
   *
   * La traza es lo que convierte el punto en una órbita, y el panel es lo que
   * convierte la animación en una herramienta: esconderlos por defecto haría
   * que el proyecto se presentara peor de lo que es.
   */
  verOrbita: true,
  verPanel: true,
  verLucesNocturnas: true,
  rotacionAutomatica: true,

  /**
   * Las referencias empiezan ocultas incluso en desarrollo: sirvieron para
   * verificar la conversión de coordenadas en #28 y ya cumplieron. Se pueden
   * volver a encender cuando haga falta comprobar algo.
   */
  verReferencias: false,

  /**
   * Las acciones viven dentro del store, no en los componentes.
   *
   * `set` recibe una función del estado anterior en lugar de un valor: así la
   * acción no necesita leer el estado desde fuera, y dos pulsaciones seguidas
   * no pueden pisarse.
   */
  alternarOrbita: () => set((s) => ({ verOrbita: !s.verOrbita })),
  alternarReferencias: () => set((s) => ({ verReferencias: !s.verReferencias })),
  alternarPanel: () => set((s) => ({ verPanel: !s.verPanel })),
  alternarLucesNocturnas: () => set((s) => ({ verLucesNocturnas: !s.verLucesNocturnas })),
  alternarRotacionAutomatica: () =>
    set((s) => ({ rotacionAutomatica: !s.rotacionAutomatica })),
}));
