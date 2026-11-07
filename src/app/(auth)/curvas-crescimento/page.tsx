'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { PageHeader, Tabs } from '@/components/ui';
import { DocCard, DocGrid } from '@/components/ui/documentos';
import { urlDocumento } from '@/lib/documentos';
import { useDocumentos } from '@/lib/use-documentos';

const ABAS = [
  { id: 'Meninas', label: 'Meninas' },
  { id: 'Meninos', label: 'Meninos' },
] as const;

export default function CurvasCrescimentoPage() {
  const [abaAtiva, setAbaAtiva] = useState<'Meninas' | 'Meninos'>('Meninas');
  const { documentos, carregando, erro } = useDocumentos('CRESCIMENTO');
  const listaAtual = documentos.filter(d => d.grupo === abaAtiva);

  return (
    <div className="conteudo">
      <PageHeader icon="las la-chart-line" title="Curvas de peso e crescimento" subtitle="Tabelas OMS de crescimento infantil" />

      <Tabs tabs={ABAS} active={abaAtiva} onChange={setAbaAtiva} label="Selecionar curva de crescimento" />

      {carregando && <p role="status" className="ui-doc-aviso">Carregando curvas…</p>}
      {erro && <p role="alert" className="ui-doc-aviso">{erro}</p>}

      <DocGrid>
        {listaAtual.map(curva => (
          <DocCard
            key={curva.slug}
            icone={<FileText size={20} />}
            titulo={curva.titulo}
            nivel={2}
            hrefVer={urlDocumento(curva.slug)}
            hrefBaixar={urlDocumento(curva.slug, true)}
          />
        ))}
      </DocGrid>
    </div>
  );
}
