import test from 'node:test';
import assert from 'node:assert/strict';

import { isTeacherCredentialsValid } from './teacher-auth.mjs';

test('accepts the teacher credentials', () => {
  assert.equal(isTeacherCredentialsValid('test', 'test'), true);
});

test('rejects incorrect teacher credentials', () => {
  assert.equal(isTeacherCredentialsValid('teacher', 'wrong'), false);
});
