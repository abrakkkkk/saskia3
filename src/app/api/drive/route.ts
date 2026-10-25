import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!session.user.hospitalId) return NextResponse.json({ error: 'Hospital não identificado' }, { status: 403 });
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    const folderId = '1a0gzCh2yfoCIHQtQMRp-AJXuCPTAmoP6';

    if (!apiKey) {
      return NextResponse.json({ 
        files: [], 
        configured: false, 
        message: 'API Key do Google Drive não configurada no ambiente.' 
      }, { status: 200 });
    }

    // A API do Drive v3 precisa que informemos a pasta mãe (parents)
    // Usamos trashed=false para não trazer arquivos da lixeira
    const query = `'${folderId}' in parents and trashed=false`;
    
    // A query string deve ser codificada para URL
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,webViewLink,webContentLink)&key=${apiKey}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store' 
    });

    if (!res.ok) {
      console.warn("Falha ao comunicar com Google Drive API, operando com documentos locais.");
      return NextResponse.json({ 
        files: [], 
        configured: false, 
        message: 'Falha ao buscar arquivos remotos do Google Drive.' 
      }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Erro interno na rota do Drive:", error);
    return NextResponse.json({ 
      files: [], 
      configured: false, 
      error: 'Erro interno ao consultar arquivos remotos.' 
    }, { status: 200 });
  }
}
