import { AUTHOR_URL } from './constants';

import './AuthorCredit.css';

/**
 * Crédito de autoría, fuera del `<Canvas>`.
 *
 * Presente sin protagonizar: tipografía del tema, sin tarjeta ni badge. El
 * enlace abre el perfil de GitHub hasta que exista el portafolio (ver
 * `AUTHOR_URL`).
 */
export function AuthorCredit() {
  return (
    <a className="credito" href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
      Desarrollado por <span className="credito__nombre">Jonathan Siesquen</span>
    </a>
  );
}
