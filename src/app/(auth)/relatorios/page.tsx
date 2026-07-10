'use client';

export default function RelatoriosPage() {
  const ocupacaoUTI = 82; // %
  const metaCirurgias = 90; // %
  const satisfacao = 95; // %

  // Dados para o gráfico de barras
  const receitasMes = [
    { mes: 'Jan', valor: 45 },
    { mes: 'Fev', valor: 52 },
    { mes: 'Mar', valor: 48 },
    { mes: 'Abr', valor: 70 },
    { mes: 'Mai', valor: 65 },
    { mes: 'Jun', valor: 85 }
  ];
  const maxValor = Math.max(...receitasMes.map(r => r.valor));

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-chart-bar"></i> Relatórios & Analytics</h2>
          <p>Visão estratégica e Business Intelligence (BI)</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" style={{ background: '#475569' }}>
            <i className="las la-file-export"></i> Exportar PDF
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        {/* KPI 1 */}
        <div className="card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            TAXA DE OCUPAÇÃO UTI <i className="las la-bed text-blue-500" style={{ fontSize: '20px' }}></i>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>
            {ocupacaoUTI}%
          </div>
          <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${ocupacaoUTI}%`, background: ocupacaoUTI > 80 ? '#ef4444' : '#3b82f6', height: '100%' }}></div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            META DE CIRURGIAS <i className="las la-procedures text-green-500" style={{ fontSize: '20px' }}></i>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>
            {metaCirurgias}%
          </div>
          <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${metaCirurgias}%`, background: '#10b981', height: '100%' }}></div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            NPS PACIENTES <i className="las la-smile text-purple-500" style={{ fontSize: '20px' }}></i>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b' }}>
            {satisfacao}
          </div>
          <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${satisfacao}%`, background: '#8b5cf6', height: '100%' }}></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Gráfico de Barras em CSS */}
        <div className="card">
          <h3 style={{ marginBottom: '30px', fontSize: '18px', color: '#1e293b' }}>Faturamento Bruto (Últimos 6 meses)</h3>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '250px', gap: '15px', padding: '0 20px', borderBottom: '1px solid #e2e8f0' }}>
            {receitasMes.map(r => {
              const altura = (r.valor / maxValor) * 100;
              return (
                <div key={r.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{ opacity: 0, transition: 'opacity 0.3s' }} className="bar-tooltip">R$ {r.valor}k</div>
                  <div 
                    style={{ 
                      width: '100%', 
                      height: `${altura}%`, 
                      background: 'linear-gradient(to top, #3b82f6, #60a5fa)', 
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 1s ease-out'
                    }}
                  ></div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '10px' }}>{r.mes}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabela Resumo */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Convênios Top Faturamento</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {[
              { nome: 'Unimed Saúde', valor: 'R$ 1.2M', cor: '#10b981' },
              { nome: 'Bradesco Saúde', valor: 'R$ 800k', cor: '#ef4444' },
              { nome: 'Amil', valor: 'R$ 450k', cor: '#f59e0b' },
              { nome: 'SUS', valor: 'R$ 200k', cor: '#3b82f6' }
            ].map(c => (
              <div key={c.nome} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.cor }}></div>
                  <span style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>{c.nome}</span>
                </div>
                <span style={{ fontWeight: 800, color: '#1e293b' }}>{c.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
