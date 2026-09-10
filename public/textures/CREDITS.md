# Texturas

Origen y licencia de las imágenes de esta carpeta.

## `earth-color.jpg` — 4096×2048, 824 KB

Superficie terrestre en color real.

- **Origen:** NASA Visible Earth — *Blue Marble: Next Generation*, diciembre de 2004
- **Archivo:** `world.topo.bathy.200412.3x5400x2700.jpg` (5400×2700)
- **URL:** <https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg>
- **Licencia:** dominio público (obra del gobierno de EE. UU.)

## `earth-night.jpg` — 4096×2048, 596 KB

Luces nocturnas. Se usa en la issue 2-8 como `emissiveMap`.

- **Origen:** NASA Visible Earth — *Earth's City Lights*
- **Archivo:** `earth_lights_lrg.jpg` (2400×1200)
- **URL:** <https://eoimages.gsfc.nasa.gov/images/imagerecords/55000/55167/earth_lights_lrg.jpg>
- **Licencia:** dominio público (obra del gobierno de EE. UU.)

⚠️ El original es 2400×1200: escalarlo a 4096×2048 no añade detalle, solo mantiene la
uniformidad con la textura de color. Si el peso llega a molestar, esta es la primera candidata
a bajar a 2048×1024.

## Procesado

Ambas redimensionadas a **4096×2048** con ffmpeg y filtro Lanczos:

```bash
ffmpeg -i original.jpg -vf "scale=4096:2048:flags=lanczos" -q:v 4 salida.jpg
```

**Por qué 4096×2048:**

- **Proporción 2:1** — es lo que exige una proyección equirectangular, y lo que
  `SphereGeometry` espera en sus coordenadas UV. Otra proporción saldría deformada.
- **Potencia de dos** — permite a WebGL generar *mipmaps*: versiones reducidas previas que
  evitan el parpadeo cuando la textura se ve pequeña o inclinada. Con medidas arbitrarias se
  desactivan y la imagen «hierve» al girar.
- **El límite real es la VRAM, no el peso del archivo.** El navegador descomprime la imagen sin
  comprimir: 4096×2048×4 bytes ≈ **32 MB** por textura. Los originales de la NASA llegan a
  21600×10800, que serían **933 MB** — en un móvil la pestaña se cierra. Y por encima del
  `MAX_TEXTURE_SIZE` de WebGL (a menudo 4096 u 8192) la textura falla **en silencio**: globo
  negro sin ningún error.

## Pendientes

La **máscara de agua** (`roughnessMap`) y el **relieve** (`normalMap`/`bumpMap`) se usan en la
issue 2-8 y no están aquí todavía.

No se encontraron URLs oficiales de NASA que respondan, y la fuente alternativa localizada
(`turban/webgl-earth`) **no declara licencia** — en un repositorio público eso significa que los
derechos son del autor. Se buscarán fuentes con licencia clara al llegar a esa issue.
