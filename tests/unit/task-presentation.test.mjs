import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskProgress } from '../../src/features/tasks/task-presentation.ts';

test('шкала различает текущий этап, возврат с проверки и завершение', () => {
 assert.deepEqual(taskProgress('new'), { step: 0, returned: false, complete: false });
 assert.deepEqual(taskProgress('in_progress'), { step: 1, returned: false, complete: false });
 assert.deepEqual(taskProgress('in_review'), { step: 2, returned: false, complete: false });
 assert.deepEqual(taskProgress('rework'), { step: 2, returned: true, complete: false });
 assert.deepEqual(taskProgress('accepted'), { step: 3, returned: false, complete: true });
 assert.equal(taskProgress('unknown'), null);
});
