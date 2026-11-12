/**
 * Genera los avisos de licencia de todas las dependencias que se incluyen en el sitio publicado
 * (dependencias de producción, directas y transitivas) a partir de package-lock.json:
 *   public/third-party-licenses.txt   texto completo de cada licencia (exigido por MIT, ISC, OFL...)
 *   public/third-party-licenses.json  resumen (nombre, versión, licencia) que muestra la página «Licencias»
 * Se ejecuta automáticamente antes de `npm run dev` y `npm run build`.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const LICENSE_FILE = /^(licen[cs]e|copying|ofl)(\.(md|txt))?$/i;

const entries = [];
const seen = new Set();
for (const [path, info] of Object.entries(lock.packages || {})) {
  if (!path || info.dev || info.optional) continue;
  const dir = join(root, path);
  const pkgFile = join(dir, 'package.json');
  if (!existsSync(pkgFile)) continue;
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
  const key = `${pkg.name}@${pkg.version}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const licenseFile = readdirSync(dir).find((f) => LICENSE_FILE.test(f));
  const license = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type || info.license || 'Desconocida';
  entries.push({
    name: pkg.name,
    version: pkg.version,
    license,
    homepage: pkg.homepage || (typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url) || '',
    text: licenseFile ? readFileSync(join(dir, licenseFile), 'utf8').trim() : '',
  });
}

entries.sort((a, b) => a.name.localeCompare(b.name));
const missing = entries.filter((e) => !e.text);
if (missing.length) {
  console.warn(`[licencias] Sin archivo de licencia: ${missing.map((e) => e.name).join(', ')}`);
}

const header =
  'Avisos de licencia de terceros incluidos en Pizarra Digital\n' +
  'Generado automáticamente a partir de package-lock.json.\n\n';
const body = entries
  .map((e) => `${'='.repeat(72)}\n${e.name}@${e.version} — ${e.license}\n${e.homepage}\n${'='.repeat(72)}\n\n${e.text || '(El paquete no incluye archivo de licencia; consulte el repositorio del paquete.)'}\n`)
  .join('\n');

mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'third-party-licenses.txt'), header + body);
writeFileSync(
  join(root, 'public', 'third-party-licenses.json'),
  JSON.stringify(entries.map(({ text, ...rest }) => rest), null, 2)
);
console.log(`[licencias] ${entries.length} paquetes de producción documentados.`);
