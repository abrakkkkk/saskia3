import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const hospitais = await prisma.hospital.findMany ({
      where: { ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json (hospitais)
  } catch (error) {
    return NextResponse.json([], { status: 500 })
  }
}
