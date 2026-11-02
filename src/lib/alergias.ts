// Comparação simples entre o texto livre de alergias e o texto prescrito.
// Não substitui catálogo de medicamentos: nome comercial e classe farmacológica não são reconhecidos.

const SEM_ALERGIA = /^(nega|negam|nenhuma?|nao|sem|nkda|desconhece|nao informad[oa]|nao possui|sem alergias?( conhecidas?)?|nega alergias?|nao tem)\b/

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function termosDeAlergia(alergias: string | null | undefined) {
  if (!alergias) return []
  return alergias
    .split(/[,;/\n]|\s+e\s+/i)
    .map(parte => normalizar(parte.replace(/\([^)]*\)/g, ' '))
      .replace(/^(alergia|alergica?|alergico)\s*(a|ao|as|aos|de|por)?\s*/, '')
      .replace(/[.:]+$/, '')
      .trim())
    .filter(termo => termo.length >= 3 && !SEM_ALERGIA.test(termo))
}

export function alergiasCitadas(alergias: string | null | undefined, textoPrescrito: string) {
  const texto = normalizar(textoPrescrito.replace(/<[^>]+>/g, ' '))
  return [...new Set(termosDeAlergia(alergias).filter(termo => texto.includes(termo)))]
}
