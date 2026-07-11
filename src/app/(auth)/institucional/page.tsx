'use client';

import { ActivitySquare, Users, Rocket, Eye, Heart, History, Star, Lightbulb, Network, ShieldCheck } from 'lucide-react';

export default function InstitucionalPage() {
    return (
        <div className="p-8 max-w-6xl mx-auto space-y-12">

            {/* BANNER PRINCIPAL */}
            <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-[2rem] p-16 text-center text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>
                
                <ActivitySquare className="w-20 h-20 mx-auto mb-6 text-blue-400" />
                <h1 className="text-5xl font-black mb-4 tracking-tight">Saskia Saúde Integrada</h1>
                <p className="text-xl text-blue-100/90 max-w-3xl mx-auto leading-relaxed">
                    Tecnologia e humanização para uma saúde mais eficiente e acessível a todos os brasileiros. 
                    Um ecossistema completo com mais de 40 módulos integrados.
                </p>
            </div>

            {/* SOBRE NÓS */}
            <div className="bg-white rounded-3xl p-12 text-center shadow-lg border border-slate-100">
                <Users className="w-16 h-16 mx-auto mb-6 text-blue-800" />
                <p className="text-lg text-slate-600 max-w-4xl mx-auto leading-relaxed">
                    A <strong className="text-blue-900">Saskia Saúde</strong> é uma plataforma inovadora voltada para a transformação digital da saúde no Brasil. 
                    Desenvolvida com foco na integração de serviços, otimização de processos e melhoria da experiência tanto dos 
                    profissionais quanto dos pacientes. Mais do que um sistema, a Saskia representa uma nova forma de organizar, 
                    gerenciar e humanizar o cuidado em saúde.
                </p>
            </div>

            {/* MISSÃO, VISÃO E VALORES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-3xl p-8 text-center shadow-lg border-t-4 border-t-blue-500 hover:-translate-y-2 transition-transform">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Rocket className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-4">Missão</h3>
                    <p className="text-slate-600 leading-relaxed">
                        Promover a transformação da saúde por meio da tecnologia, oferecendo soluções acessíveis, 
                        eficientes e humanizadas que melhorem a qualidade do atendimento e a gestão dos serviços de saúde.
                    </p>
                </div>
                
                <div className="bg-white rounded-3xl p-8 text-center shadow-lg border-t-4 border-t-cyan-500 hover:-translate-y-2 transition-transform">
                    <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Eye className="w-8 h-8 text-cyan-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-4">Visão</h3>
                    <p className="text-slate-600 leading-relaxed">
                        Ser referência nacional em sistemas integrados de saúde, contribuindo para a modernização do setor 
                        e impactando positivamente a vida de milhões de brasileiros.
                    </p>
                </div>

                <div className="bg-white rounded-3xl p-8 text-center shadow-lg border-t-4 border-t-indigo-500 hover:-translate-y-2 transition-transform">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Heart className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-4">Valores</h3>
                    <p className="text-slate-600 leading-relaxed">
                        Ética e Responsabilidade • Inovação Contínua • Humanização do Cuidado • 
                        Compromisso com a Saúde Pública • Acessibilidade Tecnológica • Valorização dos Profissionais
                    </p>
                </div>
            </div>

            {/* NOSSA HISTÓRIA (LINHA DO TEMPO) */}
            <div className="bg-slate-50 rounded-3xl p-12 border border-slate-200">
                <div className="text-center mb-12">
                    <History className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <h2 className="text-3xl font-black text-slate-800">Nossa História</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-3xl font-black text-blue-800 mb-3">2024</div>
                        <p className="text-slate-600 text-sm font-medium">Nasce a ideia de um chatbot IA para auxiliar profissionais e pacientes</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-3xl font-black text-blue-800 mb-3">2025</div>
                        <p className="text-slate-600 text-sm font-medium">O projeto evolui para o ecossistema Saskia Saúde sob orientação da Prof.ª Dr.ª Isabela Bonfim</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-3xl font-black text-blue-800 mb-3">2026</div>
                        <p className="text-slate-600 text-sm font-medium">Primeira versão completa com mais de 40 módulos integrados de gestão hospitalar</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-3xl font-black text-blue-800 mb-3">2026+</div>
                        <p className="text-slate-600 text-sm font-medium">Reconhecimento como plataforma inovadora e início da expansão nacional</p>
                    </div>
                </div>
            </div>

            {/* DIFERENCIAIS */}
            <div>
                <div className="text-center mb-12">
                    <Star className="w-12 h-12 mx-auto mb-4 text-yellow-400 fill-yellow-400" />
                    <h2 className="text-3xl font-black text-slate-800">Por que escolher a Saskia?</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 shrink-0 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Lightbulb className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">Inovação na Saúde</h3>
                            <p className="text-sm text-slate-600">Tecnologia acessível para clínicas, hospitais e unidades públicas de saúde.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 shrink-0 bg-cyan-50 rounded-xl flex items-center justify-center">
                            <Network className="w-6 h-6 text-cyan-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">Integração Total</h3>
                            <p className="text-sm text-slate-600">Módulos que conversam entre si, eliminando retrabalho e papelada.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 shrink-0 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">Segurança e Ética</h3>
                            <p className="text-sm text-slate-600">Desenvolvido com protocolos rigorosos de proteção de dados médicos.</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
