import { AUTHOR_URL, REPO_URL } from './constants';

import './AuthorCredit.css';

/**
 * Marca secundaria del crédito, en píxeles.
 *
 * 24 coincide con el badge que envolvía la marca; al quitar ese círculo extra
 * el SVG hereda ese tamaño y evita el doble anillo.
 */
const GITHUB_ICON_SIZE = 24;

/**
 * Marca oficial de GitHub, no el icono de Lucide.
 *
 * `lucide-react` 1.40 ya no exporta `Github` (retiraron marcas comerciales).
 * Incrustar el trazo evita una dependencia nueva y se pinta con `currentColor`.
 */
function GitHubMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.564 9.564 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

/**
 * Crédito de autoría, fuera del `<Canvas>`.
 *
 * Una sola pieza visual con dos destinos hermanos: el nombre abre el perfil
 * (y más adelante el portafolio) y la marca de GitHub abre este repositorio.
 * La raíz no es un enlace — anidar `<a>` sería HTML inválido.
 */
export function AuthorCredit() {
  return (
    <div className="credito">
      <a
        className="credito__autor"
        href={AUTHOR_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Desarrollado por <span className="credito__nombre">Jonathan Siesquen</span>
      </a>
      <span className="credito__separador" aria-hidden="true" />
      <a
        className="credito__fuente"
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Código fuente de ISS Tracker en GitHub"
      >
        <span className="credito__marca">
          <GitHubMark size={GITHUB_ICON_SIZE} />
        </span>
      </a>
    </div>
  );
}
