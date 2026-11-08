import { NextResponse } from 'next/server'
import { exigir, type Ator } from '@/lib/api-guard'
import { prisma } from '@/lib/db'
import { tipoPrescricao, tiposPermitidos, type TipoPrescricao } from '@/lib/prescricao'

type Resultado = { ator: Ator; negado?: never } | { ator?: never; negado: NextResponse }

/**
 * Exige que o usuário logado esteja autorizado pelo gestor a emitir ESTE tipo de prescrição.
 * O cargo sozinho não basta; o ADMIN pode todos os tipos (precisa ter registro profissional para salvar receita).
 */
export async function exigirPrescricao(tipo: TipoPrescricao): Promise<Resultado> {
  const { ator, negado } = await exigir('prescricao:registrar')
  if (negado) return { negado }
  const usuario = await prisma.usuario.findFirst({
    where: { id: ator.id, hospitalId: ator.hospitalId },
    select: { prescricoesAutorizadas: true },
  })
  if (!tiposPermitidos(ator.cargo, usuario?.prescricoesAutorizadas).includes(tipo)) {
    return {
      negado: NextResponse.json({
        error: `Você não está autorizado a emitir prescrição de ${tipoPrescricao(tipo).curto.toLowerCase()}. Peça ao administrador da unidade.`,
        codigo: 'PRESCRICAO_NAO_AUTORIZADA',
      }, { status: 403 }),
    }
  }
  return { ator }
}
