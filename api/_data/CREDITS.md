# Datos geográficos

Los polígonos de países, mares y océanos proceden de
[Natural Earth](https://www.naturalearthdata.com/), revisión
`ca96624a56bd078437bca8184e78163e5039ad19`.

- Países: `ne_110m_admin_0_countries`, escala 1:110m.
- Mares y océanos: `ne_50m_geography_marine_polys`, escala 1:50m. Esta resolución se usa porque
  la capa 1:110m omite áreas necesarias como el mar del Norte.

Natural Earth declara sus datos vectoriales y ráster de dominio público. El archivo
`locations.json` conserva únicamente el nombre en español, la caja envolvente y los polígonos;
las coordenadas se cuantizan a 0,01° mediante `npm run data:locations`.

Fuentes y condiciones de uso:

- https://github.com/nvkelso/natural-earth-vector
- https://www.naturalearthdata.com/about/terms-of-use/
