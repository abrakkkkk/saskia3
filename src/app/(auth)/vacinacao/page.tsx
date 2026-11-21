'use client';

import { FileText } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { DocCard, DocGrid } from '@/components/ui/documentos';
import { EmptyState, PageHeader, Panel } from '@/components/ui';
import { urlDocumento } from '@/lib/documentos';
import { pode } from '@/lib/permissions';
import { useDocumentos } from '@/lib/use-documentos';
import RegistroVacinas from './RegistroVacinas';
import '@/components/ui/modulo.css';
import './vacinacao.css';

export default function VacinacaoPage() {
  const { documentos, carregando, erro } = useDocumentos('VACINACAO');
  const { data: session } = useSession();
  const cargo = session?.user?.cargo;
  const podeLer = pode(cargo, 'vacina:ler');

  return (
    <div className="conteudo">
      <PageHeader
        icon="las la-syringe"
        title="Vacinação"
        subtitle={podeLer ? 'Registro das doses aplicadas, enviado à RNDS, e calendários vacinais.' : 'Consulta a calendários vacinais em PDF.'}
      />

      {podeLer && <RegistroVacinas podeRegistrar={pode(cargo, 'vacina:registrar')} />}

      <Panel title="Calendários vacinais" icon="las la-calendar-check">
        {carregando && <p role="status" className="ui-doc-aviso">Carregando calendários…</p>}
        {erro && <p role="alert" className="ui-doc-aviso">{erro}</p>}
        {!carregando && !erro && documentos.length === 0 && <EmptyState icon="las la-calendar-check" message="Nenhum calendário publicado no acervo." />}
        <DocGrid>
          {documentos.map(doc => (
            <DocCard
              key={doc.slug}
              icone={<FileText size={20} />}
              titulo={doc.titulo}
              nivel={3}
              hrefVer={urlDocumento(doc.slug)}
              hrefBaixar={urlDocumento(doc.slug, true)}
            />
          ))}
        </DocGrid>
      </Panel>
    </div>
  );
}
