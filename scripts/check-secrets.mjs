#!/usr/bin/env node
/**
 * Bloquea el commit si detecta archivos sensibles o secretos en el contenido.
 *
 * Segunda barrera: el .gitignore protege del olvido, pero `git add -f` lo
 * ignora. En un repositorio publico, subir un secreto no se deshace — borrarlo
 * despues no lo saca del historial, y un token filtrado hay que rotarlo.
 *
 * Se ejecuta desde .husky/pre-commit.
 */

import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

/** Rutas que nunca deben commitearse, con el motivo que se muestra al bloquear. */
const RUTAS_PROHIBIDAS = [
  { patron: /^\.env($|\.)/, motivo: 'variables de entorno (puede contener tokens)' },
  { patron: /^\.vercel\//, motivo: 'credenciales de despliegue' },
  { patron: /\.local\.(md|json)$/, motivo: 'configuracion personal, no del equipo' },
  { patron: /^PLAN\.md$/, motivo: 'documento de trabajo interno' },
  { patron: /^ProyectosPotenciales\.md$/, motivo: 'notas internas' },
  { patron: /^Notas\//, motivo: 'notas personales de estudio' },
  { patron: /^node_modules\//, motivo: 'dependencias: se instalan, no se commitean' },
  { patron: /^dist\//, motivo: 'build generado' },
];

/**
 * Patrones de secretos en el contenido. Son los formatos con prefijo
 * reconocible; no pretenden cubrirlo todo.
 */
const PATRONES_SECRETO = [
  { patron: /\bghp_[A-Za-z0-9]{36}\b/, nombre: 'token de GitHub (classic)' },
  { patron: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/, nombre: 'token de GitHub (fine-grained)' },
  { patron: /\bsk-[A-Za-z0-9]{32,}\b/, nombre: 'clave de API tipo OpenAI' },
  { patron: /\bAKIA[0-9A-Z]{16}\b/, nombre: 'clave de acceso de AWS' },
  { patron: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, nombre: 'clave privada' },
];

/** Extensiones que no tiene sentido escanear en busca de texto. */
const BINARIOS = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp4|webm|pdf|zip)$/i;

/** Un archivo enorme rara vez es codigo; escanearlo entero no compensa. */
const TAMANO_MAXIMO = 512 * 1024;

function archivosEnStaging() {
  const salida = execSync('git diff --cached --name-only --diff-filter=ACM', {
    encoding: 'utf8',
  });
  return salida.split('\n').filter(Boolean);
}

const problemas = [];

for (const archivo of archivosEnStaging()) {
  const ruta = archivo.replace(/\\/g, '/');

  // 1. La ruta en si
  const prohibida = RUTAS_PROHIBIDAS.find((r) => r.patron.test(ruta));
  if (prohibida) {
    problemas.push({ archivo: ruta, causa: `archivo prohibido — ${prohibida.motivo}` });
    continue; // no hace falta mirar dentro
  }

  // 2. El contenido
  if (BINARIOS.test(ruta)) continue;
  try {
    if (statSync(ruta).size > TAMANO_MAXIMO) continue;
    const contenido = readFileSync(ruta, 'utf8');
    for (const { patron, nombre } of PATRONES_SECRETO) {
      if (patron.test(contenido)) {
        problemas.push({ archivo: ruta, causa: `posible ${nombre} en el contenido` });
        break;
      }
    }
  } catch {
    // Archivo borrado o ilegible entre el staging y ahora: no es cosa nuestra.
  }
}

if (problemas.length === 0) process.exit(0);

console.error('\n  COMMIT BLOQUEADO — contenido sensible detectado\n');
for (const { archivo, causa } of problemas) {
  console.error(`   ${archivo}`);
  console.error(`     ${causa}\n`);
}
console.error('  Este repositorio es publico. Un secreto subido NO se deshace:');
console.error('  borrarlo despues no lo saca del historial, y hay que rotarlo.\n');
console.error('  Para sacar un archivo del commit:');
console.error('     git restore --staged <archivo>\n');

process.exit(1);
