'use client';
import './planos.css';

export default function PlanosPage() {
  return (
    <div className="conteudo">
      <div className="container-planos">

        <div role="note" className="card" style={{ padding: 16, marginBottom: 16 }}>
          Valores e condições abaixo são apenas referências informativas e não configuram plano contratado, proposta comercial vigente ou cobrança do hospital.
        </div>
        <div className="banner-planos">
          <div className="icone-banner" aria-hidden="true"><i className="las la-tags"></i></div>
          <h1>Planos e Valores</h1>
          <p>Soluções sob medida para cada porte de instituição. Da prefeitura de uma pequena cidade à grande rede hospitalar privada.</p>
        </div>

        <div className="cards-destaque">
          <div className="card-destaque anual">
            <div className="icone-destaque" aria-hidden="true"><i className="las la-calendar-check"></i></div>
            <h4>Plano Anual com Desconto</h4>
            <p>Economize o equivalente a <strong>2 meses</strong> de mensalidade contratando o plano anual. Mesmo suporte, menor custo.</p>
          </div>
          <div className="card-destaque suporte">
            <div className="icone-destaque" aria-hidden="true"><i className="las la-headset"></i></div>
            <h4>Suporte 24/7</h4>
            <p>Adicione <strong>20% a 30%</strong> sobre a mensalidade para suporte VIP com atendimento prioritário por telefone e WhatsApp.</p>
          </div>
          <div className="card-destaque implementacao">
            <div className="icone-destaque" aria-hidden="true"><i className="las la-cogs"></i></div>
            <h4>Taxa de Implementação</h4>
            <p>Cobrada uma única vez. Inclui parametrização do sistema, treinamento da equipe e migração de dados.</p>
          </div>
        </div>

        <div className="secao-planos">
          <h2><i className="las la-landmark"></i> Prefeituras e Órgãos Públicos</h2>
          
          <div className="tabela-wrapper">
            <table className="tabela-planos" aria-label="Preços para prefeituras e órgãos públicos">
              <thead>
                <tr>
                  <th>Porte</th>
                  <th>Exemplos</th>
                  <th>Mensalidade</th>
                  <th>Anual (c/ desconto)</th>
                  <th>Implementação</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="tag-categoria tag-publico">Grandes Capitais</span></td>
                  <td>Fortaleza, São Paulo, Rio de Janeiro</td>
                  <td>R$ 5.000,00/mês</td>
                  <td>R$ 50.000,00</td>
                  <td>A partir de R$ 20.000,00</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-publico">Cidades Metropolitanas</span></td>
                  <td>Caucaia, Maracanaú, Guarulhos</td>
                  <td>R$ 3.500,00/mês</td>
                  <td>R$ 35.000,00</td>
                  <td>A partir de R$ 15.000,00</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-publico">Cidades de Médio Porte</span></td>
                  <td>Maranguape, Quixadá, Sobral</td>
                  <td>R$ 2.500,00/mês</td>
                  <td>R$ 25.000,00</td>
                  <td>A partir de R$ 12.000,00</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-publico">Cidades Pequenas</span></td>
                  <td>Paraipaba, São Gonçalo do Amarante</td>
                  <td>R$ 1.200,00/mês</td>
                  <td>R$ 12.000,00</td>
                  <td>A partir de R$ 6.000,00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="secao-planos">
          <h2><i className="las la-clinic-medical"></i> Clínicas e Consultórios</h2>
          
          <div className="tabela-wrapper">
            <table className="tabela-planos" aria-label="Preços para clínicas e consultórios">
              <thead>
                <tr>
                  <th>Porte</th>
                  <th>Exemplos</th>
                  <th>Mensalidade</th>
                  <th>Anual (c/ desconto)</th>
                  <th>Implementação</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="tag-categoria tag-privado">Consultório Individual</span></td>
                  <td>Médico, Dentista, Psicólogo, Nutricionista</td>
                  <td>R$ 149,00/mês</td>
                  <td>R$ 1.490,00</td>
                  <td>R$ 500,00</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-privado">Clínica Pequena</span></td>
                  <td>Até 5 profissionais</td>
                  <td>R$ 399,00/mês</td>
                  <td>R$ 3.990,00</td>
                  <td>R$ 1.500,00</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-privado">Clínica Média</span></td>
                  <td>De 6 a 20 profissionais</td>
                  <td>R$ 799,00/mês</td>
                  <td>R$ 7.990,00</td>
                  <td>R$ 3.000,00</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-privado">Policlínica / Centro</span></td>
                  <td>Mais de 20 profissionais</td>
                  <td>R$ 1.499,00/mês</td>
                  <td>R$ 14.990,00</td>
                  <td>R$ 5.000,00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="secao-planos">
          <h2><i className="las la-hospital"></i> Hospitais e Unidades Hospitalares</h2>
          
          <div className="tabela-wrapper">
            <table className="tabela-planos" aria-label="Preços para hospitais e unidades hospitalares">
              <thead>
                <tr>
                  <th>Porte</th>
                  <th>Exemplos</th>
                  <th>Mensalidade</th>
                  <th>Anual (c/ desconto)</th>
                  <th>Implementação</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="tag-categoria tag-privado">Pequeno Porte</span></td>
                  <td>Até 50 leitos</td>
                  <td>R$ 2.499,00/mês</td>
                  <td>R$ 24.990,00</td>
                  <td>A partir de R$ 8.000,00</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-privado">Médio Porte</span></td>
                  <td>De 51 a 150 leitos</td>
                  <td>R$ 3.999,00/mês</td>
                  <td>R$ 39.990,00</td>
                  <td>A partir de R$ 15.000,00</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-privado">Grande Porte</span></td>
                  <td>Acima de 150 leitos</td>
                  <td>R$ 5.999,00/mês</td>
                  <td>R$ 59.990,00</td>
                  <td>A partir de R$ 25.000,00</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-privado">Rede Hospitalar</span></td>
                  <td>Múltiplas unidades</td>
                  <td>Sob consulta</td>
                  <td>Sob consulta</td>
                  <td>Sob consulta</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="secao-planos">
          <h2><i className="las la-hand-holding-heart"></i> Instituições Filantrópicas</h2>
          
          <div className="tabela-wrapper">
            <table className="tabela-planos" aria-label="Preços para instituições filantrópicas">
              <thead>
                <tr>
                  <th>Porte</th>
                  <th>Exemplos</th>
                  <th>Mensalidade</th>
                  <th>Anual (c/ desconto)</th>
                  <th>Implementação</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="tag-categoria tag-filantropico">Pequeno Porte</span></td>
                  <td>Até 30 leitos</td>
                  <td>R$ 799,00/mês</td>
                  <td>R$ 7.990,00</td>
                  <td>R$ 2.000,00</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-filantropico">Médio Porte</span></td>
                  <td>De 31 a 100 leitos</td>
                  <td>R$ 1.499,00/mês</td>
                  <td>R$ 14.990,00</td>
                  <td>R$ 5.000,00</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-filantropico">Grande Porte</span></td>
                  <td>Acima de 100 leitos</td>
                  <td>R$ 2.499,00/mês</td>
                  <td>R$ 24.990,00</td>
                  <td>A partir de R$ 8.000,00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="secao-planos">
          <h2><i className="las la-headset"></i> Adicionais de Suporte</h2>
          
          <div className="tabela-wrapper">
            <table className="tabela-planos" aria-label="Adicionais de suporte e seus valores">
              <thead>
                <tr>
                  <th>Tipo de Suporte</th>
                  <th>Descrição</th>
                  <th>Canais</th>
                  <th>Valor (sobre a mensalidade)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="tag-categoria tag-publico">Suporte Básico</span></td>
                  <td>Horário comercial (8h às 18h)</td>
                  <td>E-mail e Chat</td>
                  <td>Incluso</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-privado">Suporte VIP 24x7</span></td>
                  <td>Atendimento prioritário 24 horas</td>
                  <td>Telefone e WhatsApp</td>
                  <td>+20% sobre a mensalidade</td>
                </tr>
                <tr>
                  <td><span className="tag-categoria tag-privado">Suporte Premium</span></td>
                  <td>Gestor dedicado + visitas trimestrais</td>
                  <td>Telefone, WhatsApp e Presencial</td>
                  <td>+30% sobre a mensalidade</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="observacoes">
          <h4><i className="las la-info-circle"></i> Observações Importantes</h4>
          <ul>
            <li><i className="las la-check-circle"></i> Valores baseados no mercado de licitações e contratos públicos.</li>
            <li><i className="las la-check-circle"></i> O preço final pode variar conforme número de módulos contratados, unidades de saúde e usuários.</li>
            <li><i className="las la-check-circle"></i> Para prefeituras, recomenda-se cadastro no portal de fornecedores e participação em pregões eletrônicos.</li>
            <li><i className="las la-check-circle"></i> Contratos abaixo de R$ 50 mil podem ser feitos por dispensa de licitação (Lei 14.133/2021).</li>
            <li><i className="las la-check-circle"></i> Instituições filantrópicas têm desconto especial de até 40% mediante comprovação.</li>
            <li><i className="las la-check-circle"></i> Todos os planos incluem hospedagem, manutenção e atualizações do sistema.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
