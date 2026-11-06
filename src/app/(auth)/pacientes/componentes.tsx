'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { useCallSystem } from '@/contexts/CallContext';
import { cpfValido, STATUS_ESPERA, STATUS_TOM } from '@/lib/utils';
import '@/components/ui/modulo.css';
import './pacientes.css';

export function useCargo(): string | undefined {
  const { data } = useSession();
  return data?.user?.cargo;
}

/** Relógio de baixa frequência para os indicadores de espera. */
export function useAgora(intervaloMs = 60000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(timer);
  }, [intervaloMs]);
  return agora;
}

export async function erroDaApi(res: Response, padrao: string) {
  const corpo: unknown = await res.json().catch(() => null);
  return corpo && typeof corpo === 'object' && 'error' in corpo && typeof corpo.error === 'string' ? corpo.error : padrao;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TOM[status] ?? 'neutral'}>{status}</Badge>;
}

// Tempo-alvo de primeiro atendimento da escala Manchester (minutos). Sem classificação, 60 min.
const ALVO_ESPERA_MIN: Record<string, number> = { Vermelho: 0, Laranja: 10, Amarelo: 60, Verde: 120, Azul: 240 };
const ALVO_SEM_CLASSIFICACAO_MIN = 60;

function minutosDesde(desde: string, agora: number) {
  return Math.max(0, Math.floor((agora - new Date(desde).getTime()) / 60000));
}

function textoEspera(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h ${String(minutos % 60).padStart(2, '0')}min`;
  return `${Math.floor(horas / 24)}d ${horas % 24}h`;
}

type DadosEspera = { status: string; esperaDesde?: string | null; classificacao?: string | null };

/** Verdadeiro quando o paciente aguarda além do tempo-alvo da sua classificação. */
export function acimaDoAlvo(p: DadosEspera, agora: number) {
  if (!STATUS_ESPERA.includes(p.status) || !p.esperaDesde) return false;
  return minutosDesde(p.esperaDesde, agora) > (ALVO_ESPERA_MIN[p.classificacao ?? ''] ?? ALVO_SEM_CLASSIFICACAO_MIN);
}

/** Tempo de espera em fonte tabular. Passou do tempo-alvo: negrito, ícone e texto de apoio (não depende só de cor). */
export function Espera({ status, desde, classificacao, agora }: {
  status: string;
  desde?: string | null;
  classificacao?: string | null;
  agora: number;
}) {
  if (!STATUS_ESPERA.includes(status) || !desde) {
    return <span className="pac-espera pac-espera-nenhuma" aria-label="Sem espera em curso">-</span>;
  }
  const minutos = minutosDesde(desde, agora);
  const alvo = ALVO_ESPERA_MIN[classificacao ?? ''] ?? ALVO_SEM_CLASSIFICACAO_MIN;
  const longa = acimaDoAlvo({ status, esperaDesde: desde, classificacao }, agora);
  return (
    <span className={`pac-espera${longa ? ' pac-espera-longa' : ''}`} title={longa ? `Acima do tempo-alvo de ${alvo} min` : undefined}>
      {longa && <i className="las la-exclamation-circle" aria-hidden="true"></i>}
      {textoEspera(minutos)}
      {longa && <span className="sr-only"> (acima do tempo-alvo)</span>}
    </span>
  );
}

export const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const FORM_VAZIO = {
  nome: '', cpf: '', rg: '', nascimento: '', sexo: '', telefone: '', email: '', endereco: '',
  mae: '', convenio: '', tipoSanguineo: '', alergias: '', status: 'Recepção', queixaPrincipal: '',
};

export function ModalNovoPaciente({ permitirInternacao = false, onFechar, onCriado }: {
  permitirInternacao?: boolean;
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [naoIdentificado, setNaoIdentificado] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const campo = (chave: keyof typeof FORM_VAZIO) => ({
    value: form[chave],
    onChange: (e: { target: { value: string } }) => setForm(atual => ({ ...atual, [chave]: e.target.value })),
  });

  const alternarNaoIdentificado = (marcado: boolean) => {
    setNaoIdentificado(marcado);
    const carimbo = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    setForm(atual => ({ ...atual, nome: marcado ? `Desconhecido ${carimbo}` : '' }));
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (salvando) return;
    if (form.cpf.trim() && !cpfValido(form.cpf)) {
      setErro('CPF inválido: confira os dígitos ou deixe em branco.');
      return;
    }
    setErro('');
    setSalvando(true);
    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setErro(await erroDaApi(res, 'Erro ao cadastrar paciente.'));
        return;
      }
      onCriado();
    } catch {
      setErro('Falha de conexão: o paciente não foi cadastrado.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      size="lg"
      title={<><i className="las la-user-plus" aria-hidden="true"></i> Novo paciente</>}
      closeLabel="Fechar cadastro"
      onClose={onFechar}
    >
      <form onSubmit={enviar}>
        {erro && <p className="mod-aviso mod-aviso-erro" role="alert">{erro}</p>}
        <label className="pac-check">
          <input type="checkbox" checked={naoIdentificado} onChange={e => alternarNaoIdentificado(e.target.checked)} />
          Paciente não identificado
        </label>
        <div className="mod-form-grid">
          <div className="form-group mod-largo">
            <label htmlFor="novo-nome">Nome completo *</label>
            <input id="novo-nome" required maxLength={160} placeholder="Nome ou Desconhecido" {...campo('nome')} />
          </div>
          <div className="form-group"><label htmlFor="novo-cpf">CPF</label><input id="novo-cpf" maxLength={20} inputMode="numeric" placeholder="000.000.000-00" {...campo('cpf')} /></div>
          <div className="form-group"><label htmlFor="novo-rg">RG</label><input id="novo-rg" maxLength={30} {...campo('rg')} /></div>
          <div className="form-group"><label htmlFor="novo-nascimento">Nascimento</label><input id="novo-nascimento" type="date" {...campo('nascimento')} /></div>
          <div className="form-group">
            <label htmlFor="novo-sexo">Sexo</label>
            <select id="novo-sexo" {...campo('sexo')}>
              <option value="">Não informado</option><option>Masculino</option><option>Feminino</option><option>Outro</option>
            </select>
          </div>
          <div className="form-group"><label htmlFor="novo-telefone">Telefone</label><input id="novo-telefone" type="tel" maxLength={40} placeholder="(00) 00000-0000" {...campo('telefone')} /></div>
          <div className="form-group"><label htmlFor="novo-email">E-mail</label><input id="novo-email" type="email" maxLength={254} {...campo('email')} /></div>
          <div className="form-group mod-largo"><label htmlFor="novo-endereco">Endereço</label><input id="novo-endereco" maxLength={300} {...campo('endereco')} /></div>
          <div className="form-group"><label htmlFor="novo-mae">Nome da mãe</label><input id="novo-mae" maxLength={160} {...campo('mae')} /></div>
          <div className="form-group"><label htmlFor="novo-convenio">Convênio</label><input id="novo-convenio" maxLength={120} {...campo('convenio')} /></div>
          <div className="form-group">
            <label htmlFor="novo-tipo">Tipo sanguíneo</label>
            <select id="novo-tipo" {...campo('tipoSanguineo')}>
              <option value="">Desconhecido</option>
              {TIPOS_SANGUINEOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group"><label htmlFor="novo-alergias">Alergias</label><input id="novo-alergias" maxLength={2000} placeholder="Em branco = não avaliado" {...campo('alergias')} /></div>
          {permitirInternacao && (
            <div className="form-group">
              <label htmlFor="novo-status">Status de entrada</label>
              <select id="novo-status" {...campo('status')}>
                <option value="Recepção">Recepção</option>
                <option value="Internado">Internação direta</option>
              </select>
            </div>
          )}
          <div className="form-group mod-largo"><label htmlFor="novo-queixa">Queixa principal</label><input id="novo-queixa" maxLength={2000} {...campo('queixaPrincipal')} /></div>
        </div>
        <ModalActions>
          <button type="button" className="btn btn-secondary" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar cadastro'}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

type Sala = { id?: string; nome: string; setor?: string | null; andar?: string | null; status?: string };

export function ModalChamada({ paciente, onFechar }: { paciente: { id: string; nome: string; status: string }; onFechar: () => void }) {
  const { chamarPaciente } = useCallSystem();
  const [consultorio, setConsultorio] = useState('');
  const [salas, setSalas] = useState<Sala[]>([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch('/api/salas', { signal: controller.signal });
        if (!res.ok) return;
        const dados: unknown = await res.json();
        if (Array.isArray(dados)) setSalas(dados as Sala[]);
      } catch {
        // Sem lista de salas, o local continua podendo ser digitado.
      }
    })();
    return () => controller.abort();
  }, []);

  const chamar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setErro('');
    const resultado = await chamarPaciente({ pacienteId: paciente.id, nome: paciente.nome, consultorio: consultorio.trim(), status: paciente.status });
    setEnviando(false);
    if (resultado.ok) onFechar();
    else setErro(resultado.erro);
  };

  return (
    <Modal size="sm" title="Chamar no painel" closeLabel="Fechar chamada" onClose={onFechar}>
      <form onSubmit={chamar}>
        <p className="pac-margem">Para onde <strong>{paciente.nome}</strong> deve se dirigir?</p>
        {erro && <p className="mod-aviso mod-aviso-erro" role="alert">{erro}</p>}
        <div className="form-group">
          <label htmlFor="chamada-local">Local *</label>
          <input id="chamada-local" required maxLength={120} value={consultorio} onChange={e => setConsultorio(e.target.value)} placeholder="Digite ou escolha abaixo" />
        </div>
        {salas.length > 0 && (
          <div className="pac-salas">
            {salas.map(s => (
              <button key={s.id ?? s.nome} type="button" className="pac-sala" aria-pressed={consultorio === s.nome} onClick={() => setConsultorio(s.nome)}>
                <span><strong>{s.nome}</strong><span className="pac-sub">{[s.setor, s.andar].filter(Boolean).join(' - ')}</span></span>
                <span className="pac-sub">{s.status === 'livre' ? 'Livre' : 'Em uso'}</span>
              </button>
            ))}
          </div>
        )}
        <ModalActions>
          <button type="button" className="btn btn-secondary" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={enviando}><i className="las la-bullhorn" aria-hidden="true"></i> {enviando ? 'Chamando...' : 'Chamar'}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}
