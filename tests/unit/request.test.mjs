import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fetchWithTimeout } from '../../src/shared/api/request.ts';
test('зависший HTTP-запрос завершается по таймауту, успешный запрос возвращает ответ', async () => {
 const server = createServer((request, response) => { if (request.url === '/ok') response.end('готово'); });
 server.listen(0, '127.0.0.1'); await once(server, 'listening');
 const base = 'http://127.0.0.1:' + server.address().port;
 try {
  const response = await fetchWithTimeout(base + '/ok', undefined, 1000); assert.equal(await response.text(), 'готово');
  await assert.rejects(fetchWithTimeout(base + '/hang', undefined, 40), { name: 'TimeoutError' });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchWithTimeout(base + '/ok', { signal: controller.signal }, 1000), { name: 'AbortError' });
 } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
