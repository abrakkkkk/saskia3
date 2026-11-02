import { NextResponse } from 'next/server';
import { exigir } from '@/lib/api-guard';

const PASTA_ID = '1a0gzCh2yfoCIHQtQMRp-AJXuCPTAmoP6';
const LIMITE_ARQUIVOS = 200;
const INDISPONIVEL = { files: [], configured: false, message: 'Catálogo remoto indisponível.' };

export async function GET() {
  const { negado } = await exigir('autenticado');
  if (negado) return negado;

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) return NextResponse.json(INDISPONIVEL);

  try {
    const parametros = new URLSearchParams({
      q: `'${PASTA_ID}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,size,webViewLink,webContentLink)',
      pageSize: String(LIMITE_ARQUIVOS),
      key: apiKey,
    });
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${parametros}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn('Catálogo do Drive indisponível, status', res.status);
      return NextResponse.json(INDISPONIVEL);
    }

    const data: { files?: unknown } = await res.json();
    const files = Array.isArray(data.files) ? data.files.slice(0, LIMITE_ARQUIVOS) : [];
    return NextResponse.json({ files, configured: true });
  } catch {
    console.error('Falha ao consultar o catálogo do Drive');
    return NextResponse.json(INDISPONIVEL);
  }
}
