'use client';

import { PageHeader, Panel } from '@/components/ui';
import '@/components/ui/ui-extras.css';
import './institucional.css';

const HISTORIA = [
  { ano: '2024', texto: 'Nasce a ideia de um chatbot IA para auxiliar profissionais e pacientes.' },
  { ano: '2025', texto: 'O projeto evolui para o ecossistema Saskia Saúde sob orientação da Prof.ª Dr.ª Isabela Bonfim.' },
  { ano: '2026', texto: 'Primeira versão do sistema de gestão hospitalar.' },
  { ano: '2026+', texto: 'Evolução contínua do produto com os hospitais parceiros.' },
];

const DIFERENCIAIS = [
  { icone: 'las la-lightbulb', titulo: 'Inovação na saúde', texto: 'Tecnologia acessível para clínicas, hospitais e unidades públicas de saúde.' },
  { icone: 'las la-network-wired', titulo: 'Integração total', texto: 'Módulos pensados para reduzir retrabalho e papelada.' },
  { icone: 'las la-shield-alt', titulo: 'Segurança e ética', texto: 'Acesso por cargo e isolamento de dados entre hospitais.' },
];

export default function InstitucionalPage() {
  return (
    <main className="mod-pagina">
      <PageHeader
        icon="las la-heartbeat"
        title="Saskia Saúde Integrada"
        subtitle="Tecnologia e humanização para uma saúde mais eficiente e acessível a todos os brasileiros. Um sistema de gestão hospitalar em evolução."
      />

      <Panel title="Sobre a Saskia Saúde" icon="las la-users">
        <p className="inst-texto">
          A <strong>Saskia Saúde</strong> é uma plataforma inovadora voltada para a transformação digital da saúde no Brasil.
          Desenvolvida com foco na integração de serviços, otimização de processos e melhoria da experiência tanto dos
          profissionais quanto dos pacientes. Mais do que um sistema, a Saskia representa uma nova forma de organizar,
          gerenciar e humanizar o cuidado em saúde.
        </p>
      </Panel>

      <div className="inst-grade">
        <Panel title="Missão" icon="las la-rocket">
          <p className="inst-texto">
            Promover a transformação da saúde por meio da tecnologia, oferecendo soluções acessíveis,
            eficientes e humanizadas que melhorem a qualidade do atendimento e a gestão dos serviços de saúde.
          </p>
        </Panel>
        <Panel title="Visão" icon="las la-eye">
          <p className="inst-texto">
            Ser referência nacional em sistemas integrados de saúde, contribuindo para a modernização do setor
            e impactando positivamente a vida de milhões de brasileiros.
          </p>
        </Panel>
        <Panel title="Valores" icon="las la-heart">
          <ul className="inst-valores">
            <li>Ética e responsabilidade</li>
            <li>Inovação contínua</li>
            <li>Humanização do cuidado</li>
            <li>Compromisso com a saúde pública</li>
            <li>Acessibilidade tecnológica</li>
            <li>Valorização dos profissionais</li>
          </ul>
        </Panel>
      </div>

      <Panel title="Nossa história" icon="las la-history">
        <ol className="inst-historia">
          {HISTORIA.map(item => (
            <li key={item.ano}>
              <strong>{item.ano}</strong>
              <p>{item.texto}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <section aria-labelledby="diferenciais-titulo">
        <h2 id="diferenciais-titulo" className="ux-titulo-secao"><i className="las la-star" aria-hidden="true"></i> Por que escolher a Saskia?</h2>
        <div className="ux-atalhos">
          {DIFERENCIAIS.map(item => (
            <div key={item.titulo} className="ux-atalho">
              <span className="ux-atalho-icone" aria-hidden="true"><i className={item.icone}></i></span>
              <span><strong>{item.titulo}</strong><small>{item.texto}</small></span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
