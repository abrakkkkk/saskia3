import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import sanitizeHtml from 'sanitize-html'
import { isRecord } from '@/lib/request-validation'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { alergiasCitadas } from '@/lib/alergias'
import { isTerminal } from '@/lib/paciente-status'
import { formatarRegistro } from '@/lib/registro-profissional'
import { ehTipoPrescricao, type TipoPrescricao } from '@/lib/prescricao'
import { exigirPrescricao } from '@/lib/prescricao-guard'

const JANELA_DUPLICIDADE_MS = 30_000
const LIMITE_HISTORICO = 50

function sanitizeRecipeHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'ul', 'ol', 'li', 'img'],
    allowedAttributes: { img: ['src', 'alt'] },
    allowedSchemes: [],
    allowProtocolRelative: false,
    exclusiveFilter: (frame) => frame.tag === 'img'
      && (!frame.attribs.src?.startsWith('/adesivos/') || frame.attribs.src.includes('..') || frame.attribs.src.includes('\\')),
  });
}

const SELECT_RECEITA = {
  id: true, pacienteId: true, medicamentos: true, tipo: true, observacoes: true,
  profissional: true, registroProfissional: true, especialidadeProfissional: true, usuarioId: true, createdAt: true,
} satisfies Prisma.ReceitaSelect

/** Histórico sempre por paciente, junto das alergias que a tela precisa destacar. */
export async function GET(request: NextRequest) {
  try {
    const { ator, negado } = await exigir('prescricao:ler')
    if (negado) return negado

    const pacienteId = request.nextUrl.searchParams.get('pacienteId')?.trim()
    if (!pacienteId || pacienteId.length > 64) {
      return NextResponse.json({ error: 'Selecione o paciente para consultar o histórico' }, { status: 400 })
    }

    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, hospitalId: ator.hospitalId },
      select: { id: true, nome: true, alergias: true, nascimento: true, cpf: true, sexo: true, endereco: true },
    })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    const receitas = await prisma.receita.findMany({
      where: { hospitalId: ator.hospitalId, pacienteId },
      select: SELECT_RECEITA,
      orderBy: { createdAt: 'desc' },
      take: LIMITE_HISTORICO,
    })

    return NextResponse.json({ paciente, receitas })
  } catch (error) {
    console.error('Erro ao buscar receitas:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao buscar prescrições' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const base = await exigir('prescricao:registrar')
    if (base.negado) return base.negado

    const body = await lerJson(request)
    const tipo: TipoPrescricao = ehTipoPrescricao(body?.tipo) ? body.tipo : 'FARMACOLOGICA'
    // O cargo só abre a porta; o tipo de prescrição precisa estar autorizado pelo gestor para este usuário.
    const { ator, negado } = await exigirPrescricao(tipo)
    if (negado) return negado

    if (!body || typeof body.pacienteId !== 'string' || !body.pacienteId.trim() || body.pacienteId.length > 64 || !Array.isArray(body.medicamentos) || body.medicamentos.length < 1 || body.medicamentos.length > 100) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }
    if (body.medicamentos.some((item) => !isRecord(item) || typeof item.viaUso !== 'string' || !item.viaUso.trim() || item.viaUso.length > 80 || typeof item.conteudo !== 'string' || !item.conteudo.trim() || item.conteudo.length > 4000)) {
      return NextResponse.json({ error: 'Itens da prescrição inválidos' }, { status: 400 })
    }
    if (body.observacoes !== undefined && body.observacoes !== null && (typeof body.observacoes !== 'string' || body.observacoes.length > 1000)) {
      return NextResponse.json({ error: 'Observações inválidas' }, { status: 400 })
    }

    // Receita sem registro no conselho não vale na farmácia: o prescritor precisa ter o dele cadastrado.
    const prescritor = await prisma.usuario.findFirst({
      where: { id: ator.id, hospitalId: ator.hospitalId },
      select: { conselho: true, registroNumero: true, registroUf: true, especialidade: true, rqe: true },
    })
    const registroProfissional = formatarRegistro(prescritor)
    if (!registroProfissional) {
      return NextResponse.json({
        error: 'Cadastre seu registro profissional (CRM, número e UF) em Minha conta antes de salvar receitas.',
        codigo: 'REGISTRO_PROFISSIONAL_AUSENTE',
      }, { status: 409 })
    }
    const especialidadeProfissional = [prescritor?.especialidade, prescritor?.rqe ? `RQE ${prescritor.rqe}` : null].filter(Boolean).join(' · ') || null

    const pacienteId = body.pacienteId.trim()
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, hospitalId: ator.hospitalId, arquivadoEm: null },
      select: { id: true, status: true, alergias: true },
    })
    if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado ou não autorizado' }, { status: 403 })
    if (isTerminal(paciente.status)) return NextResponse.json({ error: 'Paciente com óbito registrado não pode receber prescrição' }, { status: 409 })

    const medicamentos = (body.medicamentos as { viaUso: string; conteudo: string }[])
      .map(item => ({ viaUso: item.viaUso.trim(), conteudo: sanitizeRecipeHtml(item.conteudo) }))
    if (medicamentos.some((item) => !item.conteudo.replace(/<[^>]+>/g, '').trim())) {
      return NextResponse.json({ error: 'Cada item deve conter texto de prescrição' }, { status: 400 })
    }

    // A conferência de alergia vale para medicamentos; cuidados, oxigênio, dieta etc. não citam fármaco.
    const citadas = tipo === 'FARMACOLOGICA' ? alergiasCitadas(paciente.alergias, medicamentos.map(item => item.conteudo).join(' ')) : []
    if (citadas.length > 0 && body.alergiaConfirmada !== true) {
      return NextResponse.json({
        error: `A prescrição cita alergia registrada do paciente: ${citadas.join(', ')}. Confirme para salvar.`,
        codigo: 'ALERGIA_NAO_CONFIRMADA',
        alergias: citadas,
      }, { status: 409 })
    }

    // Duplo clique ou reenvio: mesmo autor, paciente e conteúdo em poucos segundos devolve a receita já salva.
    const recentes = await prisma.receita.findMany({
      where: {
        hospitalId: ator.hospitalId, pacienteId, usuarioId: ator.id, tipo,
        createdAt: { gte: new Date(Date.now() - JANELA_DUPLICIDADE_MS) },
      },
      select: SELECT_RECEITA,
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    const conteudo = JSON.stringify(medicamentos)
    const repetida = recentes.find(receita => JSON.stringify(receita.medicamentos) === conteudo)
    if (repetida) return NextResponse.json(repetida)

    const receita = await prisma.receita.create({
      data: {
        hospitalId: ator.hospitalId,
        pacienteId,
        medicamentos: medicamentos as Prisma.InputJsonValue,
        tipo,
        observacoes: typeof body.observacoes === 'string' ? body.observacoes : null,
        profissional: ator.nome,
        registroProfissional,
        especialidadeProfissional,
        usuarioId: ator.id,
      },
      select: SELECT_RECEITA,
    })

    await auditar(ator, 'RECEITA_CRIADA', 'Receita', receita.id, {
      pacienteId,
      tipo,
      itens: medicamentos.length,
      ...(citadas.length > 0 ? { alergiaConfirmada: citadas } : {}),
    })
    return NextResponse.json(receita, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar receita:', error instanceof Error ? error.name : 'erro')
    return NextResponse.json({ error: 'Erro ao criar prescrição' }, { status: 500 })
  }
}
