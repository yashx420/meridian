import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import DownloadReport from "@/components/onboarding/DownloadReport";
import { PERSONAS } from "@/lib/personas";

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    
    // Table detection
    if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter(r => !/^\s*\|[\s\-:]+\|/.test(r));
      if (rows.length > 0) {
        const parseRow = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim().replace(/\*\*/g, '').replace(/\*/g, '').replace(/—/g, '-'));
        const header = parseRow(rows[0]);
        const body = rows.slice(1);
        elements.push(
          <div key={`table-${i}`} style={{overflowX:'auto',margin:'12px 0'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,lineHeight:1.5}}>
              <thead><tr>{header.map((h,ci)=>(
                <th key={ci} style={{padding:'10px 12px',background:'var(--bg-tint)',borderBottom:'2px solid var(--line-2)',borderRight:'1px solid var(--line-1)',textAlign:'left',fontSize:11,fontWeight:600,color:'var(--ink-3)',letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
              ))}</tr></thead>
              <tbody>{body.map((row,ri)=>{const cells=parseRow(row);return(<tr key={ri} style={{borderBottom:'1px solid var(--line-1)'}}>{cells.map((c,ci)=>(<td key={ci} style={{padding:'10px 12px',borderRight:ci<cells.length-1?'1px solid var(--line-1)':'none',color:'var(--ink-1)',verticalAlign:'top',background:ri%2===0?'var(--surface)':'var(--surface-alt)'}}>{formatInline(c)}</td>))}</tr>);})}</tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    
    // Headers
    if (line.match(/^#{1,4}\s/)) {
      const level = line.match(/^#+/)[0].length;
      const text = line.replace(/^#+\s/, '').trim().replace(/\*\*/g, '').replace(/\*/g, '').replace(/—/g, '-');
      const sizes = {1:16, 2:14, 3:13, 4:11.5};
      const margins = {1:'20px 0 12px', 2:'18px 0 10px', 3:'16px 0 8px', 4:'14px 0 6px'};
      elements.push(<div key={i} style={{fontSize:sizes[level],fontWeight:600,color:'var(--ink)',margin:margins[level],letterSpacing:level===1?'-0.015em':'-0.01em'}}>{text}</div>);
      i++;
      continue;
    }
    
    // Lists
    if (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)) {
      const listItems = [];
      const ordered = !!line.match(/^\d+\.\s/);
      while (i < lines.length && (lines[i].trim().match(/^[-*]\s/) || lines[i].trim().match(/^\d+\.\s/))) {
        const trimmed = lines[i].trim();
        const numMatch = trimmed.match(/^(\d+)\.\s/);
        const content = trimmed.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
        listItems.push(
          <li key={i} style={{paddingLeft:ordered?22:16,position:'relative',marginTop:6,fontSize:12.5,color:'var(--ink-1)',lineHeight:1.65}}>
            {ordered
              ? <span style={{position:'absolute',left:0,top:0,fontSize:12.5,fontWeight:600,color:'var(--ink-2)'}}>{(numMatch?numMatch[1]:listItems.length+1)}.</span>
              : <span style={{position:'absolute',left:2,top:9,width:4,height:4,background:'var(--ink-3)',borderRadius:'50%',display:'inline-block'}}></span>}
            {formatInline(content)}
          </li>
        );
        i++;
      }
      elements.push(<ul key={`list-${i}`} style={{paddingLeft:0,listStyle:'none',margin:'8px 0'}}>{listItems}</ul>);
      continue;
    }
    
    // Empty lines
    if (line === '') { i++; continue; }
    
    // Paragraphs with inline formatting
    elements.push(<p key={i} style={{fontSize:13,color:'var(--ink-1)',lineHeight:1.7,margin:'8px 0'}}>{formatInline(line)}</p>);
    i++;
  }
  
  return elements;
}

function formatInline(text) {
  if (!text) return text;
  // Remove all asterisks and handle bold markdown
  const cleanText = String(text).replace(/\*\*/g, '').replace(/\*/g, '').replace(/—/g, '-');
  
  const parts = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  let lastIdx = 0;
  
  // Find bold sections in original text
  const originalBoldRegex = /\*\*(.*?)\*\*/g;
  while ((match = originalBoldRegex.exec(text)) !== null) {
    const beforeText = text.slice(lastIdx, match.index).replace(/\*\*/g, '').replace(/\*/g, '').replace(/—/g, '-');
    if (beforeText) parts.push(beforeText);
    parts.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
    lastIdx = match.index + match[0].length;
  }
  
  const afterText = text.slice(lastIdx).replace(/\*\*/g, '').replace(/\*/g, '').replace(/—/g, '-');
  if (afterText) parts.push(afterText);
  
  return parts.length > 0 ? parts : cleanText;
}

export default function ExecuteReport({ twinContext, orgContext, brief, question, messageHistory, team, iconSet, onComplete }) {
  const [stage, setStage] = useState('analyzing'); // analyzing | synthesizing | done
  const activeSpecialists = team || PERSONAS;
  // The deep-dive consults every assembled specialist, so every index is relevant.
  const relevantIndices = activeSpecialists.map((_, i) => i);
  const [ps, setPs] = useState(activeSpecialists.map(() => ({ status: 'pending', progress: 0 })));
  const [results, setResults] = useState({});
  const [synthesis, setSynthesis] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [viewPersona, setViewPersona] = useState(null);
  const [showRoi, setShowRoi] = useState(false);
  const [elapsedAtDone, setElapsedAtDone] = useState(null);
  // Configurable ROI parameters (defaults per demo spec).
  const [roi, setRoi] = useState({ hourlyRate: 250, days: 2, costPerMinute: 0.3 });

  useEffect(() => { const t = setInterval(() => setElapsed(e => e + 1), 1000); return () => clearInterval(t); }, []);

  // When all specialists finish, snapshot the live timer and reveal the ROI
  // summary full-screen before the user drops into individual analyses.
  useEffect(() => {
    if (stage === 'done') {
      setElapsedAtDone((prev) => (prev == null ? elapsed : prev));
      setShowRoi(true);
    }
  }, [stage]);

  useEffect(() => {
    runExecuteAnalysis();
  }, []);

  const runExecuteAnalysis = async () => {
    const collectedResults = {};
    
    for (let i = 0; i < activeSpecialists.length; i++) {
      const p = activeSpecialists[i];
      setPs(prev => { const x = [...prev]; x[i] = { status: 'consulting', progress: 5 }; return x; });
      
      const animInterval = setInterval(() => {
        setPs(prev => { const x = [...prev]; if (x[i] && x[i].progress < 90) x[i] = { ...x[i], progress: x[i].progress + 3 }; return x; });
      }, 280);
      
      const res = await base44.functions.invoke('personaConsult', {
        mode: 'persona', personaId: p.id, brief, twinContext, orgContext, question, messageHistory, teamRole: p.teamRole, dynamicPersona: p
      });
      
      clearInterval(animInterval);
      collectedResults[p.id] = res.data.analysis;
      setResults(prev => ({ ...prev, [p.id]: res.data.analysis }));
      setPs(prev => { const x = [...prev]; x[i] = { status: 'complete', progress: 100 }; return x; });
    }

    setStage('synthesizing');
    const personaResults = activeSpecialists.map(p => ({ role: p.role, analysis: collectedResults[p.id] || '' }));
    const synthRes = await base44.functions.invoke('personaConsult', {
      mode: 'synthesise', brief, twinContext, orgContext, personaResults, question, messageHistory
    });
    
    setSynthesis(synthRes.data.synthesis);
    setStage('done');
  };

  const fmt = s => { const m = String(Math.floor(s / 60)).padStart(2, '0'); const sc = String(s % 60).padStart(2, '0'); return `00:${m}:${sc}`; };

  const elaboratePersona = async (personaId) => {
    const persona = activeSpecialists.find(p => p.id === personaId);
    if (!persona) return;
    
    setPs(prev => {
      const x = [...prev];
      const idx = activeSpecialists.findIndex(p => p.id === personaId);
      x[idx] = { status: 'consulting', progress: 5 };
      return x;
    });

    const animInterval = setInterval(() => {
      setPs(prev => {
        const x = [...prev];
        const idx = activeSpecialists.findIndex(p => p.id === personaId);
        if (x[idx] && x[idx].progress < 90) x[idx] = { ...x[idx], progress: x[idx].progress + 3 };
        return x;
      });
    }, 280);

    const res = await base44.functions.invoke('personaConsult', {
      mode: 'persona', personaId, brief, twinContext, orgContext, question, messageHistory, teamRole: persona.teamRole, dynamicPersona: persona
    });

    clearInterval(animInterval);
    const updatedAnalysis = res.data.analysis;
    setResults(prev => ({ ...prev, [personaId]: updatedAnalysis }));
    const idx = activeSpecialists.findIndex(p => p.id === personaId);
    setPs(prev => { const x = [...prev]; x[idx] = { status: 'complete', progress: 100 }; return x; });
  };

  const roiMinutes = (elapsedAtDone == null ? elapsed : elapsedAtDone) / 60;
  const humanCostEach = roi.hourlyRate * 8 * roi.days;
  const tceCostEach = roiMinutes * roi.costPerMinute;
  const savingEach = humanCostEach - tceCostEach;
  const totalSaving = savingEach * activeSpecialists.length;
  const eur = (n) => '€' + Number(n).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const setRoiNum = (k) => (e) => setRoi((r) => ({ ...r, [k]: Math.max(0, Number(e.target.value) || 0) }));

  return (
    <>
      {showRoi && stage === 'done' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,14,10,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20, animation: 'fadeIn 300ms ease-out' }}>
          <div style={{ width: '100%', maxWidth: 780, maxHeight: '92vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-3)' }}>
            {/* Header */}
            <div style={{ padding: '22px 26px', background: 'linear-gradient(135deg, var(--indigo-tint), var(--amber-tint))', borderBottom: '1px solid var(--indigo-tint-2)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--indigo-deep)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Return on Investment · This session</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{eur(totalSaving)} saved</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4 }}>
                {activeSpecialists.length} specialists · {fmt(elapsedAtDone == null ? elapsed : elapsedAtDone)} elapsed vs an estimated {roi.days * activeSpecialists.length} consultant-days
              </div>
            </div>

            {/* Configurable parameters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '16px 26px', borderBottom: '1px solid var(--line-1)' }}>
              {[
                { k: 'hourlyRate', label: 'Hourly rate (€)', step: 10 },
                { k: 'days', label: 'Days / specialist', step: 0.5 },
                { k: 'costPerMinute', label: 'TCE €/min', step: 0.05 },
              ].map((f) => (
                <label key={f.k} style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 9.5, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</span>
                  <input type="number" min="0" step={f.step} value={roi[f.k]} onChange={setRoiNum(f.k)}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--line-2)', borderRadius: 7, fontSize: 13, color: 'var(--ink)', background: 'var(--bg-tint)', outline: 'none', fontFamily: 'inherit' }} />
                </label>
              ))}
            </div>

            {/* Comparison table */}
            <div style={{ padding: '8px 26px 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Specialist', 'Human equivalent', 'Human cost', 'TCE cost', 'Saving'].map((h, ci) => (
                      <th key={h} style={{ padding: '9px 8px', textAlign: ci === 0 ? 'left' : 'right', fontSize: 9.5, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '2px solid var(--line-2)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeSpecialists.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--line-1)' }}>
                      <td style={{ padding: '9px 8px', color: 'var(--ink-1)', fontWeight: 600 }}>{p.role}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: 'var(--ink-2)' }}>{roi.days} days × €{roi.hourlyRate}/hr × 8hrs</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: 'var(--ink-2)' }}>{eur(humanCostEach)}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: 'var(--ink-2)' }}>{eur(tceCostEach)}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>{eur(savingEach)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} style={{ padding: '11px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--ink)' }}>Total saved</td>
                    <td style={{ padding: '11px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d', fontSize: 14 }}>{eur(totalSaving)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 26px 22px' }}>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', maxWidth: 420, lineHeight: 1.5 }}>
                Saving calculated live from this session's timer against your own team's rates. TCE cost = elapsed minutes × €/min.
              </div>
              <button onClick={() => setShowRoi(false)}
                style={{ flexShrink: 0, padding: '9px 18px', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Continue to analysis →
              </button>
            </div>
          </div>
        </div>
      )}
      {viewPersona && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,12,0.32)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={() => setViewPersona(null)}>
          <div style={{ width: 680, maxHeight: '82vh', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{viewPersona.role}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{viewPersona.spec}</div>
              </div>
              <button onClick={() => setViewPersona(null)} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-1)', lineHeight: 1.65 }}>
                {renderMarkdown(results[viewPersona.id])}
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ maxWidth: 760, margin: '24px auto', padding: '20px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Execute Analysis</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{question}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }}>Elapsed<br/><b style={{ color: 'var(--ink)' }}>{fmt(elapsed)}</b></div>
        </div>

        {/* Overall execution progress */}
        {stage !== 'done' && (() => {
          const total = relevantIndices.length || 1;
          const overall = Math.round(relevantIndices.reduce((a, i) => a + (ps[i]?.progress || 0), 0) / total);
          const doneCount = relevantIndices.filter((i) => ps[i]?.status === 'complete').length;
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--ink-3)', marginBottom: 6 }}>
                <span>{stage === 'synthesizing' ? 'Synthesising master briefing…' : `Executing specialist team · ${doneCount}/${total} complete`}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{stage === 'synthesizing' ? 100 : overall}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--line-1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stage === 'synthesizing' ? 100 : overall}%`, background: 'var(--indigo)', borderRadius: 2, transition: 'width 350ms' }} />
              </div>
            </div>
          );
        })()}

        {/* Personas - Analyzing Phase */}
        {stage !== 'done' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
            {activeSpecialists.map((p, i) => {
              const isRelevant = relevantIndices.includes(i);
              if (!isRelevant) return null;
              const s = ps[i] || { status: 'pending', progress: 0 };
              const Ic = iconSet[p.icon];
              return (
                <div key={p.id} onClick={() => results[p.id] ? setViewPersona(p) : elaboratePersona(p.id)} style={{
                  padding: '14px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)',
                  opacity: s.status === 'pending' && !results[p.id] ? 0.6 : 1, cursor: 'pointer', transition: 'all 200ms'
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.boxShadow = 'var(--shadow-1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-tint)', border: '1px solid var(--line-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-1)', flexShrink: 0 }}>
                      <Ic size={15} />
                    </div>
                    {s.status === 'complete' && <span style={{ fontSize: 10, padding: '3px 8px', background: 'var(--green-tint)', color: 'var(--green)', borderRadius: 999, fontWeight: 600, flexShrink: 0 }}>● Complete</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{p.role}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginBottom: 10 }}>{p.spec}</div>
                  <div style={{ height: '2px', background: 'var(--line-1)', borderRadius: '1px', overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ height: '100%', width: `${s.progress}%`, background: 'var(--indigo)', borderRadius: '1px', transition: 'width 350ms' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--line-1)', fontSize: 11, color: 'var(--ink-3)' }}>
                    <span>Confidence {p.confidence || 93}%</span>
                    {s.status !== 'pending' && <span style={{ color: 'var(--indigo)', fontWeight: 550, cursor: 'pointer' }}>View analysis →</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Synthesis Status */}
      {stage === 'synthesizing' && (
        <div style={{ padding: '14px', background: 'var(--bg-tint)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-md)', textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
          Synthesising analysis from all specialists…
        </div>
      )}

        {/* Report and Personas Grid */}
        {stage === 'done' && synthesis && (
          <div style={{ animation: 'fadeIn 400ms ease-out' }}>
            <div style={{ padding: '14px', background: 'linear-gradient(135deg, var(--indigo-tint), var(--amber-tint))', border: '1px solid var(--indigo-tint-2)', borderRadius: 'var(--r-md)', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--indigo-deep)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Generated Analysis</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-1)' }}>
                {renderMarkdown(synthesis)}
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--indigo-tint-2)' }}>
                <DownloadReport synthesis={synthesis} twinFields={twinContext} orgFields={orgContext} />
              </div>
            </div>

            {/* Personas Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 14 }}>
              {activeSpecialists.map((p) => {
                const Ic = iconSet[p.icon];
                return (
                  <div key={p.id} onClick={() => setViewPersona(p)} style={{
                    padding: '16px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)',
                    cursor: 'pointer', transition: 'all 200ms', display: 'flex', flexDirection: 'column', gap: 10
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.boxShadow = 'var(--shadow-1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Header with icon and badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-tint)', border: '1px solid var(--line-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-1)', flexShrink: 0 }}>
                        <Ic size={16} />
                      </div>
                      <span style={{ fontSize: 10.5, padding: '3px 9px', background: 'var(--green-tint)', color: 'var(--green)', border: 'none', borderRadius: 999, fontWeight: 600, flexShrink: 0 }}>● Complete</span>
                    </div>

                    {/* Title and spec */}
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{p.role}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{p.spec}</div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 3, background: 'var(--line-1)', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                      <div style={{ height: '100%', width: '100%', background: 'var(--indigo)', borderRadius: 2 }} />
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid var(--line-1)' }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Confidence {p.confidence || 93}%</span>
                      <span style={{ fontSize: 11, fontWeight: 550, color: 'var(--indigo)' }}>View analysis →</span>
                    </div>
                  </div>
                );
              })}
            </div>


          </div>
        )}

        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    </>
  );
}