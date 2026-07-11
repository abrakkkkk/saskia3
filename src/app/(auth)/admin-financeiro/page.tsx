'use client';
import { useState, useEffect } from 'react';
import './financeiro.css';

interface PagamentoInfo {
  data: string;
  forma: string;
  comprovante?: string;
}

interface Fatura {
  id: string;
  hospitalId: string;
  hospitalNome: string;
  plano: string;
  categoria: string;
  valor: number;
  vencimento: string;
  status: string;
  tipoInst: string;
  pagamento?: PagamentoInfo;
}

export default function AdminFinanceiroPage() {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [activeTab, setActiveTab] = useState<'faturas' | 'historico' | 'planos'>('faturas');
  
  // Filtros
  const [buscaFatura, setBuscaFatura] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [buscaHistorico, setBuscaHistorico] = useState('');

  useEffect(() => {
    try {
      let f: Fatura[] = JSON.parse(localStorage.getItem('saskiaFaturas') || '[]');
      
      // Auto-update status for past due invoices
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      let changed = false;
      
      f.forEach(fatura => {
        if (fatura.status === 'Pendente' && new Date(fatura.vencimento + 'T00:00:00') < hoje) {
          fatura.status = 'Vencido';
          changed = true;
        }
      });

      if (changed) {
        localStorage.setItem('saskiaFaturas', JSON.stringify(f));
      }

      setFaturas(f);
    } catch(e) {}
  }, []);

  // Estatísticas
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const totalFaturas = faturas.length;
  const pagasMes = faturas.filter(f => {
    if (f.status !== 'Pago' || !f.pagamento) return false;
    const d = new Date(f.pagamento.data + 'T00:00:00');
    return d.getMonth() + 1 === mesAtual && d.getFullYear() === anoAtual;
  }).length;
  
  const pendentes = faturas.filter(f => f.status === 'Pendente' || f.status === 'Vencido').length;
  
  const vencidas = faturas.filter(f => {
    if (f.status === 'Pago' || f.status === 'Cortesia') return false;
    return new Date(f.vencimento + 'T00:00:00') < new Date(new Date().toDateString());
  }).length;
  
  const receitaMes = faturas
    .filter(f => {
      if (f.status !== 'Pago' || !f.pagamento) return false;
      const d = new Date(f.pagamento.data + 'T00:00:00');
      return d.getMonth() + 1 === mesAtual && d.getFullYear() === anoAtual;
    })
    .reduce((sum, f) => sum + f.valor, 0);
    
  const hospitaisAtivos = new Set(faturas.filter(f => f.status === 'Pago' || f.status === 'Cortesia').map(f => f.hospitalId)).size;

  // Filtros de Listagem
  const getFaturasFiltradas = () => {
    let lista = [...faturas].reverse();
    if (filtroStatus !== 'todos') {
      lista = lista.filter(f => f.status === filtroStatus);
    }
    if (buscaFatura.trim()) {
      const termo = buscaFatura.toLowerCase();
      lista = lista.filter(f => f.hospitalNome.toLowerCase().includes(termo) || f.plano.toLowerCase().includes(termo));
    }
    return lista;
  };

  const getHistoricoFiltrado = () => {
    let lista = faturas.filter(f => f.pagamento).reverse();
    if (buscaHistorico.trim()) {
      const termo = buscaHistorico.toLowerCase();
      lista = lista.filter(f => f.hospitalNome.toLowerCase().includes(termo));
    }
    return lista;
  };

  const calcularDias = (vencimento: string) => {
    const venc = new Date(vencimento + "T00:00:00");
    const h = new Date();
    h.setHours(0,0,0,0);
    return Math.ceil((venc.getTime() - h.getTime()) / (1000 * 60 * 60 * 24));
  };

  const printRelatorio = () => {
    window.print();
  };

  return (
    <div className="conteudo">
      <div className="fin-container">
        
        <div className="banner-fin">
          <div>
            <h1><i className="las la-coins"></i> Painel Financeiro Global</h1>
            <p>Visualização de licenças, pagamentos e status de todos os hospitais da rede</p>
          </div>
          <div>
            <button className="btn btn-info" onClick={printRelatorio} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white' }}>
              <i className="las la-print"></i> Imprimir Relatório
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card azul">
            <div className="stat-icon"><i className="las la-file-invoice"></i></div>
            <div className="stat-valor">{totalFaturas}</div>
            <div className="stat-label">Total de Faturas</div>
          </div>
          <div className="stat-card verde">
            <div className="stat-icon"><i className="las la-check-circle"></i></div>
            <div className="stat-valor">{pagasMes}</div>
            <div className="stat-label">Pagas (Mês)</div>
          </div>
          <div className="stat-card amarelo">
            <div className="stat-icon"><i className="las la-clock"></i></div>
            <div className="stat-valor">{pendentes}</div>
            <div className="stat-label">Pendentes</div>
          </div>
          <div className="stat-card vermelho">
            <div className="stat-icon"><i className="las la-exclamation-triangle"></i></div>
            <div className="stat-valor">{vencidas}</div>
            <div className="stat-label">Vencidas</div>
          </div>
          <div className="stat-card verde">
            <div className="stat-icon"><i className="las la-money-bill"></i></div>
            <div className="stat-valor">R$ {receitaMes.toFixed(2)}</div>
            <div className="stat-label">Receita (Mês)</div>
          </div>
          <div className="stat-card azul">
            <div className="stat-icon"><i className="las la-building"></i></div>
            <div className="stat-valor">{hospitaisAtivos}</div>
            <div className="stat-label">Hospitais Ativos</div>
          </div>
        </div>

        <div className="tabs-fin">
          <button className={`tab-btn ${activeTab === 'faturas' ? 'ativo' : ''}`} onClick={() => setActiveTab('faturas')}>
            <i className="las la-file-invoice"></i> Gestão de Faturas
          </button>
          <button className={`tab-btn ${activeTab === 'historico' ? 'ativo' : ''}`} onClick={() => setActiveTab('historico')}>
            <i className="las la-history"></i> Histórico de Pagamentos
          </button>
          <button className={`tab-btn ${activeTab === 'planos' ? 'ativo' : ''}`} onClick={() => setActiveTab('planos')}>
            <i className="las la-tags"></i> Tabela de Planos
          </button>
        </div>

        {activeTab === 'faturas' && (
          <div className="tab-conteudo ativo">
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Buscar por hospital, plano..." 
                value={buscaFatura}
                onChange={e => setBuscaFatura(e.target.value)}
              />
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                <option value="todos">Todos os Status</option>
                <option value="Pago">✅ Pagos</option>
                <option value="Pendente">⏳ Pendentes</option>
                <option value="Vencido">❌ Vencidos</option>
                <option value="Cortesia">🎁 Cortesia/Filantrópico</option>
              </select>
            </div>
            
            <div className="tabela-wrapper">
              <table className="tabela-fin">
                <thead>
                  <tr>
                    <th>Fatura</th>
                    <th>Hospital</th>
                    <th>Plano</th>
                    <th>Categoria</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {getFaturasFiltradas().length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nenhuma fatura encontrada</td></tr>
                  ) : (
                    getFaturasFiltradas().map(f => {
                      const diasRestantes = calcularDias(f.vencimento);
                      let classeLinha = '';
                      if (f.status === 'Vencido' || (f.status === 'Pendente' && diasRestantes < 0)) classeLinha = 'vencido';
                      else if (f.status === 'Pendente' && diasRestantes <= 7) classeLinha = 'vencendo';

                      let badgeStatusClass = 'badge-pendente';
                      if (f.status === 'Pago') badgeStatusClass = 'badge-pago';
                      if (f.status === 'Cortesia') badgeStatusClass = 'badge-cortesia';
                      if (f.status === 'Vencido' || diasRestantes < 0) badgeStatusClass = 'badge-vencido';

                      let badgeTipoClass = 'badge-cortesia';
                      if (f.tipoInst === 'Privado') badgeTipoClass = 'badge-info';
                      if (f.tipoInst === 'Público') badgeTipoClass = 'badge-purple';

                      return (
                        <tr key={f.id} className={classeLinha}>
                          <td><strong>{f.id}</strong></td>
                          <td>{f.hospitalNome}</td>
                          <td>{f.plano}</td>
                          <td>{f.categoria}</td>
                          <td><strong>R$ {f.valor.toFixed(2)}</strong></td>
                          <td>
                            {new Date(f.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {f.status === 'Pendente' && diasRestantes >= 0 && (
                              <div style={{ fontSize: '11px', color: diasRestantes <= 7 ? '#dc2626' : '#16a34a', marginTop: '2px', fontWeight: 'bold' }}>
                                Vence em {diasRestantes} dia(s)
                              </div>
                            )}
                          </td>
                          <td><span className={`badge ${badgeStatusClass}`}>{f.status}</span></td>
                          <td><span className={`badge ${badgeTipoClass}`}>{f.tipoInst}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="tab-conteudo ativo">
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Buscar por hospital..." 
                value={buscaHistorico}
                onChange={e => setBuscaHistorico(e.target.value)}
              />
            </div>
            
            {getHistoricoFiltrado().length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <i className="las la-history" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
                <p style={{ margin: 0 }}>Nenhum pagamento registrado no histórico</p>
              </div>
            ) : (
              getHistoricoFiltrado().map(f => (
                <div key={f.id} className="historico-card pago">
                  <h4><i className="las la-check-circle" style={{ color: '#16a34a' }}></i> {f.hospitalNome} - {f.plano}</h4>
                  <p><strong>Fatura:</strong> {f.id} | <strong>Valor:</strong> R$ {f.valor.toFixed(2)} | <strong>Vencimento:</strong> {new Date(f.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  <p>
                    <strong>Pago em:</strong> {f.pagamento ? new Date(f.pagamento.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/D'} | 
                    <strong> Forma:</strong> {f.pagamento?.forma} | 
                    <strong> Comprovante:</strong> {f.pagamento?.comprovante || 'N/I'}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'planos' && (
          <div className="tab-conteudo ativo">
            <div className="planos-grid">
              <div className="plano-card basico">
                <div className="plano-icon"><i className="las la-hospital"></i></div>
                <h3>Plano Básico</h3>
                <p>Até 10 usuários<br/>Módulos essenciais<br/>Suporte por e-mail</p>
                <div className="plano-preco">R$ 299<span>/mês</span></div>
              </div>
              <div className="plano-card premium">
                <div className="plano-icon"><i className="las la-star"></i></div>
                <h3>Plano Premium ⭐</h3>
                <p>Até 50 usuários<br/>Todos os módulos<br/>Suporte prioritário</p>
                <div className="plano-preco">R$ 799<span>/mês</span></div>
              </div>
              <div className="plano-card enterprise">
                <div className="plano-icon"><i className="las la-crown"></i></div>
                <h3>Plano Enterprise</h3>
                <p>Usuários ilimitados<br/>Todos os módulos<br/>Suporte 24/7</p>
                <div className="plano-preco">R$ 1.499<span>/mês</span></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
