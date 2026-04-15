'use client'

import React, { useState, useEffect } from 'react'
import { Monitor, Users, Activity, CheckCircle2, AlertCircle, Play, Pause, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

// Componente Avatar mockado para o Escritório
const AgentAvatar = ({ name, role, status, x, y, active }: { 
  name: string, role: string, status: string, x: number, y: number, active?: boolean 
}) => (
  <div 
    className={clsx(
      "absolute flex flex-col items-center transition-all duration-700 ease-in-out",
      active ? "scale-110 z-10" : "scale-90 opacity-60 z-0"
    )}
    style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) ${active ? 'scale(1.1)' : 'scale(0.9)'}` }}
  >
    <div className={clsx(
      "w-16 h-16 rounded-full border-2 flex items-center justify-center bg-slate-800 relative shadow-2xl",
      active ? "border-indigo-500 shadow-indigo-500/40" : "border-slate-700 shadow-black"
    )}>
      <Users className={clsx("w-8 h-8", active ? "text-indigo-400" : "text-slate-500")} />
      {active && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
        </span>
      )}
    </div>
    <div className="mt-3 text-center">
      <p className="text-white font-semibold text-sm drop-shadow-md">{name}</p>
      <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">{role}</p>
    </div>
  </div>
)

export default function VirtualOffice() {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  const agents = [
    { id: '1', name: 'Sherlock', role: 'Investigador', x: 20, y: 50, step: 1 },
    { id: '2', name: 'Oracle', role: 'Analista', x: 40, y: 40, step: 2 },
    { id: '3', name: 'Designer', role: 'Criativo', x: 60, y: 60, step: 3 },
    { id: '4', name: 'Manager', role: 'Finalizador', x: 80, y: 50, step: 4 },
  ]

  const timeline = [
    { title: 'Investigação Web', status: 'completed', time: '10:02 AM' },
    { title: 'Análise de Profundidade', status: 'running', time: '10:05 AM' },
    { title: 'Geração de Criativos', status: 'pending', time: '-' },
    { title: 'Publicação Final', status: 'pending', time: '-' },
  ]

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar de Timeline */}
      <aside className="w-80 border-r border-slate-900 bg-slate-900/30 backdrop-blur-3xl p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Timeline da Run</h2>
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Ao Vivo</p>
          </div>
        </div>

        <div className="space-y-6 relative flex-grow">
          {timeline.map((item, idx) => (
            <div key={idx} className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div className={clsx(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center bg-slate-950 z-10 transition-colors",
                  item.status === 'completed' && "border-emerald-500 text-emerald-500 bg-emerald-500/10",
                  item.status === 'running' && "border-indigo-500 text-indigo-400 animate-pulse bg-indigo-500/10",
                  item.status === 'pending' && "border-slate-800 text-slate-700"
                )}>
                  {item.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                {idx < timeline.length - 1 && (
                  <div className="w-0.5 h-full bg-slate-800 mt-1"></div>
                )}
              </div>
              <div className="pb-8">
                <h4 className={clsx(
                  "font-medium transition-colors",
                  item.status === 'pending' ? "text-slate-600" : "text-white"
                )}>{item.title}</h4>
                <p className="text-xs text-slate-500">{item.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-tighter text-slate-400 font-bold">
            <span>Organização Atual</span>
            <span className="text-indigo-400 hover:underline cursor-pointer">Alterar</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-indigo-500 to-purple-500" />
            <div>
              <p className="text-sm font-bold">Arvabot Squads</p>
              <p className="text-[10px] text-slate-500">Active Run: #SQ-9201</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Office Canvas */}
      <main className="flex-grow relative bg-[#0a0c10]">
        {/* Background Grid Design */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:60px_60px] opacity-[0.05]" />
        
        {/* Run Header Dashboard */}
        <header className="absolute top-0 inset-x-0 p-8 flex justify-between items-start pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl flex items-center gap-8 shadow-2xl pointer-events-auto">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Run Ativa</span>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Conteúdo LinkedIn Semanal
                <Badge className="bg-emerald-500/10 text-emerald-400">Otimização AI</Badge>
              </h1>
            </div>
            <div className="h-10 w-px bg-slate-800" />
            <div className="flex items-center gap-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Duração</span>
                <span className="text-sm font-mono text-white">00:04:12</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tokens</span>
                <span className="text-sm font-mono text-white">2.4k</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button className="p-3 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
              <Pause className="w-5 h-5" />
            </button>
            <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20">
              Ver Output
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Office Visualizer Canvas Overlay */}
        <div className="absolute inset-0 overflow-hidden">
          {/* SVG Handoff Paths */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5" opacity="0.5" />
              </marker>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path 
              d="M 170 300 Q 500 240 850 300" 
              fill="transparent" 
              stroke="url(#lineGrad)" 
              strokeWidth="2" 
              strokeDasharray="10 5"
              className="animate-[dash_30s_linear_infinite]"
            />
          </svg>

          {/* Agentes renderizados com as posições X, Y */}
          <div className="relative w-full h-full">
            {agents.map((agent) => (
              <AgentAvatar 
                key={agent.id}
                name={agent.name}
                role={agent.role}
                status="online"
                x={agent.x}
                y={agent.y}
                active={agent.step === currentStep}
              />
            ))}
          </div>
        </div>

        {/* Console Flutuante Low-Impact */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-2xl pointer-events-auto h-32 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-white/5 pb-2">
              <span>Handoff Log</span>
              <span className="text-emerald-500">Streaming...</span>
            </div>
            <div className="font-mono text-xs text-slate-400 space-y-1">
              <p><span className="text-emerald-500">[System]</span> Handoff iniciado para Oracle...</p>
              <p><span className="text-indigo-400">[Sherlock]</span> Dados de URL capturados com sucesso. Persistent session carregada.</p>
              <p><span className="text-amber-500">[Warning]</span> Latência detectada no provider OpenAI.</p>
              <p><span className="text-slate-500">03:12 PM - Step 2 processo em andamento...</span></p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", className)}>
      {children}
    </span>
  )
}
