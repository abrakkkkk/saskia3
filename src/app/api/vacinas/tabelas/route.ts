import { NextResponse } from 'next/server'
import { exigir } from '@/lib/api-guard'
import { tabelasExame, tabelasVacina } from '@/lib/rnds/tabelas'

// Tabelas oficiais da RNDS para os formulários (dado público, sem paciente). ?tipo=exame para as do REL.
export async function GET(request: Request) {
  const exame = new URL(request.url).searchParams.get('tipo') === 'exame'
  const { negado } = await exigir(exame ? 'integracao:gerir' : 'vacina:ler')
  if (negado) return negado
  return NextResponse.json(exame ? tabelasExame() : tabelasVacina(), { headers: { 'cache-control': 'private, max-age=3600' } })
}
