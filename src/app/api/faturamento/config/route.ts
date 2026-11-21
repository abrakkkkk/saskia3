import { NextResponse } from 'next/server'
import { auditar, exigir, lerJson } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { UF_IBGE } from '@/lib/faturamento/dominios'
import { ehFalha, falha, respostaErro, respostaFalha, texto } from '@/lib/faturamento/servidor'

const SELECT = {
  cnes: true, municipioIbge: true, uf: true, orgaoDestinoNome: true, orgaoDestinoTipo: true,
  orgaoOrigemNome: true, orgaoOrigemSigla: true, orgaoEmissorAih: true, updatedAt: true,
} as const

// Dados da unidade usados nos arquivos do SUS e no XML TISS (CNES).
export async function GET() {
  try {
    const { ator, negado } = await exigir('faturamento:ler')
    if (negado) return negado
    const [config, hospital] = await Promise.all([
      prisma.configFaturamento.findUnique({ where: { hospitalId: ator.hospitalId }, select: SELECT }),
      prisma.hospital.findUnique({ where: { id: ator.hospitalId }, select: { nome: true, cnpj: true } }),
    ])
    return NextResponse.json({ ...config, orgaoDestinoTipo: config?.orgaoDestinoTipo ?? 'M', hospital })
  } catch (error) {
    return respostaErro(error, 'carregar a configuração do faturamento')
  }
}

export async function PUT(request: Request) {
  try {
    const { ator, negado } = await exigir('faturamento:configurar')
    if (negado) return negado
    const corpo = await lerJson(request)
    if (!corpo) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const campos = {
      cnes: texto(corpo, 'cnes', 7, /^\d{7}$/),
      municipioIbge: texto(corpo, 'municipioIbge', 6, /^\d{6}$/),
      uf: texto(corpo, 'uf', 2, /^[A-Za-z]{2}$/),
      orgaoDestinoNome: texto(corpo, 'orgaoDestinoNome', 40),
      orgaoDestinoTipo: texto(corpo, 'orgaoDestinoTipo', 1, /^[ME]$/),
      orgaoOrigemNome: texto(corpo, 'orgaoOrigemNome', 30),
      orgaoOrigemSigla: texto(corpo, 'orgaoOrigemSigla', 6),
      orgaoEmissorAih: texto(corpo, 'orgaoEmissorAih', 10),
    }
    const dados: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(campos)) {
      if (ehFalha(v)) return respostaFalha(v)
      if (v !== undefined) dados[k] = k === 'uf' && v ? v.toUpperCase() : v
    }
    if (dados.uf && !UF_IBGE[dados.uf]) return respostaFalha(falha('UF inválida'))
    if (dados.orgaoDestinoTipo === null) delete dados.orgaoDestinoTipo
    const config = await prisma.configFaturamento.upsert({
      where: { hospitalId: ator.hospitalId },
      create: { hospitalId: ator.hospitalId, ...dados },
      update: dados,
      select: SELECT,
    })
    await auditar(ator, 'faturamento.configurar', 'ConfigFaturamento', ator.hospitalId, { campos: Object.keys(dados) })
    return NextResponse.json(config)
  } catch (error) {
    return respostaErro(error, 'salvar a configuração do faturamento')
  }
}
