import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET (_: NextRequest, { params }: { params: Promise <{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json ({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const hospitalId = session.user.hospitalId
    const paciente = await prisma.paciente.findFirst ({
      where: { id, hospitalId },
      include: { 
        triagens: { orderBy: { createdAt: 'desc' } }, 
        evolucoes: { orderBy: { createdAt: 'desc' } }, 
        prescricoes: { orderBy: { createdAt: 'desc' } },
        exames: { orderBy: { createdAt: 'desc' } },
        sinaisVitais: { orderBy: { createdAt: 'desc' } },
        escoresClinicos: { orderBy: { createdAt: 'desc' } },
        avaliacoesNutri: { orderBy: { createdAt: 'desc' } },
        avaliacoesMedicas: { orderBy: { createdAt: 'desc' } },
        anotacoesEnf: { orderBy: { createdAt: 'desc' } },
        timelineEvents: { orderBy: { createdAt: 'desc' } }
      }
    })

    if (!paciente) return NextResponse.json ({ error: 'Paciente não encontrado' }, { status: 404 })

    return NextResponse.json (paciente)
  } catch {
    return NextResponse.json ({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT (request: NextRequest, { params }: { params: Promise <{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json ({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const hospitalId = session.user.hospitalId
    const body = await request.json()
    
    const pacienteExistente = await prisma.paciente.findFirst({ where: { id, hospitalId } })
    if (!pacienteExistente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    // Prevents Mass Assignment by removing protected fields from the body
    const { id: _, hospitalId: __, createdAt, updatedAt, ...safeData } = body
    
    const paciente = await prisma.paciente.update ({ where: { id }, data: safeData })
    return NextResponse.json (paciente)
  } catch {
    return NextResponse.json ({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE (_: NextRequest, { params }: { params: Promise <{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json ({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const hospitalId = session.user.hospitalId
    
    const pacienteExistente = await prisma.paciente.findFirst({ where: { id, hospitalId } })
    if (!pacienteExistente) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    await prisma.paciente.delete ({ where: { id } })
    return NextResponse.json ({ success: true })
  } catch {
    return NextResponse.json ({ error: 'Erro ao excluir' }, { status: 500 })
  }
}
