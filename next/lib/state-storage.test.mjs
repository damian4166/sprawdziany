import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { loadState, saveState } from './state-storage.mjs';

test('saves and loads quiz state from a json file', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'quiz-state-'));
  const filePath = path.join(tempDir, 'state.json');

  const state = {
    questions: [{ id: 'q-1', text: 'Pytanie', answer: 'Odpowiedź', createdAt: '2026-01-01T00:00:00.000Z' }],
    answers: [],
  };

  await saveState(state, filePath);
  const loadedState = await loadState(filePath);

  assert.deepEqual(loadedState, state);

  await rm(tempDir, { recursive: true, force: true });
});
