'use client';

import { useEffect, useId, useState } from 'react';
import '@/components/ui/busca.css';

export type MedicamentoCatalogo = {
  id: string; produto: string; substancia: string; apresentacao: string; laboratorio: string;
  tipo: string | null; tarja: string | null; classe: string | null; rename: boolean;
};

/** Busca no catálogo CMED/ANVISA. Escolher um item insere nome, substância e apresentação no editor da prescrição. */
export default function BuscaMedicamento({ rotulo, onEscolher }: { rotulo: string; onEscolher: (m: MedicamentoCatalogo) => void }) {
  const [termo, setTermo] = useState('');
  const [lista, setLista] = useState<MedicamentoCatalogo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const id = useId();

  useEffect(() => {
    const t = termo.trim();
    if (t.length < 2) return;
    let ativo = true;
    const espera = setTimeout(async () => {
      setCarregando(true);
      try {
        const r = await fetch(`/api/medicamentos?q=${encodeURIComponent(t)}`);
        const dados = await r.json();
        if (!r.ok) throw new Error(dados.error || 'Não foi possível buscar.');
        if (ativo) { setLista(Array.isArray(dados) ? dados : []); setErro(''); }
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Erro na busca.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }, 300);
    return () => { ativo = false; clearTimeout(espera); };
  }, [termo]);

  const controlado = (tarja: string | null) => !!tarja && /preta/i.test(tarja);
  // Com menos de 2 letras a lista e os avisos somem, mesmo que o último resultado ainda esteja em memória.
  const buscando = termo.trim().length >= 2;

  return (
    <div className="rec-busca-med hide-on-print">
      <label htmlFor={`${id}-busca`} className="rec-busca-rotulo">{rotulo}</label>
      <input
        id={`${id}-busca`}
        type="search"
        autoComplete="off"
        placeholder="Buscar medicamento por nome ou substância (catálogo ANVISA/CMED)"
        value={termo}
        onChange={e => setTermo(e.target.value)}
        aria-controls={`${id}-lista`}
      />
      {buscando && carregando && <p className="mod-nota" role="status">Buscando…</p>}
      {buscando && erro && <p className="mod-aviso mod-aviso-erro" role="alert">{erro}</p>}
      {buscando && !carregando && !erro && lista.length === 0 && <p className="mod-nota" role="status">Nada encontrado. Você pode digitar a prescrição à mão no campo abaixo.</p>}
      {buscando && lista.length > 0 && (
        <ul id={`${id}-lista`} className="rec-busca-lista" aria-label="Resultados do catálogo de medicamentos">
          {lista.map(m => (
            <li key={m.id}>
              <button type="button" onClick={() => { onEscolher(m); setTermo(''); setLista([]); }}>
                <strong>{m.produto}</strong> <span className="rec-busca-subst">({m.substancia})</span>
                <span className="rec-busca-apres">{m.apresentacao} · {m.laboratorio}</span>
                {(m.tipo || m.tarja) && (
                  <span className="rec-busca-marcas">
                    {m.tipo && <em>{m.tipo}</em>}
                    {m.tarja && <em className={controlado(m.tarja) ? 'rec-busca-controlado' : ''}>{m.tarja}</em>}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
