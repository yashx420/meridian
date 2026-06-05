import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/* Shared CSS vars assumed injected by MeridianTCE */

const INITIAL_TWIN_MSG = "Welcome to Meridian. I'm Seneca - your sovereign reasoning host. I'll be building your Digital Twin through conversation. The more you share, the better I can reason on your behalf.\n\nLet's start with the basics: what's your name and your current role?";
const INITIAL_ORG_MSG = "Now let's build the Org Twin - a complete dossier on the client organisation. I'll ask you about everything I need to reason on their behalf.\n\nTo start: what's the name of the organisation you're engaging with, and what sector are they in?";

function Ring({ pct }) {
  const r = 19, c = 2 * Math.PI * r;
  return (
    <div className="twin-ring">
      <svg viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={r} className="twin-ring-track" />
        <circle cx="23" cy="23" r={r} className="twin-ring-fill"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div className="twin-pct">{Math.round(pct)}<small>CAL</small></div>
    </div>
  );
}

export default function OnboardingChat({ mode, onComplete, existingProfile }) {
  const isTwin = mode === 'twin';
  const initialMsg = isTwin ? INITIAL_TWIN_MSG : INITIAL_ORG_MSG;

  const [messages, setMessages] = useState([
    { role: 'seneca', content: initialMsg }
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [calibration, setCalibration] = useState(existingProfile?.calibration_pct || 0);
  const [extractedFields, setExtractedFields] = useState(existingProfile || {});
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [chatRecordId, setChatRecordId] = useState(null);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  // Load or create chat record on mount
  useEffect(() => {
    loadOrCreateChatRecord();
  }, []);

  const loadOrCreateChatRecord = async () => {
    try {
      // Scope to the current user so a reset (which deletes this user's records)
      // can't re-load another session's onboarding chat.
      const me = await base44.auth.me();
      const existing = await base44.entities.OnboardingChat.filter({ mode, created_by: me.email });
      if (existing.length > 0) {
        const record = existing[0];
        setChatRecordId(record.id);
        if (record.messages?.length > 0) {
          setMessages(record.messages);
        }
      } else {
        const newRecord = await base44.entities.OnboardingChat.create({
          mode,
          messages: [{ role: 'seneca', content: initialMsg, timestamp: new Date().toISOString() }],
          last_updated: new Date().toISOString()
        });
        setChatRecordId(newRecord.id);
      }
    } catch (e) {
      console.error('Failed to load/create chat record:', e);
    }
  };

  const saveChatMessages = async (updatedMessages) => {
    if (!chatRecordId) return;
    try {
      await base44.entities.OnboardingChat.update(chatRecordId, {
        messages: updatedMessages,
        last_updated: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to save chat messages:', e);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text || draft).trim();
    if (!q || loading) return;
    setDraft('');

    const userMsg = { role: 'user', content: q, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    // Build message history for API (exclude initial seneca message from history as it's the system prompt trigger)
    const apiMessages = newMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    const res = await base44.functions.invoke('onboardingChat', {
      mode,
      messages: apiMessages
    });

    setLoading(false);
    const data = res.data;
    const senecaMsg = { role: 'seneca', content: data.message, timestamp: new Date().toISOString() };
    const updatedMessages = [...newMessages, senecaMsg];
    setMessages(updatedMessages);
    saveChatMessages(updatedMessages);
    
    if (data.calibration_pct !== undefined) setCalibration(data.calibration_pct);
    if (data.extracted_fields) {
      setExtractedFields(prev => ({ ...prev, ...data.extracted_fields }));
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Extract text from doc
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          content: { type: "string", description: "Full text content of the document" },
          summary: { type: "string", description: "Brief summary of the document" }
        }
      }
    });

    const docText = extracted?.output?.content || extracted?.output?.summary || '';
    setDocs(prev => [...prev, { name: file.name, url: file_url, text: docText }]);
    setUploading(false);

    // Notify in chat
    const userMsg = { role: 'user', content: `I've uploaded a document: ${file.name}`, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    const apiMessages = newMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    const res = await base44.functions.invoke('onboardingChat', {
      mode,
      messages: apiMessages,
      docContext: docText.slice(0, 3000)
    });

    setLoading(false);
    const data = res.data;
    const senecaMsg = { role: 'seneca', content: data.message, timestamp: new Date().toISOString() };
    const updatedMessages = [...newMessages, senecaMsg];
    setMessages(updatedMessages);
    saveChatMessages(updatedMessages);
    
    if (data.calibration_pct !== undefined) setCalibration(data.calibration_pct);
    if (data.extracted_fields) {
      setExtractedFields(prev => ({ ...prev, ...data.extracted_fields }));
    }

    e.target.value = '';
  };

  const handleNext = async () => {
    const transcript = messages.map(m => `${m.role === 'user' ? 'USER' : 'SENECA'}: ${m.content}`).join('\n\n');
    const profileData = {
      ...extractedFields,
      display_name: extractedFields.full_name || extractedFields.org_name || (isTwin ? 'My Digital Twin' : 'Org Twin'),
      calibration_pct: calibration,
      raw_context: transcript,
      is_calibrated: calibration >= 100,
      docs
    };

    try {
      let saved;
      if (isTwin) {
        if (existingProfile?.id) {
          saved = await base44.entities.ConsultantProfile.update(existingProfile.id, profileData);
        } else {
          saved = await base44.entities.ConsultantProfile.create(profileData);
        }
      } else {
        if (existingProfile?.id) {
          saved = await base44.entities.OrgProfile.update(existingProfile.id, profileData);
        } else {
          saved = await base44.entities.OrgProfile.create(profileData);
        }
      }
      onComplete(saved || profileData);
    } catch (e) {
      console.error('Failed to save profile:', e);
      onComplete(profileData);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Calibration bar */}
      <div style={{ padding: '14px 32px', borderBottom: '1px solid var(--line-1)', background: 'var(--surface)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Ring pct={calibration} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
            {isTwin ? 'Digital Twin' : 'Org Twin'} · {Math.round(calibration)}% calibrated
          </div>
          <div style={{ height: 4, background: 'var(--line-2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${calibration}%`, background: 'var(--indigo)', borderRadius: 2, transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
          {calibration >= 100 && (
            <div style={{ fontSize: 10.5, color: 'var(--green)', fontWeight: 550, marginTop: 3 }}>
              ✓ Fully calibrated - you can keep adding context or click Next
            </div>
          )}
        </div>
        {/* Extracted fields preview */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 300 }}>
          {Object.entries(extractedFields).filter(([k]) => !['raw_context','calibration_pct','is_calibrated','docs'].includes(k)).slice(0, 6).map(([k, v]) => (
            v && <span key={k} style={{ fontSize: 9.5, padding: '2px 7px', background: 'var(--indigo-tint)', color: 'var(--indigo-deep)', borderRadius: 4, fontWeight: 550 }}>
              {Array.isArray(v) ? v.slice(0,2).join(', ') : String(v).slice(0, 30)}
            </span>
          ))}
        </div>
        <button
          onClick={handleNext}
          style={{ padding: '7px 16px', background: 'var(--indigo)', color: '#fff', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
        >
          {calibration >= 100 ? 'Continue →' : 'Skip / Next →'}
        </button>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            {m.role === 'seneca' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1A1A1A,#3A3A3A)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4m6 6l4 4M5 19l4-4m6-6l4-4"/>
                </svg>
              </div>
            )}
            <div style={{
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: m.role === 'user' ? 'var(--indigo-tint)' : 'var(--surface)',
              border: `1px solid ${m.role === 'user' ? 'var(--indigo-tint-2)' : 'var(--line-2)'}`,
              fontSize: 13.5,
              color: m.role === 'user' ? 'var(--indigo-deep)' : 'var(--ink-1)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1A1A1A,#3A3A3A)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4m6 6l4 4M5 19l4-4m6-6l4-4"/>
              </svg>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: '12px 12px 12px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Seneca is thinking</span>
              <span style={{ display: 'inline-block', width: '1.5px', height: 14, background: 'var(--ink)', verticalAlign: '-2px', animation: 'blink 1s steps(1,end) infinite' }} />
            </div>
          </div>
        )}
        {/* Uploaded docs */}
        {docs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 8 }}>
            {docs.map((d, i) => (
              <span key={i} style={{ fontSize: 10.5, padding: '3px 8px', background: 'var(--amber-tint)', color: 'var(--amber)', border: '1px solid rgba(180,83,9,0.15)', borderRadius: 5, fontWeight: 550 }}>
                📎 {d.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div style={{ padding: '14px 32px 20px', borderTop: '1px solid var(--line-1)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ background: 'var(--bg-tint)', border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 14px' }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={isTwin ? "Tell Seneca about yourself…" : "Tell Seneca about the organisation…"}
            rows={2}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', resize: 'none', fontSize: 13.5, color: 'var(--ink)', fontFamily: 'inherit', lineHeight: 1.5 }}
            disabled={loading}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', border: '1px solid var(--line-2)', borderRadius: 6, background: 'var(--surface)', fontSize: 11, color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {uploading ? '⏳' : '📎'} {uploading ? 'Uploading…' : 'Upload document'}
              </button>
              <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleUpload} accept=".pdf,.docx,.txt,.xlsx,.csv,.html,.png,.jpg,.jpeg" />
            </div>
            <button
              onClick={() => send()}
              disabled={loading || !draft.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: draft.trim() ? 'var(--indigo)' : 'var(--bg-tint)', color: draft.trim() ? '#fff' : 'var(--ink-4)', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 550, cursor: draft.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 180ms' }}
            >
              Send <span style={{ fontSize: 9.5, padding: '1px 4px', background: 'rgba(255,255,255,0.18)', borderRadius: 3 }}>⌘↵</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}