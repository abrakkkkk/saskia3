// Dados 100% fictícios para o banco de TESTE local. Nunca use contra a produção.
// As senhas abaixo são sintéticas e só existem no banco descartável criado por tests/banco-teste.mjs.

export const HOSPITAL_A = { id: 'audit-hospital-a', nome: 'Hospital Teste Alfa', cnpj: '00.000.000/0001-01' };
export const HOSPITAL_B = { id: 'audit-hospital-b', nome: 'Hospital Teste Beta', cnpj: '00.000.000/0001-02' };

// Código curto da unidade usado no login (coluna Hospital.codigo, quando a migração existir).
export const CODIGOS = { [HOSPITAL_A.id]: 'TESTEA', [HOSPITAL_B.id]: 'TESTEB' };

export const SENHA_AUDIT = 'audit-only-synthetic-pass-2026!';
export const SENHA_E2E = 'e2e-somente-teste-local-2026!';

export const USUARIOS = [
  // Usado por tests/tenant-isolation.integration.test.mjs (o teste troca o cargo conforme a rota).
  { id: 'audit-admin-a', email: 'audit.admin@example.test', nome: 'Auditor Alfa', cargo: 'ENFERMEIRO_ASSISTENCIAL', hospitalId: HOSPITAL_A.id, senha: SENHA_AUDIT },
  { id: 'e2e-recep-a', email: 'recepcao.alfa@example.test', nome: 'Recepção Alfa', cargo: 'RECEPCIONISTA', hospitalId: HOSPITAL_A.id, senha: SENHA_E2E },
  { id: 'e2e-enf-a', email: 'enfermagem.alfa@example.test', nome: 'Enfermeira Alfa', cargo: 'ENFERMEIRO_ASSISTENCIAL', hospitalId: HOSPITAL_A.id, senha: SENHA_E2E },
  {
    id: 'e2e-med-a', email: 'medico.alfa@example.test', nome: 'Dr. Médico Alfa', cargo: 'MEDICO', hospitalId: HOSPITAL_A.id, senha: SENHA_E2E,
    conselho: 'CRM', registroNumero: '000001', registroUf: 'SP', especialidade: 'Clínica Médica', prescricoesAutorizadas: ['FARMACOLOGICA'],
  },
  { id: 'e2e-recep-b', email: 'recepcao.beta@example.test', nome: 'Recepção Beta', cargo: 'RECEPCIONISTA', hospitalId: HOSPITAL_B.id, senha: SENHA_E2E },
  {
    id: 'e2e-med-b', email: 'medico.beta@example.test', nome: 'Dr. Médico Beta', cargo: 'MEDICO', hospitalId: HOSPITAL_B.id, senha: SENHA_E2E,
    conselho: 'CRM', registroNumero: '000002', registroUf: 'RJ', prescricoesAutorizadas: ['FARMACOLOGICA'],
  },
];

export const PACIENTES = [
  { id: 'e2e-patient-a1', hospitalId: HOSPITAL_A.id, nome: 'Paciente Alfa Triagem', status: 'Recepção', alergias: 'Nega alergias' },
  { id: 'e2e-patient-a2', hospitalId: HOSPITAL_A.id, nome: 'Paciente Alfa UTI', status: 'Aguardando Médico', alergias: 'Nega alergias' },
  { id: 'audit-patient-b', hospitalId: HOSPITAL_B.id, nome: 'Paciente Beta Sigiloso', status: 'Aguardando Médico', alergias: 'Dipirona' },
  { id: 'e2e-patient-b2', hospitalId: HOSPITAL_B.id, nome: 'Paciente Beta Reservado', status: 'Recepção' },
];

export const NOMES_B = PACIENTES.filter(p => p.hospitalId === HOSPITAL_B.id).map(p => p.nome);
