export default function ConfiguracoesPage() {
  return (
    <main className="page-content" aria-labelledby="configuracoes-title">
      <header className="page-header">
        <div className="header-left">
          <h2 id="configuracoes-title"><i className="las la-cog" aria-hidden="true" /> Configurações do Sistema</h2>
          <p>Dados da unidade, permissões, integrações e regras de faturamento</p>
        </div>
      </header>
      <section className="card" role="status" style={{ padding: 24 }}>
        <h3>Configurações administrativas indisponíveis</h3>
        <p>Essas opções ainda não estão conectadas ao cadastro persistente da unidade nem a controles administrativos no servidor. A edição está desativada para evitar salvar dados fictícios somente neste navegador ou sugerir que integrações e permissões estejam efetivamente configuradas.</p>
        <p>As preferências da unidade devem ser configuradas pelo fluxo administrativo autorizado quando estiver disponível.</p>
      </section>
    </main>
  );
}
