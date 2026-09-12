# Product

## Register

product

## Users

Reclutadores técnicos y hiring managers que abren la demo en vivo o el
repositorio público en una pasada corta (30–90 s). También visitantes
curiosos que quieren ver dónde está la ISS ahora mismo.

El contexto del reclutador: está evaluando oficio, no solo “si funciona”. La
precisión orbital, la arquitectura y la interfaz pesan juntas.

## Product Purpose

Seguimiento en tiempo real de la Estación Espacial Internacional sobre un
globo 3D: elementos orbitales propios vía BFF, propagación SGP4, traza,
iluminación solar real e interfaz de telemetría.

Éxito: una demo que se entiende al instante, se siente precisa, y deja claro
que detrás hay ingeniería cuidadosa. El proyecto vive en producción y forma
parte del portafolio personal de Jonathan Siesquen.

## Brand Personality

preciso · moderno · confiable · llamativo

Voz técnica y directa. La interfaz no explica de más: muestra datos que
cuadran con lo que se ve. El globo es el protagonista; los paneles informan
sin competir. “Llamativo” significa presencia y pulido que detienen la mirada
del reclutador, no ruido visual ni efectos gratuitos.

Referente de calidad percibida: la claridad y el acabado de las páginas de
producto de Apple (jerarquía limpia, pocos elementos, cada detalle justificado).

## Anti-references

- Dashboards genéricos de Material UI / plantillas admin oscuras
- “AI slop”: púrpuras degradados, glow barato, pills, tipografía Inter/system
  por defecto, cards anidadas sin motivo
- SaaS genérico que podría pertenecer a cualquier startup
- UI que tapa el globo o pelea con la escena 3D por protagonismo

## Design Principles

1. **El globo es el contenido.** La interfaz cede espacio y atención; informa
   sin convertirse en el espectáculo.
2. **Show, don’t tell.** La precisión se demuestra (posición, Sol, traza), no
   se anuncia con copy de marketing.
3. **Craft visible en 3 segundos.** Tipografía, contraste y jerarquía deben
   leerse como decisión deliberada ante un reclutador que no va a leer el
   README primero.
4. **Instrumento, no formulario.** Controles y telemetría pertenecen a una
   escena espacial, no a un panel de settings.
5. **Una decisión, un sitio.** Tema y tokens concentran la identidad; no se
   pelea estilo componente a componente.

## Accessibility & Inclusion

- Contraste legible sobre paneles translúcidos (lado diurno y nocturno)
- `prefers-reduced-motion` respetado (ya en el tema)
- Controles con texto visible además de iconos
- Meta de la Fase 6 (#46): teclado, contraste y lector de pantalla de forma
  sistemática; no esperar a esa issue para no empeorar lo que ya hay
