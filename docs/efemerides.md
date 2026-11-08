# Efemérides para la exploración astronómica

La escena puede consultar una tabla local de posiciones y velocidades geométricas
procedente de NASA/JPL Horizons. Los diez cuerpos se identifican por su centro
físico. Las consultas de verificación se hicieron para fechas intermedias que
quedaron fuera de los nodos de la tabla.

## Contrato

- **Entrada temporal**. Día juliano en TDB. La ventana incluye ambos extremos,
  desde el 1 de enero de 2025 a las 00:00 TDB hasta el 1 de enero de 2031 a las
  00:00 TDB. Las fechas inválidas o fuera de la ventana devuelven
  `out-of-coverage`.
- **Marco**. Ejes cartesianos ICRF. Los vectores describen posiciones simultáneas
  en el modelo de JPL y se generan con `VEC_CORR=NONE`, sin correcciones por
  tiempo de viaje de la luz ni aberración.
- **Origen**. Baricentro del sistema solar (Horizons 0) por defecto. Se puede usar
  el centro del Sol (10) o de la Tierra (399) mediante resta vectorial en el
  mismo instante. Esto traslada el origen y conserva los ejes ICRF.
- **Unidad**. Kilómetros por defecto. El llamador puede pedir unidades
  astronómicas con `au`. Una UA equivale exactamente a 149 597 870,7 km.
  [Resolución B2 de la UAI](https://www.iau.org/static/resolutions/IAU2012_English.pdf)
- **Centros físicos**. La Tierra (399) y la Luna (301) son dos cuerpos distintos
  del baricentro Tierra–Luna (3). Para los planetas exteriores, el catálogo usa
  599, 699, 799 y 899, que Horizons distingue de los baricentros 5, 6, 7 y 8.
  [Identificación de cuerpos en Horizons](https://ssd.jpl.nasa.gov/horizons/manual.html)

`createEphemeris(buffer)` decodifica la tabla y devuelve un lector reutilizable.
`position('moon', jdTdb, 'earth')` entrega la posición del centro de la Luna
relativa al centro terrestre. La integración con la escena convertirá su reloj
UTC a TDB y sus ejes a los del render.

## Archivo y procedencia

La tabla v1 ocupa **618 484 bytes** y vive en
`public/ephemeris/horizons-2025-2031-v1.bin`. El formato comienza con cuatro
bytes `HZV1`, seguidos de un bloque por cuerpo en el orden de
`EPHEMERIS_BODIES`. Cada registro contiene seis Float64 little-endian (X, Y, Z
en km y VX, VY, VZ en km/s). Los registros se espacian uniformemente dentro de
cada bloque. Para el último intervalo, cada bloque conserva el nodo que cierra
la interpolación aunque su fecha quede después del límite público.

La interpolación cúbica de Hermite usa la posición y velocidad de los dos
registros que rodean la fecha. El archivo se sirve como un recurso estático del
mismo origen. La escena inicial aún no lo descarga. Cuando se añada el zoom,
podrá solicitarlo al entrar en la exploración.

Fuente de los vectores y las referencias: J. D. Giorgini y JPL Solar System
Dynamics Group, NASA/JPL Horizons, consulta del 8 de noviembre de 2026.
`scripts/fixtures/horizons-v1.json` registra la fecha, la versión de la API,
los parámetros de las consultas, los identificadores de las soluciones de JPL
y el SHA-256 de la tabla. Para regenerar, ejecutar `npm run data:ephemeris`
manualmente y luego `npm run test:ephemeris`. Si Horizons actualiza una
solución o el formato de respuesta, revisar las diferencias antes de publicar
una versión nueva. La descarga usa solicitudes secuenciales y se detiene
ante errores.
[API de Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html) ·
[Política de uso de JPL](https://ssd-api.jpl.nasa.gov/)

## Verificación

`npm run test:ephemeris` corre sin red en CI. Compara la distancia euclídea
entre el vector interpolado y el vector directo de Horizons en 48 fechas
repartidas por toda la ventana. Las tolerancias incorporan margen respecto a
lo observado. Son umbrales de regresión para el visor y estas fechas de prueba.

| Cuerpo | ID | Paso (días) | Mayor diferencia (km) | Tolerancia (km) |
| --- | ---: | ---: | ---: | ---: |
| Sol | 10 | 8 | 0,0131 | 0,05 |
| Mercurio | 199 | 1 | 20,0351 | 35 |
| Venus | 299 | 2 | 2,7903 | 5 |
| Tierra | 399 | 2 | 1,1906 | 3 |
| Luna | 301 | 1 | 4,2668 | 8 |
| Marte | 499 | 4 | 1,9369 | 4 |
| Júpiter | 599 | 1 | 6,8352 | 12 |
| Saturno | 699 | 2 | 1,4634 | 4 |
| Urano | 799 | 2 | 3,5734 | 7 |
| Neptuno | 899 | 2 | 3,7044 | 7 |

La misma verificación compara los vectores directos de la Luna desde la Tierra
(4,7963 km de diferencia máxima, tolerancia de 9 km) y la Tierra desde el
Sol (1,1910 km, tolerancia de 3 km). También cubre unidades, ambos límites
temporales, fechas fuera de cobertura y archivos truncados o de formato
incompatible.
