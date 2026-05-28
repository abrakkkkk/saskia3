'use client'

import Link from 'next/link'

const adminCards = [
  { href: '/admin/configuracao', icon: 'las la-building', title: 'Configuração', desc: 'Dados da instituição, logo, endereço' },
  { href: '/admin/procedimentos', icon: 'las la-syringe', title: 'Procedimentos', desc: 'Cadastre procedimentos médicos' },
  { href: '/admin/usuarios', icon: 'las la-users', title: 'Usuários', desc: 'Administradores, recepção, profissionais' },
  { href: '/admin/prontuarios', icon: 'las la-file-alt', title: 'Modelos de Prontuários', desc: 'Padronize os registros clínicos' },
  { href: '/admin/financeiro', icon: 'las la-coins', title: 'Financeiro', desc: 'Gestão de licenças e pagamentos' },
  { href: '/admin/config-dashboard', icon: 'las la-sliders-h', title: 'Configurar Dashboard', desc: 'Personalize os módulos do dashboard' },
  { href: '/admin/hospitais', icon: 'las la-hospital', title: 'Hospitais', desc: 'Gerenciar unidades hospitalares' },
]

export default function AdminPage() {
  return (
    <div>
      <div className="page-header">
        <h2><i className="las la-hospital"></i> Painel Administrativo</h2>
      </div>
      <p style={{ color: '#666', marginBottom: 20 }}>Gerencie toda a plataforma da Saskia Saúde Integrada.</p>

      <div className="dashboard-cards">
        {adminCards.map ((card) => (
          <Link key={card.href} href={card.href}>
            <div className="card-admin">
              <i className={card.icon}></i>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
