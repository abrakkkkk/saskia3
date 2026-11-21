'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader, Tabs } from '@/components/ui';
import { pode } from '@/lib/permissions';
import { AbaRnds } from './AbaRnds';
import { AbaCnes } from './AbaCnes';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import './integracoes.css';

type Aba = 'rnds' | 'cnes';

export default function IntegracoesPage() {
  const { data: session } = useSession();
  const podeGerir = pode(session?.user?.cargo, 'integracao:gerir');
  const [aba, setAba] = useState<Aba>('rnds');

  return (
    <div className="mod-pagina">
      <PageHeader icon="las la-network-wired" title="Integrações" subtitle="Envio de vacinas e exames à RNDS e conferência do cadastro no CNES." />
      <Tabs<Aba>
        label="Integrações"
        active={aba}
        onChange={setAba}
        tabs={[
          { id: 'rnds', label: 'RNDS', icon: 'las la-cloud-upload-alt' },
          { id: 'cnes', label: 'CNES', icon: 'las la-id-card' },
        ]}
      />
      {aba === 'rnds' ? <AbaRnds podeGerir={podeGerir} /> : <AbaCnes />}
    </div>
  );
}
