import { NextResponse } from 'next/server'
import { auditar, exigir } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { compararEstabelecimento, conferirEquipe, consultarEstabelecimento } from '@/lib/cnes'

// Situação do CNES da unidade: dados cadastrados, equipe importada da base oficial e conferência de CNS/CBO dos usuários.
// ?conferir=1 consulta a API pública do Ministério da Saúde e devolve as divergências do estabelecimento.
export async function GET(request: Request) {
  const { ator, negado } = await exigir('integracao:ler')
  if (negado) return negado
  try {
    const conferir = new URL(request.url).searchParams.get('conferir') === '1'
    const [hospital, config, usuarios, equipe] = await Promise.all([
      prisma.hospital.findUnique({ where: { id: ator.hospitalId }, select: { nome: true, cnpj: true } }),
      prisma.configFaturamento.findUnique({ where: { hospitalId: ator.hospitalId }, select: { cnes: true, municipioIbge: true, uf: true } }),
      prisma.usuario.findMany({
        where: { hospitalId: ator.hospitalId, ativo: true, cargo: { notIn: ['ADMIN', 'FATURISTA', 'RECEPCIONISTA'] } },
        select: { id: true, nome: true, cargo: true, cns: true, cbo: true },
        orderBy: { nome: 'asc' },
        take: 1000,
      }),
      prisma.cnesProfissional.findMany({ where: { hospitalId: ator.hospitalId }, select: { cns: true, nome: true, cbo: true, competencia: true }, take: 5000 }),
    ])

    let estabelecimento: unknown = null
    if (conferir) {
      if (!config?.cnes) {
        estabelecimento = { ok: false, erro: 'Cadastre o CNES da unidade em Faturamento → Unidade.' }
      } else {
        const r = await consultarEstabelecimento(config.cnes)
        estabelecimento = r.ok
          ? { ok: true, oficial: r.estabelecimento, divergencias: compararEstabelecimento(r.estabelecimento, { nome: hospital?.nome ?? '', cnpj: hospital?.cnpj ?? null, municipioIbge: config.municipioIbge, uf: config.uf }) }
          : r
        await auditar(ator, 'CONFERIR_CNES', 'ConfigFaturamento', null, { ok: r.ok })
      }
    }

    const competencia = equipe.reduce<string | null>((m, p) => (!m || p.competencia > m ? p.competencia : m), null)
    return NextResponse.json({
      unidade: { nome: hospital?.nome ?? null, cnes: config?.cnes ?? null, municipioIbge: config?.municipioIbge ?? null, uf: config?.uf ?? null },
      equipeImportada: { total: equipe.length, competencia },
      profissionais: conferirEquipe(usuarios, equipe),
      estabelecimento,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar a situação do CNES' }, { status: 500 })
  }
}
