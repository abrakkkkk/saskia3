import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isChatbotEnabled } from '../src/lib/chatbot.ts';

test('chatbot remains disabled even when a provider key is configured', () => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'synthetic-test-key';

  try {
    assert.equal(isChatbotEnabled(), false);
  } finally {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
