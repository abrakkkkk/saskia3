'use client';
import { getSessionUser } from '@/lib/session';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import './ponto.css';

interface RegistroPonto {
  data: string;
  hora: string;
  tipo: string;
  profissional: string;
  timestamp: number;
}

export default function PontoPage() {
  const { data: session } = useSession();
  
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [horaAtual, setHoraAtual] = useState('');
  const [dataAtual, setDataAtual] = useState('');
  const [tabAtiva, setTabAtiva] = useState('hoje');

  // Filtros Histórico
  const [busca, setBusca] = useState('');
  const [mesFiltro, setMesFiltro] = useState('todos');

  // Load
  useEffect(() => {
    fetchRegistros();

    const interval = setInterval(() => {
      const agora = new Date();
      setHoraAtual(agora.toLocaleTimeString('pt-BR'));
      setDataAtual(agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getHospitalId = () => {
    const u = JSON.stringify(getSessionUser());
    const usuario = session?.user || (u ? JSON.parse(u) : null);
    return usuario?.hospitalId || 'hospital_001';
  };

  const getNomeProfissional = () => {
    const u = JSON.stringify(getSessionUser());
    const usuario = session?.user || (u ? JSON.parse(u) : null);
    return usuario?.name || usuario?.nome || 'Profissional Desconhecido';
  };

  const fetchRegistros = () => {
    try {
      const hid = getHospitalId();
      fetch(`/api/pontoregistro?hospitalId=${hid}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Map db object to UI model
            const mapped = data.map(r => {
              const dt = new Date(r.dataHora);
              return {
                data: dt.toLocaleDateString('pt-BR'),
                hora: dt.toLocaleTimeString('pt-BR'),
                tipo: r.tipo,
                profissional: r.usuario?.nome || 'Profissional',
                timestamp: dt.getTime()
              }
            });
            setRegistros(mapped);
          }
        });
    } catch(e) {}
  };

  const registrar = (tipo: string) => {
    const profissional = getNomeProfissional();
    const hid = getHospitalId();
    
    const agora = new Date();
    const novoRegistro: RegistroPonto = {
      data: agora.toLocaleDateString('pt-BR'),
      hora: agora.toLocaleTimeString('pt-BR'),
      tipo,
      profissional,
      timestamp: agora.getTime()
    };

    const novosRegistros = [...registros, novoRegistro];
    setRegistros(novosRegistros);

    const u = JSON.stringify(getSessionUser());
    const sess = session?.user || (u ? JSON.parse(u) : null);

    fetch('/api/pontoregistro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalId: hid,
        usuarioId: sess?.id || 'usuario_anonimo',
        tipo,
        dataHora: agora.toISOString()
      })
    }).catch(console.error);

    const msgs: Record<string, string> = {
      'ENTRADA': '✅ ENTRADA REGISTRADA! 💪',
      'SAÍDA': '👋 SAÍDA REGISTRADA! 🏠',
      'INÍCIO INTERVALO': '☕ INTERVALO INICIADO!',
      'FIM INTERVALO': '🔄 INTERVALO FINALIZADO!'
    };
    alert(msgs[tipo] || 'Registro efetuado!');
  };

  // Status computation
  const hojeStr = new Date().toLocaleDateString('pt-BR');
  const profissionalLogado = getNomeProfissional();
  
  const registrosHoje = registros.filter(r => r.data === hojeStr && r.profissional === profissionalLogado);
  
  const temEntrada = registrosHoje.some(r => r.tipo === 'ENTRADA');
  const temSaida = registrosHoje.some(r => r.tipo === 'SAÍDA');
  const temInicioIntervalo = registrosHoje.some(r => r.tipo === 'INÍCIO INTERVALO');
  const temFimIntervalo = registrosHoje.some(r => r.tipo === 'FIM INTERVALO');
  const emIntervalo = temInicioIntervalo && !temFimIntervalo;

  let btnEntradaDisabled = true;
  let btnSaidaDisabled = true;
  let btnInicioIntervaloDisabled = true;
  let btnFimIntervaloDisabled = true;
  let statusTexto = '';
  let statusClasse = 'status-ponto status-finalizado';

  if (!temEntrada) {
    btnEntradaDisabled = false;
    statusTexto = 'Jornada não iniciada';
  } else if (temEntrada && temSaida) {
    statusTexto = 'Jornada concluída';
  } else if (emIntervalo) {
    btnFimIntervaloDisabled = false;
    statusClasse = 'status-ponto status-intervalo';
    statusTexto = 'Em intervalo';
  } else {
    // Trabalhando
    btnSaidaDisabled = false;
    btnInicioIntervaloDisabled = false;
    statusClasse = 'status-ponto status-trabalhando';
    statusTexto = 'Em jornada';
  }

  // Cards Hoje
  const regEntrada = registrosHoje.find(r => r.tipo === 'ENTRADA');
  const regSaida = registrosHoje.find(r => r.tipo === 'SAÍDA');
  let horasTrabalhadas = '00:00';

  if (regEntrada && regSaida) {
    const diff = new Date(regSaida.timestamp).getTime() - new Date(regEntrada.timestamp).getTime();
    horasTrabalhadas = String(Math.floor(diff/3600000)).padStart(2,'0') + ':' + String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
  }

  const diasTrabalhadosMes = [...new Set(registros.filter(r => r.profissional === profissionalLogado && r.tipo === 'ENTRADA').map(r => r.data))].length;

  // Render Histórico
  let historicoFiltrado = registros.filter(r => r.profissional === profissionalLogado).reverse();
  if (mesFiltro !== 'todos') {
    historicoFiltrado = historicoFiltrado.filter(r => parseInt(r.data.split('/')[1]) === parseInt(mesFiltro));
  }
  if (busca) {
    const b = busca.toLowerCase();
    historicoFiltrado = historicoFiltrado.filter(r => r.data.includes(b) || r.tipo.toLowerCase().includes(b));
  }

  // Resumo Mês (Expediente)
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();
  const regMes = registros.filter(r => {
    const p = r.data.split('/');
    return parseInt(p[1]) === mesAtual && parseInt(p[2]) === anoAtual && r.profissional === profissionalLogado;
  });

  const diasMes = [...new Set(regMes.filter(r => r.tipo === 'ENTRADA').map(r => r.data))];
  const totalIntervalos = regMes.filter(r => r.tipo === 'INÍCIO INTERVALO').length;
  let totalMin = 0;
  
  diasMes.forEach(data => {
    const entradas = regMes.filter(r => r.data === data && r.tipo === 'ENTRADA');
    const saidas = regMes.filter(r => r.data === data && r.tipo === 'SAÍDA');
    entradas.forEach((e, i) => {
      if (saidas[i]) {
        totalMin += (new Date(saidas[i].timestamp).getTime() - new Date(e.timestamp).getTime()) / 60000;
      }
    });
  });
  const expHorasStr = String(Math.floor(totalMin/60)).padStart(2,'0') + ':' + String(Math.floor(totalMin%60)).padStart(2,'0');

  const getBadgeClass = (tipo: string) => {
    if (tipo === 'ENTRADA') return 'badge-success';
    if (tipo === 'SAÍDA') return 'badge-danger';
    if (tipo.includes('INTERVALO')) return 'badge-warning';
    return 'badge-info';
  };

  const imprimirRelatorioPonto = () => {
    const janela = window.open('','_blank');
    if (!janela) return;
    janela.document.write(`
      <html><head><title>Relatório de Ponto</title>
      <style>body{font-family:Arial;padding:30px;}table{width:100%;border-collapse:collapse;}th{background:#0f172a;color:white;padding:10px;}td{padding:8px;border-bottom:1px solid #ddd;}h2{color:#0a1f44;}</style>
      </head><body>
      <h2>Relatório de Ponto</h2>
      <p><strong>Profissional:</strong> ${profissionalLogado}</p>
      <table><thead><tr><th>Data</th><th>Hora</th><th>Tipo</th></tr></thead><tbody>
      ${registros.filter(r => r.profissional === profissionalLogado).reverse().slice(0,200).map(r => `<tr><td>${r.data}</td><td>${r.hora}</td><td>${r.tipo}</td></tr>`).join('')}
      </tbody></table></body></html>
    `);
    janela.document.close();
    janela.print();
  };

  return (
    <div className="conteudo">
      <div className="ponto-container">
        <div className="banner-ponto">
          <div>
            <h1><i className="las la-clock"></i> Registro de Ponto Eletrônico</h1>
            <p>Controle de jornada de trabalho</p>
          </div>
        </div>

        <div className="relogio-secao">
          <div className="relogio-digital">{horaAtual || '00:00:00'}</div>
          <div className="data-completa">{dataAtual || 'Carregando...'}</div>
          
          <div className={statusClasse}>
            <i className={`las ${temEntrada && temSaida ? 'la-check-circle' : 'la-circle'}`}></i> 
            <span>{statusTexto}</span>
          </div>
          
          <div className="ponto-botoes">
            <button className="btn-ponto-acao btn-entrada" disabled={btnEntradaDisabled} onClick={() => registrar('ENTRADA')}>
              <i className="las la-sign-in-alt"></i><span>ENTRADA</span>
            </button>
            <button className="btn-ponto-acao btn-inicio-intervalo" disabled={btnInicioIntervaloDisabled} onClick={() => registrar('INÍCIO INTERVALO')}>
              <i className="las la-coffee"></i><span>INTERVALO</span>
            </button>
            <button className="btn-ponto-acao btn-fim-intervalo" disabled={btnFimIntervaloDisabled} onClick={() => registrar('FIM INTERVALO')}>
              <i className="las la-undo-alt"></i><span>FIM INTERVALO</span>
            </button>
            <button className="btn-ponto-acao btn-saida" disabled={btnSaidaDisabled} onClick={() => registrar('SAÍDA')}>
              <i className="las la-sign-out-alt"></i><span>SAÍDA</span>
            </button>
          </div>
        </div>

        <div className="status-cards">
          <div className="status-card">
            <div className="card-icon" style={{color:'#16a34a'}}><i className="las la-sign-in-alt"></i></div>
            <div className="card-numero">{regEntrada ? regEntrada.hora : '--:--'}</div>
            <div className="card-label">Entrada Hoje</div>
          </div>
          <div className="status-card">
            <div className="card-icon" style={{color:'#dc2626'}}><i className="las la-sign-out-alt"></i></div>
            <div className="card-numero">{regSaida ? regSaida.hora : '--:--'}</div>
            <div className="card-label">Saída Hoje</div>
          </div>
          <div className="status-card">
            <div className="card-icon" style={{color:'#f59e0b'}}><i className="las la-hourglass-half"></i></div>
            <div className="card-numero">{horasTrabalhadas}</div>
            <div className="card-label">Horas Hoje</div>
          </div>
          <div className="status-card">
            <div className="card-icon" style={{color:'#1e3a8a'}}><i className="las la-calendar-check"></i></div>
            <div className="card-numero">{diasTrabalhadosMes}</div>
            <div className="card-label">Dias no Mês</div>
          </div>
        </div>

        <div className="tabs-ponto">
          <button className={`tab-btn ${tabAtiva === 'hoje' ? 'ativo' : ''}`} onClick={() => setTabAtiva('hoje')}>
            <i className="las la-calendar-day"></i> Hoje
          </button>
          <button className={`tab-btn ${tabAtiva === 'historico' ? 'ativo' : ''}`} onClick={() => setTabAtiva('historico')}>
            <i className="las la-history"></i> Histórico
          </button>
          <button className={`tab-btn ${tabAtiva === 'expediente' ? 'ativo' : ''}`} onClick={() => setTabAtiva('expediente')}>
            <i className="las la-business-time"></i> Expediente
          </button>
        </div>

        {tabAtiva === 'hoje' && (
          <div className="tabela-wrapper">
            <table className="tabela-ponto">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Tipo</th>
                  <th>Profissional</th>
                </tr>
              </thead>
              <tbody>
                {registrosHoje.length === 0 ? (
                  <tr><td colSpan={3} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhum registro hoje</td></tr>
                ) : (
                  [...registrosHoje].reverse().map((r, i) => {
                    const icones: Record<string, string> = {
                      'ENTRADA': '🟢', 'SAÍDA': '🔴', 'INÍCIO INTERVALO': '🟡', 'FIM INTERVALO': '🔵'
                    };
                    return (
                      <tr key={i}>
                        <td><strong>{r.hora}</strong></td>
                        <td>{icones[r.tipo] || ''} {r.tipo}</td>
                        <td>{r.profissional}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {tabAtiva === 'historico' && (
          <div>
            <div className="search-box">
              <input type="text" placeholder="Buscar por data ou tipo..." value={busca} onChange={e => setBusca(e.target.value)} />
              <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}>
                <option value="todos">Todos os meses</option>
                <option value="1">Janeiro</option><option value="2">Fevereiro</option>
                <option value="3">Março</option><option value="4">Abril</option>
                <option value="5">Maio</option><option value="6">Junho</option>
                <option value="7">Julho</option><option value="8">Agosto</option>
                <option value="9">Setembro</option><option value="10">Outubro</option>
                <option value="11">Novembro</option><option value="12">Dezembro</option>
              </select>
            </div>
            
            <div className="tabela-wrapper">
              <table className="tabela-ponto">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Profissional</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoFiltrado.length === 0 ? (
                    <tr><td colSpan={4} style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhum registro encontrado</td></tr>
                  ) : (
                    historicoFiltrado.slice(0, 100).map((r, i) => (
                      <tr key={i}>
                        <td>{r.data}</td>
                        <td><strong>{r.hora}</strong></td>
                        <td><span className={`badge ${getBadgeClass(r.tipo)}`}>{r.tipo}</span></td>
                        <td>{r.profissional}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tabAtiva === 'expediente' && (
          <div>
            <div className="expediente-card">
              <h4><i className="las la-user-clock"></i> Resumo do Mês ({new Date().toLocaleString('pt-BR', {month: 'long'})})</h4>
              <p><strong>Dias:</strong> <span>{diasMes.length}</span></p>
              <p><strong>Horas:</strong> <span>{expHorasStr}</span></p>
              <p><strong>Intervalos:</strong> <span>{totalIntervalos}</span></p>
            </div>
            
            <button className="btn-imprimir" onClick={imprimirRelatorioPonto}>
              <i className="las la-print"></i> Imprimir Relatório Completo
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
