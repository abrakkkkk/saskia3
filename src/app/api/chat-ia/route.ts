import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = 'Você é o EnfBia Bot, assistente de inteligência artificial do sistema hospitalar Saskia Saúde Integrada. Você auxilia profissionais de saúde (médicos, enfermeiros, técnicos, recepcionistas e gestores hospitalares) com: Protocolos clínicos e diretrizes de saúde, Triagem Manchester e classificação de risco, Sinais vitais medicamentos e dosagens, Cuidados de enfermagem e procedimentos, Primeiros socorros e emergências, Documentação hospitalar e prontuários, Orientações sobre os módulos do sistema Saskia. Responda sempre em português brasileiro, de forma clara, objetiva e profissional. Respostas devem ser concisas (máximo 3 parágrafos).';

export async function POST(request: NextRequest) {
  const API_KEY = process.env.OPENAI_API_KEY;

  if (!API_KEY) {
    return NextResponse.json(
      { error: { message: 'Chave de API da OpenAI não configurada.' } },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const messages = body.messages || [];

    // Formatar as mensagens para o padrão OpenAI, inserindo o system prompt
    const formattedMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: body.model || 'gpt-4o-mini', // Usando modelo rápido/padrão
        max_tokens: body.max_tokens || 1024,
        temperature: 0.7,
        messages: formattedMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro na API da OpenAI');
    }

    // Retorna no formato que o componente frontend espera (adaptado do que tínhamos)
    // O frontend espera `data.content[0].text` ou precisamos ajustar o frontend para ler `data.choices[0].message.content`
    // Vamos retornar um formato unificado para que o frontend não quebre (simulando a estrutura antiga, ou alteramos o frontend).
    // O frontend faz: const botContent = data.content?.[0]?.text || data.error?.message;
    // Vou retornar compatível:
    return NextResponse.json({
      content: [
        { text: data.choices[0].message.content }
      ]
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: { message } },
      { status: 500 }
    );
  }
}
