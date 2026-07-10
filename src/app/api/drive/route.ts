import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    const folderId = '1a0gzCh2yfoCIHQtQMRp-AJXuCPTAmoP6';

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key do Google Drive não configurada.' }, { status: 500 });
    }

    // A API do Drive v3 precisa que informemos a pasta mãe (parents)
    // Usamos trashed=false para não trazer arquivos da lixeira
    const query = `'${folderId}' in parents and trashed=false`;
    
    // A query string deve ser codificada para URL
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,webViewLink)&key=${apiKey}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Desativar cache temporário para sempre mostrar os PDFs atualizados
      cache: 'no-store' 
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Erro na API do Google:", errorData);
      return NextResponse.json({ error: 'Falha ao buscar arquivos no Google Drive' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Erro interno:", error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
