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

  return Response.json(
    {
      /** Los elementos tal cual los da Celestrak: `json2satrec` los consume. */
      elementos,
      /**
       * Cuándo se descargaron. No es lo mismo que `EPOCH`, que es el instante
       * al que se refieren los cálculos: un TLE del mediodía puede
       * descargarse a medianoche y sigue siendo válido.
       */
      descargadoEn: Date.now(),
      fuente: 'celestrak.org',
    },
    {
      headers: {
        // La caché llega en la issue #34. De momento se declara explícito para
        // que nadie asuma que hay una.
        'cache-control': 'no-store',
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
