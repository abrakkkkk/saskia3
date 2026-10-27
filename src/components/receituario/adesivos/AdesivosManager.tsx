'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { todosAdesivos, type Adesivo } from './catalog';

type AdesivoBandeja = Pick<Adesivo, 'pasta' | 'arquivo' | 'nome'> & { qtd: number };

type AdesivosManagerProps = {
  mostrarGerador: boolean;
  modalAberto: boolean;
  onModalAbertoChange: (aberto: boolean) => void;
  onInsertText: (text: string) => void;
  onInsertSticker: (adesivo: Adesivo) => void;
};

const categorias = [
  { id: 'todos', label: 'Todos', icon: 'las la-list-ul' },
  { id: 'combinados', label: 'Combinados', icon: 'las la-puzzle-piece' },
  { id: 'motivo', label: 'Motivos', icon: 'las la-question-circle' },
  { id: 'viauso', label: 'Vias ADM', icon: 'las la-syringe' },
] as const;

function StickerTabs({
  categoria,
  onChange,
}: {
  categoria: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="modal-tabs">
      {categorias.map(item => (
        <button
          className={`modal-tab ${categoria === item.id ? 'ativo' : ''}`}
          key={item.id}
          onClick={() => onChange(item.id)}
          type="button"
        >
          <i className={item.icon} aria-hidden="true" /> {item.label}
        </button>
      ))}
    </div>
  );
}

function StickerGrid({
  stickers,
  onSelect,
}: {
  stickers: Adesivo[];
  onSelect: (adesivo: Adesivo) => void;
}) {
  return (
    <div className="adesivos-grid">
      {stickers.map(adesivo => (
        <button
          className="adesivo-item"
          key={`${adesivo.pasta}/${adesivo.arquivo}`}
          onClick={() => onSelect(adesivo)}
          type="button"
        >
          <img
            src={`/adesivos/${adesivo.pasta}/${adesivo.arquivo}`}
            alt={adesivo.nome}
            onError={event => {
              event.currentTarget.style.display = 'none';
              event.currentTarget.nextElementSibling?.setAttribute(
                'style',
                'display:block;font-size:48px;color:#1e3a8a;margin-bottom:8px;',
              );
            }}
          />
          <i className={adesivo.icone} aria-hidden="true" style={{ display: 'none' }} />
          <span>{adesivo.nome}</span>
        </button>
      ))}
    </div>
  );
}

export default function AdesivosManager({
  mostrarGerador,
  modalAberto,
  onModalAbertoChange,
  onInsertText,
  onInsertSticker,
}: AdesivosManagerProps) {
  const [categoria, setCategoria] = useState('todos');
  const [bandeja, setBandeja] = useState<AdesivoBandeja[]>([]);
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!modalAberto) return;
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onModalAbertoChange(false);
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [modalAberto, onModalAbertoChange]);

  const adesivosFiltrados = useMemo(
    () => categoria === 'todos'
      ? todosAdesivos
      : todosAdesivos.filter(adesivo => adesivo.categoria === categoria),
    [categoria],
  );

  const adicionarNaBandeja = (adesivo: Adesivo) => {
    setBandeja(current => {
      const existingIndex = current.findIndex(item => (
        item.pasta === adesivo.pasta && item.arquivo === adesivo.arquivo
      ));
      if (existingIndex < 0) return [...current, { ...adesivo, qtd: 1 }];
      return current.map((item, index) => index === existingIndex
        ? { ...item, qtd: item.qtd + 1 }
        : item);
    });
  };

  const alterarQuantidade = (index: number, delta: number) => {
    setBandeja(current => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, qtd: Math.max(1, item.qtd + delta) } : item
    )));
  };

  const imprimirCartela = () => {
    if (bandeja.length === 0) {
      window.alert('Adicione adesivos à bandeja para imprimir.');
      return;
    }

    setImprimindo(true);
    window.setTimeout(() => {
      document.body.dataset.printMode = 'stickers';
      window.print();
      window.setTimeout(() => {
        delete document.body.dataset.printMode;
        setImprimindo(false);
      }, 500);
    }, 200);
  };

  const printSheet = imprimindo && typeof document !== 'undefined'
    ? createPortal(
        <div className="print-adesivos-container">
          {bandeja.flatMap((adesivo, index) => (
            Array.from({ length: adesivo.qtd }, (_, copyIndex) => (
              <div className="print-adesivo-item" key={`${index}-${copyIndex}`}>
                <img src={`/adesivos/${adesivo.pasta}/${adesivo.arquivo}`} alt={adesivo.nome} />
                <span>{adesivo.nome}</span>
              </div>
            ))
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {mostrarGerador && <section className="papel-receita adesivos-manager" aria-labelledby="adesivos-title">
        <h2 id="adesivos-title"><i className="las la-tag" aria-hidden="true" /> Gerador de Adesivos</h2>
        <p className="adesivos-description">Selecione os adesivos para montar uma cartela de impressão.</p>

        <StickerTabs categoria={categoria} onChange={setCategoria} />
        <div className="adesivos-catalogo">
          <StickerGrid stickers={adesivosFiltrados} onSelect={adicionarNaBandeja} />
        </div>

        <div className="bandeja-adesivos">
          <h3><i className="las la-inbox" aria-hidden="true" /> Bandeja de Impressão</h3>
          {bandeja.length === 0 ? (
            <p className="adesivos-empty">Nenhum adesivo selecionado.</p>
          ) : (
            <div className="adesivos-tray-list">
              {bandeja.map((adesivo, index) => (
                <div className="adesivo-bandeja-item" key={`${adesivo.pasta}/${adesivo.arquivo}`}>
                  <div className="adesivo-bandeja-identidade">
                    <img src={`/adesivos/${adesivo.pasta}/${adesivo.arquivo}`} alt="" />
                    <span>{adesivo.nome}</span>
                  </div>
                  <div className="adesivo-bandeja-acoes">
                    <div className="adesivo-quantidade" aria-label={`Quantidade de ${adesivo.nome}`}>
                      <button onClick={() => alterarQuantidade(index, -1)} type="button" aria-label={`Diminuir ${adesivo.nome}`}>−</button>
                      <span aria-live="polite">{adesivo.qtd}</span>
                      <button onClick={() => alterarQuantidade(index, 1)} type="button" aria-label={`Aumentar ${adesivo.nome}`}>+</button>
                    </div>
                    <button
                      className="adesivo-remover"
                      onClick={() => setBandeja(current => current.filter((_, itemIndex) => itemIndex !== index))}
                      type="button"
                      aria-label={`Remover ${adesivo.nome}`}
                    >
                      <i className="las la-trash" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="cta-button" onClick={imprimirCartela} disabled={bandeja.length === 0} type="button">
            <i className="las la-print" aria-hidden="true" /> Imprimir Cartela de Adesivos
          </button>
        </div>
      </section>}

      {modalAberto && (
        <div
          className="modal-adesivos"
          style={{ display: 'flex' }}
          onClick={event => {
            if (event.target === event.currentTarget) onModalAbertoChange(false);
          }}
          role="presentation"
        >
          <section className="modal-content" role="dialog" aria-modal="true" aria-labelledby="adesivos-modal-title">
            <div className="modal-header">
              <span id="adesivos-modal-title"><i className="las la-smile" aria-hidden="true" /> Inserir Elemento Visual</span>
              <button onClick={() => onModalAbertoChange(false)} type="button" aria-label="Fechar">&times;</button>
            </div>
            <div className="modal-body">
              <div className="acesso-rapido">
                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'mg', 'ml', 'h', ' '].map(value => (
                  <button className="acesso-numero" key={value || 'space'} onClick={() => onInsertText(value)} type="button">
                    {value === ' ' ? 'Espaço' : value}
                  </button>
                ))}
              </div>
              <StickerTabs categoria={categoria} onChange={setCategoria} />
              <StickerGrid
                stickers={adesivosFiltrados}
                onSelect={adesivo => {
                  onInsertSticker(adesivo);
                  onModalAbertoChange(false);
                }}
              />
            </div>
          </section>
        </div>
      )}

      {printSheet}
    </>
  );
}
