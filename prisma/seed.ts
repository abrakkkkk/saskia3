import "dotenv/config";
import { PrismaClient, CargoUsuario, StatusAgendamento, StatusExame, StatusCirurgia, TipoLeito, StatusOcupacao, PrioridadeTicket, StatusTicket, StatusChamada, Usuario } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando o seed massivo de dados fictícios em TypeScript...');

  // Limpar dados existentes antes de popular
  console.log('Limpando dados existentes...');
  await prisma.configDashboard.deleteMany({});
  await prisma.estoqueItem.deleteMany({});
  await prisma.emergencia.deleteMany({});
  await prisma.chamada.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.sala.deleteMany({});
  await prisma.utiLeito.deleteMany({});
  await prisma.cirurgia.deleteMany({});
  await prisma.exame.deleteMany({});
  await prisma.agendamento.deleteMany({});
  await prisma.receita.deleteMany({});
  await prisma.prescricao.deleteMany({});
  await prisma.evolucao.deleteMany({});
  await prisma.triagem.deleteMany({});
  await prisma.paciente.deleteMany({});
  await prisma.usuario.deleteMany({});
  await prisma.hospital.deleteMany({});

  // 1. Criar o Hospital (Base de tudo)
  const hospital = await prisma.hospital.create({
    data: {
      nome: 'Hospital Geral Alfa',
      cnpj: '12.345.678/0001-99',
      endereco: 'Av. Paulista, 1000 - São Paulo, SP',
      telefone: '(11) 3333-4444',
      email: 'contato@hospitalalfa.com.br',
    },
  });

  // ADMINISTRADOR DO SISTEMA
  await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      email: 'admin@hospitalalfa.com',
      senha: '123456',
      cargo: CargoUsuario.ADMIN,
      hospitalId: hospital.id,
    },
  });

  // 2. Criar Corpo Clínico e Administrativo (Múltiplos Usuários)
  console.log('Criando usuários e corpo clínico...');
  const medicosDados = [
    { nome: 'Dr. Carlos Eduardo', email: 'carlos.medico@hospitalalfa.com', cargo: CargoUsuario.MEDICO },
    { nome: 'Dra. Vanessa Rocha', email: 'vanessa.medica@hospitalalfa.com', cargo: CargoUsuario.MEDICO },
    { nome: 'Dr. André Albuquerque', email: 'andre.pediatra@hospitalalfa.com', cargo: CargoUsuario.MEDICO },
    { nome: 'Dra. Juliana Mendes', email: 'juliana.cardio@hospitalalfa.com', cargo: CargoUsuario.MEDICO }
  ];

  const medicos: Usuario[] = [];
  for (const m of medicosDados) {
    const doc = await prisma.usuario.create({
      data: { ...m, hospitalId: hospital.id, senha: 'senha_criptografada_aqui' }
    });
    medicos.push(doc);
  }

  const enfermeirosDados = [
    { nome: 'Mariana Silva', email: 'mariana.enfermagem@hospitalalfa.com', cargo: CargoUsuario.ENFERMEIRO_ASSISTENCIAL },
    { nome: 'Roberto Alves', email: 'roberto.triagem@hospitalalfa.com', cargo: CargoUsuario.ENFERMEIRO_ASSISTENCIAL },
    { nome: 'Paula Tejeda', email: 'paula.chefe@hospitalalfa.com', cargo: CargoUsuario.ENFERMEIRO_ASSISTENCIAL }
  ];

  const enfermeiros: Usuario[] = [];
  for (const e of enfermeirosDados) {
    const enf = await prisma.usuario.create({
      data: { ...e, hospitalId: hospital.id, senha: 'senha_criptografada_aqui' }
    });
    enfermeiros.push(enf);
  }

  // 3. Criar Pacientes em Massa de Forma Ramificada
  console.log('Criando pacientes e históricos médicos vinculados...');

  const listaPacientes = [
    { nome: 'João dos Santos', cpf: '111.222.333-44', rg: '12.345.678-9', nascimento: new Date('1985-05-20'), sexo: 'Masculino', tipoSanguineo: 'O+', status: 'Em Atendimento', classificacao: 'Verde', queixa: 'Dor de cabeça persistente e febre baixa.', alergias: 'Dipirona' },
    { nome: 'Maria Oliveira Souza', cpf: '555.666.777-88', rg: '98.765.432-1', nascimento: new Date('1992-11-02'), sexo: 'Feminino', tipoSanguineo: 'A-', status: 'Recepção', classificacao: 'Azul', queixa: 'Apenas retorno para monitoramento de rotina.' },
    { nome: 'Antônio Francisco Costa', cpf: '222.333.444-11', rg: '23.456.789-0', nascimento: new Date('1960-03-15'), sexo: 'Masculino', tipoSanguineo: 'B+', status: 'Em Atendimento', classificacao: 'Amarelo', queixa: 'Dor torácica leve e falta de ar ao caminhar.' },
    { nome: 'Francisca Neide Lima', cpf: '444.555.666-22', rg: '34.567.890-1', nascimento: new Date('1978-08-24'), sexo: 'Feminino', tipoSanguineo: 'AB+', status: 'Internado', classificacao: 'Laranja', queixa: 'Crise asmática severa refratária a bombinha.' },
    { nome: 'Marcos Vinícius Filho', cpf: '777.888.999-33', rg: '45.678.901-2', nascimento: new Date('2018-06-10'), sexo: 'Masculino', tipoSanguineo: 'O-', status: 'Em Atendimento', classificacao: 'Vermelho', queixa: 'Crise convulsiva generalizada ativa há mais de 5 minutos.' },
    { nome: 'Ana Beatriz Cavalcante', cpf: '888.999.000-44', rg: '56.789.012-3', nascimento: new Date('2000-01-30'), sexo: 'Feminino', tipoSanguineo: 'A+', status: 'Alta', classificacao: 'Verde', queixa: 'Disúria e dor lombar baixa.' },
    { nome: 'Carlos Augusto Nobre', cpf: '333.444.555-55', rg: '67.890.123-4', nascimento: new Date('1953-12-05'), sexo: 'Masculino', tipoSanguineo: 'O+', status: 'Internado', classificacao: 'Amarelo', queixa: 'Pico hipertensivo com tontura e visão turva.' },
    { nome: 'Juliana Paes Leme', cpf: '999.111.222-66', rg: '78.901.234-5', nascimento: new Date('1988-07-12'), sexo: 'Feminino', tipoSanguineo: 'B-', status: 'Recepção', classificacao: 'Azul', queixa: 'Renovação de receita médica de uso contínuo.' },
    { nome: 'Raimundo Nonato Silva', cpf: '123.456.789-77', rg: '89.012.345-6', nascimento: new Date('1967-09-09'), sexo: 'Masculino', tipoSanguineo: 'A-', status: 'Em Atendimento', classificacao: 'Verde', queixa: 'Entorse no tornozelo direito pós queda.' },
    { nome: 'Gabriela Duarte Fontes', cpf: '987.654.321-00', rg: '90.123.456-7', nascimento: new Date('1995-04-18'), sexo: 'Feminino', tipoSanguineo: 'AB-', status: 'Alta', classificacao: 'Amarelo', queixa: 'Dor abdominal aguda em fossa ilíaca direita.' }
  ];

  for (let i = 0; i < listaPacientes.length; i++) {
    const p = listaPacientes[i];
    const paciente = await prisma.paciente.create({
      data: {
        hospitalId: hospital.id,
        nome: p.nome,
        cpf: p.cpf,
        rg: p.rg,
        nascimento: p.nascimento,
        sexo: p.sexo,
        telefone: `(11) 99123-${1000 + i}`,
        tipoSanguineo: p.tipoSanguineo,
        alergias: p.alergias || 'Nenhuma declarada',
        status: p.status,
        classificacao: p.classificacao,
        queixaPrincipal: p.queixa,
      },
    });

    // Vincular Triagem automática para pacientes que passaram pela triagem/atendimento
    if (p.status !== 'Recepção') {
      const enfResponsavel = enfermeiros[i % enfermeiros.length];
      await prisma.triagem.create({
        data: {
          pacienteId: paciente.id,
          classificacao: p.classificacao,
          pressao: p.classificacao === 'Laranja' ? '160/100' : '120/80',
          temperatura: p.classificacao === 'Vermelho' ? 39.1 : 36.6,
          frequenciaC: p.classificacao === 'Vermelho' ? 120 : 75,
          frequenciaR: 18,
          saturacao: p.classificacao === 'Laranja' ? 91 : 98,
          glicemia: 104,
          peso: 72.0 + i,
          altura: 1.65 + (i / 100),
          dor: i % 10,
          queixa: p.queixa,
          observacoes: 'Sinais vitais coletados e registrados no sistema de triagem rápida.',
          profissional: enfResponsavel.nome,
        }
      });

      // Gerar evoluções e prescrições para os atendidos
      const medResponsavel = medicos[i % medicos.length];
      await prisma.evolucao.create({
        data: {
          pacienteId: paciente.id,
          tipo: 'Médica',
          descricao: `Paciente avaliado pelo plantão. Conduta definida conforme protocolo clínico de classificação ${p.classificacao}.`,
          profissional: medResponsavel.nome,
        }
      });

      await prisma.prescricao.create({
        data: {
          pacienteId: paciente.id,
          medicamento: p.classificacao === 'Laranja' ? 'Soro Fisiológico + Berotec' : 'Dipirona Sódica',
          dose: p.classificacao === 'Laranja' ? '20ml' : '500mg',
          via: p.classificacao === 'Laranja' ? 'Inalação' : 'Oral',
          frequencia: 'Dose única imediata',
          profissional: medResponsavel.nome,
        }
      });
    }
  }

  // 4. Agendamentos, Exames e Cirurgias Adicionais
  console.log('Populando agenda, exames laboratoriais e cirurgias...');
  const pacientesSalvos = await prisma.paciente.findMany();

  for (let i = 0; i < 5; i++) {
    const paciente = pacientesSalvos[i];
    const medico = medicos[i % medicos.length];

    await prisma.agendamento.create({
      data: {
        pacienteId: paciente.id,
        hospitalId: hospital.id,
        dataHora: new Date(`2026-07-${15 + i}T10:00:00Z`),
        tipo: 'Consulta de Retorno',
        especialidade: i % 2 === 0 ? 'Cardiologia' : 'Clínica Geral',
        profissional: medico.nome,
        status: StatusAgendamento.AGENDADO,
      }
    });

    await prisma.exame.create({
      data: {
        pacienteId: paciente.id,
        hospitalId: hospital.id,
        tipo: i % 2 === 0 ? 'Imagem' : 'Laboratorial',
        nome: i % 2 === 0 ? 'Raio-X de Tórax' : 'Creatinina e Ureia',
        status: i % 3 === 0 ? StatusExame.CONCLUIDO : StatusExame.COLETADO,
        profissional: medico.nome,
      }
    });
  }

  // Agendar uma Cirurgia Complexa de Exemplo
  await prisma.cirurgia.create({
    data: {
      pacienteId: pacientesSalvos[3].id,
      hospitalId: hospital.id,
      procedimento: 'Colecistectomia por Videolaparoscopia',
      sala: 'Sala de Cirurgia 02',
      dataHora: new Date('2026-06-29T07:30:00Z'),
      equipe: 'Dr. Carlos (Cirurgião Principal), Dra. Vanessa (Anestesista), Enf. Paula (Instrumentadora)',
      anestesia: 'Geral',
      status: StatusCirurgia.AGENDADA,
    }
  });

  // 5. Infraestrutura Robusta (Leitos de UTI e Enfermaria)
  console.log('Populando infraestrutura hospitalar...');
  const leitosDados: { hospitalId: string; numero: number; tipo: TipoLeito; status: StatusOcupacao; pacienteNome: string | null }[] = [];
  for (let j = 101; j <= 110; j++) {
    leitosDados.push({
      hospitalId: hospital.id,
      numero: j,
      tipo: TipoLeito.ADULTO,
      status: j % 4 === 0 ? StatusOcupacao.OCUPADO : StatusOcupacao.LIVRE,
      pacienteNome: j % 4 === 0 ? 'Paciente de Internação Temporária' : null
    });
  }
  for (let j = 201; j <= 205; j++) {
    leitosDados.push({
      hospitalId: hospital.id,
      numero: j,
      tipo: TipoLeito.PEDIATRICO,
      status: j === 201 ? StatusOcupacao.LIMPEZA : StatusOcupacao.LIVRE
    });
  }
  await prisma.utiLeito.createMany({ data: leitosDados });

  // Salas de Atendimento
  await prisma.sala.createMany({
    data: [
      { hospitalId: hospital.id, nome: 'Consultório 01', tipo: 'Consulta', setor: 'Ambulatório', andar: 'Térreo', status: StatusOcupacao.OCUPADO },
      { hospitalId: hospital.id, nome: 'Consultório 02', tipo: 'Consulta', setor: 'Ambulatório', andar: 'Térreo', status: StatusOcupacao.LIVRE },
      { hospitalId: hospital.id, nome: 'Consultório 03 (Pediatria)', tipo: 'Consulta', setor: 'Pediatria', andar: '1º Andar', status: StatusOcupacao.LIVRE },
      { hospitalId: hospital.id, nome: 'Sala de Tomografia', tipo: 'Imagem', setor: 'Radiologia', andar: 'Térreo', status: StatusOcupacao.LIVRE },
      { hospitalId: hospital.id, nome: 'Sala de Trauma 01', tipo: 'Urgência', setor: 'Pronto Socorro', andar: 'Térreo', status: StatusOcupacao.OCUPADO },
    ]
  });

  // 6. Painel de Chamadas e Tickets TI
  console.log('Injetando painel administrativo, chamadas e ocorrências...');
  await prisma.ticket.createMany({
    data: [
      { hospitalId: hospital.id, solicitante: 'Mariana Silva (Enfermagem)', titulo: 'Impressora do posto 2 travada', descricao: 'Não imprime etiquetas de identificação de pulseiras.', prioridade: PrioridadeTicket.ALTA, status: StatusTicket.ENVIADO },
      { hospitalId: hospital.id, solicitante: 'Dr. Carlos Eduardo', titulo: 'Erro de Login no Prontuário', descricao: 'Lentidão intermitente ao salvar evoluções no sistema.', prioridade: PrioridadeTicket.URGENTE, status: StatusTicket.EM_ANALISE }
    ]
  });

  await prisma.chamada.createMany({
    data: [
      { hospitalId: hospital.id, pacienteId: pacientesSalvos[0].id, pacienteNome: pacientesSalvos[0].nome, consultorio: 'Consultório 01', status: StatusChamada.ATIVA },
      { hospitalId: hospital.id, pacienteId: pacientesSalvos[2].id, pacienteNome: pacientesSalvos[2].nome, consultorio: 'Triagem Sala B', status: StatusChamada.FINALIZADA }
    ]
  });

  await prisma.emergencia.create({
    data: {
      hospitalId: hospital.id,
      tipo: 'Parada Cardiorrespiratória (Código Azul) - Sala de Trauma 01',
      profissional: 'Equipe de Plantão de Alta Complexidade',
    }
  });

  // 7. Estoque Avançado e Volumoso de Insumos (Farmácia/Almoxarifado)
  console.log('Abastecendo o estoque da farmácia e almoxarifado central...');
  await prisma.estoqueItem.createMany({
    data: [
      { hospitalId: hospital.id, categoria: 'Medicamentos', nome: 'Dipirona Monoidratada 500mg/mL', quantidade: 850, unidade: 'Ampola', minimo: 150, lote: 'L2026A', validade: new Date('2028-12-31') },
      { hospitalId: hospital.id, categoria: 'Medicamentos', nome: 'Paracetamol 500mg Comprimidos', quantidade: 2500, unidade: 'Comprimido', minimo: 500, lote: 'PTR26B', validade: new Date('2027-06-15') },
      { hospitalId: hospital.id, categoria: 'Medicamentos', nome: 'Cloridrato de Tramadol 50mg/mL', quantidade: 120, unidade: 'Ampola', minimo: 40, lote: 'TRA99D', validade: new Date('2028-02-20') },
      { hospitalId: hospital.id, categoria: 'Materiais', nome: 'Seringa Descartável 5mL com Agulha', quantidade: 1400, unidade: 'Unidade', minimo: 300, lote: 'SER99B', validade: new Date('2030-05-15') },
      { hospitalId: hospital.id, categoria: 'Materiais', nome: 'Luva de Procedimento Látex Tam M', quantidade: 5000, unidade: 'Par', minimo: 1000, lote: 'LUV01C', validade: new Date('2029-10-10') },
      { hospitalId: hospital.id, categoria: 'Materiais', nome: 'Cateter Intravenoso Gelco 20G', quantidade: 450, unidade: 'Unidade', minimo: 100, lote: 'GEL20G', validade: new Date('2029-01-18') },
      { hospitalId: hospital.id, categoria: 'Medicamentos', nome: 'Soro Fisiológico 0,9% 500mL', quantidade: 600, unidade: 'Frasco', minimo: 150, lote: 'SF500M', validade: new Date('2028-08-11') }
    ],
  });

  // 8. Configurações Customizadas do Dashboard Geral
  await prisma.configDashboard.create({
    data: {
      hospitalId: hospital.id,
      config: {
        tema: 'dark',
        atualizacaoAutomaticaSegundos: 30,
        widgetsAtivos: ['ocupacao_leitos', 'tempo_espera_triagem', 'alertas_estoque_critico', 'chamadas_painel_tempo_real', 'status_atendimento_pronto_socorro']
      },
    },
  });

  console.log('Seed massivo finalizado com sucesso! Todos os dados relacionais foram inseridos de forma limpa.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });