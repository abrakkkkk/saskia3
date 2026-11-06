'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { estadoApos, minutosTrabalhados, normalizarTipo, PROXIMOS } from '@/lib/ponto';
import { PageHeader, StatGrid, StatCard, Tabs, Panel, Badge, SearchInput, EmptyState, LoadingState, ErrorState, type Tone } from '@/components/ui';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import './ponto.css';

const ABAS = [
  { id: 'hoje', label: 'Hoje', icon: 'las la-calendar-day' },
  { id: 'historico', label: 'Histórico', icon: 'las la-history' },
  { id: 'expediente', label: 'Expediente', icon: 'las la-business-time' },
] as const;

interface RegistroPonto {
  id: string;
  data: string;
  hora: string;
  tipo: string;
  profissional: string;
  usuarioId: string;
  timestamp: number;
}

export default function PontoPage() {
  const { data: session, status: sessionStatus } = useSession();
  
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [horaAtual, setHoraAtual] = useState('');
  const [dataAtual, setDataAtual] = useState('');
  const [tabAtiva, setTabAtiva] = useState<(typeof ABAS)[number]['id']>('hoje');
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [agoraMs, setAgoraMs] = useState(0);
  const [carregandoRegistros, setCarregandoRegistros] = useState(true);
  const [dadosCarregados, setDadosCarregados] = useState(false);

  // Filtros Histórico
  const [busca, setBusca] = useState('');
  const [mesFiltro, setMesFiltro] = useState('todos');

  const getNomeProfissional = () => {
    const usuario = session?.user;
    return usuario?.name || 'Profissional Desconhecido';
  };

  const fetchRegistros = useCallback(async () => {
    setCarregandoRegistros(true);
    try {
      const res = await fetch('/api/pontoregistro');
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Não foi possível carregar os registros de ponto.');
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('A resposta do servidor de ponto é inválida.');
      setErroApi('');
      const mapped = data.flatMap((r: { id?: unknown; dataHora?: unknown; tipo?: unknown; usuario?: { id?: unknown; nome?: unknown } } | null) => {
          const dt = new Date(r?.dataHora as string);
          if (!r || typeof r.id !== 'string' || typeof r.usuario?.id !== 'string'
            || typeof r.tipo !== 'string' || Number.isNaN(dt.getTime())) return [];
          const tipoNormalizado = normalizarTipo(r.tipo) ?? r.tipo.toLocaleUpperCase('pt-BR');
          return [{
            id: r.id,
            data: dt.toLocaleDateString('pt-BR'),
            hora: dt.toLocaleTimeString('pt-BR'),
            tipo: tipoNormalizado,
            profissional: typeof r.usuario.nome === 'string' ? r.usuario.nome : 'Profissional',
            usuarioId: r.usuario.id,
            timestamp: dt.getTime()
          }];
        });
        setRegistros(mapped);
      setDadosCarregados(true);
    } catch (error) {
      setDadosCarregados(false);
      setErroApi(error instanceof Error ? error.message : 'Não foi possível carregar os registros de ponto. Tente novamente.');
    } finally {
      setCarregandoRegistros(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated') void Promise.resolve().then(() => { fetchRegistros(); });
  }, [sessionStatus, fetchRegistros]);

  useEffect(() => {
    const atualizarRelogio = () => {
      const agora = new Date();
      setAgoraMs(agora.getTime());
      setHoraAtual(agora.toLocaleTimeString('pt-BR'));
      setDataAtual(agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    atualizarRelogio();
    const interval = setInterval(atualizarRelogio, 1000);
    return () => clearInterval(interval);
  }, []);

  const registrar = async (tipo: string) => {
    if (salvando || carregandoRegistros || !dadosCarregados) return;
    setSalvando(true);
    setErroApi('');
    try {
      const res = await fetch('/api/pontoregistro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'O servidor não confirmou o registro de ponto.');
      }
      await fetchRegistros();
      alert('Registro de ponto confirmado pelo servidor com sucesso.');
    } catch (error) {
      setErroApi(error instanceof Error ? error.message : 'Falha ao registrar o ponto.');
    } finally {
      setSalvando(false);
    }
  };

  // Status computation
  const hojeStr = new Date().toLocaleDateString('pt-BR');
  const profissionalLogado = getNomeProfissional();
  
  const usuarioId = session?.user?.id;
  const registrosHoje = registros.filter(r => r.data === hojeStr && r.usuarioId === usuarioId);
  
  // Estado vem do ÚLTIMO registro do usuário, não do dia: plantão noturno continua "em jornada" após a meia-noite.
  const meus = registros.filter(r => r.usuarioId === usuarioId).sort((a, b) => a.timestamp - b.timestamp);
  const ultimoRegistro = meus.at(-1);
  const estado = estadoApos(ultimoRegistro?.tipo);
  const permitidos = PROXIMOS[estado];
  const btnEntradaDisabled = !permitidos.includes('ENTRADA');
  const btnSaidaDisabled = !permitidos.includes('SAÍDA');
  const btnInicioIntervaloDisabled = !permitidos.includes('INÍCIO INTERVALO');
  const btnFimIntervaloDisabled = !permitidos.includes('FIM INTERVALO');
  const temSaida = estado === 'FORA' && ultimoRegistro?.tipo === 'SAÍDA';
  let statusTexto = estado === 'FORA' ? (temSaida ? 'Jornada encerrada' : 'Jornada não iniciada') : estado === 'EM_INTERVALO' ? 'Em intervalo' : 'Em jornada';
  if (!dadosCarregados) {
    statusTexto = carregandoRegistros ? 'Carregando status...' : 'Status indisponível';
  }
  // Cards Hoje
  const indiceEntrada = meus.map(r => r.tipo).lastIndexOf('ENTRADA');
  const jornadaAtual = indiceEntrada >= 0 ? meus.slice(indiceEntrada) : [];
  const regEntrada = jornadaAtual[0];
  const regSaida = jornadaAtual.find(r => r.tipo === 'SAÍDA');
  const minutosJornada = minutosTrabalhados(jornadaAtual, estado === 'FORA' || !agoraMs ? undefined : agoraMs);
  const horasTrabalhadas = String(Math.floor(minutosJornada / 60)).padStart(2, '0') + ':' + String(minutosJornada % 60).padStart(2, '0');
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();
  const diasTrabalhadosMes = [...new Set(registros.filter(r => {
    const data = new Date(r.timestamp);
    return r.usuarioId === usuarioId && r.tipo === 'ENTRADA'
      && data.getMonth() + 1 === mesAtual && data.getFullYear() === anoAtual;
  }).map(r => r.data))].length;

  // Render Histórico
  let historicoFiltrado = registros.filter(r => r.usuarioId === usuarioId);
  if (mesFiltro !== 'todos') {
    historicoFiltrado = historicoFiltrado.filter(r => parseInt(r.data.split('/')[1]) === parseInt(mesFiltro));
  }
  if (busca) {
    const b = busca.toLowerCase();
    historicoFiltrado = historicoFiltrado.filter(r => r.data.includes(b) || r.tipo.toLowerCase().includes(b));
  }

  // Resumo Mês (Expediente)
  const regMes = registros.filter(r => {
    const p = r.data.split('/');
    return parseInt(p[1]) === mesAtual && parseInt(p[2]) === anoAtual && r.usuarioId === usuarioId;
  });

  const diasMes = [...new Set(regMes.filter(r => r.tipo === 'ENTRADA').map(r => r.data))];
  const totalIntervalos = regMes.filter(r => r.tipo === 'INÍCIO INTERVALO').length;
  const totalMin = minutosTrabalhados([...regMes].sort((a, b) => a.timestamp - b.timestamp));
  const expHorasStr = String(Math.floor(totalMin / 60)).padStart(2,'0') + ':' + String(totalMin % 60).padStart(2,'0');

  const getBadgeTone = (tipo: string): Tone => {
    if (tipo === 'ENTRADA') return 'success';
    if (tipo === 'SAÍDA') return 'danger';
    if (tipo.includes('INTERVALO')) return 'warning';
    return 'info';
  };
  const rotuloTipo = (tipo: string) => {
    const rotulos: Record<string, string> = { 'ENTRADA': 'Entrada', 'SAÍDA': 'Saída', 'INÍCIO INTERVALO': 'Início do intervalo', 'FIM INTERVALO': 'Fim do intervalo' };
    return rotulos[tipo] ?? tipo;
  };
  const toneStatus: Tone = estado === 'FORA' ? 'neutral' : estado === 'EM_INTERVALO' ? 'warning' : 'success';
  const bloqueado = salvando || carregandoRegistros || !dadosCarregados;

  const imprimirRelatorioPonto = () => {
    const janela = window.open('','_blank');
    if (!janela) return;
    const escaparHtml = (valor: string) => valor.replace(/[&<>"']/g, caractere => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caractere] || caractere);
    janela.document.write(`
      <html><head><title>Relatório de Ponto</title>
      <style>body{font-family:Arial;padding:30px;}table{width:100%;border-collapse:collapse;}th{background:#0f172a;color:white;padding:10px;}td{padding:8px;border-bottom:1px solid #ddd;}h2{color:#0a1f44;}</style>
      </head><body>
      <h2>Relatório de Ponto</h2>
      <p><strong>Profissional:</strong> ${escaparHtml(profissionalLogado)}</p>
      <table><thead><tr><th>Data</th><th>Hora</th><th>Tipo</th></tr></thead><tbody>
      ${registros.filter(r => r.usuarioId === usuarioId).slice(0,200).map(r => `<tr><td>${escaparHtml(r.data)}</td><td>${escaparHtml(r.hora)}</td><td>${escaparHtml(r.tipo)}</td></tr>`).join('')}
      </tbody></table></body></html>
    `);
    janela.document.close();
    janela.print();
  };

  return (
    <div className="mod-pagina">
      <PageHeader icon="las la-clock" title="Meu ponto" subtitle="Registro interno de entradas, intervalos e saídas. Não substitui o ponto oficial da instituição." />

      {erroApi && (
        <div className="mod-aviso mod-aviso-erro" role="alert">
          {erroApi}{' '}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void fetchRegistros()} disabled={carregandoRegistros}>Tentar novamente</button>
        </div>
      )}

      <Panel>
        <div className="pt-relogio">
          <div className="pt-hora" aria-label="Hora atual">{horaAtual || '00:00:00'}</div>
          <div className="pt-data">{dataAtual || 'Carregando...'}</div>
          <div role="status" aria-live="polite">
            <Badge tone={dadosCarregados ? toneStatus : 'neutral'}>{statusTexto}</Badge>
          </div>
        </div>
        <div className="pt-acoes">
          <button type="button" className="btn btn-success pt-acao" disabled={btnEntradaDisabled || bloqueado} onClick={() => registrar('ENTRADA')}>
            <i className="las la-sign-in-alt" aria-hidden="true"></i> Entrada
          </button>
          <button type="button" className="btn btn-warning pt-acao" disabled={btnInicioIntervaloDisabled || bloqueado} onClick={() => registrar('INÍCIO INTERVALO')}>
            <i className="las la-coffee" aria-hidden="true"></i> Início do intervalo
          </button>
          <button type="button" className="btn btn-info pt-acao" disabled={btnFimIntervaloDisabled || bloqueado} onClick={() => registrar('FIM INTERVALO')}>
            <i className="las la-undo-alt" aria-hidden="true"></i> Fim do intervalo
          </button>
          <button type="button" className="btn btn-danger pt-acao" disabled={btnSaidaDisabled || bloqueado} onClick={() => registrar('SAÍDA')}>
            <i className="las la-sign-out-alt" aria-hidden="true"></i> Saída
          </button>
        </div>
      </Panel>

      <StatGrid>
        <StatCard icon="las la-sign-in-alt" value={regEntrada ? regEntrada.hora : '--:--'} label="Entrada da jornada" />
        <StatCard icon="las la-sign-out-alt" value={regSaida ? regSaida.hora : '--:--'} label="Saída da jornada" />
        <StatCard icon="las la-hourglass-half" value={horasTrabalhadas} label="Horas na jornada" />
        <StatCard icon="las la-calendar-check" value={diasTrabalhadosMes} label="Dias no mês" />
      </StatGrid>

      <Tabs label="Seções do ponto" tabs={ABAS} active={tabAtiva} onChange={setTabAtiva} />

      {tabAtiva === 'hoje' && (
        !dadosCarregados ? (
          carregandoRegistros ? <LoadingState message="Carregando registros..." /> : <ErrorState message="Registros indisponíveis. Tente novamente." onRetry={() => void fetchRegistros()} />
        ) : registrosHoje.length === 0 ? (
          <EmptyState icon="las la-clock" message="Nenhum registro hoje." />
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr><th>Hora</th><th>Tipo</th><th>Profissional</th></tr>
              </thead>
              <tbody>
                {[...registrosHoje].reverse().map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.hora}</strong></td>
                    <td>{rotuloTipo(r.tipo)}</td>
                    <td>{r.profissional}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tabAtiva === 'historico' && (
        <div>
          <div className="ux-barra">
            <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por data ou tipo" label="Buscar no histórico por data ou tipo" />
            <div className="form-group">
              <select aria-label="Filtrar histórico por mês" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}>
                <option value="todos">Todos os meses</option>
                <option value="1">Janeiro</option><option value="2">Fevereiro</option>
                <option value="3">Março</option><option value="4">Abril</option>
                <option value="5">Maio</option><option value="6">Junho</option>
                <option value="7">Julho</option><option value="8">Agosto</option>
                <option value="9">Setembro</option><option value="10">Outubro</option>
                <option value="11">Novembro</option><option value="12">Dezembro</option>
              </select>
            </div>
          </div>

          {historicoFiltrado.length === 0 ? (
            <EmptyState icon="las la-history" message="Nenhum registro encontrado." />
          ) : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr><th>Data</th><th>Hora</th><th>Tipo</th><th>Profissional</th></tr>
                </thead>
                <tbody>
                  {historicoFiltrado.slice(0, 100).map(r => (
                    <tr key={r.id}>
                      <td>{r.data}</td>
                      <td><strong>{r.hora}</strong></td>
                      <td><Badge tone={getBadgeTone(r.tipo)}>{rotuloTipo(r.tipo)}</Badge></td>
                      <td>{r.profissional}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tabAtiva === 'expediente' && (
        <Panel
          title={`Resumo do mês (${new Date().toLocaleString('pt-BR', {month: 'long'})})`}
          icon="las la-user-clock"
          actions={<button type="button" className="btn btn-secondary btn-sm" onClick={imprimirRelatorioPonto}><i className="las la-print" aria-hidden="true"></i> Imprimir relatório</button>}
        >
          <dl className="pt-resumo">
            <div><dt>Dias</dt><dd>{diasMes.length}</dd></div>
            <div><dt>Horas</dt><dd>{expHorasStr}</dd></div>
            <div><dt>Intervalos</dt><dd>{totalIntervalos}</dd></div>
          </dl>
        </Panel>
      )}
    </div>
  );
}
