/**
 * Envio de e-mail transacional pelo Resend (https://resend.com), por HTTP, sem SDK.
 * Precisa de RESEND_API_KEY e EMAIL_FROM (ex.: "Saskia <nao-responda@seudominio.com.br>").
 */
export function emailConfigurado() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export async function enviarEmail(para: string, assunto: string, html: string, texto: string): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY
  const de = process.env.EMAIL_FROM
  if (!chave || !de) return false
  try {
    // EMAIL_API_URL só é usado nos testes, para apontar a um servidor local que captura o e-mail.
    const resposta = await fetch(process.env.EMAIL_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: de, to: [para], subject: assunto, html, text: texto }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!resposta.ok) console.error('Resend recusou o envio:', resposta.status)
    return resposta.ok
  } catch (error) {
    console.error('Falha ao enviar e-mail:', error instanceof Error ? error.name : 'erro')
    return false
  }
}
