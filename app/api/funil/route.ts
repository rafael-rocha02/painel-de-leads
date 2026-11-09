import { NextResponse } from 'next/server'
import { obterDadosFunil } from '@/lib/funil-servidor'

export const revalidate = 3600

export async function GET() {
  return NextResponse.json(await obterDadosFunil())
}
