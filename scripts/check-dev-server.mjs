#!/usr/bin/env node
/**
 * Avisa si hay un proceso de Node de este proyecto corriendo antes de un
 * `npm ci`.
 *
 * El problema (paso de verdad, issue 1-7): `npm ci` borra node_modules entero
 * antes de instalar. En Windows no se puede borrar un archivo que otro proceso
 * tiene abierto, asi que si el servidor de Vite esta corriendo, el borrado
 * falla a medias con EPERM y deja node_modules inservible:
 *
 *   npm error code EPERM
 *   npm error syscall unlink
 *   npm error path ...\node_modules\@rolldown\...\rolldown-binding.node
 *
 * En Linux y macOS se puede borrar un archivo en uso, asi que esto no pasa y
 * el script no hace nada. Por eso el CI (Ubuntu) nunca lo vera.
 */

import { execFileSync } from 'node:child_process';

// Fuera de Windows no hay problema que avisar.
if (process.platform !== 'win32') process.exit(0);

const raiz = process.cwd().toLowerCase().replace(/\\/g, '/');

/**
 * Devuelve los procesos de Node cuya linea de comando apunta a este proyecto.
 * Se usa Win32_Process porque tasklist solo da PIDs, sin la ruta.
 */
function procesosDelProyecto() {
  let salida;
  try {
    salida = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        'Get-CimInstance Win32_Process -Filter "Name=\'node.exe\'" | ' +
          'Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch {
    // Sin PowerShell o sin permisos: no bloquear por esto.
    return [];
  }

  if (!salida.trim()) return [];

  let datos;
  try {
    datos = JSON.parse(salida);
  } catch {
    return [];
  }

  // ConvertTo-Json devuelve un objeto suelto si solo hay un resultado.
  const lista = Array.isArray(datos) ? datos : [datos];

  return lista.filter((p) => {
    const cmd = (p.CommandLine || '').toLowerCase().replace(/\\/g, '/');
    // Que apunte a este proyecto y no sea este mismo script.
    return (
      cmd.includes(raiz) &&
      p.ProcessId !== process.pid &&
      !cmd.includes('check-dev-server')
    );
  });
}

const encontrados = procesosDelProyecto();
if (encontrados.length === 0) process.exit(0);

console.error('\n  Hay procesos de Node de este proyecto en marcha:\n');
for (const p of encontrados) {
  const cmd = (p.CommandLine || '').replace(/\s+/g, ' ').slice(0, 100);
  console.error(`   PID ${p.ProcessId}  ${cmd}`);
}
console.error('\n  `npm ci` borra node_modules antes de instalar, y Windows no deja');
console.error('  borrar archivos que otro proceso tiene abiertos. Si continuas, la');
console.error('  instalacion puede fallar a medias y dejar node_modules inservible.\n');
console.error('  Para el servidor de desarrollo primero:  q + Enter, o Ctrl+C');
console.error(`  O termina el proceso:  Stop-Process -Id ${encontrados[0].ProcessId}\n`);

process.exit(1);
