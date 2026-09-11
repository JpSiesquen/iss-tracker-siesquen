# Geocodificación inversa

La ubicación que acompaña a las coordenadas de la ISS se resuelve dentro del BFF. No se consulta
una API externa y la geometría no llega al navegador.

## Datos

Se midieron dos capas oficiales de Natural Earth:

| Capa | Resolución | Fuente sin reducir | Fuente gzip |
|---|---:|---:|---:|
| Países | 1:110m | 838.726 B | 208.616 B |
| Mares y océanos | 1:50m | 1.163.418 B | 454.815 B |

La capa marina 1:110m pesa menos, pero solo contiene 29 áreas y omite el mar del Norte, que es uno
de los casos de aceptación. La variante 1:50m contiene 118 áreas, incluidos mares, golfos y
estrechos regionales.

El generador elimina todas las propiedades salvo el nombre en español, normaliza `Polygon` y
`MultiPolygon`, conserva las cajas envolventes y cuantiza las coordenadas a 0,01°. El resultado
combinado ocupa **832.156 B**, o **256.294 B gzip**. Supera ampliamente el umbral de 80 KB, por lo
que enviarlo al cliente penalizaría cada primera carga.

En cambio, al mantenerlo en `api/`, el bundle medido pasa de **458,53 KB a 458,93 KB gzip**: solo
**0,40 KB** por el cliente, el hook y la validación de la respuesta. Cada consulta devuelve
únicamente un nombre y su tipo.

## Resolución y caché

`GET /api/locate?lat=&lon=` valida ambas coordenadas y busca primero países. Si no encuentra uno,
busca el área marina más específica; las figuras se ordenan por el área de su caja para que
«Mar del Norte» gane a «Océano Atlántico». Como último recurso, las coordenadas determinan uno de
los océanos globales y nunca se responde con un guion.

El punto en polígono usa ray casting, recorre todos los polígonos de un `MultiPolygon`, descarta los
anillos interiores y normaliza las longitudes alrededor del punto para cruzar ±180°. Las cajas
envolventes evitan recorrer casi todos los anillos en cada petición.

El cliente actualiza el nombre cada 30 segundos. Las coordenadas de la URL se cuantizan a 0,25°
para que visitantes cercanos compartan claves de CDN; el endpoint usa un día de `s-maxage` porque
el resultado es determinista y los datos se versionan con el despliegue.

## Verificación

`npm run test:locations` comprueba trece puntos: ciudades en cuatro continentes, el Amazonas, el
Pacífico central, el mar del Norte, Lesoto como agujero dentro de Sudáfrica, Fiyi a ambos lados de
±180° y el océano en ambos lados del antimeridiano.

La precisión está limitada deliberadamente por la escala cartográfica. Cerca de una costa o
frontera, el nombre describe la geometría aproximada de Natural Earth, no una frontera jurídica de
alta resolución.
