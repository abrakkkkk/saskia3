import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isRecord } from '@/lib/request-validation';

const SYSTEM_PROMPT = 'Você é o EnfBia Bot, assistente de inteligência artificial do sistema hospitalar Saskia Saúde Integrada. Você auxilia profissionais de saúde com protocolos, documentação e orientações gerais sobre os módulos do sistema. Responda em português brasileiro, de forma clara, objetiva e profissional, em no máximo três parágrafos. Não use emojis. Não substitua protocolos institucionais nem a avaliação de profissionais habilitados.';
const MAX_BODY_BYTES = 20 * 1024;
const MAX_MESSAGES = 13;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_TOTAL_CHARS = 16_000;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

async function readJson(request: NextRequest): Promise<unknown | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }

    const body = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!isRecord(value) || !Array.isArray(value.messages) || value.messages.length === 0 || value.messages.length > MAX_MESSAGES) {
    return null;
  }

  let totalChars = 0;
  const messages: ChatMessage[] = [];
  for (const message of value.messages) {
    if (
      !isRecord(message) ||
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string' ||
      !message.content.trim() ||
      message.content.length > MAX_MESSAGE_CHARS
    ) {
      return null;
    }
    totalChars += message.content.length;
    if (totalChars > MAX_TOTAL_CHARS) return null;
    messages.push({ role: message.role, content: message.content });
  }

  if (messages.at(-1)?.role !== 'user') return null;
  return messages;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { message: 'Não autorizado' } }, { status: 401 });

  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: { message: 'Requisição inválida ou muito grande' } }, { status: 400 });

  const messages = parseMessages(body);
  if (!messages) return NextResponse.json({ error: { message: 'Mensagens inválidas' } }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: { message: 'Assistente indisponível no momento' } }, { status: 503 });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: { message: 'Não foi possível obter resposta do assistente' } }, { status: 502 });
    }

    const data: unknown = await response.json();
    if (!isRecord(data) || !Array.isArray(data.choices)) {
      return NextResponse.json({ error: { message: 'Resposta inválida do assistente' } }, { status: 502 });
    }

    const firstChoice = data.choices[0];
    const message = isRecord(firstChoice) && isRecord(firstChoice.message) ? firstChoice.message : null;
    if (!message || typeof message.content !== 'string') {
      return NextResponse.json({ error: { message: 'Resposta inválida do assistente' } }, { status: 502 });
    }

    return NextResponse.json({ content: [{ text: message.content }] });
  } catch {
    return NextResponse.json({ error: { message: 'Assistente indisponível no momento' } }, { status: 502 });
  }
}
