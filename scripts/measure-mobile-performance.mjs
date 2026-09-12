import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const DEFAULT_URL = 'http://127.0.0.1:4173';
const DEBUGGING_PORT = 9222;
const CPU_SLOWDOWN = Number(process.env.PERF_CPU_SLOWDOWN ?? 4);
const MEASUREMENT_MS = Number(process.env.PERF_MEASUREMENT_MS ?? 15_000);
const MEMORY_SETTLE_MS = Number(process.env.PERF_MEMORY_SETTLE_MS ?? 120_000);
const NETWORK_LATENCY_MS = Number(process.env.PERF_NETWORK_LATENCY_MS ?? 150);
const DOWNLOAD_BYTES_PER_SECOND = Number(
  process.env.PERF_DOWNLOAD_BYTES_PER_SECOND ?? 200_000,
);
const UPLOAD_BYTES_PER_SECOND = Number(
  process.env.PERF_UPLOAD_BYTES_PER_SECOND ?? 93_750,
);
const VIEWPORT_WIDTH = Number(process.env.PERF_VIEWPORT_WIDTH ?? 360);
const VIEWPORT_HEIGHT = Number(process.env.PERF_VIEWPORT_HEIGHT ?? 800);
const DEVICE_SCALE_FACTOR = Number(process.env.PERF_DEVICE_SCALE_FACTOR ?? 3);

if (
  ![
    CPU_SLOWDOWN,
    MEASUREMENT_MS,
    MEMORY_SETTLE_MS,
    NETWORK_LATENCY_MS,
    DOWNLOAD_BYTES_PER_SECOND,
    UPLOAD_BYTES_PER_SECOND,
    VIEWPORT_WIDTH,
    VIEWPORT_HEIGHT,
    DEVICE_SCALE_FACTOR,
  ].every((value) => Number.isFinite(value) && value > 0)
) {
  throw new Error('Las variables PERF_* deben contener números positivos.');
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chromePath) {
  throw new Error('No se encontró Chrome. Define CHROME_PATH y vuelve a intentarlo.');
}

const targetUrl = process.argv[2] ?? DEFAULT_URL;
const profileDirectory = await mkdtemp(join(tmpdir(), 'iss-performance-'));
const safeTemporaryRoot = resolve(tmpdir());
const resolvedProfile = resolve(profileDirectory);
if (!resolvedProfile.startsWith(`${safeTemporaryRoot}\\`)) {
  throw new Error('El perfil temporal quedó fuera de la carpeta esperada.');
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function waitForDebugger() {
  const endpoint = `http://127.0.0.1:${DEBUGGING_PORT}/json/version`;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return;
    } catch {
      // Chrome todavía está arrancando.
    }
    await delay(200);
  }

  throw new Error('Chrome no abrió el puerto de depuración a tiempo.');
}

class CdpSession {
  constructor(webSocketUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(webSocketUrl);

    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);

      if (message.id) {
        const request = this.pending.get(message.id);
        if (!request) return;
        this.pending.delete(message.id);
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result);
        return;
      }

      const listeners = this.listeners.get(message.method) ?? [];
      this.listeners.delete(message.method);
      for (const listener of listeners) listener(message.params);
    });
  }

  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolveOpen, rejectOpen) => {
      this.socket.addEventListener('open', resolveOpen, { once: true });
      this.socket.addEventListener('error', rejectOpen, { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;

    return new Promise((resolveRequest, rejectRequest) => {
      this.pending.set(id, { resolve: resolveRequest, reject: rejectRequest });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method, timeoutMs = 60_000) {
    return new Promise((resolveEvent, rejectEvent) => {
      const timeout = setTimeout(() => {
        rejectEvent(new Error(`Chrome no emitió ${method} a tiempo.`));
      }, timeoutMs);
      const listeners = this.listeners.get(method) ?? [];
      listeners.push((params) => {
        clearTimeout(timeout);
        resolveEvent(params);
      });
      this.listeners.set(method, listeners);
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(session, expression) {
  const { result, exceptionDetails } = await session.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  }

  return result.value;
}

async function heapUsed(session) {
  await session.send('HeapProfiler.collectGarbage');
  const { metrics } = await session.send('Performance.getMetrics');
  return metrics.find(({ name }) => name === 'JSHeapUsedSize')?.value ?? null;
}

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    `--remote-debugging-port=${DEBUGGING_PORT}`,
    `--user-data-dir=${profileDirectory}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-gpu-sandbox',
    `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`,
    'about:blank',
  ],
  { stdio: 'ignore', windowsHide: true },
);
const chromeExited = new Promise((resolveExit) => chrome.once('exit', resolveExit));

let session;

try {
  await waitForDebugger();
  const pageResponse = await fetch(
    `http://127.0.0.1:${DEBUGGING_PORT}/json/new?${encodeURIComponent('about:blank')}`,
    { method: 'PUT' },
  );
  const page = await pageResponse.json();

  session = new CdpSession(page.webSocketDebuggerUrl);
  await session.open();
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Performance.enable');
  await session.send('HeapProfiler.enable');
  await session.send('Network.enable');
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    mobile: true,
  });
  await session.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 5,
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: NETWORK_LATENCY_MS,
    downloadThroughput: DOWNLOAD_BYTES_PER_SECOND,
    uploadThroughput: UPLOAD_BYTES_PER_SECOND,
    connectionType: 'cellular4g',
  });

  const loaded = session.once('Page.loadEventFired');
  await session.send('Page.navigate', { url: targetUrl });
  await loaded;

  const loadedScene = await evaluate(
    session,
    `(async () => {
      const expected = [
        'earth-color',
        'earth-night',
        'earth-normal',
        'earth-specular',
      ];
      const deadline = performance.now() + 60_000;

      while (performance.now() < deadline) {
        const resources = performance.getEntriesByType('resource');
        const textures = resources.filter((entry) =>
          expected.some((name) => entry.name.includes(name)),
        );

        if (textures.length === expected.length && document.querySelector('canvas')) {
          await new Promise((resolveFrame) =>
            requestAnimationFrame(() => requestAnimationFrame(resolveFrame)),
          );
          const canvas = document.querySelector('canvas');
          const panel = document.querySelector('.panel');
          const panelRect = panel?.getBoundingClientRect();
          return {
            sceneReadyMs: performance.now(),
            textureTransferBytes: textures.reduce(
              (total, entry) => total + entry.transferSize,
              0,
            ),
            textureDecodedBytes: textures.reduce(
              (total, entry) => total + entry.decodedBodySize,
              0,
            ),
            texturePaths: textures.map((entry) => new URL(entry.name).pathname),
            canvasCssPixels: [canvas.clientWidth, canvas.clientHeight],
            canvasBufferPixels: [canvas.width, canvas.height],
            layout: {
              viewportWidth: innerWidth,
              documentWidth: document.documentElement.scrollWidth,
              panelLeft: panelRect?.left ?? null,
              panelRight: panelRect?.right ?? null,
              panelClientWidth: panel?.clientWidth ?? null,
              panelScrollWidth: panel?.scrollWidth ?? null,
            },
          };
        }

        await new Promise((resolvePoll) => setTimeout(resolvePoll, 50));
      }

      throw new Error('Las texturas no terminaron de cargar.');
    })()`,
  );

  const measureFrames = `new Promise((resolveFrames) => {
    const startedAt = performance.now();
    let frames = 0;
    const tick = (now) => {
      frames += 1;
      if (now - startedAt >= ${MEASUREMENT_MS}) {
        resolveFrames({
          frames,
          durationMs: now - startedAt,
          fps: (frames * 1000) / (now - startedAt),
        });
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  })`;

  const framesBefore = await evaluate(session, measureFrames);
  const heapBefore = await heapUsed(session);
  await delay(MEMORY_SETTLE_MS);
  const heapAfter = await heapUsed(session);
  const framesAfter = await evaluate(session, measureFrames);

  console.log(
    JSON.stringify(
      {
        url: targetUrl,
        emulation: {
          viewport: `${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}`,
          deviceScaleFactor: DEVICE_SCALE_FACTOR,
          cpuSlowdown: CPU_SLOWDOWN,
          network: `${(DOWNLOAD_BYTES_PER_SECOND * 8) / 1_000_000} Mbps / ${NETWORK_LATENCY_MS} ms`,
        },
        ...loadedScene,
        framesBefore,
        framesAfter,
        heapBeforeBytes: heapBefore,
        heapAfterBytes: heapAfter,
        heapGrowthBytes:
          heapBefore === null || heapAfter === null ? null : heapAfter - heapBefore,
      },
      null,
      2,
    ),
  );
} finally {
  session?.close();
  chrome.kill();
  await Promise.race([chromeExited, delay(5_000)]);

  try {
    await rm(profileDirectory, { recursive: true, force: true });
  } catch (error) {
    if (error.code === 'EBUSY') {
      await delay(500);
      await rm(profileDirectory, { recursive: true, force: true }).catch(() => {});
    }
  }
}
