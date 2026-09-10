import { ommSchema, type Omm } from './_omm.js';

/**
 * Datos orbitales de la ISS: `GET /api/tle`.
 *
 * Descarga de Celestrak los elementos que describen la órbita y los sirve al
 * frontend. Son la base del cálculo de posición con SGP4 de la Fase 5.
 *
 * ## Por qué esto justifica un backend
 *
 * No es un ejercicio inventado. Tres razones concretas:
 *
 *   1. **Celestrak pide explícitamente que no se le golpee en cada carga.** Es
 *      un servicio gratuito mantenido por una persona; el abuso lo pondría en
 *      riesgo. Con este intermediario, mil visitantes generan una descarga en
 *      lugar de mil.
 *   2. **Los elementos cambian una o dos veces al día.** Pedirlos en cada
 *      visita sería pedir mil veces lo mismo.
 *   3. **CORS.** Celestrak no garantiza permitir peticiones desde el
 *      navegador; un servidor no tiene esa restricción.
 *
 * ## Por qué JSON y no las dos líneas de texto
 *
 * El TLE clásico son dos líneas de ancho fijo heredadas de las tarjetas
 * perforadas. Celestrak también ofrece `FORMAT=JSON` con los mismos datos ya
 * separados en campos, y `satellite.js` acepta ambos: `twoline2satrec` para el
 * texto y `json2satrec` para esto.
 *
 * Comprobado que dan **exactamente la misma posición**, así que se elige el
 * JSON por tres motivos:
 *
 *   - Se valida con Zod campo a campo; el texto habría que trocearlo por
 *     posición de carácter.
 *   - El texto viene con finales de línea CRLF, que hay que normalizar.
 *   - Un campo que cambie de tipo se detecta aquí y no tres capas más abajo.
 */

/** El mismo NORAD ID que usa el resto del proyecto. */
const ISS_NORAD_ID = 25544;

const CELESTRAK_URL = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${ISS_NORAD_ID}&FORMAT=JSON`;

/**
 * Cortesía básica con un servicio gratuito: identificarse permite a quien lo
 * mantiene saber quién genera tráfico, y distinguir un cliente que se porta
 * bien de un script anónimo.
 */
const USER_AGENT = 'iss-tracker-siesquen/1.0 (+https://iss-tracker-siesquen.vercel.app)';

/**
 * Cuánto sirve la CDN la respuesta guardada, en segundos. Seis horas.
 *
 * Los elementos orbitales se publican una o dos veces al día, así que pedirlos
 * más a menudo no da más precisión: solo ruido.
 *
 *   TTL     peticiones/día a Celestrak    valoración
 *   5 min              288                innecesario
 *   6 h                  4                equilibrado
 *   24 h                 1                el dato puede quedarse viejo
 *
 * Seis horas dejan cuatro descargas diarias se publiquen las que se publiquen,
 * y con cualquier volumen de visitantes.
 */
const CDN_TTL_SEGUNDOS = 6 * 60 * 60;

/**
 * Cuánto puede seguir sirviéndose el dato caducado mientras se refresca por
 * detrás, en segundos. Una hora.
 *
 * `stale-while-revalidate` es la parte que elimina el pico de latencia justo
 * cuando expira la caché: en vez de hacer esperar a quien tuvo la mala suerte
 * de llegar en ese instante, la CDN le da el dato viejo —de horas, no de
 * días— y actualiza en segundo plano. Nadie espera nunca.
 */
const CDN_STALE_SEGUNDOS = 60 * 60;

/** Cabecera de caché de las respuestas correctas. */
const CACHE_CONTROL = `public, s-maxage=${CDN_TTL_SEGUNDOS}, stale-while-revalidate=${CDN_STALE_SEGUNDOS}`;

/**
 * Cuánto se espera a Celestrak antes de rendirse, en milisegundos.
 *
 * ⚠️ `fetch` sin timeout espera indefinidamente. En una función serverless eso
 * significa consumir el tiempo máximo de ejecución y devolver un 504 genérico
 * en lugar de un error propio — o peor, dejar al cliente colgado.
 *
 * Ocho segundos son de sobra para una respuesta que normalmente tarda menos de
 * uno, y dejan margen para servir el fallback antes de que Vercel corte.
 */
const TIMEOUT_MS = 8000;

/** Lo que devuelve el endpoint cuando todo va bien. */
interface RespuestaTle {
  elementos: Omm;
  descargadoEn: number;
  fuente: string;
}

/**
 * Caché en memoria de esta instancia.
 *
 * ⚠️ Es una optimización OPORTUNISTA, nunca el mecanismo principal. Una
 * función serverless vive por petición: si la instancia sigue caliente esta
 * variable persiste, y si Vercel levantó otra está vacía. Con varias
 * instancias en paralelo, cada una tiene su propia copia.
 *
 * No está mal usarla —ahorra incluso la ejecución cuando acierta— pero no se
 * puede confiar en ella. La caché HTTP es la que hace el trabajo de verdad, y
 * funciona en un entorno distribuido porque no depende de dónde se ejecute
 * nada.
 *
 * Mismo TTL que la CDN: no tiene sentido que un nivel sirva un dato que el
 * otro ya considera caducado.
 */
let memoria: { cuerpo: RespuestaTle; guardadoEn: number } | null = null;

export async function GET(): Promise<Response> {
  /**
   * Primer nivel: la memoria de esta instancia.
   *
   * Si acierta, se ahorra incluso la llamada a Celestrak. Si falla —instancia
   * nueva, o dato caducado— se sigue adelante como si no existiera. Nunca es
   * un error que esté vacía.
   */
  if (memoria && Date.now() - memoria.guardadoEn < CDN_TTL_SEGUNDOS * 1000) {
    return respuestaConCache(memoria.cuerpo, 'memoria');
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(CELESTRAK_URL, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (causa) {
    // La red falló: DNS, conexión rechazada, o el timeout de arriba. 502 Bad
    // Gateway es el código correcto — el fallo es de un servicio del que
    // dependemos, no nuestro ni del cliente.
    return falloConFallback('No se pudo contactar con Celestrak', causa);
  }

  /**
   * ⚠️ `fetch` no rechaza la promesa en un 404 ni en un 500: solo si falla la
   * red. Sin esta comprobación se intentaría parsear la página de error de
   * Celestrak como si fueran datos orbitales.
   */
  if (!respuesta.ok) {
    return falloConFallback(
      `Celestrak respondió ${respuesta.status} ${respuesta.statusText}`,
    );
  }

  /**
   * Se lee como TEXTO antes de parsear, y no directamente con `.json()`.
   *
   * ⚠️ Comprobado: ante un NORAD ID que no existe, Celestrak responde
   * `No GP data found` **en texto plano y con status 200**. No un 404, ni un
   * JSON de error. Llamar a `.json()` sobre eso lanza un SyntaxError que, sin
   * más contexto, se reportaría como «JSON inválido» — cierto pero inútil
   * para diagnosticar.
   *
   * Teniendo el texto se puede decir qué llegó realmente.
   */
  const texto = await respuesta.text();

  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch (causa) {
    const recorte = texto.trim().slice(0, 100);
    return falloConFallback(`Celestrak no devolvió JSON: "${recorte}"`, causa);
  }

  /**
   * Celestrak devuelve un ARRAY, aunque se pida un solo satélite: la misma URL
   * sirve para consultar grupos enteros. Un array vacío significa que el
   * catálogo no conoce ese NORAD ID.
   */
  if (!Array.isArray(datos) || datos.length === 0) {
    return falloConFallback('Celestrak no devolvió ningún objeto orbital');
  }

  /**
   * Validación con Zod, no una comprobación de que los campos existan.
   *
   * ⚠️ La diferencia no es teórica. Con una inclinación de 200 grados
   * —físicamente imposible— `json2satrec` devuelve `error: 0` y `propagate`
   * calcula una posición de aspecto normal: lat 12.79, lon 94.68, alt 416 km.
   * No lanza nada. El marcador aparecería en el sitio equivocado y nadie se
   * enteraría.
   *
   * Por eso los rangos del esquema describen qué es físicamente posible, y no
   * solo qué tipo tiene cada campo. Es preferible fallar que mentir.
   */
  const validado = ommSchema.safeParse(datos[0]);
  if (!validado.success) {
    const primero = validado.error.issues[0];
    return falloConFallback(
      `Elementos orbitales inválidos: ${primero.path.join('.')} — ${primero.message}`,
      validado.error,
    );
  }
  const elementos = validado.data;

  const cuerpo: RespuestaTle = {
    /** Los elementos tal cual los da Celestrak: `json2satrec` los consume. */
    elementos,
    /**
     * Cuándo se descargaron. No es lo mismo que `EPOCH`, que es el instante al
     * que se refieren los cálculos: un TLE del mediodía puede descargarse a
     * medianoche y sigue siendo válido.
     */
    descargadoEn: Date.now(),
    fuente: 'celestrak.org',
  };

  memoria = { cuerpo, guardadoEn: Date.now() };

  return respuestaConCache(cuerpo, 'origen');
}

/**
 * Envuelve el cuerpo con las cabeceras de caché.
 *
 * ## Qué le dice cada parte a la CDN
 *
 *   public                     cualquier caché compartida puede guardarlo
 *   s-maxage=21600             sírvelo 6 h sin volver a ejecutar la función
 *   stale-while-revalidate     pasado ese plazo, sigue sirviendo el viejo
 *                              mientras refrescas por detrás
 *
 * La `s` de `s-maxage` es de *shared*: afecta a cachés compartidas como la CDN,
 * no a la del navegador. Es lo que queremos — que el ahorro sea para todos los
 * visitantes, no solo para quien repite.
 *
 * Con esto, mil visitas producen UNA petición a Celestrak. Y es menos código
 * que gestionar la caché a mano.
 *
 * `x-tle-cache` no es una cabecera estándar: sirve para ver de dónde salió el
 * dato al depurar, junto a la `x-vercel-cache` que añade la CDN.
 */
function respuestaConCache(cuerpo: RespuestaTle, origen: 'memoria' | 'origen'): Response {
  return Response.json(
    { ...cuerpo, edadMs: Date.now() - cuerpo.descargadoEn },
    {
      headers: {
        'cache-control': CACHE_CONTROL,
        'x-tle-cache': origen,
      },
    },
  );
}

/**
 * Qué hacer cuando Celestrak falla: servir el último dato conocido si lo hay.
 *
 * ## Por qué un dato viejo es aceptable aquí
 *
 * Porque **los elementos orbitales envejecen despacio**. Uno de ayer sigue
 * dando una posición razonable; uno de hace una semana ya no. Servir el último
 * conocido mantiene el proyecto funcionando durante una caída ajena, en vez de
 * dejar el globo sin ISS por algo que no depende de nosotros.
 *
 * ⚠️ Pero tiene un límite, y por eso la respuesta va marcada con `stale: true`
 * y su antigüedad. El cliente decide qué hacer con un dato de tres días. Es el
 * mismo principio de la issue #31: la antigüedad del dato es parte del dato.
 *
 * ## Qué NO sale de aquí
 *
 * El detalle del error se registra en el log del servidor y **no se envía al
 * cliente**. Un mensaje de error puede revelar rutas de archivos, versiones o
 * estructura interna: al cliente, lo que necesita saber; a los logs, el
 * detalle para diagnosticar.
 */
function falloConFallback(motivo: string, causa?: unknown): Response {
  console.error(`[api/tle] ${motivo}`, causa ?? '');

  if (memoria) {
    return Response.json(
      {
        ...memoria.cuerpo,
        edadMs: Date.now() - memoria.cuerpo.descargadoEn,
        stale: true,
        aviso: 'No se pudo actualizar desde Celestrak; este dato es el último conocido.',
      },
      {
        headers: {
          /**
           * TTL corto en el fallback: se quiere reintentar pronto, no dejar
           * seis horas de dato viejo cacheado en la CDN por un fallo puntual.
           */
          'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
          'x-tle-cache': 'fallback',
        },
      },
    );
  }

  // Sin dato previo no hay nada que servir. 502 Bad Gateway: el fallo es de un
  // servicio del que dependemos, no nuestro ni del cliente.
  return Response.json(
    { error: 'No se pudieron obtener los datos orbitales de la ISS.' },
    { status: 502, headers: { 'cache-control': 'no-store' } },
  );
}
