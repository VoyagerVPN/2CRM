import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const temporary = resolve(root, '.cache/tmp');
mkdirSync(temporary, { recursive: true });
const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('Укажите исполняемый файл и аргументы');
const child = spawn(command === 'node' ? process.execPath : command, args, {
  cwd: root, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, TEMP: temporary, TMP: temporary, TMPDIR: temporary, npm_config_cache: resolve(root, '.cache/npm') },
});
child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
