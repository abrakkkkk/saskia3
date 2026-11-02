/** Mensagem de erro devolvida pela API, ou o texto padrão quando a resposta não traz uma. */
export async function mensagemErro(resposta: Response, padrao: string) {
  const corpo: unknown = await resposta.json().catch(() => null);
  const erro = corpo && typeof corpo === 'object' ? (corpo as { error?: unknown }).error : null;
  return typeof erro === 'string' && erro ? erro : padrao;
}

export function textoDoErro(erro: unknown, padrao: string) {
  return erro instanceof Error && erro.message ? erro.message : padrao;
}

export async function enviarJson(url: string, metodo: 'POST' | 'PUT', corpo: unknown, padraoErro: string) {
  const resposta = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new Error(await mensagemErro(resposta, padraoErro));
  return resposta;
}
