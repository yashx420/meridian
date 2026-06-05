import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/* ── Shared CSS assumed injected by MeridianTCE ── */

const DEMO_ORG = {
  display_name: 'EuroGov Financial Authority',
  org_name: 'EuroGov Financial Authority',
  industry: 'Public Sector Financial Regulation',
  size: '2,400 employees',
  headquarters: 'Brussels, Belgium',
  current_tech_stack: 'AWS GovCloud (primary), Microsoft 365, legacy on-premise Oracle ERP',
  compliance_frameworks: ['NIS2', 'GDPR', 'Schrems II', 'DORA', 'EBA Cloud Guidelines'],
  key_challenges: 'Dependency on US hyperscalers creates legal exposure under Schrems II.',
  engagement_trigger: 'Schrems II invalidation risk + DORA deadline pressure',
  budget_envelope: '€8–12M over 3 years',
  timeline: '18 months to full migration',
  stakeholders: 'CTO (Marta Kowalski), CISO (Dirk van Essen), General Counsel (Sophie Bernard)',
};

const DEMO_TWIN = {
  full_name: 'James Brennan',
  role_title: 'Principal Technology Advisor',
};

const PERSONAS = [
  { id: 'comp', label: 'Compliance Sentinel' },
  { id: 'cloud', label: 'Cloud Architect' },
  { id: 'legal', label: 'Legal Advisor' },
  { id: 'fin', label: 'Financial Analyst' },
  { id: 'risk', label: 'Risk Officer' },
];

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('### ')) { elements.push(<h3 key={i} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: '18px 0 6px', letterSpacing: '-0.01em' }}>{inlineFmt(line.slice(4))}</h3>); i++; continue; }
    if (line.startsWith('## ')) { elements.push(<h2 key={i} style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '22px 0 8px', borderBottom: '1px solid var(--line-1)', paddingBottom: 6 }}>{inlineFmt(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith('# ')) { elements.push(<h1 key={i} style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: '24px 0 10px' }}>{inlineFmt(line.slice(2))}</h1>); i++; continue; }
    if (line.match(/^[-*]\s/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*]\s/)) { items.push(<li key={i} style={{ paddingLeft: 16, position: 'relative', marginTop: 4, fontSize: 13, lineHeight: 1.6 }}><span style={{ position: 'absolute', left: 4, top: 8, width: 4, height: 4, background: 'var(--ink-3)', borderRadius: '50%', display: 'inline-block' }} />{inlineFmt(lines[i].replace(/^[-*]\s/, ''))}</li>); i++; }
      elements.push(<ul key={`ul-${i}`} style={{ listStyle: 'none', margin: '6px 0' }}>{items}</ul>);
      continue;
    }
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i]); i++; }
      const valid = rows.filter(r => !/^\s*\|[\s\-:]+\|/.test(r));
      if (valid.length > 0) {
        const parse = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const header = parse(valid[0]);
        elements.push(
          <div key={`t-${i}`} style={{ overflowX: 'auto', margin: '12px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{header.map((h, ci) => <th key={ci} style={{ padding: '7px 12px', background: 'var(--surface-alt)', borderBottom: '2px solid var(--line-2)', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
              <tbody>{valid.slice(1).map((row, ri) => <tr key={ri} style={{ borderBottom: '1px solid var(--line-1)' }}>{parse(row).map((c, ci) => <td key={ci} style={{ padding: '7px 12px', color: 'var(--ink-1)', verticalAlign: 'top', background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)' }}>{inlineFmt(c)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    if (line.match(/^---+$/)) { elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--line-2)', margin: '14px 0' }} />); i++; continue; }
    if (line.trim()) elements.push(<p key={i} style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.65, margin: '5px 0' }}>{inlineFmt(line)}</p>);
    i++;
  }
  return elements;
}

function inlineFmt(text) {
  if (!text) return text;
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index} style={{ fontWeight: 600, color: 'var(--ink)' }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index} style={{ fontStyle: 'italic' }}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={m.index} style={{ fontFamily: 'monospace', fontSize: '0.9em', background: 'var(--bg-tint)', padding: '1px 4px', borderRadius: 3 }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

export default function ClientView({ user }) {
  const [stage, setStage] = useState('consulting'); // consulting | done
  const [ps, setPs] = useState(PERSONAS.map(() => ({ status: 'pending', progress: 0 })));
  const [synthesis, setSynthesis] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const scrollRef = useRef(null);

  const brief = [
    `Organisation: ${DEMO_ORG.org_name}`,
    `Industry: ${DEMO_ORG.industry}`,
    `Size: ${DEMO_ORG.size}`,
    `Current tech stack: ${DEMO_ORG.current_tech_stack}`,
    `Compliance frameworks: ${DEMO_ORG.compliance_frameworks.join(', ')}`,
    `Key challenges: ${DEMO_ORG.key_challenges}`,
    `Engagement trigger: ${DEMO_ORG.engagement_trigger}`,
    `Budget: ${DEMO_ORG.budget_envelope}`,
    `Timeline: ${DEMO_ORG.timeline}`,
    `Key stakeholders: ${DEMO_ORG.stakeholders}`,
  ].join('\n');

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const collected = {};
      for (let i = 0; i < PERSONAS.length; i++) {
        if (cancelled) return;
        const p = PERSONAS[i];
        setPs(prev => { const x = [...prev]; x[i] = { status: 'consulting', progress: 5 }; return x; });
        const anim = setInterval(() => setPs(prev => { const x = [...prev]; if (x[i]?.progress < 90) x[i] = { ...x[i], progress: x[i].progress + 3 }; return x; }), 280);
        const res = await base44.functions.invoke('personaConsult', { mode: 'persona', personaId: p.id, brief, twinContext: DEMO_TWIN, orgContext: DEMO_ORG });
        clearInterval(anim);
        if (cancelled) return;
        collected[p.id] = res.data.analysis;
        setPs(prev => { const x = [...prev]; x[i] = { status: 'complete', progress: 100 }; return x; });
      }
      if (cancelled) return;
      const personaResults = PERSONAS.map(p => ({ role: p.label, analysis: collected[p.id] || '' }));
      const synthRes = await base44.functions.invoke('personaConsult', { mode: 'synthesise', brief, twinContext: DEMO_TWIN, orgContext: DEMO_ORG, personaResults });
      if (cancelled) return;
      setSynthesis(synthRes.data.synthesis);
      setStage('done');
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const sendMessage = async (text) => {
    const q = (text || draft).trim();
    if (!q || loadingRef.current) return;
    loadingRef.current = true;
    setDraft('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    const res = await base44.functions.invoke('personaConsult', { mode: 'followup', question: q, brief, synthesis, twinContext: DEMO_TWIN, orgContext: DEMO_ORG });
    loadingRef.current = false;
    setLoading(false);
    setMessages(prev => [...prev, { role: 'seneca', text: res.data.answer }]);
  };

  const fmt = s => `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const initials = user?.full_name ? user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'CL';

  return (
    <div style={{ width: '100%', minHeight: '100vh', height: '100vh', display: 'grid', gridTemplateRows: '56px 1fr', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: 'var(--surface)', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#1A1A1A" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="4" stroke="#4F46E5" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="1.6" fill="#4F46E5" />
          </svg>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Meridian</span>
          <span style={{ width: 1, height: 16, background: 'var(--line-2)', margin: '0 4px' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-1)' }}>{DEMO_ORG.org_name}</span>
          <span style={{ fontSize: 9.5, padding: '2px 6px', background: 'var(--indigo-tint)', color: 'var(--indigo)', borderRadius: 4, fontWeight: 550, letterSpacing: '0.04em', textTransform: 'uppercase', marginLeft: 4 }}>Client Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 999, fontSize: 11.5, color: 'var(--ink-1)', fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 3px rgba(21,128,61,0.12)' }} />
            {DEMO_ORG.org_name}
          </div>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#E2E5FF,#C7CCFF)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, color: 'var(--indigo-deep)' }}>{initials}</div>
        </div>
      </div>

      {/* Main content - 2 columns: main + chat */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', overflow: 'hidden' }}>
        {/* Left: consultation */}
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line-1)' }}>
          {/* Header */}
          <div style={{ padding: '18px 32px 14px', borderBottom: '1px solid var(--line-1)', background: 'var(--bg)', flexShrink: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>
              <span style={{ color: 'var(--indigo)' }}>Phase 04</span> · Team Consultation Engine - Active
            </div>
            <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.018em' }}>{DEMO_ORG.org_name} · Consultation</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4 }}>{DEMO_ORG.engagement_trigger}</div>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            {/* Live strip */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 10, fontSize: 11.5, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--indigo)', display: 'inline-block' }} />
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{stage === 'done' ? 'Consultation complete' : 'Consultation live'}</span>
                <span style={{ color: 'var(--ink-3)' }}>· 5 specialists routing</span>
              </div>
              <span style={{ color: 'var(--ink-3)', fontSize: 10.5 }}>Elapsed <b style={{ color: 'var(--ink-1)' }}>{fmt(elapsed)}</b></span>
            </div>

            {/* Persona cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
              {PERSONAS.map((p, i) => {
                const s = ps[i];
                return (
                  <div key={p.id} style={{
                    padding: '13px 15px', background: 'var(--surface)', border: `1px solid ${s.status === 'consulting' ? 'var(--indigo-tint-2)' : 'var(--line-2)'}`,
                    borderRadius: 10, transition: 'all 300ms'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{p.label}</span>
                      <span style={{
                        fontSize: 9.5, padding: '2px 7px', borderRadius: 999, fontWeight: 600,
                        background: s.status === 'complete' ? 'var(--green-tint)' : s.status === 'consulting' ? 'var(--indigo-tint)' : 'var(--bg-tint)',
                        color: s.status === 'complete' ? 'var(--green)' : s.status === 'consulting' ? 'var(--indigo)' : 'var(--ink-3)'
                      }}>
                        {s.status === 'complete' ? '✓ Complete' : s.status === 'consulting' ? 'Consulting…' : 'Queued'}
                      </span>
                    </div>
                    {s.status !== 'pending' && (
                      <div style={{ height: 2, background: 'var(--line-1)', borderRadius: 1, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.progress}%`, background: 'var(--indigo)', borderRadius: 1, transition: 'width 350ms' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Synthesis */}
            {stage === 'done' && synthesis && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--indigo-tint-2)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-2)', marginBottom: 20 }}>
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line-1)', background: 'linear-gradient(180deg,#FDFCFA,var(--surface))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--indigo)', marginBottom: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--indigo)', display: 'inline-block' }} />
                    Seneca · Synthesised Master Briefing
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.018em' }}>Sovereign Exit Pathway Analysis</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 5 }}>
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Confidential</span> · 5 specialist contributions
                  </div>
                </div>
                <div style={{ padding: '16px 20px 20px', fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.7 }}>
                  {renderMarkdown(synthesis)}
                </div>
              </div>
            )}

            {stage === 'consulting' && (
              <div style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--line-1)', borderRadius: 10, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
                Synthesising master briefing after all specialists complete…
              </div>
            )}
          </div>
        </div>

        {/* Right: Q&A chat */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--surface)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>Questions & Clarifications</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>Ask anything about this consultation</div>
          </div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && stage === 'done' && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Suggested questions</div>
                {[
                  'What are the top compliance risks?',
                  'Summarise the financial impact',
                  'What is the recommended migration path?'
                ].map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} style={{
                    textAlign: 'left', padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--line-2)',
                    borderRadius: 7, fontSize: 11.5, color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.4
                  }}>{s}</button>
                ))}
              </div>
            )}
            {messages.length === 0 && stage !== 'done' && (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--ink-4)', fontSize: 11.5 }}>
                Chat will activate once the consultation completes.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 7 }}>
                <div style={{
                  maxWidth: '85%', padding: '8px 10px',
                  borderRadius: m.role === 'user' ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                  background: m.role === 'user' ? 'var(--indigo-tint)' : 'var(--bg-tint)',
                  border: `1px solid ${m.role === 'user' ? 'var(--indigo-tint-2)' : 'var(--line-1)'}`,
                  fontSize: 12, color: m.role === 'user' ? 'var(--indigo-deep)' : 'var(--ink-1)', lineHeight: 1.55, whiteSpace: 'pre-wrap'
                }}>{m.text}</div>
              </div>
            ))}
            {loading && (
              <div style={{ padding: '8px 10px', background: 'var(--bg-tint)', border: '1px solid var(--line-1)', borderRadius: '10px 10px 10px 3px', fontSize: 11.5, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                Thinking <span style={{ display: 'inline-block', width: '1.5px', height: 12, background: 'var(--ink-3)', animation: 'blink 1s steps(1,end) infinite' }} />
              </div>
            )}
          </div>
          {/* Composer */}
          <div style={{ padding: '8px 10px 12px', borderTop: '1px solid var(--line-1)', flexShrink: 0 }}>
            <div style={{ background: 'var(--bg-tint)', border: '1px solid var(--line-2)', borderRadius: 10, padding: '8px 10px' }}>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendMessage(); } }}
                placeholder={stage !== 'done' ? 'Available after consultation completes…' : 'Ask anything about the report…'}
                disabled={loading || stage !== 'done'}
                rows={2}
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', resize: 'none', fontSize: 12, color: 'var(--ink)', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !draft.trim() || stage !== 'done'}
                  style={{
                    padding: '5px 12px', background: draft.trim() && stage === 'done' ? 'var(--indigo)' : 'var(--bg-tint)',
                    color: draft.trim() && stage === 'done' ? '#fff' : 'var(--ink-4)',
                    borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600,
                    cursor: draft.trim() && stage === 'done' ? 'pointer' : 'not-allowed', fontFamily: 'inherit'
                  }}
                >Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}