import type { Metadata } from 'next';
import Link from 'next/link';
import './politicas-privacidade.css';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Saskia Saúde',
  description: 'Como o sistema Saskia trata dados pessoais. Texto em revisão jurídica.',
};

// Página pública (fora de (auth)): o titular dos dados precisa poder ler sem ter login.
export default function PoliticaPrivacidadePage() {
  return (
    <div className="pp-pagina">
      <div className="pp-topo"><Link href="/">Voltar ao acesso ao sistema</Link></div>
      <article className="pp-doc">
        <h1>Política de Privacidade</h1>
        <p className="pp-meta">Versão preliminar. Sujeita à Lei nº 13.709/2018 (LGPD).</p>

        <div className="pp-aviso" role="note">
          <p>
            <strong>Este texto depende de revisão jurídica antes de valer como documento oficial.</strong>{' '}
            Papéis de controlador e operador, bases legais, prazos e canais de contato ainda serão definidos com o
            advogado ou encarregado (DPO) e com cada hospital contratante.
          </p>
        </div>

        <h2>1. Sobre este documento</h2>
        <p>
          Descreve, de forma resumida, quais dados o sistema Saskia trata e para quê. O sistema é usado por hospitais e
          clínicas; cada instituição define como usa o sistema com seus pacientes e profissionais.
        </p>

        <h2>2. Dados tratados</h2>
        <ul>
          <li>Cadastro de pacientes: identificação, contato, data de nascimento e dados de atendimento.</li>
          <li>Dados de saúde, que a LGPD classifica como sensíveis: triagem, sinais vitais, evoluções, prescrições, exames, internações e óbitos.</li>
          <li>Dados de profissionais: nome, e-mail institucional, cargo e foto de perfil, quando enviada.</li>
          <li>Registros de uso: ações administrativas relevantes ficam em trilha de auditoria associada ao usuário.</li>
        </ul>

        <h2>3. Para que os dados são usados</h2>
        <p>
          Para registrar e acompanhar o atendimento, organizar agenda, prescrições e exames, apoiar a gestão do hospital e
          manter a segurança do acesso. A base legal de cada finalidade será definida na revisão jurídica.
        </p>

        <h2>4. Quem acessa</h2>
        <p>
          O acesso é restrito a usuários autenticados de cada hospital e depende do cargo. Dados de um hospital não são
          exibidos a usuários de outro. Dados são compartilhados com terceiros apenas quando houver obrigação legal ou
          contrato com prestadores de infraestrutura, a ser detalhado na versão final.
        </p>

        <h2>5. Segurança</h2>
        <ul>
          <li>Acesso por e-mail e senha, com bloqueio temporário após várias tentativas incorretas.</li>
          <li>Senhas armazenadas em formato protegido (hash), nunca em texto legível.</li>
          <li>Permissões por cargo aplicadas no servidor.</li>
        </ul>
        <p>
          Medidas adicionais de infraestrutura (local de hospedagem, criptografia em repouso, cópias de segurança e prazos
          de retenção) dependem da operação de cada instalação e serão descritas após validação técnica.
        </p>

        <h2>6. Direitos do titular</h2>
        <p>
          A LGPD garante ao titular, entre outros direitos, confirmação do tratamento, acesso, correção, anonimização ou
          eliminação, portabilidade e informação sobre compartilhamento. Para exercê-los, procure o hospital que o atendeu
          ou o encarregado de dados indicado por ele.
        </p>

        <h2>7. Contato</h2>
        <p>Canal oficial de privacidade e encarregado (DPO): <strong>a definir</strong>.</p>

        <h2>8. Alterações</h2>
        <p>Este documento será atualizado conforme a revisão jurídica e mudanças no sistema.</p>
      </article>
    </div>
  );
}
