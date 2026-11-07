'use client';

import { ChartLine, Syringe, FileText, Image as ImageIcon } from 'lucide-react';

import { DocAtalho, DocCard, DocGrid, DocSection } from '@/components/ui/documentos';
import { PageHeader } from '@/components/ui';
import { urlDocumento } from '@/lib/documentos';
import { useDocumentos } from '@/lib/use-documentos';

export default function BibliotecaPage() {
  const { documentos, carregando, erro } = useDocumentos('BIBLIOTECA');

  return (
    <div className="conteudo">
      <PageHeader icon="las la-book" title="Biblioteca" subtitle="Manuais, protocolos e referências técnicas" />

      <DocGrid>
        <DocAtalho href="/curvas-crescimento" icone={<ChartLine size={20} />} titulo="Curvas de crescimento" descricao="Tabelas OMS de crescimento infantil" />
        <DocAtalho href="/vacinacao" icone={<Syringe size={20} />} titulo="Calendários de vacinação" descricao="Calendários vacinais por faixa etária" />
      </DocGrid>

      <DocSection titulo="Documentos técnicos e protocolos">
        {carregando && <p className="ui-doc-aviso" role="status">Carregando documentos…</p>}
        {erro && <p className="ui-doc-aviso" role="alert">{erro}</p>}
        {!carregando && !erro && documentos.length === 0 && <p className="ui-doc-aviso" role="status">Nenhum documento disponível no momento.</p>}
        <DocGrid>
          {documentos.map(doc => (
            <DocCard
              key={doc.slug}
              icone={doc.mime.startsWith('image/') ? <ImageIcon size={20} /> : <FileText size={20} />}
              titulo={doc.titulo}
              hrefVer={urlDocumento(doc.slug)}
              hrefBaixar={urlDocumento(doc.slug, true)}
            />
          ))}
        </DocGrid>
      </DocSection>
    </div>
  );
}
