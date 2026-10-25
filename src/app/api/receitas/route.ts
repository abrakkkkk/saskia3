import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { JSDOM } from 'jsdom'
import { isRecord } from '@/lib/request-validation'

const ALLOWED_RECIPE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'IMG']);
const DROP_CONTENT_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE']);

function sanitizeRecipeHtml(value: string) {
  const document = new JSDOM(value).window.document;
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    if (!ALLOWED_RECIPE_TAGS.has(element.tagName)) {
      if (DROP_CONTENT_TAGS.has(element.tagName)) element.remove();
      else element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    if (element.tagName === 'IMG') {
      const src = element.getAttribute('src') || '';
      const alt = element.getAttribute('alt') || '';
      if (!src.startsWith('/adesivos/') || src.includes('..') || src.includes('\\')) {
        element.remove();
        continue;
      }
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
      element.setAttribute('src', src);
      element.setAttribute('alt', alt.slice(0, 120));
    } else {
      for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
    }
  }
  return document.body.innerHTML;
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!['MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'TECNICO_ENFERMAGEM', 'FARMACEUTICO'].includes(session.user.cargo)) {
      return NextResponse.json({ error: 'Acesso restrito à equipe clínica' }, { status: 403 })
    }

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    const receitas = await prisma.receita.findMany({
      where: { hospitalId },
      include: {
        paciente: {
          select: { nome: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json(receitas)
  } catch (error) {
    console.error('Erro ao buscar receitas:', error)
    return NextResponse.json({ error: 'Erro ao buscar prescrições' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (session.user.cargo !== 'MEDICO') return NextResponse.json({ error: 'Apenas médicos podem registrar prescrições' }, { status: 403 })

    const hospitalId = session.user.hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 })
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    if (!isRecord(body) || typeof body.pacienteId !== 'string' || !body.pacienteId || !Array.isArray(body.medicamentos) || body.medicamentos.length < 1 || body.medicamentos.length > 100) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }
    if (body.medicamentos.some((item) => !isRecord(item) || typeof item.viaUso !== 'string' || !item.viaUso.trim() || item.viaUso.length > 80 || typeof item.conteudo !== 'string' || !item.conteudo.trim() || item.conteudo.length > 4000)) {
      return NextResponse.json({ error: 'Itens da prescrição inválidos' }, { status: 400 })
    }
    if (body.observacoes !== undefined && body.observacoes !== null && (typeof body.observacoes !== 'string' || body.observacoes.length > 1000)) {
      return NextResponse.json({ error: 'Observações inválidas' }, { status: 400 })
    }
    
    // IDOR protection: Verify the patient belongs to this hospital
    const paciente = await prisma.paciente.findFirst({
      where: { id: body.pacienteId, hospitalId }
    })
    
    if (!paciente) {
      return NextResponse.json({ error: 'Paciente não encontrado ou não autorizado' }, { status: 403 })
    }

    const medicamentos = body.medicamentos.map((item) => ({ viaUso: item.viaUso.trim(), conteudo: sanitizeRecipeHtml(item.conteudo) }));
    if (medicamentos.some((item) => !item.conteudo.replace(/<[^>]+>/g, '').trim())) {
      return NextResponse.json({ error: 'Cada item deve conter texto de prescrição' }, { status: 400 });
    }
    const receita = await prisma.receita.create({
      data: {
        hospitalId,
        pacienteId: body.pacienteId,
        medicamentos: medicamentos as Prisma.InputJsonValue,
        observacoes: typeof body.observacoes === 'string' ? body.observacoes : null,
        profissional: session.user.name || 'Médico',
        usuarioId: session.user.id || null
      },
      include: {
        paciente: true
      }
    })

    return NextResponse.json(receita, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar receita:', error)
    const message = error instanceof Error ? error.message : 'Erro ao criar receita'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
