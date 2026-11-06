'use client';
/* Os adesivos são arquivos estáticos pequenos de /public/adesivos; next/image não agrega aqui. */
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Panel } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
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
    <div className="rec-filtro-adesivos" role="group" aria-label="Categoria de adesivos">
      {categorias.map(item => (
        <button
          className="btn btn-secondary btn-sm"
          key={item.id}
          aria-pressed={categoria === item.id}
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
            onError={event => event.currentTarget.classList.add('adesivo-img-falhou')}
          />
          <i className={adesivo.icone} aria-hidden="true" />
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
      {mostrarGerador && (
        <Panel title="Gerador de adesivos" icon="las la-tag">
          <p className="mod-nota">Escolha os adesivos para montar uma cartela de impressão.</p>

          <StickerTabs categoria={categoria} onChange={setCategoria} />
          <div className="adesivos-catalogo">
            <StickerGrid stickers={adesivosFiltrados} onSelect={adicionarNaBandeja} />
          </div>

          <div className="bandeja-adesivos">
            <h3>Bandeja de impressão</h3>
            {bandeja.length === 0 ? (
              <p className="adesivos-empty">Nenhum adesivo escolhido.</p>
            ) : (
              <ul className="adesivos-tray-list">
                {bandeja.map((adesivo, index) => (
                  <li className="adesivo-bandeja-item" key={`${adesivo.pasta}/${adesivo.arquivo}`}>
                    <div className="adesivo-bandeja-identidade">
                      <img src={`/adesivos/${adesivo.pasta}/${adesivo.arquivo}`} alt="" />
                      <span>{adesivo.nome}</span>
                    </div>
                    <div className="adesivo-bandeja-acoes">
                      <div className="adesivo-quantidade" role="group" aria-label={`Quantidade de ${adesivo.nome}`}>
                        <button className="btn btn-secondary btn-sm" onClick={() => alterarQuantidade(index, -1)} type="button" aria-label={`Diminuir ${adesivo.nome}`}>-</button>
                        <span aria-live="polite">{adesivo.qtd}</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => alterarQuantidade(index, 1)} type="button" aria-label={`Aumentar ${adesivo.nome}`}>+</button>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm rec-perigo"
                        onClick={() => setBandeja(current => current.filter((_, itemIndex) => itemIndex !== index))}
                        type="button"
                        aria-label={`Remover ${adesivo.nome}`}
                      >
                        <i className="las la-trash" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button className="btn btn-primary" onClick={imprimirCartela} disabled={bandeja.length === 0} type="button">
              <i className="las la-print" aria-hidden="true" /> Imprimir cartela
            </button>
          </div>
        </Panel>
      )}

      {modalAberto && (
        <Modal size="lg" title="Inserir na receita" closeLabel="Fechar" onClose={() => onModalAbertoChange(false)}>
          <div className="acesso-rapido" role="group" aria-label="Inserção rápida">
            {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'mg', 'ml', 'h', ' '].map(value => (
              <button className="btn btn-secondary btn-sm" key={value || 'space'} onClick={() => onInsertText(value)} type="button">
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
        </Modal>
      )}

      {printSheet}
    </>
  );
}
