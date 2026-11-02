'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui';
import { useCallSystem } from '@/contexts/CallContext';
import { cpfValido, formatarEspera, MANCHESTER_CORES, STATUS_ESPERA, STATUS_TOM } from '@/lib/utils';
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

export function ManchesterBadge({ classificacao }: { classificacao: string | null | undefined }) {
  const cor = classificacao ? MANCHESTER_CORES[classificacao] : undefined;
  if (!cor) return <Badge>Não classificado</Badge>;
  return (
    <span className="pac-manchester" style={{ background: cor.bg, color: cor.text, borderColor: cor.border }}>
      <span className="pac-dot" aria-hidden="true" style={{ background: cor.markerColor }} /> {classificacao}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TOM[status] ?? 'neutral'}>{status}</Badge>;
}

export function EsperaBadge({ status, desde, agora }: { status: string; desde?: string | null; agora: number }) {
  if (!STATUS_ESPERA.includes(status) || !desde) return null;
  return <span className="pac-sub"><i className="las la-clock" aria-hidden="true"></i> Espera: {formatarEspera(desde, agora)}</span>;
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
    <div className="pac-modal-fundo">
      <div className="pac-modal" role="dialog" aria-modal="true" aria-labelledby="pac-novo-titulo">
        <div className="pac-modal-topo">
          <h2 id="pac-novo-titulo"><i className="las la-user-plus" aria-hidden="true"></i> Novo paciente</h2>
          <button type="button" className="pac-icone-btn" aria-label="Fechar cadastro" onClick={onFechar}><i className="las la-times" aria-hidden="true"></i></button>
        </div>
        <form onSubmit={enviar}>
          {erro && <p className="pac-erro" role="alert">{erro}</p>}
          <label className="pac-check">
            <input type="checkbox" checked={naoIdentificado} onChange={e => alternarNaoIdentificado(e.target.checked)} />
            Paciente não identificado
          </label>
          <div className="pac-grade">
            <div className="form-group pac-inteira">
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
            <div className="form-group pac-inteira"><label htmlFor="novo-endereco">Endereço</label><input id="novo-endereco" maxLength={300} {...campo('endereco')} /></div>
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
            <div className="form-group pac-inteira"><label htmlFor="novo-queixa">Queixa principal</label><input id="novo-queixa" maxLength={2000} {...campo('queixaPrincipal')} /></div>
          </div>
          <div className="pac-rodape">
            <button type="button" className="btn pac-btn-sec" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar cadastro'}</button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="pac-modal-fundo">
      <div className="pac-modal pac-modal-estreito" role="dialog" aria-modal="true" aria-labelledby="pac-chamada-titulo">
        <div className="pac-modal-topo">
          <h2 id="pac-chamada-titulo">Chamar paciente no painel</h2>
          <button type="button" className="pac-icone-btn" aria-label="Fechar chamada" onClick={onFechar}><i className="las la-times" aria-hidden="true"></i></button>
        </div>
        <form onSubmit={chamar}>
          <p className="pac-margem">Para onde <strong>{paciente.nome}</strong> deve se dirigir?</p>
          {erro && <p className="pac-erro" role="alert">{erro}</p>}
          <div className="form-group">
            <label htmlFor="chamada-local">Local *</label>
            <input id="chamada-local" required maxLength={120} value={consultorio} onChange={e => setConsultorio(e.target.value)} placeholder="Digite ou selecione abaixo" />
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
          <div className="pac-rodape">
            <button type="button" className="btn pac-btn-sec" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={enviando}><i className="las la-bullhorn" aria-hidden="true"></i> {enviando ? 'Chamando...' : 'Chamar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
