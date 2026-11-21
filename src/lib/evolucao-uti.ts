// Evolução diária de UTI: mínimo de registro da RDC Anvisa 7/2010 (evolução, intercorrências e cuidados
// registrados ao menos uma vez ao dia pelas equipes médica, de enfermagem e de fisioterapia) e escalas usuais:
// RASS (sedação), Glasgow (consciência), Braden (risco de lesão por pressão), EVN/BPS/CPOT (dor).
// Modelo padrão: cada hospital valida na implantação. Sem dependência de servidor.

export const MODELO_EVOLUCAO_UTI = 'RDC-ANVISA-7-2010'

export const VENTILACAO = [
  { valor: 'AR_AMBIENTE', rotulo: 'Ar ambiente' },
  { valor: 'CATETER_O2', rotulo: 'Cateter nasal de O₂' },
  { valor: 'MASCARA_O2', rotulo: 'Máscara de O₂' },
  { valor: 'VNI', rotulo: 'Ventilação não invasiva' },
  { valor: 'VM_INVASIVA', rotulo: 'Ventilação mecânica invasiva' },
] as const

export const DISPOSITIVOS = [
  { valor: 'CVC', rotulo: 'Cateter venoso central' },
  { valor: 'PICC', rotulo: 'PICC' },
  { valor: 'PAI', rotulo: 'Pressão arterial invasiva' },
  { valor: 'TOT', rotulo: 'Tubo orotraqueal' },
  { valor: 'TQT', rotulo: 'Traqueostomia' },
  { valor: 'SVD', rotulo: 'Sonda vesical de demora' },
  { valor: 'SNE', rotulo: 'Sonda nasoenteral / nasogástrica' },
  { valor: 'DRENO', rotulo: 'Dreno' },
  { valor: 'CATETER_HD', rotulo: 'Cateter de hemodiálise' },
  { valor: 'OUTRO', rotulo: 'Outro' },
] as const

export const RASS = [
  { valor: 4, rotulo: '+4 Combativo' },
  { valor: 3, rotulo: '+3 Muito agitado' },
  { valor: 2, rotulo: '+2 Agitado' },
  { valor: 1, rotulo: '+1 Inquieto' },
  { valor: 0, rotulo: '0 Alerta e calmo' },
  { valor: -1, rotulo: '−1 Sonolento' },
  { valor: -2, rotulo: '−2 Sedação leve' },
  { valor: -3, rotulo: '−3 Sedação moderada' },
  { valor: -4, rotulo: '−4 Sedação profunda' },
  { valor: -5, rotulo: '−5 Não desperta' },
] as const

export const GLASGOW = {
  ocular: { rotulo: 'Abertura ocular', max: 4 },
  verbal: { rotulo: 'Resposta verbal', max: 5 },
  motora: { rotulo: 'Resposta motora', max: 6 },
} as const

export const BRADEN = {
  percepcao: { rotulo: 'Percepção sensorial', max: 4 },
  umidade: { rotulo: 'Umidade', max: 4 },
  atividade: { rotulo: 'Atividade', max: 4 },
  mobilidade: { rotulo: 'Mobilidade', max: 4 },
  nutricao: { rotulo: 'Nutrição', max: 4 },
  friccao: { rotulo: 'Fricção e cisalhamento', max: 3 },
} as const
export type ItemBraden = keyof typeof BRADEN

export const ESCALAS_DOR = {
  EVN: { rotulo: 'EVN (0 a 10)', min: 0, max: 10 },
  BPS: { rotulo: 'BPS (3 a 12)', min: 3, max: 12 },
  CPOT: { rotulo: 'CPOT (0 a 8)', min: 0, max: 8 },
} as const
export type EscalaDor = keyof typeof ESCALAS_DOR

/** Faixas de risco de Braden mais usadas (Braden e Bergstrom). */
export function riscoBraden(total: number) {
  if (total <= 9) return 'Risco muito alto'
  if (total <= 12) return 'Risco alto'
  if (total <= 14) return 'Risco moderado'
  if (total <= 18) return 'Risco leve'
  return 'Sem risco'
}

export function gravidadeGlasgow(total: number) {
  if (total <= 8) return 'Grave'
  if (total <= 12) return 'Moderado'
  return 'Leve'
}

const LIMITES = {
  pas: [30, 300], pad: [10, 200], fc: [20, 300], fr: [0, 80], spo2: [0, 100], glicemia: [10, 1500],
  fio2: [21, 100], peep: [0, 30], entradasMl: [0, 50000], saidasMl: [0, 50000],
} as const

export type Dispositivo = { tipo: string; local: string | null; inseridoEm: string }

export type DadosEvolucaoUti = {
  pas: number | null; pad: number | null; fc: number | null; fr: number | null; temperatura: number | null
  spo2: number | null; glicemia: number | null
  dispositivos: Dispositivo[]
  ventilacao: string | null; fio2: number | null; peep: number | null; ventilacaoObs: string | null
  entradasMl: number | null; saidasMl: number | null
  rass: number | null
  glasgowOcular: number | null; glasgowVerbal: number | null; glasgowMotora: number | null; glasgowTotal: number | null
  bradenItens: Record<ItemBraden, number> | null; bradenTotal: number | null
  dor: number | null; dorEscala: EscalaDor | null
  evolucao: string
}

type Falha = { ok: false; erro: string }

function vazio(v: unknown) { return v === undefined || v === null || v === '' }

function inteiro(v: unknown, min: number, max: number, nome: string): number | null | Falha {
  if (vazio(v)) return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  if (!Number.isInteger(n) || n < min || n > max) return { ok: false, erro: `${nome}: informe um número inteiro entre ${min} e ${max}.` }
  return n
}

function texto(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

function falhou(v: unknown): v is Falha {
  return !!v && typeof v === 'object' && 'ok' in v && (v as Falha).ok === false
}

/** Valida e normaliza a evolução. `agora` limita datas de inserção de dispositivo ao passado. */
export function validarEvolucaoUti(entrada: Record<string, unknown>, agora = new Date()): { ok: true; dados: DadosEvolucaoUti } | Falha {
  const nomes: Record<keyof typeof LIMITES, string> = {
    pas: 'PA sistólica', pad: 'PA diastólica', fc: 'Frequência cardíaca', fr: 'Frequência respiratória', spo2: 'SpO₂',
    glicemia: 'Glicemia', fio2: 'FiO₂', peep: 'PEEP', entradasMl: 'Entradas', saidasMl: 'Saídas',
  }
  const num: Partial<Record<keyof typeof LIMITES, number | null>> = {}
  for (const campo of Object.keys(LIMITES) as (keyof typeof LIMITES)[]) {
    const [min, max] = LIMITES[campo]
    const r = inteiro(entrada[campo], min, max, nomes[campo])
    if (falhou(r)) return r
    num[campo] = r
  }

  let temperatura: number | null = null
  if (!vazio(entrada.temperatura)) {
    const t = Number(String(entrada.temperatura).replace(',', '.'))
    if (!Number.isFinite(t) || t < 30 || t > 45) return { ok: false, erro: 'Temperatura: informe entre 30 e 45 °C.' }
    temperatura = Math.round(t * 10) / 10
  }

  const ventilacao = texto(entrada.ventilacao, 20)
  if (ventilacao && !VENTILACAO.some(v => v.valor === ventilacao)) return { ok: false, erro: 'Modo de ventilação inválido.' }

  const dispositivos: Dispositivo[] = []
  if (!vazio(entrada.dispositivos)) {
    if (!Array.isArray(entrada.dispositivos) || entrada.dispositivos.length > 20) return { ok: false, erro: 'Lista de dispositivos inválida.' }
    for (const d of entrada.dispositivos) {
      const item = d && typeof d === 'object' ? d as Record<string, unknown> : {}
      const tipo = texto(item.tipo, 20)
      if (!tipo || !DISPOSITIVOS.some(x => x.valor === tipo)) return { ok: false, erro: 'Tipo de dispositivo inválido.' }
      const inseridoTexto = texto(item.inseridoEm, 10)
      const inserido = inseridoTexto && /^\d{4}-\d{2}-\d{2}$/.test(inseridoTexto) ? new Date(`${inseridoTexto}T00:00:00Z`) : null
      if (!inserido || Number.isNaN(inserido.getTime()) || inserido.getTime() > agora.getTime() + 86_400_000) {
        return { ok: false, erro: 'Informe a data de inserção de cada dispositivo (não pode ser futura).' }
      }
      dispositivos.push({ tipo, local: texto(item.local, 60), inseridoEm: inseridoTexto! })
    }
  }

  const rass = inteiro(entrada.rass, -5, 4, 'RASS')
  if (falhou(rass)) return rass

  const go = inteiro(entrada.glasgowOcular, 1, 4, 'Glasgow ocular')
  const gv = inteiro(entrada.glasgowVerbal, 1, 5, 'Glasgow verbal')
  const gm = inteiro(entrada.glasgowMotora, 1, 6, 'Glasgow motora')
  for (const r of [go, gv, gm]) if (falhou(r)) return r
  const glasgowTotal = go !== null && gv !== null && gm !== null ? (go as number) + (gv as number) + (gm as number) : null

  let bradenItens: Record<ItemBraden, number> | null = null
  let bradenTotal: number | null = null
  const bradenEntrada = entrada.bradenItens && typeof entrada.bradenItens === 'object' ? entrada.bradenItens as Record<string, unknown> : null
  const chavesBraden = Object.keys(BRADEN) as ItemBraden[]
  const preenchidos = bradenEntrada ? chavesBraden.filter(k => !vazio(bradenEntrada[k])) : []
  if (preenchidos.length > 0) {
    if (preenchidos.length < chavesBraden.length) return { ok: false, erro: 'Braden: preencha os seis itens ou deixe todos em branco.' }
    bradenItens = {} as Record<ItemBraden, number>
    for (const k of chavesBraden) {
      const r = inteiro(bradenEntrada![k], 1, BRADEN[k].max, `Braden (${BRADEN[k].rotulo})`)
      if (falhou(r)) return r
      bradenItens[k] = r as number
    }
    bradenTotal = chavesBraden.reduce((s, k) => s + bradenItens![k], 0)
  }

  let dor: number | null = null
  let dorEscala: EscalaDor | null = null
  if (!vazio(entrada.dor)) {
    const escala = texto(entrada.dorEscala, 4) as EscalaDor | null
    if (!escala || !(escala in ESCALAS_DOR)) return { ok: false, erro: 'Escolha a escala de dor.' }
    const r = inteiro(entrada.dor, ESCALAS_DOR[escala].min, ESCALAS_DOR[escala].max, `Dor (${escala})`)
    if (falhou(r)) return r
    dor = r; dorEscala = escala
  }

  const evolucao = texto(entrada.evolucao, 8000)
  if (!evolucao || evolucao.length < 10) return { ok: false, erro: 'Escreva a evolução (mínimo de 10 caracteres).' }

  return {
    ok: true,
    dados: {
      pas: num.pas ?? null, pad: num.pad ?? null, fc: num.fc ?? null, fr: num.fr ?? null, temperatura,
      spo2: num.spo2 ?? null, glicemia: num.glicemia ?? null,
      dispositivos,
      ventilacao, fio2: num.fio2 ?? null, peep: num.peep ?? null, ventilacaoObs: texto(entrada.ventilacaoObs, 300),
      entradasMl: num.entradasMl ?? null, saidasMl: num.saidasMl ?? null,
      rass: rass as number | null,
      glasgowOcular: go as number | null, glasgowVerbal: gv as number | null, glasgowMotora: gm as number | null, glasgowTotal,
      bradenItens, bradenTotal, dor, dorEscala, evolucao,
    },
  }
}

/** Dias desde a inserção (dia da inserção = D0), para vigilância de infecção ligada a dispositivo. */
export function diasDeDispositivo(inseridoEm: string, hoje = new Date()) {
  const inicio = Date.UTC(Number(inseridoEm.slice(0, 4)), Number(inseridoEm.slice(5, 7)) - 1, Number(inseridoEm.slice(8, 10)))
  const fim = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return Math.max(0, Math.floor((fim - inicio) / 86_400_000))
}
