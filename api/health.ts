/**
 * Comprobación de vida del BFF: `GET /api/health`.
 *
 * Primera función de servidor del proyecto. No sirve datos — existe para
 * confirmar que la capa serverless está desplegada y responde, antes de
 * construir sobre ella el endpoint de los TLE (#33).
 *
 * ## Enrutado por sistema de archivos
 *
 * El nombre del archivo ES la ruta: `api/health.ts` responde en `/api/health`.
 * No hay router que configurar ni rutas que registrar.
 *
 * ⚠️ Esta carpeta va en la RAÍZ, hermana de `src/`, no dentro. Vercel busca
 * aquí por convención; dentro de `src/` esto sería código de cliente y
 * acabaría en el bundle del navegador, que es lo contrario de lo que se
 * quiere.
 *
 * ## Por qué la Web API estándar y no `@vercel/node`
 *
 * La firma podría ser `(req: VercelRequest, res: VercelResponse)`, al estilo
 * de Express. Se usa `Request`/`Response` —el estándar de la plataforma web—
 * por dos razones:
 *
 *   1. **Cero dependencias.** `@vercel/node` solo aporta tipos, pero arrastra
 *      `undici`, `ajv` y `path-to-regexp`, que suman cinco avisos de
 *      seguridad. Son de `devDependencies` y no llegan a producción, pero un
 *      `npm audit` sucio hace que se dejen de leer los avisos.
 *   2. **No ata el código a Vercel.** `Request` y `Response` son el estándar
 *      que entienden Deno, Bun, Cloudflare Workers y Node moderno. Migrar
 *      sería cambiar de sitio el archivo.
 *
 * ## Ciclo de vida
 *
 * Esta función no vive en un proceso permanente: Vercel la levanta cuando
 * alguien la llama y la apaga cuando deja de usarse.
 *
 * ⚠️ Consecuencia que condiciona el diseño de #34: **el estado en memoria no
 * es fiable entre peticiones.** Una variable global puede conservarse si la
 * instancia sigue caliente, o desaparecer sin aviso. Sirve como optimización
 * oportunista, nunca como única caché.
 *
 * Si nadie la ha llamado hace rato, la primera petición espera a que el
 * entorno arranque —el «cold start»—, del orden de décimas de segundo. No
 * confundir con los alojamientos que duermen la aplicación durante casi un
 * minuto.
 */
export function GET(): Response {
  return Response.json(
    {
      ok: true,
      service: 'iss-tracker-bff',
      timestamp: Date.now(),
    },
    {
      headers: {
        // Sin caché: el sentido de este endpoint es responder AHORA. Una
        // respuesta cacheada diría que el servicio está vivo aunque llevara
        // caído desde antes.
        'cache-control': 'no-store',
      },
    },
  );
}
