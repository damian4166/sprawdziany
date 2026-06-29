import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createInitialState } from './quiz-state.mjs';

export const DEFAULT_STATE_FILE_PATH = path.resolve(process.cwd(), 'data', 'quiz-state.json');

export async function loadState(filePath = DEFAULT_STATE_FILE_PATH) {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      return createInitialState();
    }

    return {
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      answers: Array.isArray(parsed.answers) ? parsed.answers : [],
    };
  } catch {
    return createInitialState();
  }
}

export async function saveState(state, filePath = DEFAULT_STATE_FILE_PATH) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
}
