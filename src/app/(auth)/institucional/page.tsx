'use client';

import { ActivitySquare, Users, Rocket, Eye, Heart, History, Star, Lightbulb, Network, ShieldCheck } from 'lucide-react';

export default function InstitucionalPage() {
    return (
        <main className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 lg:space-y-12">

            {/* BANNER PRINCIPAL */}
            <section aria-labelledby="institucional-titulo" className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl lg:rounded-[2rem] p-6 sm:p-10 lg:p-16 text-center text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>
                
                <ActivitySquare aria-hidden="true" className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto mb-5 lg:mb-6 text-blue-400" />
                <h1 id="institucional-titulo" className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 tracking-tight">Saskia Saúde Integrada</h1>
                <p className="text-base sm:text-lg lg:text-xl text-blue-100/90 max-w-3xl mx-auto leading-relaxed">
                    Tecnologia e humanização para uma saúde mais eficiente e acessível a todos os brasileiros. 
                    Um ecossistema completo com mais de 40 módulos integrados.
                </p>
            </section>

            {/* SOBRE NÓS */}
            <section aria-label="Sobre a Saskia Saúde" className="bg-white rounded-3xl p-6 sm:p-8 lg:p-12 text-center shadow-lg border border-slate-100">
                <Users aria-hidden="true" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-5 lg:mb-6 text-blue-800" />
                <p className="text-lg text-slate-600 max-w-4xl mx-auto leading-relaxed">
                    A <strong className="text-blue-900">Saskia Saúde</strong> é uma plataforma inovadora voltada para a transformação digital da saúde no Brasil. 
                    Desenvolvida com foco na integração de serviços, otimização de processos e melhoria da experiência tanto dos 
                    profissionais quanto dos pacientes. Mais do que um sistema, a Saskia representa uma nova forma de organizar, 
                    gerenciar e humanizar o cuidado em saúde.
                </p>
            </section>

            {/* MISSÃO, VISÃO E VALORES */}
            <section aria-label="Missão, visão e valores" className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-8">
                <article className="bg-white rounded-3xl p-6 sm:p-8 text-center shadow-lg border-t-4 border-t-blue-500 motion-safe:transition-transform motion-safe:duration-200 md:hover:-translate-y-1">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Rocket aria-hidden="true" className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Missão</h2>
                    <p className="text-slate-600 leading-relaxed">
                        Promover a transformação da saúde por meio da tecnologia, oferecendo soluções acessíveis, 
                        eficientes e humanizadas que melhorem a qualidade do atendimento e a gestão dos serviços de saúde.
                    </p>
                </article>
                
                <article className="bg-white rounded-3xl p-6 sm:p-8 text-center shadow-lg border-t-4 border-t-cyan-500 motion-safe:transition-transform motion-safe:duration-200 md:hover:-translate-y-1">
                    <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Eye aria-hidden="true" className="w-8 h-8 text-cyan-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Visão</h2>
                    <p className="text-slate-600 leading-relaxed">
                        Ser referência nacional em sistemas integrados de saúde, contribuindo para a modernização do setor 
                        e impactando positivamente a vida de milhões de brasileiros.
                    </p>
                </article>

                <article className="bg-white rounded-3xl p-6 sm:p-8 text-center shadow-lg border-t-4 border-t-indigo-500 motion-safe:transition-transform motion-safe:duration-200 md:hover:-translate-y-1">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Heart aria-hidden="true" className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Valores</h2>
                    <p className="text-slate-600 leading-relaxed">
                        Ética e Responsabilidade • Inovação Contínua • Humanização do Cuidado • 
                        Compromisso com a Saúde Pública • Acessibilidade Tecnológica • Valorização dos Profissionais
                    </p>
                </article>
            </section>

            {/* NOSSA HISTÓRIA (LINHA DO TEMPO) */}
            <section aria-labelledby="historia-titulo" className="bg-slate-50 rounded-3xl p-6 sm:p-8 lg:p-12 border border-slate-200">
                <div className="text-center mb-12">
                    <History aria-hidden="true" className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <h2 id="historia-titulo" className="text-2xl sm:text-3xl font-black text-slate-800">Nossa História</h2>
                </div>
                
                <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <li className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-3xl font-black text-blue-800 mb-3">2024</div>
                        <p className="text-slate-600 text-sm font-medium">Nasce a ideia de um chatbot IA para auxiliar profissionais e pacientes</p>
                    </li>
                    <li className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-3xl font-black text-blue-800 mb-3">2025</div>
                        <p className="text-slate-600 text-sm font-medium">O projeto evolui para o ecossistema Saskia Saúde sob orientação da Prof.ª Dr.ª Isabela Bonfim</p>
                    </li>
                    <li className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-3xl font-black text-blue-800 mb-3">2026</div>
                        <p className="text-slate-600 text-sm font-medium">Primeira versão completa com mais de 40 módulos integrados de gestão hospitalar</p>
                    </li>
                    <li className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-3xl font-black text-blue-800 mb-3">2026+</div>
                        <p className="text-slate-600 text-sm font-medium">Reconhecimento como plataforma inovadora e início da expansão nacional</p>
                    </li>
                </ol>
            </section>

            {/* DIFERENCIAIS */}
            <section aria-labelledby="diferenciais-titulo">
                <div className="text-center mb-12">
                    <Star aria-hidden="true" className="w-12 h-12 mx-auto mb-4 text-yellow-400 fill-yellow-400" />
                    <h2 id="diferenciais-titulo" className="text-2xl sm:text-3xl font-black text-slate-800">Por que escolher a Saskia?</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <div className="flex items-start gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 shrink-0 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Lightbulb aria-hidden="true" className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">Inovação na Saúde</h3>
                            <p className="text-sm text-slate-600">Tecnologia acessível para clínicas, hospitais e unidades públicas de saúde.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 shrink-0 bg-cyan-50 rounded-xl flex items-center justify-center">
                            <Network aria-hidden="true" className="w-6 h-6 text-cyan-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">Integração Total</h3>
                            <p className="text-sm text-slate-600">Módulos que conversam entre si, eliminando retrabalho e papelada.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="w-12 h-12 shrink-0 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <ShieldCheck aria-hidden="true" className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">Segurança e Ética</h3>
                            <p className="text-sm text-slate-600">Desenvolvido com protocolos rigorosos de proteção de dados médicos.</p>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    );
}
