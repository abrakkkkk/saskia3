'use client';
import { Badge, PageHeader, Panel, type Tone } from '@/components/ui';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import './planos.css';

type Linha = { porte: string; exemplos: string; mensal: string; anual: string; implementacao: string };
type Secao = { id: string; titulo: string; icone: string; tom: Tone; linhas: Linha[] };

const SECOES: Secao[] = [
  {
    id: 'prefeituras', titulo: 'Prefeituras e órgãos públicos', icone: 'las la-landmark', tom: 'info',
    linhas: [
      { porte: 'Grandes capitais', exemplos: 'Fortaleza, São Paulo, Rio de Janeiro', mensal: 'R$ 5.000,00/mês', anual: 'R$ 50.000,00', implementacao: 'A partir de R$ 20.000,00' },
      { porte: 'Cidades metropolitanas', exemplos: 'Caucaia, Maracanaú, Guarulhos', mensal: 'R$ 3.500,00/mês', anual: 'R$ 35.000,00', implementacao: 'A partir de R$ 15.000,00' },
      { porte: 'Cidades de médio porte', exemplos: 'Maranguape, Quixadá, Sobral', mensal: 'R$ 2.500,00/mês', anual: 'R$ 25.000,00', implementacao: 'A partir de R$ 12.000,00' },
      { porte: 'Cidades pequenas', exemplos: 'Paraipaba, São Gonçalo do Amarante', mensal: 'R$ 1.200,00/mês', anual: 'R$ 12.000,00', implementacao: 'A partir de R$ 6.000,00' },
    ],
  },
  {
    id: 'clinicas', titulo: 'Clínicas e consultórios', icone: 'las la-clinic-medical', tom: 'neutral',
    linhas: [
      { porte: 'Consultório individual', exemplos: 'Médico, dentista, psicólogo, nutricionista', mensal: 'R$ 149,00/mês', anual: 'R$ 1.490,00', implementacao: 'R$ 500,00' },
      { porte: 'Clínica pequena', exemplos: 'Até 5 profissionais', mensal: 'R$ 399,00/mês', anual: 'R$ 3.990,00', implementacao: 'R$ 1.500,00' },
      { porte: 'Clínica média', exemplos: 'De 6 a 20 profissionais', mensal: 'R$ 799,00/mês', anual: 'R$ 7.990,00', implementacao: 'R$ 3.000,00' },
      { porte: 'Policlínica ou centro', exemplos: 'Mais de 20 profissionais', mensal: 'R$ 1.499,00/mês', anual: 'R$ 14.990,00', implementacao: 'R$ 5.000,00' },
    ],
  },
  {
    id: 'hospitais', titulo: 'Hospitais e unidades hospitalares', icone: 'las la-hospital', tom: 'neutral',
    linhas: [
      { porte: 'Pequeno porte', exemplos: 'Até 50 leitos', mensal: 'R$ 2.499,00/mês', anual: 'R$ 24.990,00', implementacao: 'A partir de R$ 8.000,00' },
      { porte: 'Médio porte', exemplos: 'De 51 a 150 leitos', mensal: 'R$ 3.999,00/mês', anual: 'R$ 39.990,00', implementacao: 'A partir de R$ 15.000,00' },
      { porte: 'Grande porte', exemplos: 'Acima de 150 leitos', mensal: 'R$ 5.999,00/mês', anual: 'R$ 59.990,00', implementacao: 'A partir de R$ 25.000,00' },
      { porte: 'Rede hospitalar', exemplos: 'Múltiplas unidades', mensal: 'Sob consulta', anual: 'Sob consulta', implementacao: 'Sob consulta' },
    ],
  },
  {
    id: 'filantropicas', titulo: 'Instituições filantrópicas', icone: 'las la-hand-holding-heart', tom: 'success',
    linhas: [
      { porte: 'Pequeno porte', exemplos: 'Até 30 leitos', mensal: 'R$ 799,00/mês', anual: 'R$ 7.990,00', implementacao: 'R$ 2.000,00' },
      { porte: 'Médio porte', exemplos: 'De 31 a 100 leitos', mensal: 'R$ 1.499,00/mês', anual: 'R$ 14.990,00', implementacao: 'R$ 5.000,00' },
      { porte: 'Grande porte', exemplos: 'Acima de 100 leitos', mensal: 'R$ 2.499,00/mês', anual: 'R$ 24.990,00', implementacao: 'A partir de R$ 8.000,00' },
    ],
  },
];

const SUPORTES: { tipo: string; tom: Tone; descricao: string; canais: string; valor: string }[] = [
  { tipo: 'Suporte básico', tom: 'info', descricao: 'Horário comercial (8h às 18h)', canais: 'E-mail e chat', valor: 'Incluso' },
  { tipo: 'Suporte VIP 24x7', tom: 'neutral', descricao: 'Atendimento prioritário 24 horas', canais: 'Telefone e WhatsApp', valor: '+20% sobre a mensalidade' },
  { tipo: 'Suporte premium', tom: 'neutral', descricao: 'Gestor dedicado e visitas trimestrais', canais: 'Telefone, WhatsApp e presencial', valor: '+30% sobre a mensalidade' },
];

export default function PlanosPage() {
  return (
    <div className="mod-pagina">
      <PageHeader icon="las la-tags" title="Planos e valores" subtitle="Soluções para cada porte de instituição, da prefeitura de uma cidade pequena à grande rede hospitalar privada." />

      <p role="note" className="mod-aviso mod-aviso-atencao">
        Os valores abaixo são referências informativas. Não configuram plano contratado, proposta comercial vigente ou cobrança do hospital.
      </p>

      <div className="ux-atalhos">
        <div className="ux-atalho">
          <span className="ux-atalho-icone" aria-hidden="true"><i className="las la-calendar-check"></i></span>
          <span><strong>Plano anual com desconto</strong><small>Economia equivalente a 2 meses de mensalidade, com o mesmo suporte.</small></span>
        </div>
        <div className="ux-atalho">
          <span className="ux-atalho-icone" aria-hidden="true"><i className="las la-headset"></i></span>
          <span><strong>Suporte 24/7</strong><small>Adicional de 20% a 30% sobre a mensalidade, com atendimento prioritário por telefone e WhatsApp.</small></span>
        </div>
        <div className="ux-atalho">
          <span className="ux-atalho-icone" aria-hidden="true"><i className="las la-cogs"></i></span>
          <span><strong>Taxa de implementação</strong><small>Cobrada uma única vez. Inclui parametrização, treinamento da equipe e migração de dados.</small></span>
        </div>
      </div>

      {SECOES.map(secao => (
        <section key={secao.id} className="ux-secao" aria-labelledby={`planos-${secao.id}`}>
          <h2 id={`planos-${secao.id}`} className="ux-titulo-secao"><i className={secao.icone} aria-hidden="true"></i> {secao.titulo}</h2>
          <div className="tabela-wrapper">
            <table className="tabela" aria-label={`Preços para ${secao.titulo.toLowerCase()}`}>
              <thead>
                <tr><th>Porte</th><th>Exemplos</th><th>Mensalidade</th><th>Anual (com desconto)</th><th>Implementação</th></tr>
              </thead>
              <tbody>
                {secao.linhas.map(linha => (
                  <tr key={linha.porte}>
                    <td><Badge tone={secao.tom}>{linha.porte}</Badge></td>
                    <td>{linha.exemplos}</td>
                    <td>{linha.mensal}</td>
                    <td>{linha.anual}</td>
                    <td className="pl-valor">{linha.implementacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="ux-secao" aria-labelledby="planos-suporte">
        <h2 id="planos-suporte" className="ux-titulo-secao"><i className="las la-headset" aria-hidden="true"></i> Adicionais de suporte</h2>
        <div className="tabela-wrapper">
          <table className="tabela" aria-label="Adicionais de suporte e seus valores">
            <thead>
              <tr><th>Tipo de suporte</th><th>Descrição</th><th>Canais</th><th>Valor (sobre a mensalidade)</th></tr>
            </thead>
            <tbody>
              {SUPORTES.map(s => (
                <tr key={s.tipo}>
                  <td><Badge tone={s.tom}>{s.tipo}</Badge></td>
                  <td>{s.descricao}</td>
                  <td>{s.canais}</td>
                  <td className="pl-valor">{s.valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="ux-secao">
        <Panel title="Observações" icon="las la-info-circle">
          <ul className="ux-lista">
            <li>O preço final pode variar conforme o número de módulos contratados, unidades de saúde e usuários.</li>
            <li>Condições comerciais e contratuais são definidas em proposta formal.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
