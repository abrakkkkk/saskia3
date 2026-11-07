// Mapa do acervo: arquivo antigo (em public/) -> nome padrao, titulo legivel e categoria.
// Padrao de nome: minusculas, sem acento, hifens; prefixo = categoria quando ajuda (crescimento-, vacinacao-).
// "ativo: false" = existe no disco mas nunca apareceu na tela; entra desligado ate alguem revisar.
const B = 'BIBLIOTECA', C = 'CRESCIMENTO', V = 'VACINACAO', F = 'FICHAS'

const biblioteca = [
  ['docs/aspectos_pele.pdf', 'aspectos-dermatologicos-pele-negra', 'Aspectos Dermatológicos da Pele Negra'],
  ['docs/atlas_pele.pdf', 'atlas-dermatologico-pele-negra-e-parda-ingles', 'Atlas Dermatológico Pele Negra e Parda (inglês)'],
  ['docs/protocolo_violencia.pdf', 'protocolo-violencia-contra-mulher', 'Protocolo de cuidados e enfrentamento da violência contra a mulher'],
  ['docs/recomendacoes.pdf', 'recomendacoes-diagnostico-tratamento-vaginites', 'Recomendações para o Diagnóstico e Tratamento das Vaginites'],
  ['docs/mapasmentaisinterpexames.pdf', 'mapas-mentais-interpretacao-exames', 'Mapas Mentais: Interpretação de Exames'],
  ['docs/examelabcorrelaçãoclinica1.pdf', 'interpretacao-exames-laboratoriais-correlacao-clinica', 'Interpretação de Exames Laboratoriais e Correlação Clínica'],
  ['docs/Cuidado_com_a_população_de_rua.pdf', 'cuidado-populacao-de-rua', 'Cuidado com a população de rua'],
  ['docs/Diretriz_Brasileira_de_Dislipidemias_e_Prevencao_da_Aterosclerose_2025.pdf', 'diretriz-dislipidemias-aterosclerose-2025', 'Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose 2025'],
  ['docs/Diretriz_Brasileira_Hipertensão_2025.pdf', 'diretriz-hipertensao-2025', 'Diretriz Brasileira de Hipertensão 2025'],
  ['docs/Epilepsia_-_Guia Prático.pdf', 'epilepsia-guia-pratico', 'Epilepsia: Guia Prático'],
  ['docs/GUIA_DE_CUIDADO_COM_OS_PÉS_PARA_PACIENTES_DIABÉTICOS_PACIENTE.pdf', 'guia-cuidado-pes-diabeticos', 'Guia de Cuidado com os Pés para Pacientes Diabéticos'],
  ['docs/Infecções_Sexualmente_Transmissíveis_PCDT.pdf', 'pcdt-infeccoes-sexualmente-transmissiveis', 'Infecções Sexualmente Transmissíveis (PCDT)'],
  ['docs/Manual_Gestação_Alto_Risco.pdf', 'manual-gestacao-alto-risco', 'Manual de Gestação de Alto Risco'],
  ['docs/Práticas_de_Cuidado_LGBTQIA+.pdf', 'praticas-cuidado-lgbtqia', 'Práticas de Cuidado LGBTQIA+'],
  ['docs/Protocolo_atendimento_pessoas_Trans_2023.pdf', 'protocolo-atendimento-pessoas-trans-2023', 'Protocolo de Atendimento a Pessoas Trans 2023'],
  ['images/TABELA_KDIGO.png', 'tabela-kdigo', 'Tabela KDIGO'],
  ['docs/estrategia_antirracista.pdf', 'estrategia-antirracista-saude-2025', 'Estratégia Antirracista para a Saúde 2025'],
  ['docs/manual_oncologia.pdf', 'manual-oncologia-para-nao-oncologistas', 'Manual de Oncologia para não Oncologistas'],
  ['images/tabela_risco_cardiovascular.png', 'tabela-risco-cardiovascular', 'Tabela de Risco Cardiovascular'],
].map(([de, slug, titulo], i) => ({ de, slug, titulo, categoria: B, ordem: i + 1 }))

// Existiam em public/docs mas nunca apareceram na Biblioteca; o dono mandou ligar (sao importantes).
const naoListados = [
  ['docs/Dermatologia_Pele_Negra.pdf', 'dermatologia-pele-negra', 'Dermatologia na Pele Negra'],
  ['docs/DESENGASGO_E_RCP_ADULTOS_E_CRIANÇAS_-_ATUALIZAÇÕES.pdf', 'desengasgo-e-rcp-adultos-e-criancas', 'Desengasgo e RCP em Adultos e Crianças (atualizações)'],
  ['docs/Guia_para_melhor_cuidado_da_mulher_vítima_de_situação_de_violência.pdf', 'guia-cuidado-mulher-vitima-de-violencia', 'Guia para melhor cuidado da mulher vítima de situação de violência'],
  ['docs/Manual_de_Atenção_às_Mulheres_na_Transição_Menopausal_e_Menopausa_Versão_Preliminar.pdf', 'manual-transicao-menopausal-e-menopausa-preliminar', 'Manual de Atenção às Mulheres na Transição Menopausal e Menopausa (versão preliminar)'],
].map(([de, slug, titulo], i) => ({ de, slug, titulo, categoria: B, ordem: 100 + i }))

const faixa = { '0-5': '0 a 5 anos', '5-10': '5 a 10 anos', '5-19': '5 a 19 anos' }
const medida = { altura: 'Altura por Idade', imc: 'IMC por Idade', perimetro_cefalico: 'Perímetro Cefálico', peso: 'Peso por Idade' }
const tipo = { percentil: ['percentil', 'Percentil'], zscore: ['zscore', 'Escore Z'] }
const crescimento = []
let ordemC = 0
for (const sexo of ['meninas', 'meninos']) {
  for (const [m, rotuloM] of Object.entries(medida)) {
    for (const f of Object.keys(faixa)) {
      for (const [t, [tSlug, rotuloT]] of Object.entries(tipo)) {
        let de = `docs/${m}_${sexo}_${f}_${t}.pdf`
        // dois arquivos fugiram do padrao antigo
        if (m === 'imc' && sexo === 'meninas' && f === '0-5' && t === 'zscore') de = 'docs/imc_meninas_0-5_escore_z.pdf'
        if (m === 'imc' && sexo === 'meninos' && f === '0-5' && t === 'zscore') de = 'docs/OMS._IMC_Meninos__de_0_a_5_anos._Escore_Z.pdf'
        crescimento.push({
          de, optional: true, slug: `crescimento-${m.replace('_', '-')}-${sexo}-${f}-${tSlug}`,
          titulo: `${rotuloM} (${faixa[f]}) - ${rotuloT}`, categoria: C, grupo: sexo === 'meninas' ? 'Meninas' : 'Meninos', ordem: ++ordemC,
        })
      }
    }
  }
}

const vacinacao = [
  ['0_A_10_ANOS', 'vacinacao-0-a-10-anos', 'Vacinação - 0 a 10 anos'],
  ['10_A_19_ANOS', 'vacinacao-10-a-19-anos', 'Vacinação - 10 a 19 anos'],
  ['20_A_59_ANOS', 'vacinacao-20-a-59-anos', 'Vacinação - 20 a 59 anos'],
  ['60_ANOS_E_MAIORES', 'vacinacao-60-anos-e-mais', 'Vacinação - 60 anos e maiores'],
  ['DM-PNEUMO-HEPATO-NEFRO-ESPLENO-IMUNO-HIV-ONCO-TRANSPLANTADOS-TCTH-ESPECIAIS', 'vacinacao-grupos-especiais', 'Vacinação - Grupos Especiais'],
  ['GESTANTES', 'vacinacao-gestantes', 'Vacinação - Gestantes'],
  ['OCUPACIONAIS_POR_ÁREA_DE_ATUAÇÃO', 'vacinacao-ocupacionais', 'Vacinação - Ocupacionais'],
  ['PNEUMOCÓCICAS', 'vacinacao-pneumococicas', 'Vacinação - Pneumocócicas'],
  ['PRE-MATUROS', 'vacinacao-pre-maturos', 'Vacinação - Pré-maturos'],
  ['RN_AO_IDOSO', 'vacinacao-recem-nascido-ao-idoso', 'Vacinação - Recém-nascido ao Idoso'],
  ['RN_AOS_19_ANOS', 'vacinacao-recem-nascido-aos-19-anos', 'Vacinação - Recém-nascido aos 19 anos'],
  ['VINTE_AOS_60+', 'vacinacao-20-aos-60-mais-anos', 'Vacinação - 20 aos 60+ anos'],
].map(([nome, slug, titulo], i) => ({ de: `docs/${nome}.pdf`, slug, titulo, categoria: V, ordem: i + 1 }))

const MS = 'Ministério da Saúde', SK = 'Saskia Saúde', FP = 'Farmácia Popular'
const fichas = [
  ['dole1', 'ficha-escore-sintomas-prostaticos', 'Escore Internacional de Sintomas Prostáticos', 'UFRGS', 'UFRGS', ['Urologia', 'Próstata', 'Avaliação']],
  ['reqmom', 'ficha-requisicao-mamografia', 'Requisição de Mamografia', SK, 'Atendimento', ['Mamografia', 'Saúde da Mulher', 'Requisição']],
  ['MSS1', 'ficha-hanseniase-avaliacao-neurologica', 'Hanseníase - Tabela de Avaliação Neurológica', MS, 'MS', ['Hanseníase', 'Neurologia', 'Avaliação']],
  ['MRPA', 'ficha-mrpa-medicao-residencial-pressao-arterial', 'Medição Residencial da Pressão Arterial', SK, 'Atendimento', ['Pressão Arterial', 'Cardiologia', 'MRPA']],
  ['mpmp', 'ficha-farmacia-popular-medicamentos-e-insumos', 'Medicamentos e Insumos do Programa Farmácia Popular', FP, 'Farmácia', ['Farmácia Popular', 'Medicamentos', 'Insumos']],
  ['Hanseniasev5', 'ficha-hanseniase-avaliacao-v5', 'Hanseníase v5 - Ficha de Avaliação', MS, 'MS', ['Hanseníase', 'Avaliação', 'Protocolo']],
  ['FLMEP1', 'ficha-formulario-lme-padrao', 'Formulário LME Padrão 1', MS, 'MS', ['LME', 'Medicamentos', 'Formulário']],
  ['FPVD1', 'ficha-visitas-domiciliares', 'Ficha para Visitas Domiciliares', SK, 'Atendimento', ['Visita Domiciliar', 'APS', 'Saúde da Família']],
  ['FIDFCv5', 'ficha-investigacao-dengue-chikungunya-v5', 'Ficha de Investigação Dengue e Febre de Chikungunya v5', MS, 'MS', ['Dengue', 'Chikungunya', 'Vigilância']],
  ['FAIs1', 'ficha-atendimento-individual', 'Ficha de Atendimento Individual', SK, 'Atendimento', ['Atendimento', 'Individual', 'Prontuário']],
  ['FAICOUs2', 'ficha-atendimento-individual-orientacoes-de-uso', 'Ficha de Atendimento Individual com Orientações de Uso', SK, 'Atendimento', ['Atendimento', 'Orientações', 'Individual']],
  ['MIt1', 'ficha-farmacia-popular-tabela-medicamentos-insumos', 'Farmácia Popular - Medicamentos e Insumos', FP, 'Farmácia', ['Farmácia Popular', 'Medicamentos', 'Tabela']],
  ['DIDEC', 'ficha-diario-de-cefaleias', 'Diário de Cefaléias', SK, 'Outros', ['Cefaléia', 'Diário', 'Neurologia']],
  ['TFPs3', 'ficha-tratamento-fascite-plantar', 'Como Tratar a Fascite Plantar', SK, 'Outros', ['Fascite Plantar', 'Ortopedia', 'Tratamento']],
  ['AARHv2', 'ficha-atendimento-antirrabico-humano-v2', 'Atendimento Antirrábico Humano v2', MS, 'MS', ['Raiva', 'Antirrábico', 'Protocolo']],
  ['APACP', 'ficha-apac-preenchivel', 'APAC Preenchível', MS, 'MS', ['APAC', 'Autorização', 'SUS']],
].map(([nome, slug, titulo, instituicao, grupo, tags], i) => ({ de: `fichass1/${nome}.pdf`, slug, titulo, instituicao, grupo, tags, categoria: F, ordem: i + 1 }))

module.exports = [...biblioteca, ...naoListados, ...crescimento, ...vacinacao, ...fichas]
