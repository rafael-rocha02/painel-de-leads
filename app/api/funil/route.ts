import { NextResponse } from 'next/server'
import { dadosDeReserva, obterDadosFunil } from '@/lib/funil-servidor'

export const revalidate = 3600

export async function GET() {
  try {
    return NextResponse.json(await obterDadosFunil())
  } catch {
    return NextResponse.json(dadosDeReserva())
  }
}
