/**
 * Constantes de la interfaz.
 *
 * Viven aparte de los componentes por lo mismo que las de la escena: el linter
 * avisa de que exportar constantes junto a componentes rompe el fast refresh.
 */

/**
 * Tamaño de los iconos, en píxeles.
 *
 * 18 acompaña a un texto de 0.875rem sin dominarlo. Un icono más grande que su
 * etiqueta invierte la jerarquía.
 */
export const ICON_SIZE = 18;

/**
 * Grosor del trazo.
 *
 * El defecto de Lucide es 2, pensado para iconos aislados y grandes. A 18 px y
 * junto a texto fino, 1.5 pesa lo mismo que las letras y el conjunto se lee
 * como una sola cosa.
 */
export const ICON_STROKE = 1.5;

/**
 * Duración de las microinteracciones, en segundos.
 *
 * Entre 150 y 250 ms es donde una transición se percibe como respuesta. Por
 * encima de 400 ms la interfaz se siente lenta aunque no lo sea.
 */
export const MOTION_DURATION = 0.2;

/**
 * Desplazamiento vertical al aparecer, en píxeles.
 *
 * Pequeño a propósito: lo justo para que el panel parezca llegar desde algún
 * sitio. Un desplazamiento grande convierte una aparición en una animación, y
 * eso pide atención que el globo necesita más.
 */
export const MOTION_OFFSET = 8;
