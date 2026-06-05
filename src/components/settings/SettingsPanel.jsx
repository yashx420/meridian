import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

function InviteClientSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // null | 'sending' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const handleInvite = async () => {
    const e = email.trim();
    if (!e || !e.includes('@')) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      await base44.users.inviteUser(e, 'user');
      await base44.functions.invoke('setClientRole', { email: e });
      setStatus('sent');
      setEmail('');
      setTimeout(() => setStatus(null), 5000);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')) {
        setErrorMsg('This email is already registered or has a pending invite.');
      } else {
        setErrorMsg('Failed to send invite. Please try again.');
      }
      setStatus('error');
      setTimeout(() => { setStatus(null); setErrorMsg(''); }, 5000);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Invite Client</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 10, padding: '14px' }}>
        <p style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 12 }}>
          Send your client a secure link to view this consultation. They'll set their own password and access a read-only portal.
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); if (status === 'error') { setStatus(null); setErrorMsg(''); } }}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            placeholder="client@organisation.com"
            disabled={status === 'sending' || status === 'sent'}
            style={{
              flex: 1, padding: '7px 10px',
              border: `1px solid ${status === 'error' ? '#ef4444' : 'var(--line-2)'}`,
              borderRadius: 7, fontSize: 12, color: 'var(--ink)', background: 'var(--bg-tint)',
              outline: 'none', fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleInvite}
            disabled={!email.trim() || status === 'sending' || status === 'sent'}
            style={{
              padding: '7px 13px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600,
              background: status === 'sent' ? '#15803d' : status === 'error' ? '#ef4444' : 'var(--indigo)',
              color: '#fff',
              cursor: !email.trim() || status === 'sending' || status === 'sent' ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'all 200ms', whiteSpace: 'nowrap', opacity: status === 'sending' ? 0.7 : 1
            }}
          >
            {status === 'sending' ? 'Sending…' : status === 'sent' ? '✓ Sent' : status === 'error' ? '✗ Failed' : 'Send invite'}
          </button>
        </div>
        {status === 'sent' && (
          <p style={{ fontSize: 11, color: '#15803d', marginTop: 8, fontWeight: 500 }}>
            ✓ Invite sent — they'll receive an email to confirm and set their password.
          </p>
        )}
        {status === 'error' && errorMsg && (
          <p style={{ fontSize: 11, color: '#ef4444', marginTop: 8, fontWeight: 500 }}>
            ✗ {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}

function Ring({ pct }) {
  const r = 19, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 46, height: 46, flexShrink: 0 }}>
      <svg viewBox="0 0 46 46" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
        <circle cx="23" cy="23" r={r} fill="none" stroke="var(--line-2)" strokeWidth="2.5" />
        <circle cx="23" cy="23" r={r} fill="none" stroke="var(--indigo)" strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>{Math.round(pct)}</span>
        <span style={{ fontSize: 7.5, fontWeight: 500, color: "var(--ink-3)", letterSpacing: "0.06em" }}>CAL</span>
      </div>
    </div>
  );
}

function DocItem({ doc, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", background: "var(--surface)", border: "1px solid var(--line-1)", borderRadius: 7 }}>
      <span style={{ fontSize: 13 }}>📎</span>
      <span style={{ flex: 1, fontSize: 11.5, color: "var(--ink-1)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name || doc.file_name}</span>
      {confirming ? (
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={() => { onDelete(doc); setConfirming(false); }} style={{ padding: "2px 8px", background: "var(--destructive, #ef4444)", color: "#fff", border: "none", borderRadius: 5, fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>Delete</button>
          <button onClick={() => setConfirming(false)} style={{ padding: "2px 8px", background: "var(--bg-tint)", border: "1px solid var(--line-2)", borderRadius: 5, fontSize: 10.5, color: "var(--ink-2)", cursor: "pointer" }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} style={{ padding: "2px 7px", background: "none", border: "1px solid var(--line-2)", borderRadius: 5, fontSize: 10.5, color: "var(--ink-3)", cursor: "pointer" }}>Remove</button>
      )}
    </div>
  );
}

function TwinCard({ label, data, type, onEdit }) {
  if (!data) {
    return (
      <div style={{ padding: 14, background: "var(--surface-alt)", border: "1px dashed var(--line-3)", borderRadius: 10 }}>
        <div style={{ fontSize: 11.5, color: "var(--ink-4)", textAlign: "center", padding: "12px 0" }}>No {label} yet</div>
      </div>
    );
  }

  const pct = data.calibration_pct || 0;
  const name = type === "consultant" ? (data.full_name || data.display_name || "-") : (data.org_name || data.display_name || "-");
  const sub = type === "consultant"
    ? (data.role_title || "Digital Twin")
    : `Engagement · ${data.engagement_trigger || "Active"}`;
  const docs = data.docs || [];

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 10, overflow: "hidden" }}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px 10px" }}>
        <Ring pct={pct} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.25 }}>{name}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>
        </div>
      </div>

      {/* Fields */}
      <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {type === "consultant" && <>
          {data.years_experience && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>Experience</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-1)" }}>{data.years_experience} · {data.sectors?.join(", ") || ""}</div>
            </div>
          )}
          {data.expertise_tags?.length > 0 && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Expertise</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {data.expertise_tags.map((t, i) => (
                  <span key={i} style={{ fontSize: 10.5, padding: "2px 8px", background: "var(--indigo-tint)", color: "var(--indigo-deep)", borderRadius: 4, fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {data.decision_style && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>Decision Style</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-1)" }}>{data.decision_style}</div>
            </div>
          )}
        </>}

        {type === "org" && <>
          {(data.size || data.current_tech_stack) && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>Footprint</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-1)" }}>{[data.size, data.current_tech_stack].filter(Boolean).join(" · ")}</div>
            </div>
          )}
          {data.compliance_frameworks?.length > 0 && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Compliance</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {data.compliance_frameworks.map((t, i) => (
                  <span key={i} style={{ fontSize: 10.5, padding: "2px 8px", background: "var(--indigo-tint)", color: "var(--indigo-deep)", borderRadius: 4, fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {data.engagement_trigger && (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>Trigger</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-1)" }}>{data.engagement_trigger}</div>
            </div>
          )}
        </>}

        {/* Documents */}
        {docs.length > 0 && (
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Documents</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {docs.map((doc, i) => (
                <DocItem key={i} doc={doc} onDelete={(d) => onEdit({ ...data, docs: docs.filter((_, j) => j !== i) })} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--line-1)", padding: "10px 14px", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onEdit} style={{
          padding: "5px 12px", background: "none", border: "1px solid var(--line-2)",
          borderRadius: 6, fontSize: 11.5, fontWeight: 600, color: "var(--ink-2)",
          cursor: "pointer", fontFamily: "inherit", transition: "all 180ms"
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--indigo)"; e.currentTarget.style.color = "var(--indigo)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.color = "var(--ink-2)"; }}
        >Edit</button>
      </div>
    </div>
  );
}

function ResetDemoSection({ onResetDemo }) {
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState(null); // null | 'resetting'

  const handleReset = async () => {
    setStatus('resetting');
    try {
      await onResetDemo();
      // The panel is closed by the parent on success.
    } catch {
      setStatus(null);
      setConfirming(false);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Demo</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 10, padding: '14px' }}>
        <p style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 12 }}>
          Reset the demo to a clean slate. This permanently deletes the Digital Twin, Org Twin, consultations and chat history for this account and restarts the onboarding flow from Phase 1.
        </p>
        {confirming ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleReset}
              disabled={status === 'resetting'}
              style={{
                flex: 1, padding: '7px 13px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600,
                background: '#ef4444', color: '#fff', cursor: status === 'resetting' ? 'default' : 'pointer',
                fontFamily: 'inherit', opacity: status === 'resetting' ? 0.7 : 1
              }}
            >
              {status === 'resetting' ? 'Resetting…' : 'Yes, reset everything'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={status === 'resetting'}
              style={{
                padding: '7px 13px', borderRadius: 7, border: '1px solid var(--line-2)', fontSize: 12,
                color: 'var(--ink-2)', background: 'var(--bg-tint)', cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            style={{
              width: '100%', padding: '7px 13px', borderRadius: 7, border: '1px solid #ef4444',
              fontSize: 12, fontWeight: 600, background: 'none', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            Reset demo
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPanel({ twinData, orgData, onClose, onEditTwin, onEditOrg, onResetDemo }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.28)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}>
      <div style={{ width: 360, maxHeight: "88vh", background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 18, boxShadow: "var(--shadow-3)", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Twins & Context</div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: 7, background: "transparent", border: "1px solid transparent", cursor: "pointer", color: "var(--ink-2)", fontSize: 17 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Digital Twin */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Digital Twin</div>
              {twinData && <button onClick={onEditTwin} style={{ fontSize: 11, fontWeight: 600, color: "var(--indigo)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Edit</button>}
            </div>
            <TwinCard label="Digital Twin" data={twinData} type="consultant" onEdit={onEditTwin} />
          </div>

          {/* Org Twin */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Org Twin</div>
              {orgData && <button onClick={onEditOrg} style={{ fontSize: 11, fontWeight: 600, color: "var(--indigo)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>View</button>}
            </div>
            <TwinCard label="Org Twin" data={orgData} type="org" onEdit={onEditOrg} />
          </div>

          {/* Invite Client */}
          <InviteClientSection />

          {/* Reset Demo */}
          {onResetDemo && <ResetDemoSection onResetDemo={onResetDemo} />}
        </div>
      </div>
    </div>
  );
}