// Identificação SUS: Cartão Nacional de Saúde (CNS), CNES e CBO.
// Algoritmo do CNS conforme o manual do Cartão Nacional de Saúde (DATASUS/Ministério da Saúde):
//   definitivo (começa com 1 ou 2): gerado a partir do PIS (11 dígitos) + "000" ou "001" + dígito verificador;
//   provisório (começa com 7, 8 ou 9): soma ponderada dos 15 dígitos (pesos 15 a 1) divisível por 11.
export const somenteDigitos = (v: unknown) => (typeof v === 'string' ? v : '').replace(/\D/g, '')

export function cnsValido(cns: string | null | undefined): boolean {
  const d = somenteDigitos(cns)
  if (!/^\d{15}$/.test(d)) return false
  const inicio = d[0]
  if (inicio === '1' || inicio === '2') {
    const pis = d.slice(0, 11)
    let soma = 0
    for (let i = 0; i < 11; i++) soma += Number(pis[i]) * (15 - i)
    let dv = 11 - (soma % 11)
    if (dv === 11) dv = 0
    if (dv === 10) {
      soma += 2
      dv = 11 - (soma % 11)
      return d === `${pis}001${dv}`
    }
    return d === `${pis}000${dv}`
  }
  if (inicio === '7' || inicio === '8' || inicio === '9') {
    let soma = 0
    for (let i = 0; i < 15; i++) soma += Number(d[i]) * (15 - i)
    return soma % 11 === 0
  }
  return false
}

/** CNES: 7 dígitos (o cadastro nacional não publica regra de dígito verificador). */
export const cnesValido = (cnes: string | null | undefined) => /^\d{7}$/.test(somenteDigitos(cnes))

/** CBO 2002: 6 dígitos (ex.: 225125 médico clínico, 223505 enfermeiro, 322205 técnico de enfermagem). */
export const cboValido = (cbo: string | null | undefined) => /^\d{6}$/.test(somenteDigitos(cbo))
