import { prisma } from '@/lib/db'

export async function findPatientInHospital(id: string, hospitalId: string) {
  return prisma.paciente.findFirst({
    where: { id, hospitalId },
    select: { id: true },
  })
}
