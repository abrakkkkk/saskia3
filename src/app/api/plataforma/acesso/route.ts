import { NextResponse } from 'next/server'
import { exigirPlataforma } from '@/lib/plataforma'

/** 200 se o usuário logado opera a plataforma; 401/403 caso contrário. Serve só para mostrar ou esconder o atalho. */
export async function GET() {
  const { negado } = await exigirPlataforma()
  if (negado) return negado
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
