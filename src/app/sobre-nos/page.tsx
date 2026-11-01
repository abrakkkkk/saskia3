import './sobre-nos.css';

export default function SobreNosPage() {
  return (
    <div className="sobre-nos-container">

      {/* BANNER */}
      <div className="banner-sobre">
        <div className="banner-conteudo">
          <h1>Conheça a história por trás da Saskia</h1>
          <p className="subtitulo-banner">
            Da ideia de um chatbot inteligente à criação de um ecossistema completo de gestão em saúde.
            Conheça as mentes que estão transformando o futuro da saúde no Brasil.
          </p>
        </div>
        <i aria-hidden="true" className="las la-heart icone-coracao"></i>
      </div>

      {/* MISSÃO VISÃO VALORES — logo abaixo do banner */}
      <div className="secao-mvv">
        <div className="card-mvv missao">
          <div className="icone-mvv"><i aria-hidden="true" className="las la-rocket"></i></div>
          <h3>Missão</h3>
          <p>Promover a transformação da saúde por meio da tecnologia, oferecendo soluções acessíveis, eficientes e humanizadas.</p>
        </div>
        <div className="card-mvv visao">
          <div className="icone-mvv"><i aria-hidden="true" className="las la-eye"></i></div>
          <h3>Visão</h3>
          <p>Ser referência nacional em sistemas integrados de saúde, impactando positivamente a vida de milhões de brasileiros.</p>
        </div>
        <div className="card-mvv valores">
          <div className="icone-mvv"><i aria-hidden="true" className="las la-heart"></i></div>
          <h3>Valores</h3>
          <p>Ética, inovação contínua, humanização do cuidado, compromisso com a saúde pública e valorização dos profissionais.</p>
        </div>
      </div>

      {/* NOSSA EQUIPE */}
      <div className="secao-equipe">
        <h2><i aria-hidden="true" className="las la-users"></i> Nossa Equipe</h2>
        <div className="equipe-grid">

          {/* MARCELO */}
          <div className="card-pessoa idealizador">
            <div className="card-header">
              <div className="foto-pessoa">
                <img src="/images/equipe/marceloff.webp" alt="Marcelo Marinho de Moura" />
              </div>
              <div className="pessoa-header-info">
                <h3>Marcelo Marinho de Moura</h3>
                <span className="cargo-pessoa cargo-idealizador">Idealizador &amp; Fundador</span>
                <div className="card-links">
                  <a href="mailto:marcelomarinhomouraapp@gmail.com" className="contato-link"><i aria-hidden="true" className="las la-envelope"></i> E-mail</a>
                  <a href="http://lattes.cnpq.br/3238127472664737" target="_blank" rel="noreferrer" className="contato-link outline"><i aria-hidden="true" className="las la-external-link-alt"></i> Lattes</a>
                </div>
              </div>
            </div>
            <p className="bio-pessoa">Estudante dedicado de Enfermagem no 7º semestre da Universidade de Fortaleza (UNIFOR), comprometido em contribuir para o campo da saúde com compaixão, habilidades clínicas sólidas e um compromisso inabalável com o bem-estar dos pacientes.</p>
            <div className="frases-impacto"><i aria-hidden="true" className="las la-quote-left"></i> “A Saskia nasceu da vontade de unir tecnologia e saúde para criar um sistema mais humano, eficiente e acessível para todos que precisam.”</div>
            <div className="tags-formacao">
              <span className="tag-formacao"><i aria-hidden="true" className="las la-graduation-cap"></i> Enfermagem UNIFOR — 7º Sem.</span>
              <span className="tag-formacao"><i aria-hidden="true" className="las la-certificate"></i> APH 100h</span>
              <span className="tag-formacao"><i aria-hidden="true" className="las la-heartbeat"></i> Arritmia Einstein 100h</span>
              <span className="tag-formacao"><i aria-hidden="true" className="las la-lungs"></i> Embolia Pulmonar 450h</span>
            </div>
          </div>

          {/* ISABELA */}
          <div className="card-pessoa orientadora">
            <div className="card-header">
              <div className="foto-pessoa">
                <img src="/images/equipe/Isabelamelo1.jpg" alt="Isabela Melo Bonfim" />
              </div>
              <div className="pessoa-header-info">
                <h3>Prof.ª Dr.ª Isabela Melo Bonfim</h3>
                <span className="cargo-pessoa cargo-professora">Professora Orientadora &amp; Doutora em Enfermagem</span>
                <div className="card-links">
                  <a href="mailto:isabela.bonfim@unifor.br" className="contato-link prof-link"><i aria-hidden="true" className="las la-envelope"></i> E-mail</a>
                </div>
              </div>
            </div>
            <p className="bio-pessoa">Doutora em Enfermagem Clínico Cirúrgica pela UFC. Professora Adjunto 5 da UNIFOR. Membro do GEPTIE e NEPIT. Vice-presidente do Colegiado de Enfermagem da UNIFOR. Grande apoiadora do projeto Saskia, sempre com supervisão criteriosa de tudo que está sendo desenvolvido.</p>
            <div className="frases-impacto prof"><i aria-hidden="true" className="las la-quote-left"></i> “A tecnologia na saúde não substitui o cuidado humano — ela o potencializa. Quando unimos inovação e conhecimento clínico, criamos ferramentas que transformam a assistência em experiências mais seguras, eficientes e centradas no paciente.”</div>
            <div className="tags-formacao">
              <span className="tag-formacao tag-prof"><i aria-hidden="true" className="las la-graduation-cap"></i> Doutorado UFC</span>
              <span className="tag-formacao tag-prof"><i aria-hidden="true" className="las la-book-medical"></i> Mestrado UFC</span>
              <span className="tag-formacao tag-prof"><i aria-hidden="true" className="las la-kidney"></i> Nefrologia UECE</span>
              <span className="tag-formacao tag-prof"><i aria-hidden="true" className="las la-flask"></i> Tecnologia e Inovação</span>
            </div>
          </div>

          {/* YASMIN */}
          <div className="card-pessoa diretora">
            <div className="card-header">
              <div className="foto-pessoa">
                <img src="/images/equipe/yasmin11.jpeg" alt="Yasmin Xavier Feitosa Macêdo" />
              </div>
              <div className="pessoa-header-info">
                <h3>Yasmin Xavier Feitosa Macêdo</h3>
                <span className="cargo-pessoa cargo-diretora">Diretora Clínica de Enfermagem &amp; Treinamento IA BIA</span>
                <div className="card-links">
                  <a href="http://lattes.cnpq.br/0412143067053471" target="_blank" rel="noreferrer" className="contato-link diretora-link"><i aria-hidden="true" className="las la-external-link-alt"></i> Lattes</a>
                </div>
              </div>
            </div>
            <p className="bio-pessoa">Acadêmica do 9º semestre de Enfermagem na UNIFOR, atualmente em internato de saúde coletiva. Plena consciência dos trabalhos diários em saúde coletiva e no tratamento individualizado para pacientes com cuidado, amor, responsabilidade e técnica.</p>
            <div className="frases-impacto diretora"><i aria-hidden="true" className="las la-quote-left"></i> “Aplicar conhecimentos em tecnologias no ambiente assistencial, integrando o domínio técnico à humanização do cuidado e à segurança do paciente — esse é o meu propósito.”</div>
            <div className="tags-formacao">
              <span className="tag-formacao tag-diretora"><i aria-hidden="true" className="las la-graduation-cap"></i> Enfermagem UNIFOR — 9º Sem.</span>
              <span className="tag-formacao tag-diretora"><i aria-hidden="true" className="las la-heart"></i> Saúde Coletiva</span>
              <span className="tag-formacao tag-diretora"><i aria-hidden="true" className="las la-laptop-medical"></i> Tecnologia em Enfermagem</span>
            </div>
          </div>

          {/* GABRIELA */}
          <div className="card-pessoa estrategica">
            <div className="card-header">
              <div className="foto-pessoa">
                <img src="/images/equipe/gabis.jpeg" alt="Gabriela Saskia Pereira Custódio" />
              </div>
              <div className="pessoa-header-info">
                <h3>Gabriela Saskia Pereira Custódio</h3>
                <span className="cargo-pessoa cargo-estrategica">Diretora Estratégica — Sistema BIA | Monitora de U&amp;E</span>
                <div className="card-links">
                  <a href="http://lattes.cnpq.br/8016578684715093" target="_blank" rel="noreferrer" className="contato-link estrategica-link"><i aria-hidden="true" className="las la-external-link-alt"></i> Lattes</a>
                </div>
              </div>
            </div>
            <p className="bio-pessoa">Graduanda bolsista em Enfermagem pela UNIFOR, atualmente no 9º semestre e em internato de saúde coletiva. Fluente em inglês, com ampla experiência em Urgência e Emergência. Como Diretora Estratégica, lidera o planejamento, distribuição e correção do sistema BIA e da plataforma Saskia.</p>
            <div className="frases-impacto estrategica"><i aria-hidden="true" className="las la-quote-left"></i> “A tecnologia mostra detalhes; nós mostramos humanidade. E é na união dessas duas forças que transformamos a assistência em algo verdadeiramente humano, seguro e individualizado.”</div>
            <div className="tags-formacao">
              <span className="tag-formacao tag-estrategica"><i aria-hidden="true" className="las la-graduation-cap"></i> Enfermagem UNIFOR — 9º Sem.</span>
              <span className="tag-formacao tag-estrategica"><i aria-hidden="true" className="las la-ambulance"></i> Urgência e Emergência 120h</span>
              <span className="tag-formacao tag-estrategica"><i aria-hidden="true" className="las la-language"></i> Inglês Fluente</span>
            </div>
          </div>

          {/* ABRAHÃO */}
          <div className="card-pessoa analista">
            <div className="card-header">
              <div className="foto-pessoa">
                <img src="/images/equipe/abranll.jpeg" alt="Abrahão Levy Barbosa De Lavor" />
              </div>
              <div className="pessoa-header-info">
                <h3>Abrahão Levy Barbosa De Lavor</h3>
                <span className="cargo-pessoa cargo-analista">Analista de Dados &amp; Especialista em Business Intelligence</span>
                <div className="card-links">
                  <a href="tel:+5585988866471" className="contato-link analista-link"><i aria-hidden="true" className="las la-phone"></i> (85) 98886-6471</a>
                  <a href="https://www.linkedin.com/in/abrahao-levy-04b85125b/" target="_blank" rel="noreferrer" className="contato-link analista-outline"><i aria-hidden="true" className="lab la-linkedin"></i> LinkedIn</a>
                </div>
              </div>
            </div>
            <p className="bio-pessoa">Graduado em Análise e Desenvolvimento de Sistemas pela UNIFOR, com formação complementar em Data Analytics. Possui sólida experiência em Suporte de TI, administração de bancos de dados (PostgreSQL, Firebird e MySQL) e análise de dados. Desenvolve projetos com foco em transformar dados brutos em soluções eficientes, utilizando SQL avançado, Python (Pandas), processos ETL e criação de dashboards no Power BI (DAX) para suporte à tomada de decisão estratégica.</p>
            <div className="frases-impacto analista"><i aria-hidden="true" className="las la-quote-left"></i> “Dados salvam vidas. Na saúde, cada número representa uma pessoa, e transformar informações em decisões inteligentes é o que nos permite oferecer um cuidado mais preciso, eficiente e verdadeiramente humano.”</div>
            <div className="tags-formacao">
              <span className="tag-formacao tag-analista"><i aria-hidden="true" className="las la-graduation-cap"></i> ADS UNIFOR</span>
              <span className="tag-formacao tag-analista"><i aria-hidden="true" className="las la-database"></i> SQL / PostgreSQL</span>
              <span className="tag-formacao tag-analista"><i aria-hidden="true" className="las la-code"></i> Python (Pandas)</span>
              <span className="tag-formacao tag-analista"><i aria-hidden="true" className="las la-chart-pie"></i> Power BI (DAX)</span>
            </div>
          </div>

          {/* ALEXSANDER */}
          <div className="card-pessoa designer">
            <div className="card-header">
              <div className="foto-pessoa">
                <img src="/images/equipe/alexsilva1.webp" alt="Alexsander Silva" />
              </div>
              <div className="pessoa-header-info">
                <h3>Alexsander Silva</h3>
                <span className="cargo-pessoa cargo-design">Designer Multidisciplinar</span>
                <div className="card-links">
                  <a href="mailto:silvazxalexsander@gmail.com" className="contato-link design-link"><i aria-hidden="true" className="las la-envelope"></i> E-mail</a>
                  <a href="https://instagram.com/only.alexsander" target="_blank" rel="noreferrer" className="contato-link design-outline"><i aria-hidden="true" className="las la-instagram"></i> Instagram</a>
                </div>
              </div>
            </div>
            <p className="bio-pessoa">Designer multidisciplinar de Simão Dias/SE, com 1 ano de carreira unindo design digital e identidade de marca. Pensador criativo, solucionador de problemas e eterno aprendiz que acredita que o design é a ponte entre a tecnologia e as pessoas.</p>
            <div className="frases-impacto"><i aria-hidden="true" className="las la-quote-left"></i> “Criar algo que una beleza e funcionalidade é o que me move. Cada pixel importa quando estamos construindo experiências que podem transformar a relação das pessoas com a saúde.”</div>
            <div className="tags-formacao">
              <span className="tag-formacao tag-design"><i aria-hidden="true" className="las la-pencil-ruler"></i> UX Design</span>
              <span className="tag-formacao tag-design"><i aria-hidden="true" className="las la-layer-group"></i> UI Design</span>
              <span className="tag-formacao tag-design"><i aria-hidden="true" className="las la-fingerprint"></i> Identidade de Marca</span>
            </div>
          </div>

        </div>
      </div>

      {/* NOSSA HISTÓRIA + PROJETO LADO A LADO */}
      <div className="secao-bottom-grid">
        <div className="secao-historia">
          <h2><i aria-hidden="true" className="las la-history"></i> Nossa História</h2>
          <div className="linha-tempo">
            <div className="evento-timeline">
              <h4>O Início — A Ideia do Chatbot IA</h4>
              <p>Tudo começou com a visão de criar um <strong>chatbot inteligente</strong> que auxiliasse profissionais de saúde e pacientes com conversas fluidas e individualizadas.</p>
            </div>
            <div className="evento-timeline">
              <h4>A Evolução — Nasce o Projeto Saskia</h4>
              <p>Com orientação da Prof.ª Dr.ª Isabela Bonfim e uma equipe multidisciplinar, o projeto evoluiu para o ecossistema <strong>Saskia Saúde</strong>.</p>
            </div>
            <div className="evento-timeline">
              <h4>O Presente — Transformando a Saúde</h4>
              <p>Hoje, a Saskia une tecnologia de ponta, análise de dados inteligente e a humanização que o cuidado em saúde exige.</p>
            </div>
          </div>
        </div>

        <div className="secao-projeto">
          <h2><i aria-hidden="true" className="las la-info-circle"></i> Sobre o Projeto</h2>
          <div className="grid-projeto">
            <div className="card-projeto">
              <div className="icone-projeto"><i aria-hidden="true" className="las la-lightbulb"></i></div>
              <h4>Inovação na Saúde</h4>
              <p>Tecnologia acessível para clínicas, hospitais e unidades públicas.</p>
            </div>
            <div className="card-projeto">
              <div className="icone-projeto"><i aria-hidden="true" className="las la-sitemap"></i></div>
              <h4>Organização</h4>
              <p>Reduzindo falhas, retrabalho e perda de informações.</p>
            </div>
            <div className="card-projeto">
              <div className="icone-projeto"><i aria-hidden="true" className="las la-user-friends"></i></div>
              <h4>Integração</h4>
              <p>Conectando enfermagem, medicina, recepção e gestão.</p>
            </div>
            <div className="card-projeto">
              <div className="icone-projeto"><i aria-hidden="true" className="las la-hand-holding-heart"></i></div>
              <h4>Humanização</h4>
              <p>Permitindo que o profissional foque no paciente.</p>
            </div>
          </div>
        </div>
      </div>

      {/* IMPACTO */}
      <div className="secao-impacto">
        <h2>Impacto para a Sociedade Brasileira</h2>
        <div className="impacto-grid">
          <div className="impacto-item">
            <div className="numero-impacto"><i aria-hidden="true" className="las la-arrow-down"></i></div>
            <p>Redução de filas e tempo de espera</p>
          </div>
          <div className="impacto-item">
            <div className="numero-impacto"><i aria-hidden="true" className="las la-check-circle"></i></div>
            <p>Maior controle e rastreabilidade</p>
          </div>
          <div className="impacto-item">
            <div className="numero-impacto"><i aria-hidden="true" className="las la-clipboard-list"></i></div>
            <p>Organização de prontuários</p>
          </div>
          <div className="impacto-item">
            <div className="numero-impacto"><i aria-hidden="true" className="las la-hospital"></i></div>
            <p>Apoio à gestão hospitalar</p>
          </div>
        </div>
      </div>

    </div>
  );
}
