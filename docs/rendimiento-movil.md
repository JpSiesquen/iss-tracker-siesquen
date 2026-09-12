# Rendimiento en móvil

Mediciones de la issue #45. El objetivo no era rebajar calidad por intuición, sino identificar
el coste dominante y cambiar solo lo que aportara una mejora medible.

## Método

- Build de producción servido localmente con `npm run preview`.
- Chrome en un viewport de 360 × 800 CSS px y densidad física 3×.
- Lighthouse 12.8.2 con su perfil móvil predeterminado.
- `npm run measure:mobile` para medir mediante Chrome DevTools Protocol:
  - tiempo hasta que las cuatro texturas están descargadas y el canvas pinta dos frames;
  - cadencia de `requestAnimationFrame` con CPU ralentizada 4×;
  - heap de JavaScript después de forzar recolección de basura, antes y después de dos minutos.
- Fast 4G: 4 Mbps, 1.5 Mbps de subida y 20 ms de latencia.
- Slow 4G: 1.6 Mbps, 750 Kbps de subida y 150 ms de latencia.

El medidor no añade dependencias y acepta variables `PERF_*` para repetir otros escenarios. El
valor absoluto de FPS depende de la frecuencia del equipo que ejecuta Chrome headless; lo útil es
comprobar el margen sobre 30 FPS y que no decaiga durante la prueba.

## Resultado

| Medida | Antes | Después | Cambio |
|---|---:|---:|---:|
| Transferencia de texturas | 2.012 MB | 289 KB | −86 % |
| VRAM de texturas, sin mipmaps | 84 MiB | 8 MiB | −90 % |
| VRAM estimada, con mipmaps | 112 MiB | 10.7 MiB | −90 % |
| Buffer móvil (360 × 800, DPR físico 3) | 720 × 1600 | 540 × 1200 | −44 % de píxeles |
| Escena lista, Slow 4G + CPU 4× | 16.14 s | 6.10–8.10 s | −50–62 % |
| Escena lista, Fast 4G + CPU normal | — | 2.12 s | objetivo < 3 s |
| Cadencia tras dos minutos, CPU 4× | — | 132 → 141 FPS | sin degradación |
| Heap tras GC, dos minutos | — | 8.41 → 9.14 MB | +0.73 MB |
| Lighthouse Performance | 46 | 59 | +13 puntos |
| Lighthouse FCP | 3.48 s | 3.31 s | −5 % |
| Lighthouse LCP | 4.63 s | 4.05 s | −13 % |
| Lighthouse TBT | 2.71 s | 0.92 s | −66 % |
| Lighthouse transferencia total | 2.65 MB | 926 KB | −65 % |

Lighthouse identifica como LCP el crédito de autor, no el canvas. Por eso el tiempo específico de
la escena se mide también desde las entradas de recursos y dos frames posteriores.

## Cambio aplicado

- Escritorio conserva las cuatro texturas originales y DPR máximo 2.
- Pantallas menores de 600 px cargan cuatro variantes de 1024 × 512 y limitan el DPR a 1.5.
- Un teléfono en horizontal sigue en el perfil móvil cuando combina poca altura con
  `pointer: coarse`; una laptop táctil grande conserva el perfil de escritorio.

Las variantes de 1024 px siguen teniendo más resolución horizontal que el diámetro visible del
globo en el viewport probado. La comparación visual en 360 × 800 conservó costa, relieve, luces y
terminador; la captura de 1440 × 900 confirmó que escritorio continúa usando los originales.

## Lo que no se cambió

- La esfera conserva 64 segmentos: su geometría es pequeña y no era el cuello de botella.
- Las luces nocturnas, estrellas y el desenfoque de los paneles permanecen: la cadencia mantuvo
  margen y quitarlos sí tendría un coste visual.
- `r3f-perf` no entra en el proyecto. La versión disponible arrastra una versión antigua de drei
  con peers de React 18; la instalación de prueba se descartó y `npm ci` restauró el lockfile.

Estas cifras son una comparación local controlada, no una promesa para cualquier teléfono. Un
perfil Slow 4G combinado además con CPU 4× tarda entre 6.10 y 8.10 s, por lo que ambos límites se
documentan sin confundir ese escenario severo con el criterio Fast 4G.

La diferencia de heap tras forzar GC quedó por debajo de 1 MB y la cadencia no descendió. No se
observó crecimiento sostenido ni acumulación que indicara una fuga durante los dos minutos.
