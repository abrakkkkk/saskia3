import './financeiro.css';

export default function AdminFinanceiroPage() {
  return (
    <main className="conteudo" aria-labelledby="financeiro-title">
      <section className="fin-container">
        <div className="banner-fin">
          <div>
            <h1 id="financeiro-title"><i className="las la-coins" aria-hidden="true" /> Painel Financeiro</h1>
            <p>Faturas, contas, guias, glosas, SUS e documentos fiscais.</p>
          </div>
        </div>
        <section className="finance-unavailable" aria-labelledby="finance-unavailable-title">
          <h2 id="finance-unavailable-title">Recurso indisponível</h2>
          <p>Este painel ainda não está conectado a um serviço financeiro persistente. Para evitar registrar pagamentos, guias ou documentos fiscais apenas neste navegador, as operações estão desativadas.</p>
          <p>Nenhum dado financeiro foi carregado ou alterado nesta tela.</p>
        </section>
      </section>
    </main>
  );
}
