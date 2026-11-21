// Lista de Verificação de Segurança Cirúrgica do Protocolo para Cirurgia Segura (Ministério da Saúde,
// Anvisa e Fiocruz, 2013; anexo da Portaria MS 2.095/2013), baseada na lista da OMS (2009).
// Modelo padrão: cada hospital valida na implantação (Configurações → Hospital). Sem dependência de servidor.

export const MODELO_CHECKLIST = 'MS-ANVISA-2013'

export const ETAPAS_CHECKLIST = ['ANTES_INDUCAO', 'ANTES_INCISAO', 'ANTES_SAIDA'] as const
export type EtapaChecklist = (typeof ETAPAS_CHECKLIST)[number]

type Opcao = { valor: string; rotulo: string; exigeObservacao?: boolean }
export type ItemChecklist =
  | { id: string; texto: string; tipo: 'confirmar' }
  | { id: string; texto: string; tipo: 'opcoes'; opcoes: Opcao[] }

const NAO_SE_APLICA: Opcao = { valor: 'nao_se_aplica', rotulo: 'Não se aplica' }

export const CHECKLIST: Record<EtapaChecklist, { titulo: string; momento: string; itens: ItemChecklist[] }> = {
  ANTES_INDUCAO: {
    titulo: 'Antes da indução anestésica',
    momento: 'Sign In',
    itens: [
      { id: 'identidade', tipo: 'confirmar', texto: 'Paciente confirmou identidade, sítio cirúrgico, procedimento e consentimento' },
      { id: 'demarcacao', tipo: 'opcoes', texto: 'Sítio cirúrgico demarcado', opcoes: [{ valor: 'sim', rotulo: 'Sim' }, NAO_SE_APLICA] },
      { id: 'seguranca_anestesica', tipo: 'confirmar', texto: 'Verificação de segurança anestésica concluída (equipamentos e medicação)' },
      { id: 'oximetro', tipo: 'confirmar', texto: 'Oxímetro de pulso no paciente e em funcionamento' },
      { id: 'alergia', tipo: 'opcoes', texto: 'Paciente possui alergia conhecida?', opcoes: [{ valor: 'nao', rotulo: 'Não' }, { valor: 'sim', rotulo: 'Sim (descrever nas observações)', exigeObservacao: true }] },
      { id: 'via_aerea', tipo: 'opcoes', texto: 'Via aérea difícil ou risco de aspiração?', opcoes: [{ valor: 'nao', rotulo: 'Não' }, { valor: 'sim', rotulo: 'Sim, e há equipamento e assistência disponíveis' }] },
      { id: 'perda_sanguinea', tipo: 'opcoes', texto: 'Risco de perda sanguínea acima de 500 ml (7 ml/kg em crianças)?', opcoes: [{ valor: 'nao', rotulo: 'Não' }, { valor: 'sim', rotulo: 'Sim, e há acesso venoso adequado e planejamento para fluidos' }] },
    ],
  },
  ANTES_INCISAO: {
    titulo: 'Antes da incisão cirúrgica',
    momento: 'Time Out',
    itens: [
      { id: 'apresentacao', tipo: 'confirmar', texto: 'Todos os membros da equipe se apresentaram pelo nome e função' },
      { id: 'confirmacao_verbal', tipo: 'confirmar', texto: 'Cirurgião, anestesista e enfermagem confirmam verbalmente a identificação do paciente, o sítio cirúrgico e o procedimento' },
      { id: 'revisao_cirurgiao', tipo: 'confirmar', texto: 'Cirurgião revisou etapas críticas ou inesperadas, duração da operação e perda sanguínea prevista' },
      { id: 'revisao_anestesia', tipo: 'confirmar', texto: 'Anestesista revisou se há alguma preocupação específica em relação ao paciente' },
      { id: 'revisao_enfermagem', tipo: 'confirmar', texto: 'Enfermagem confirmou a esterilização (incluindo indicadores) e revisou questões de equipamentos ou outras preocupações' },
      { id: 'antibiotico', tipo: 'opcoes', texto: 'Antibiótico profilático administrado nos últimos 60 minutos?', opcoes: [{ valor: 'sim', rotulo: 'Sim' }, NAO_SE_APLICA] },
      { id: 'imagem', tipo: 'opcoes', texto: 'Exames de imagem essenciais estão disponíveis?', opcoes: [{ valor: 'sim', rotulo: 'Sim' }, NAO_SE_APLICA] },
    ],
  },
  ANTES_SAIDA: {
    titulo: 'Antes de o paciente sair da sala',
    momento: 'Sign Out',
    itens: [
      { id: 'registro_procedimento', tipo: 'confirmar', texto: 'Enfermagem confirma com a equipe o registro completo do procedimento realizado' },
      { id: 'contagem', tipo: 'opcoes', texto: 'Contagem de instrumentais, compressas e agulhas', opcoes: [{ valor: 'correta', rotulo: 'Correta' }, NAO_SE_APLICA] },
      { id: 'amostra', tipo: 'opcoes', texto: 'Amostra cirúrgica identificada (incluindo o nome do paciente)', opcoes: [{ valor: 'sim', rotulo: 'Sim' }, NAO_SE_APLICA] },
      { id: 'equipamento', tipo: 'opcoes', texto: 'Há problema com equipamento a ser resolvido?', opcoes: [{ valor: 'nao', rotulo: 'Não' }, { valor: 'sim', rotulo: 'Sim (descrever nas observações)', exigeObservacao: true }] },
      { id: 'recuperacao', tipo: 'confirmar', texto: 'Cirurgião, anestesista e enfermagem revisaram as preocupações essenciais para a recuperação e o manejo do paciente' },
    ],
  },
}

export type Respostas = Record<string, boolean | string>

/** Etapa que precisa estar respondida antes desta (o protocolo não avança com etapa pendente). */
export function etapaAnterior(etapa: EtapaChecklist): EtapaChecklist | null {
  const i = ETAPAS_CHECKLIST.indexOf(etapa)
  return i > 0 ? ETAPAS_CHECKLIST[i - 1] : null
}

/**
 * Confere as respostas de uma etapa. O protocolo manda parar a verificação diante de item não conforme:
 * a etapa só é registrada com todos os itens confirmados ou respondidos.
 */
export function validarEtapa(etapa: EtapaChecklist, entrada: unknown, observacoes: string | null):
  { ok: true; respostas: Respostas } | { ok: false; erro: string } {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return { ok: false, erro: 'Respostas inválidas.' }
  const dados = entrada as Record<string, unknown>
  const respostas: Respostas = {}
  for (const item of CHECKLIST[etapa].itens) {
    const valor = dados[item.id]
    if (item.tipo === 'confirmar') {
      if (valor !== true) return { ok: false, erro: `Item não confirmado: "${item.texto}". Resolva antes de registrar a etapa.` }
      respostas[item.id] = true
    } else {
      const opcao = item.opcoes.find(o => o.valor === valor)
      if (!opcao) return { ok: false, erro: `Responda: "${item.texto}".` }
      if (opcao.exigeObservacao && !observacoes) return { ok: false, erro: `Descreva nas observações: "${item.texto}".` }
      respostas[item.id] = opcao.valor
    }
  }
  return { ok: true, respostas }
}

export function rotuloResposta(etapa: EtapaChecklist, itemId: string, valor: unknown) {
  const item = CHECKLIST[etapa].itens.find(i => i.id === itemId)
  if (!item) return String(valor)
  if (item.tipo === 'confirmar') return valor === true ? 'Confirmado' : 'Pendente'
  return item.opcoes.find(o => o.valor === valor)?.rotulo ?? String(valor)
}
