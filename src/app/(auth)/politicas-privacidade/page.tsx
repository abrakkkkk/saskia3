'use client';
import { useEffect, useRef } from 'react';
import './politicas-privacidade.css';

export default function PoliticasPrivacidadePage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Execute original JS logic
        const scriptEl = document.createElement('script');
        scriptEl.innerHTML = ``;
        document.body.appendChild(scriptEl);

        return () => {
            if (scriptEl.parentNode) {
                scriptEl.parentNode.removeChild(scriptEl);
            }
        };
    }, []);

    return (
        <div 
            className="migrated-page-container" 
            ref={containerRef}
            dangerouslySetInnerHTML={{ __html: `<div class="conteudo">

<div class="politica-container">
    
    <h1>Política de Privacidade <span class="badge-lgpd">LGPD</span></h1>
    
    <div class="data-versao">
        <span><i class="las la-calendar"></i> Última atualização: 02 de maio de 2026</span>
        <span><i class="las la-file-alt"></i> Versão: 1.0</span>
        <span><i class="las la-gavel"></i> Em conformidade com a Lei nº 13.709/2018 (LGPD)</span>
    </div>

    <div class="destaque">
        <p><strong>📌 Resumo da Política:</strong> A Saskia Saúde Integrada está comprometida com a proteção dos seus dados pessoais. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos as informações dos usuários do nosso sistema, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).</p>
    </div>

    <!-- 1. INFORMAÇÕES GERAIS -->
    <h2>1. INFORMAÇÕES GERAIS</h2>
    <p>A presente Política de Privacidade tem por objetivo estabelecer as regras claras e transparentes sobre o tratamento de dados pessoais realizados pela <strong>Saskia Saúde Integrada</strong>, doravante denominada "Saskia", "nós", "nosso" ou "controladora", em relação aos usuários do sistema de gestão hospitalar, pacientes, profissionais de saúde e demais colaboradores.</p>
    <p>Esta Política se aplica a todos os serviços oferecidos através da plataforma Saskia, incluindo website, aplicação web, e quaisquer outros meios de interação com nossos sistemas.</p>

    <!-- 2. DEFINIÇÕES IMPORTANTES -->
    <h2>2. DEFINIÇÕES IMPORTANTES</h2>
    <p>Para fins desta Política de Privacidade, adotamos as seguintes definições, em conformidade com a LGPD:</p>
    <ul>
        <li><strong>Dados Pessoais:</strong> Informação relacionada a pessoa natural identificada ou identificável, como nome, CPF, e-mail, endereço, dados de saúde, etc.</li>
        <li><strong>Dados Pessoais Sensíveis:</strong> Dados sobre origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato, dados genéticos, biométricos, ou relativos à saúde ou vida sexual.</li>
        <li><strong>Tratamento de Dados:</strong> Toda operação realizada com dados pessoais, como coleta, produção, recepção, classificação, utilização, acesso, reprodução, transmissão, distribuição, processamento, arquivamento, armazenamento, eliminação, etc.</li>
        <li><strong>Titular:</strong> Pessoa natural a quem se referem os dados pessoais que são objeto de tratamento.</li>
        <li><strong>Controlador:</strong> Pessoa natural ou jurídica a quem competem as decisões referentes ao tratamento de dados pessoais (Saskia).</li>
        <li><strong>Operador:</strong> Pessoa natural ou jurídica que realiza o tratamento de dados pessoais em nome do controlador.</li>
        <li><strong>Anonimização:</strong> Utilização de meios técnicos razoáveis e disponíveis no momento do tratamento, por meio dos quais um dado perde a possibilidade de associação, direta ou indireta, a um indivíduo.</li>
    </ul>

    <!-- 3. QUAIS DADOS COLETAMOS -->
    <h2>3. QUAIS DADOS COLETAMOS</h2>
    <p>A Saskia coleta diferentes categorias de dados pessoais, dependendo da relação que o usuário mantém com a plataforma:</p>
    
    <h3>3.1 Dados de Cadastro (Pacientes)</h3>
    <ul>
        <li>Nome completo, CPF, data de nascimento, sexo, estado civil;</li>
        <li>Endereço completo (CEP, logradouro, número, bairro, cidade);</li>
        <li>Telefone, celular, e-mail;</li>
        <li>Informações de filiação (nome da mãe e do pai);</li>
        <li>Contato de emergência e parentesco.</li>
    </ul>

    <h3>3.2 Dados Clínicos e de Saúde (Dados Sensíveis)</h3>
    <ul>
        <li>Histórico médico, diagnósticos, prescrições, exames;</li>
        <li>Sinais vitais, alergias, comorbidades, cirurgias prévias;</li>
        <li>Informações sobre internações, leitos ocupados e procedimentos realizados;</li>
        <li>Prontuários eletrônicos e fichas de atendimento;</li>
        <li>Classificações de risco (Protocolo de Manchester) e triagens.</li>
    </ul>

    <h3>3.3 Dados de Profissionais e Colaboradores</h3>
    <ul>
        <li>Nome completo, e-mail institucional, cargo, nível hierárquico;</li>
        <li>Número de registro profissional (CRM, COREN, CREFITO, CRP, etc.), especialidade;</li>
        <li>Foto de perfil, dados de acesso, histórico de atividades no sistema;</li>
        <li>Informações de contato profissional.</li>
    </ul>

    <h3>3.4 Dados de Acesso e Navegação</h3>
    <ul>
        <li>Endereço IP, data e hora de acesso, páginas visitadas;</li>
        <li>Tipo de navegador, sistema operacional, resolução de tela;</li>
        <li>Logs de atividades e histórico de ações realizadas no sistema.</li>
    </ul>

    <!-- 4. FINALIDADES DO TRATAMENTO -->
    <h2>4. FINALIDADES DO TRATAMENTO</h2>
    <p>A Saskia trata os dados pessoais para as seguintes finalidades específicas e legítimas:</p>
    
    <table class="tabela-direitos">
        <thead>
            <tr><th>Finalidade</th><th>Base Legal</th><th>Dados Utilizados</th></tr>
        </thead>
        <tbody>
            <tr><td>Gestão de atendimento hospitalar e prontuários</td><td>Execução de contrato / Legítimo interesse</td><td>Dados cadastrais e clínicos</td></tr>
            <tr><td>Agendamento de consultas, exames e procedimentos</td><td>Execução de contrato</td><td>Nome, CPF, dados de contato</td></tr>
            <tr><td>Prescrição médica e controle de medicamentos</td><td>Execução de contrato / Saúde</td><td>Dados clínicos, histórico médico</td></tr>
            <tr><td>Faturamento e gestão administrativa</td><td>Obrigação legal / Execução de contrato</td><td>Dados cadastrais, dados de internação</td></tr>
            <tr><td>Pesquisas e melhorias do sistema</td><td>Legítimo interesse</td><td>Dados anonimizados</td></tr>
            <tr><td>Comunicações sobre atendimentos e suporte</td><td>Execução de contrato</td><td>E-mail, telefone</td></tr>
            <tr><td>Segurança e auditoria do sistema</td><td>Legítimo interesse / Obrigação legal</td><td>Logs de acesso, IP</td></tr>
        </tbody>
    </table>

    <!-- 5. COMPARTILHAMENTO DE DADOS -->
    <h2>5. COMPARTILHAMENTO DE DADOS</h2>
    <p>A Saskia poderá compartilhar dados pessoais nas seguintes situações:</p>
    <ul>
        <li><strong>Com profissionais de saúde autorizados:</strong> Médicos, enfermeiros e demais profissionais que participam do atendimento ao paciente.</li>
        <li><strong>Com estabelecimentos de saúde parceiros:</strong> Para continuidade do cuidado, mediante consentimento do titular.</li>
        <li><strong>Por obrigação legal ou judicial:</strong> Quando exigido por lei, ordem judicial ou por autoridades competentes.</li>
        <li><strong>Para proteção de direitos:</strong> Quando necessário para proteger os direitos, propriedade ou segurança da Saskia, de seus usuários ou do público.</li>
        <li><strong>Com provedores de serviços:</strong> Empresas contratadas para prestar serviços de infraestrutura, hospedagem, suporte técnico, sempre sob contratos que garantam a proteção dos dados.</li>
    </ul>
    <p><strong>Importante:</strong> A Saskia NÃO comercializa dados pessoais de seus usuários sob nenhuma circunstância.</p>

    <!-- 6. ARMAZENAMENTO E SEGURANÇA -->
    <h2>6. ARMAZENAMENTO E SEGURANÇA</h2>
    <p>A Saskia adota medidas técnicas e organizacionais para proteger os dados pessoais contra acessos não autorizados, destruição, perda, alteração, comunicação ou qualquer outra forma de tratamento inadequado.</p>
    
    <h3>6.1 Medidas de Segurança Implementadas</h3>
    <ul>
        <li>Criptografia de dados sensíveis em trânsito e em repouso;</li>
        <li>Controle de acesso baseado em perfis e níveis hierárquicos;</li>
        <li>Registro de logs de acesso e auditoria;</li>
        <li>Backups automáticos e redundância de dados;</li>
        <li>Política de senhas fortes e autenticação de usuários;</li>
        <li>Treinamento periódico da equipe sobre privacidade e segurança.</li>
    </ul>

    <h3>6.2 Prazo de Retenção</h3>
    <p>Os dados pessoais serão mantidos pelo tempo necessário para cumprir as finalidades para as quais foram coletados, respeitando os prazos legais estabelecidos pelo Conselho Federal de Medicina (CFM) e demais órgãos reguladores. Para dados de prontuários, o prazo mínimo de retenção é de 20 (vinte) anos, conforme legislação vigente.</p>

    <!-- 7. DIREITOS DOS TITULARES -->
    <h2>7. DIREITOS DOS TITULARES (LGPD)</h2>
    <p>Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o titular dos dados pessoais tem os seguintes direitos:</p>
    
    <table class="tabela-direitos">
        <thead><tr><th>Direito</th><th>Descrição</th></tr></thead>
        <tbody>
            <tr><td><i class="las la-check-circle"></i> Confirmação da existência de tratamento</td><td>Saber se a Saskia trata dados pessoais do titular.</td></tr>
            <tr><td><i class="las la-database"></i> Acesso aos dados</td><td>Solicitar uma cópia de todos os dados pessoais armazenados.</td></tr>
            <tr><td><i class="las la-edit"></i> Correção de dados incompletos</td><td>Solicitar a correção de dados inexatos ou desatualizados.</td></tr>
            <tr><td><i class="las la-trash-alt"></i> Anonimização, bloqueio ou eliminação</td><td>Solicitar a eliminação de dados desnecessários, excessivos ou tratados em desconformidade.</td></tr>
            <tr><td><i class="las la-exchange-alt"></i> Portabilidade dos dados</td><td>Solicitar a transferência dos dados para outro fornecedor de serviço.</td></tr>
            <tr><td><i class="las la-trash"></i> Eliminação de dados tratados com consentimento</td><td>Solicitar a eliminação de dados fornecidos mediante consentimento.</td></tr>
            <tr><td><i class="las la-info-circle"></i> Informação sobre compartilhamento</td><td>Saber com quais entidades a Saskia compartilha dados.</td></tr>
            <tr><td><i class="las la-ban"></i> Oposição ao tratamento</td><td>Opor-se a atividades de tratamento realizadas com base em legítimo interesse.</td></tr>
            <tr><td><i class="las la-robot"></i> Revisão de decisões automatizadas</td><td>Solicitar revisão de decisões tomadas exclusivamente com base em tratamento automatizado.</td></tr>
        </tbody>
    </table>

    <!-- 8. COMO EXERCER SEUS DIREITOS -->
    <h2>8. COMO EXERCER SEUS DIREITOS</h2>
    <p>Os titulares podem exercer seus direitos a qualquer momento, mediante requisição formal enviada através dos seguintes canais:</p>
    <ul>
        <li><strong>E-mail:</strong> <a href="mailto:privacidade@saskia.com.br" style="color:#1e3a8a;">privacidade@saskia.com.br</a></li>
        <li><strong>Formulário no sistema:</strong> Acesse "Minha Conta" &gt; "Solicitação de Privacidade"</li>
        <li><strong>Carta registrada:</strong> R. Azevedo Bolão, 1369 - Parquelândia, Fortaleza - CE, CEP: 60455-610</li>
        <li><strong>Telefone:</strong> (85) 9 98228864</li>
    </ul>
    <p>A Saskia se compromete a responder às solicitações em até 15 (quinze) dias úteis, nos termos da legislação aplicável.</p>

    <!-- 9. ENCARREGADO (DPO) -->
    <h2>9. ENCARREGADO PELA PROTEÇÃO DE DADOS (DPO)</h2>
    <p>A Saskia designou um Encarregado (Data Protection Officer - DPO) para atuar como canal de comunicação entre a empresa, os titulares dos dados e a Autoridade Nacional de Proteção de Dados (ANPD).</p>
    <div class="destaque">
        <p><strong>📧 E-mail do DPO:</strong> <a href="mailto:dpo@saskia.com.br">dpo@saskia.com.br</a><br>
        <strong>📞 Telefone do DPO:</strong> (85) 9 98228864<br>
        <strong>👤 Nome do DPO:</strong> Marcelo Marinho Moura</p>
    </div>

    <!-- 10. COOKIES E TECNOLOGIAS DE RASTREAMENTO -->
    <h2>10. COOKIES E TECNOLOGIAS DE RASTREAMENTO</h2>
    <p>O sistema Saskia utiliza cookies estritamente necessários para o funcionamento da plataforma, como:</p>
    <ul>
        <li>Cookies de autenticação (para manter o usuário logado);</li>
        <li>Cookies de sessão (para armazenar preferências temporárias);</li>
        <li>Cookies de segurança (para proteção contra ataques).</li>
    </ul>
    <p><strong>Não utilizamos cookies de rastreamento ou marketing.</strong> O usuário pode desabilitar os cookies nas configurações do navegador, mas isso pode afetar o funcionamento adequado do sistema.</p>

    <!-- 11. TRANSFERÊNCIA INTERNACIONAL DE DADOS -->
    <h2>11. TRANSFERÊNCIA INTERNACIONAL DE DADOS</h2>
    <p>A Saskia armazena os dados em servidores localizados no Brasil, garantindo conformidade com a legislação brasileira. Caso seja necessário utilizar serviços de terceiros sediados no exterior, a Saskia adotará as medidas necessárias para garantir o mesmo nível de proteção exigido pela LGPD.</p>

    <!-- 12. MEDIDAS EM CASO DE VIOLAÇÃO -->
    <h2>12. MEDIDAS EM CASO DE VIOLAÇÃO DE DADOS</h2>
    <p>Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, a Saskia se compromete a:</p>
    <ul>
        <li>Comunicar à Autoridade Nacional de Proteção de Dados (ANPD) em até 48 horas;</li>
        <li>Comunicar os titulares afetados de forma clara e transparente;</li>
        <li>Adotar medidas corretivas imediatas para mitigar os efeitos do incidente;</li>
        <li>Investigar as causas e implementar melhorias para prevenir futuras ocorrências.</li>
    </ul>

    <!-- 13. CONSENTIMENTO E REVOGAÇÃO -->
    <h2>13. CONSENTIMENTO E REVOGAÇÃO</h2>
    <p>Quando o tratamento de dados pessoais se basear no consentimento do titular, este poderá revogá-lo a qualquer momento, mediante solicitação pelos canais indicados nesta Política. A revogação do consentimento não afeta a licitude do tratamento realizado anteriormente.</p>

    <!-- 14. ALTERAÇÕES NA POLÍTICA -->
    <h2>14. ALTERAÇÕES NA POLÍTICA DE PRIVACIDADE</h2>
    <p>A Saskia se reserva o direito de modificar esta Política de Privacidade a qualquer momento, para refletir atualizações em nossas práticas, mudanças na legislação ou por razões operacionais. As alterações entram em vigor a partir da data de publicação no sistema.</p>
    <p>Recomendamos que os usuários revisem periodicamente esta Política. Em caso de alterações substanciais, a Saskia enviará notificação através do e-mail cadastrado ou por meio de aviso no sistema.</p>

    <!-- 15. FORO E LEGISLAÇÃO APLICÁVEL -->
    <h2>15. FORO E LEGISLAÇÃO APLICÁVEL</h2>
    <p>A presente Política de Privacidade é regida pelas leis da República Federativa do Brasil, em especial pela Lei nº 13.709/2018 (Lei Geral de Proteção de Dados). Fica eleito o foro da comarca de Fortaleza, Estado do Ceará, para dirimir quaisquer questões decorrentes desta Política, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>

    <!-- 16. ACEITAÇÃO -->
    <h2>16. ACEITAÇÃO DA POLÍTICA</h2>
    <p>Ao utilizar o sistema Saskia Saúde Integrada, o usuário declara ter lido e compreendido esta Política de Privacidade, concordando com os termos e condições aqui estabelecidos.</p>
    <p>Se você não concordar com qualquer disposição desta Política, por favor, não utilize nossos serviços e entre em contato conosco para esclarecimentos.</p>

    <!-- GLOSSÁRIO -->
    <div class="glossario">
        <h3><i class="las la-book"></i> Glossário de Termos Técnicos</h3>
        <p><strong>ANPD:</strong> Autoridade Nacional de Proteção de Dados - órgão da administração pública federal responsável por fiscalizar e aplicar a LGPD.</p>
        <p><strong>CPF:</strong> Cadastro de Pessoas Físicas - número de registro de cidadãos brasileiros perante a Receita Federal.</p>
        <p><strong>CRM:</strong> Conselho Regional de Medicina - órgão de fiscalização profissional dos médicos.</p>
        <p><strong>COREN:</strong> Conselho Regional de Enfermagem - órgão de fiscalização profissional dos enfermeiros.</p>
        <p><strong>DPO:</strong> Data Protection Officer - Encarregado pela proteção de dados pessoais.</p>
        <p><strong>LGPD:</strong> Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).</p>
        <p><strong>IP:</strong> Internet Protocol - identificador numérico atribuído a dispositivos em uma rede de computadores.</p>
        <p><strong>Prontuário Eletrônico:</strong> Registro digital das informações clínicas do paciente.</p>
    </div>

    <!-- CONTATO -->
    <div class="contato-privacidade">
        <i class="las la-shield-alt" style="font-size: 32px;"></i>
        <h3>Dúvidas sobre Privacidade?</h3>
        <p>Entre em contato com nosso Encarregado de Proteção de Dados (DPO):</p>
        <p><strong>📧 E-mail:</strong> <a href="mailto:privacidade@saskia.com.br">privacidade@saskia.com.br</a> | <a href="mailto:dpo@saskia.com.br">dpo@saskia.com.br</a></p>
        <p><strong>📞 Telefone/WhatsApp:</strong> (85) 9 98228864</p>
        <p><strong>📍 Endereço:</strong> R. Azevedo Bolão, 1369 - Parquelândia, Fortaleza - CE, CEP: 60455-610</p>
        <p><small>Esta Política de Privacidade foi atualizada pela última vez em 02 de maio de 2026.</small></p>
    </div>

</div>

</div>` }} 
        />
    );
}
