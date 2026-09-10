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

/** Lo que devuelve el endpoint cuando todo va bien. */
interface RespuestaTle {
  elementos: Record<string, unknown>;
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

/**
 * Los campos que necesita `json2satrec` para construir el propagador.
 *
 * Celestrak devuelve diecisiete; aquí se declaran los que se usan y se
 * comprueban. El resto pasa igualmente porque la respuesta se reenvía
 * completa, pero estos son los que no pueden faltar.
 */
const CAMPOS_REQUERIDOS = [
  'OBJECT_NAME',
  'EPOCH',
  'MEAN_MOTION',
  'ECCENTRICITY',
  'INCLINATION',
  'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER',
  'MEAN_ANOMALY',
  'NORAD_CAT_ID',
  'BSTAR',
] as const;

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
    });
  } catch (causa) {
    // La red falló: DNS, timeout, conexión rechazada. 502 Bad Gateway es el
    // código correcto — el fallo es de un servicio del que dependemos, no
    // nuestro ni del cliente.
    return errorJson(502, 'No se pudo contactar con Celestrak', causa);
  }

  /**
   * ⚠️ `fetch` no rechaza la promesa en un 404 ni en un 500: solo si falla la
   * red. Sin esta comprobación se intentaría parsear la página de error de
   * Celestrak como si fueran datos orbitales.
   */
  if (!respuesta.ok) {
    return errorJson(
      502,
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
    return errorJson(502, `Celestrak no devolvió JSON: "${recorte}"`, causa);
  }

  /**
   * Celestrak devuelve un ARRAY, aunque se pida un solo satélite: la misma URL
   * sirve para consultar grupos enteros. Un array vacío significa que el
   * catálogo no conoce ese NORAD ID.
   */
  if (!Array.isArray(datos) || datos.length === 0) {
    return errorJson(502, 'Celestrak no devolvió ningún objeto orbital');
  }

  const elementos = datos[0] as Record<string, unknown>;

  const faltan = CAMPOS_REQUERIDOS.filter((c) => elementos[c] === undefined);
  if (faltan.length > 0) {
    return errorJson(
      502,
      `Faltan campos en la respuesta de Celestrak: ${faltan.join(', ')}`,
    );
  }

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
 * Error en JSON, con el mismo formato que el resto de la API.
 *
 * ⚠️ El detalle interno NO se filtra al cliente: un mensaje de error puede
 * revelar rutas, versiones o estructura interna. Se registra en el log del
 * servidor, donde solo lo ve quien mantiene el servicio.
 */
function errorJson(estado: number, mensaje: string, causa?: unknown): Response {
  if (causa !== undefined) {
    console.error(`[api/tle] ${mensaje}:`, causa);
  }
  return Response.json(
    { error: mensaje },
    { status: estado, headers: { 'cache-control': 'no-store' } },
  );
}
