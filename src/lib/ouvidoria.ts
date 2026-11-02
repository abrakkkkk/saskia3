// O schema não tem coluna de resposta: ela é anexada à mensagem pelo servidor, após este marcador.
// O POST remove o marcador do texto do manifestante, para que uma resposta não possa ser imitada.
const MARCADOR = '␞[RESPOSTA-OUVIDORIA]␞'

export const PRAZO_RESPOSTA_DIAS = 30
export const STATUS_OUVIDORIA = ['ABERTO', 'EM_ANALISE', 'RESPONDIDA', 'ENCERRADA'] as const

export function limparMarcador(texto: string) {
  return texto.replaceAll(MARCADOR, '')
}

export function anexarResposta(mensagem: string, resposta: string) {
  return `${mensagem}${MARCADOR}${resposta}`
}

export function separarResposta(texto: string) {
  const [mensagem, ...respostas] = texto.split(MARCADOR)
  return { mensagem, respostas }
}

export function prazoIso(base = new Date()) {
  const prazo = new Date(base.getTime() + PRAZO_RESPOSTA_DIAS * 86_400_000)
  return prazo.toISOString().slice(0, 10)
}
