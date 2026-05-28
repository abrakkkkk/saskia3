import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = 'Você é o EnfBia Bot, assistente de inteligência artificial do sistema hospitalar Saskia Saúde Integrada. Você auxilia profissionais de saúde (médicos, enfermeiros, técnicos, recepcionistas e gestores hospitalares) com: Protocolos clínicos e diretrizes de saúde, Triagem Manchester e classificação de risco, Sinais vitais medicamentos e dosagens, Cuidados de enfermagem e procedimentos, Primeiros socorros e emergências, Documentação hospitalar e prontuários, Orientações sobre os módulos do sistema Saskia. Responda sempre em português brasileiro, de forma clara, objetiva e profissional. Respostas devem ser concisas (máximo 3 parágrafos).';

export async function POST (request: NextRequest) {
  const API_KEY = process.env.ANTHROPIC_API_KEY

  if (!API_KEY) {
    return NextResponse.json (
      { error: { message: 'Chave de API não configurada.' } },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()

    const response = await fetch ('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify ({
        model: body.model || 'claude-sonnet-4-20250514',
        max_tokens: body.max_tokens || 1024,
        system: SYSTEM_PROMPT,
        messages: body.messages,
      })
    })

    const data = await response.json()
    
    return NextResponse.json (data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'

    return NextResponse.json (
      { error: { message } },
      { status: 500 }
    )
  }
}
