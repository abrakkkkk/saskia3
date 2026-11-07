'use client';

import { FileText } from 'lucide-react';
import { DocCard, DocGrid } from '@/components/ui/documentos';
import { PageHeader } from '@/components/ui';
import { urlDocumento } from '@/lib/documentos';
import { useDocumentos } from '@/lib/use-documentos';

export default function VacinacaoPage() {
  const { documentos, carregando, erro } = useDocumentos('VACINACAO');

  const ver = (slug: string) => window.open(urlDocumento(slug), '_blank', 'noopener,noreferrer');
  const baixar = (slug: string) => {
    const a = document.createElement('a');
    a.href = urlDocumento(slug, true);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="conteudo">
      <PageHeader icon="las la-syringe" title="Calendários de vacinação" subtitle="Consulta a calendários vacinais em PDF. Não registra doses aplicadas." />

      {carregando && <p role="status" className="ui-doc-aviso">Carregando calendários…</p>}
      {erro && <p role="alert" className="ui-doc-aviso">{erro}</p>}

      <DocGrid>
        {documentos.map(doc => (
          <DocCard
            key={doc.slug}
            icone={<FileText size={20} />}
            titulo={doc.titulo}
            nivel={2}
            onVer={() => ver(doc.slug)}
            onBaixar={() => baixar(doc.slug)}
          />
        ))}
      </DocGrid>
    </div>
  );
}
