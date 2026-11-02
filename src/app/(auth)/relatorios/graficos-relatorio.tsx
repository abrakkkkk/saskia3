'use client';

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Carregado por next/dynamic na página: o recharts não entra no pacote inicial de Relatórios.
export type PontoStatus = { name: string; value: number };
export type PontoLeito = { tipo: string; ocupados: number; livres: number };

const CORES = ['#b45309', '#1d4ed8', '#be185d', '#15803d', '#475569', '#7c3aed', '#0e7490'];
const ESTILO_TOOLTIP = { borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' };

export default function GraficosRelatorio({ status, leitos }: { status: PontoStatus[]; leitos: PontoLeito[] }) {
  const statusComDados = status.filter(item => item.value > 0);
  return (
    <div className="rel-graficos">
      <div className="rel-chart-card">
        <h3>Agendamentos por status</h3>
        {statusComDados.length === 0 ? <p className="rel-vazio">Sem agendamentos no período.</p> : (
          <div style={{ height: 300 }} role="img" aria-label={`Agendamentos por status: ${statusComDados.map(item => `${item.name} ${item.value}`).join(', ')}`}>
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
      </div>

      <div className="rel-chart-card">
        <h3>Ocupação de leitos de UTI por tipo</h3>
        {leitos.length === 0 ? <p className="rel-vazio">Nenhum leito cadastrado.</p> : (
          <div style={{ height: 300 }} role="img" aria-label={`Leitos de UTI por tipo: ${leitos.map(item => `${item.tipo} ${item.ocupados} ocupados e ${item.livres} livres`).join('; ')}`}>
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
      </div>
    </div>
  );
}
