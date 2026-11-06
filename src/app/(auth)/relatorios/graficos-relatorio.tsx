'use client';

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, Panel } from '@/components/ui';

// Carregado por next/dynamic na página: o recharts não entra no pacote inicial de Relatórios.
export type PontoStatus = { name: string; value: number };
export type PontoLeito = { tipo: string; ocupados: number; livres: number };

// O recharts exige valores literais nas séries; são os mesmos tons dos tokens --ui-*.
const CORES = ['#b45309', '#1d4ed8', '#be185d', '#15803d', '#475569', '#7c3aed', '#0e7490'];
const ESTILO_TOOLTIP = { borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' };

export default function GraficosRelatorio({ status, leitos }: { status: PontoStatus[]; leitos: PontoLeito[] }) {
  const statusComDados = status.filter(item => item.value > 0);
  return (
    <div className="rel-graficos">
      <Panel title="Agendamentos por status">
        {statusComDados.length === 0 ? <EmptyState icon="las la-chart-pie" message="Sem agendamentos no período." /> : (
          <div className="rel-grafico" role="img" aria-label={`Agendamentos por status: ${statusComDados.map(item => `${item.name} ${item.value}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusComDados} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" label>
                  {statusComDados.map((item, indice) => <Cell key={item.name} fill={CORES[indice % CORES.length]} />)}
                </Pie>
                <Tooltip contentStyle={ESTILO_TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel title="Ocupação de leitos de UTI por tipo">
        {leitos.length === 0 ? <EmptyState icon="las la-bed" message="Nenhum leito cadastrado." /> : (
          <div className="rel-grafico" role="img" aria-label={`Leitos de UTI por tipo: ${leitos.map(item => `${item.tipo} ${item.ocupados} ocupados e ${item.livres} livres`).join('; ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leitos} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="tipo" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={ESTILO_TOOLTIP} />
                <Legend />
                <Bar dataKey="ocupados" name="Ocupados" stackId="leitos" fill="#b91c1c" />
                <Bar dataKey="livres" name="Livres/outros" stackId="leitos" fill="#1d4ed8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </div>
  );
}
