'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Brain, Move } from 'lucide-react'
import { TransferModal } from './transfer-modal'

interface AgentCardProps {
  agent: any
  status: any
  organizations?: any[]
  currentOrgId?: string
}

const MD_FILES = [
  { key: 'soul',       label: 'SOUL',        icon: '✨', cls: 'soul' },
  { key: 'identity',   label: 'IDENTITY',    icon: '🪪', cls: 'identity' },
  { key: 'memory',     label: 'MEMORY',      icon: '🧠', cls: 'memory' },
  { key: 'memory_mid', label: 'MEMORY_MID',  icon: '🧠', cls: 'memory-mid' },
  { key: 'memory_long',label: 'MEMORY_LONG', icon: '🧠', cls: 'memory-long' },
  { key: 'agents',     label: 'AGENTS',      icon: '👥', cls: '' },
  { key: 'tools',      label: 'TOOLS',       icon: '🔧', cls: '' },
  { key: 'user',       label: 'USER',        icon: '👤', cls: '' },
  { key: 'tasks',      label: 'TASKS',       icon: '✓',  cls: '' },
  { key: 'humanized',  label: 'HUMANIZED',   icon: '💜', cls: 'humanized' },
  { key: 'onboarding', label: 'ONBOARDING',  icon: '📋', cls: '' },
  { key: 'evolution',  label: 'EVOLUTION',   icon: '📈', cls: 'evolution' },
  { key: 'heartbeat',  label: 'HEARTBEAT',   icon: '💓', cls: '' },
]

function HumRing({ score }: { score: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 60 ? '#10B981' : score >= 30 ? '#F59E0B' : '#EF4444'
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg width="48" height="48" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="24" cy="24" r={r} stroke="#1a2035" strokeWidth="4" fill="none" />
        <circle cx="24" cy="24" r={r} stroke={color} strokeWidth="4" fill="none"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, fontWeight: 700, color }}>
        {score}
      </div>
    </div>
  )
}

function SmtBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: '#4a5580', width: 72, flexShrink: 0 }}>{label}</span>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#181d33' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: 'width .4s' }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: '#4a5580', width: 28, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

export function AgentCard({ agent, status, organizations = [], currentOrgId = '' }: AgentCardProps) {
  const [showTransfer, setShowTransfer] = useState(false)
  const metadata = typeof agent.metadata === 'string' ? JSON.parse(agent.metadata || '{}') : (agent.metadata || {})
  const agentColor = agent.color || '#10B981'
  const isOnline = status?.status === 'online'
  const modelName = (agent.model || metadata?.model || 'claude-3.5').split('/').pop()
  const humScore = metadata?.humanization_score ?? metadata?.hum ?? 65
  const smtShort  = metadata?.smt_short  ?? 29
  const smtMid    = metadata?.smt_mid    ?? 39
  const smtLong   = metadata?.smt_long   ?? 14
  const iroScore  = metadata?.iro_score  ?? 68
  const sappN1    = metadata?.sapp_n1    ?? '—'
  const sappN2    = metadata?.sapp_n2    ?? '—'
  const sappN3    = metadata?.sapp_n3    ?? '—'

  return (
    <div style={{
      background: '#0C0F1A',
      border: `1px solid ${isOnline ? 'rgba(16,185,129,.25)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      animation: 'fadeIn .3s ease both',
      transition: 'border-color .2s',
    }}>

      {/* ── HEADER ── */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: `${agentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, border: `1px solid ${agentColor}40`
        }}>
          {agent.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.2 }}>{agent.name}</div>
          <div style={{ fontSize: 11, color: '#8892b0', marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>{agent.role || 'Agente ARVA'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, marginTop: 6, color: isOnline ? '#10B981' : '#4a5580' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? '#10B981' : '#4a5580', boxShadow: isOnline ? '0 0 6px #10B981' : 'none', flexShrink: 0 }} />
            {isOnline ? 'Online' : 'Offline'}
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: '#4a5580', marginLeft: 4 }}>{modelName}</span>
          </div>
        </div>
        <HumRing score={humScore} />
      </div>

      {/* ── METRICS BAR ── */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 20, borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#07090F' }}>
        <div style={{ fontSize: 11, color: '#8892b0' }}>Heartbeat <span style={{ color: '#E8EAF6', fontWeight: 600, fontFamily: 'JetBrains Mono,monospace' }}>—</span></div>
        <div style={{ fontSize: 11, color: '#8892b0' }}>Uptime <span style={{ color: '#10B981', fontWeight: 600, fontFamily: 'JetBrains Mono,monospace' }}>99.8%</span></div>
        <div style={{ fontSize: 11, color: '#8892b0' }}>Tarefas <span style={{ color: '#E8EAF6', fontWeight: 600, fontFamily: 'JetBrains Mono,monospace' }}>{(status?.tasks_done || 0) + (status?.tasks_pending || 0)}</span></div>
      </div>

      {/* ── MD FILES ── */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 10, color: '#4a5580', letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono,monospace', marginBottom: 7 }}>
          Arquivos de Memória · <span style={{ color: '#10B981', cursor: 'pointer' }}>clique para editar</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {MD_FILES.map(f => {
            const colors: Record<string, { border: string; color: string }> = {
              'soul':       { border: 'rgba(139,92,246,.3)',  color: '#8B5CF6' },
              'identity':   { border: 'rgba(99,102,241,.3)',  color: '#6366F1' },
              'memory':     { border: 'rgba(16,185,129,.3)',  color: '#10B981' },
              'memory-mid': { border: 'rgba(16,185,129,.2)',  color: '#0d9e69' },
              'memory-long':{ border: 'rgba(16,185,129,.15)', color: '#0a7a52' },
              'evolution':  { border: 'rgba(245,158,11,.3)',  color: '#F59E0B' },
              'humanized':  { border: 'rgba(236,72,153,.3)',  color: '#EC4899' },
            }
            const c = colors[f.cls] || { border: 'rgba(255,255,255,0.07)', color: '#8892b0' }
            return (
              <div key={f.key} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 7px', borderRadius: 5, border: `1px solid ${c.border}`,
                background: '#111528', fontSize: 11, fontWeight: 500, color: c.color,
                cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace',
              }}>
                <span style={{ fontSize: 10 }}>{f.icon}</span>
                {f.label}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── SMT ── */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 9, color: '#4a5580', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono,monospace', marginBottom: 8 }}>SMT · Uso de Contexto</div>
        <SmtBar label="Short-term" pct={smtShort} color="#10B981" />
        <SmtBar label="Mid-term"   pct={smtMid}   color="#6366F1" />
        <SmtBar label="Long-term"  pct={smtLong}  color="#8892b0" />
      </div>

      {/* ── IRO ── */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 9, color: '#4a5580', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono,monospace', marginBottom: 8 }}>IRO · Evolução</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="relative" style={{ width: 40, height: 40, flexShrink: 0 }}>
            <svg width="40" height="40" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="20" cy="20" r="16" stroke="#1a2035" strokeWidth="3.5" fill="none" />
              <circle cx="20" cy="20" r="16" stroke="#F59E0B" strokeWidth="3.5" fill="none"
                strokeDasharray={`${(iroScore / 100) * 100.5} 100.5`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center" style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, fontWeight: 700, color: '#F59E0B' }}>{iroScore}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#E8EAF6' }}>Padrões confirmados: 3</div>
            <div style={{ fontSize: 11, color: '#4a5580' }}>Próximo ciclo: segunda-feira</div>
          </div>
        </div>
      </div>

      {/* ── SAPP ── */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 9, color: '#4a5580', letterSpacing: '.15em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono,monospace', marginBottom: 8 }}>SAPP · Segurança</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'Nível 1', val: sappN1, color: '#10B981' },
            { label: 'Nível 2', val: sappN2, color: '#F59E0B' },
            { label: 'Nível 3', val: sappN3, color: '#EF4444' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: 8, borderRadius: 7, border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', background: '#111528' }}>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'JetBrains Mono,monospace', color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: '#4a5580', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div style={{ padding: '10px 12px', display: 'flex', gap: 6, marginTop: 'auto' }}>
        {[
          { label: '💬 Chat',   cls: 'chat' },
          { label: '✓ Tarefas', cls: '' },
          { label: '📋 Logs',   cls: '' },
        ].map(b => (
          <button key={b.label} style={{
            flex: 1, padding: '7px 4px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: b.cls === 'chat' ? '1px solid rgba(16,185,129,.25)' : '1px solid rgba(255,255,255,0.07)',
            background: b.cls === 'chat' ? 'rgba(16,185,129,.12)' : '#111528',
            color: b.cls === 'chat' ? '#10B981' : '#8892b0', cursor: 'pointer',
          }}>{b.label}</button>
        ))}
        <Link href={`/dashboard/agents/${agent.openclaw_id}/memory`} style={{
          flex: 1, padding: '7px 4px', borderRadius: 7, fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          border: '1px solid rgba(245,158,11,.25)', background: 'rgba(245,158,11,.1)',
          color: '#F59E0B', textDecoration: 'none',
        }}>
          📋 The Call
        </Link>
        <button 
          onClick={() => setShowTransfer(true)}
          style={{
            width: 34, padding: '7px 4px', borderRadius: 7, fontSize: 14, fontWeight: 600,
            border: '1px solid rgba(16,185,129,.15)', background: '#111528',
            color: '#10B981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Transferir Agente"
        >
          <Move size={14} />
        </button>
        <button style={{
          width: 34, padding: '7px 4px', borderRadius: 7, fontSize: 14, fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.07)', background: '#111528',
          color: '#EC4899', cursor: 'pointer',
        }}>💓</button>
      </div>

      {showTransfer && (
        <TransferModal 
          agent={agent}
          organizations={organizations}
          currentOrgId={currentOrgId}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </div>
  )
}
