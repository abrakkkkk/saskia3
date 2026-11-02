'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { isTerminal } from '@/lib/paciente-status';
import './paciente-select.css';

export type PacienteOpcao = {
  id: string;
  nome: string;
  cpf?: string | null;
  nascimento?: string | null;
  status?: string | null;
};

function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function formatarNascimento(valor?: string | null) {
  if (!valor) return 'nasc. não informado';
  const [ano, mes, dia] = valor.slice(0, 10).split('-');
  return dia && mes && ano ? `nasc. ${dia}/${mes}/${ano}` : 'nasc. não informado';
}

export function cpfParcial(cpf?: string | null) {
  const digitos = (cpf ?? '').replace(/\D/g, '');
  return digitos.length === 11 ? `CPF ***.${digitos.slice(3, 6)}.***-**` : 'CPF não informado';
}

export function identificacaoPaciente(paciente: PacienteOpcao) {
  return `${paciente.nome} | ${formatarNascimento(paciente.nascimento)} | ${cpfParcial(paciente.cpf)}`;
}

/**
 * Seleção de paciente com dois identificadores (nome + nascimento/CPF parcial).
 * Não oferece pacientes com óbito registrado; arquivados já não vêm de /api/pacientes.
 */
export default function PacienteSelect({ value, onChange, label = 'Paciente', required = false, disabled = false }: {
  value: string;
  onChange: (id: string, paciente: PacienteOpcao | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const [pacientes, setPacientes] = useState<PacienteOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const resposta = await fetch('/api/pacientes');
        if (!resposta.ok) throw new Error('Não foi possível carregar os pacientes.');
        const dados: unknown = await resposta.json();
        if (!Array.isArray(dados)) throw new Error('Resposta inválida ao carregar os pacientes.');
        if (!ativo) return;
        setPacientes((dados as PacienteOpcao[]).filter(paciente => !isTerminal(paciente.status)));
        setErro('');
      } catch (falha) {
        if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os pacientes.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [tentativa]);

  const selecionado = pacientes.find(paciente => paciente.id === value) ?? null;

  const opcoes = useMemo(() => {
    const termo = semAcento(busca.trim());
    const digitos = busca.replace(/\D/g, '');
    const filtrados = !termo ? pacientes : pacientes.filter(paciente =>
      semAcento(paciente.nome).includes(termo)
      || (digitos.length >= 3 && (paciente.cpf ?? '').replace(/\D/g, '').includes(digitos)));
    return [...filtrados].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [pacientes, busca]);

  // O paciente já escolhido continua na lista mesmo fora do filtro, para o select não trocar de valor sozinho.
  const lista = selecionado && !opcoes.some(paciente => paciente.id === selecionado.id) ? [selecionado, ...opcoes] : opcoes;

  return (
    <div className="form-group pac-select">
      <label htmlFor={id}>{label}{required ? ' *' : ''}</label>
      {erro ? (
        <div className="pac-select-erro" role="alert">
          <span>{erro}</span>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => { setErro(''); setCarregando(true); setTentativa(n => n + 1); }}>Tentar novamente</button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={busca}
            onChange={evento => setBusca(evento.target.value)}
            placeholder="Filtrar por nome ou CPF"
            aria-label={`Filtrar lista: ${label}`}
            disabled={disabled || carregando}
          />
          <select
            id={id}
            value={value}
            required={required}
            disabled={disabled || carregando}
            onChange={evento => {
              const paciente = pacientes.find(item => item.id === evento.target.value) ?? null;
              onChange(evento.target.value, paciente);
            }}
          >
            <option value="">{carregando ? 'Carregando...' : lista.length === 0 ? 'Nenhum paciente encontrado' : 'Selecione...'}</option>
            {lista.map(paciente => (
              <option key={paciente.id} value={paciente.id}>{identificacaoPaciente(paciente)}</option>
            ))}
          </select>
        </>
      )}
      {selecionado && (
        <p className="pac-select-identificacao">
          <strong>{selecionado.nome}</strong>
          <span>{formatarNascimento(selecionado.nascimento)}</span>
          <span>{cpfParcial(selecionado.cpf)}</span>
        </p>
      )}
    </div>
  );
}
