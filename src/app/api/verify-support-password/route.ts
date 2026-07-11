import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senha } = body;
    
    // The support password is now securely stored on the server as an environment variable
    // We fall back to 'saskia2024' only if the env var is missing, but it is strictly evaluated on the server side
    const senhaSuporte = process.env.SENHA_SUPORTE || "saskia2024";

    if (senha === senhaSuporte) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Senha incorreta' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro no servidor' }, { status: 500 });
  }
}
