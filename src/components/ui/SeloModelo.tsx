import { Badge } from '@/components/ui';
import type { SituacaoModelo } from '@/lib/modelos-clinicos';

/** Selo discreto do item 10: modelo oficial até o hospital validar em Configurações → Hospital. */
export default function SeloModelo({ situacao }: { situacao: SituacaoModelo | null }) {
  if (!situacao) return null;
  if (situacao.validado) {
    const data = situacao.validadoEm ? new Date(situacao.validadoEm).toLocaleDateString('pt-BR') : '';
    return <Badge tone="success">Validado pelo hospital{data ? ` em ${data}` : ''}</Badge>;
  }
  return (
    <span title="Modelo oficial ainda não validado pela equipe clínica deste hospital. O administrador valida em Hospital.">
      <Badge tone="neutral">Modelo padrão MS/Anvisa</Badge>
    </span>
  );
}
