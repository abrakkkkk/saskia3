'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, HeartPulse } from 'lucide-react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import '@/components/ui/modulo.css';
import './emergencia/emergencia.css';

type Tipo = 'PANICO' | 'PCR';

const TEXTO: Record<Tipo, { titulo: string; aviso: string }> = {
  PANICO: { titulo: 'Acionar o botão do pânico', aviso: 'Use quando algo muito grave acontecer no hospital. Todos os profissionais logados e o painel de TV serão avisados na hora.' },
  PCR: { titulo: 'Acionar alerta de PCR', aviso: 'Parada cardiorrespiratória. Todos os profissionais logados e o painel de TV serão avisados na hora.' },
};
const LOCAIS = ['Pronto atendimento', 'Recepção', 'Enfermaria', 'UTI', 'Centro cirúrgico', 'Farmácia', 'Corredor', 'Estacionamento'];

/** Botões de pânico e PCR no cabeçalho. Visíveis a todos os cargos; o Administrador pode desligá-los em Dashboard. */
export default function EmergencyButtons() {
  const [aberto, setAberto] = useState<Tipo | null>(null);
  const [local, setLocal] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [config, setConfig] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/config-dashboard').then(r => (r.ok ? r.json() : null)).then(d => { if (d && typeof d === 'object' && !Array.isArray(d)) setConfig(d); }).catch(() => {});
  }, []);

  function fechar() { setAberto(null); setLocal(''); setErro(''); }

  async function acionar(e: FormEvent) {
    e.preventDefault();
    if (!aberto) return;
    setEnviando(true);
    setErro('');
    try {
      const r = await fetch('/api/emergencias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: aberto, local }) });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        setErro(d?.error ?? 'Não foi possível acionar o alerta. Avise a equipe por outro meio.');
        return;
      }
      window.dispatchEvent(new Event('emergencia:atualizar'));
      fechar();
    } catch {
      setErro('Sem conexão: o alerta não foi enviado. Avise a equipe por outro meio.');
    } finally {
      setEnviando(false);
    }
  }

  const mostrarPanico = config.btn_panico !== false;
  const mostrarPcr = config.btn_pcr !== false;
  if (!mostrarPanico && !mostrarPcr) return null;

  return (
    <>
      <div className="header-emergencia">
        {mostrarPanico && (
          <button type="button" className="btn-emergencia btn-panico" onClick={() => setAberto('PANICO')} aria-label="Acionar botão do pânico">
            <AlertTriangle aria-hidden="true" /> <span className="emergencia-rotulo">Pânico</span>
          </button>
        )}
        {mostrarPcr && (
          <button type="button" className="btn-emergencia btn-pcr" onClick={() => setAberto('PCR')} aria-label="Acionar alerta de PCR">
            <HeartPulse aria-hidden="true" /> <span className="emergencia-rotulo">PCR</span>
          </button>
        )}
      </div>

      {aberto && (
        <Modal title={TEXTO[aberto].titulo} icon={aberto === 'PCR' ? 'las la-heartbeat' : 'las la-exclamation-triangle'} onClose={fechar} busy={enviando} size="sm">
          <form onSubmit={acionar}>
            <p className="emergencia-texto">{TEXTO[aberto].aviso}</p>
            <div className="form-group">
              <label htmlFor="emergencia-local">Local</label>
              <input id="emergencia-local" list="emergencia-locais" required maxLength={120} placeholder="Ex.: UTI, leito 3" value={local} onChange={e => setLocal(e.target.value)} autoComplete="off" />
              <datalist id="emergencia-locais">{LOCAIS.map(l => <option key={l} value={l} />)}</datalist>
            </div>
            {erro && <p role="alert" className="mod-aviso mod-aviso-erro">{erro}</p>}
            <ModalActions>
              <button type="button" className="btn btn-secondary" onClick={fechar} disabled={enviando}>Cancelar</button>
              <button type="submit" className={`btn ${aberto === 'PCR' ? 'btn-amarelo' : 'btn-danger'}`} disabled={enviando}>{enviando ? 'Acionando...' : 'Acionar agora'}</button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </>
  );
}
