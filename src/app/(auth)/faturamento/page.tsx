import './faturamento.css';

export default function FaturamentoPage() {
  return (
    <main className="page-content faturamento-page" aria-labelledby="faturamento-title">
      <header className="page-header">
        <div className="header-left">
          <h2 id="faturamento-title"><i className="las la-file-invoice-dollar" aria-hidden="true" /> Faturamento</h2>
          <p>Gestão de contas médicas, guias TISS e recebimentos</p>
        </div>
      </header>
      <section className="card faturamento-notice" role="status">
        <h3>Recurso indisponível</h3>
        <p>O faturamento ainda não possui integração com um serviço persistente. A criação e a progressão de guias foram desativadas para evitar dados fictícios ou alterações que existiriam somente durante esta sessão.</p>
        <p>Nenhum dado de paciente ou financeiro está sendo exibido nesta tela.</p>
      </section>
    </main>
  );
}
