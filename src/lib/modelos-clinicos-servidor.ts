import { prisma } from '@/lib/db'
import { MODELOS_CLINICOS, type ModeloClinico, type SituacaoModelo } from '@/lib/modelos-clinicos'

/** Situação de validação de um modelo no hospital (sempre filtrada pelo hospitalId da sessão). */
export async function situacaoModelo(hospitalId: string, modelo: ModeloClinico): Promise<SituacaoModelo> {
  const v = await prisma.validacaoModeloClinico.findUnique({ where: { hospitalId_modelo: { hospitalId, modelo } } })
  return v
    ? { validado: true, validadoEm: v.validadoEm.toISOString(), validadoPorNome: v.validadoPorNome, observacao: v.observacao }
    : { validado: false, validadoEm: null, validadoPorNome: null, observacao: null }
}

export async function situacaoTodos(hospitalId: string) {
  const linhas = await prisma.validacaoModeloClinico.findMany({ where: { hospitalId } })
  return (Object.keys(MODELOS_CLINICOS) as ModeloClinico[]).map(modelo => {
    const v = linhas.find(l => l.modelo === modelo)
    return {
      modelo,
      ...MODELOS_CLINICOS[modelo],
      validado: !!v,
      validadoEm: v ? v.validadoEm.toISOString() : null,
      validadoPorNome: v?.validadoPorNome ?? null,
      observacao: v?.observacao ?? null,
    }
  })
}
