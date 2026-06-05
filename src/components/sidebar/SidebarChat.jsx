import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const SUGGESTIONS_DISCUSS = [
  "Summarise the key compliance risks",
  "What are the top 3 vendor risks?",
  "Explain the financial model",
];
const SUGGESTIONS_EXECUTE = [
  "Elaborate on the compliance section",
  "Add a 3-year TCO breakdown",
  "Strengthen the risk mitigation plans",
];

export default function SidebarChat({ twinData, orgData, synthesis, brief, phase }) {
  const [mode, setMode] = useState("discuss");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const loadingRef = useRef(false);
  const [showModeIndicator] = useState(true);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // Load or create thread when phase 4 begins and twin IDs are available
  useEffect(() => {
    if (phase === 4 && orgData?.id && twinData?.id && !threadId) {
      loadOrCreateThread();
    }
  }, [phase, orgData?.id, twinData?.id]);

  const loadOrCreateThread = async () => {
    if (!orgData?.id || !twinData?.id) return;
    try {
      const existing = await base44.entities.ConsultationThread.filter({
        org_id: orgData.id,
        consultant_id: twinData.id
      });
      if (existing.length > 0) {
        setThreadId(existing[0].id);
        setMessages(existing[0].messages?.length > 0 ? existing[0].messages : [{ role: "seneca", text: "Consultation is live. Use Discuss to ask questions about the report, or Change to modify and elaborate on sections.", timestamp: new Date().toISOString() }]);
      } else {
        const newThread = await base44.entities.ConsultationThread.create({
          org_id: orgData.id,
          consultant_id: twinData.id,
          messages: [{ role: "seneca", text: "Consultation is live. Use Discuss to ask questions about the report, or Change to modify and elaborate on sections.", timestamp: new Date().toISOString() }],
          last_message_at: new Date().toISOString()
        });
        setThreadId(newThread.id);
        setMessages(newThread.messages);
      }
    } catch (e) {
      console.error("Failed to load/create thread:", e);
      setMessages([{ role: "seneca", text: "Consultation is live. Use Discuss to ask questions about the report, or Change to modify and elaborate on sections." }]);
    }
  };

  const saveMessages = async (updatedMessages) => {
    if (!threadId) return;
    try {
      await base44.entities.ConsultationThread.update(threadId, {
        messages: updatedMessages,
        last_message_at: new Date().toISOString()
      });
    } catch (e) {
      console.error("Failed to save messages:", e);
    }
  };

  const send = async (text) => {
    const q = (text || draft).trim();
    if (!q || loadingRef.current) return;
    loadingRef.current = true;
    setDraft("");
    
    // In execute mode, emit event to trigger report generation in main section
    if (mode === "execute") {
      const userMsg = { role: "user", text: q, timestamp: new Date().toISOString(), mode };
      const updatedWithUser = [...messages, userMsg];
      setMessages(updatedWithUser);
      saveMessages(updatedWithUser);
      loadingRef.current = false;
      
      // Emit execute report event to parent
      window.dispatchEvent(new CustomEvent('meridian:executeReport', {
        detail: { question: q, twinData, orgData, brief, synthesis, messageHistory: updatedWithUser }
      }));
      return;
    }
    
    // Discuss mode: keep chat response
    const userMsg = { role: "user", text: q, timestamp: new Date().toISOString(), mode };
    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    setLoading(true);

    const res = await base44.functions.invoke("sidebarChat", {
      mode,
      question: q,
      synthesis: synthesis || "",
      brief: brief || "",
      twinContext: twinData || {},
      orgContext: orgData || {},
      messageHistory: updatedWithUser.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text, mode: m.mode }))
    });

    loadingRef.current = false;
    setLoading(false);
    
    const senecaMsg = { role: "seneca", text: res.data.answer, timestamp: new Date().toISOString(), mode };
    const updatedWithSeneca = [...updatedWithUser, senecaMsg];
    setMessages(updatedWithSeneca);
    saveMessages(updatedWithSeneca);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          content: { type: "string", description: "Full text content" },
          summary: { type: "string", description: "Brief summary" }
        }
      }
    });

    const docText = extracted?.output?.content || extracted?.output?.summary || "";

    const userMsg = { role: "user", text: `[Uploaded: ${file.name}]`, timestamp: new Date().toISOString() };
    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);

    setUploading(false);
    setLoading(true);

    const res = await base44.functions.invoke("sidebarChat", {
      mode: "discuss",
      question: `I've uploaded a document: ${file.name}. Here's its content: ${docText.slice(0, 2000)}. Please acknowledge and tell me what new insights this adds.`,
      synthesis: synthesis || "",
      brief: brief || "",
      twinContext: twinData || {},
      orgContext: orgData || {},
    });

    setLoading(false);
    const senecaMsg = { role: "seneca", text: res.data.answer, timestamp: new Date().toISOString() };
    const updatedWithSeneca = [...updatedWithUser, senecaMsg];
    setMessages(updatedWithSeneca);
    saveMessages(updatedWithSeneca);
    e.target.value = "";
  };

  const onKey = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
  };



  const suggestions = mode === "discuss" ? SUGGESTIONS_DISCUSS : SUGGESTIONS_EXECUTE;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
      background: "var(--surface)", borderTop: "1px solid var(--line-1)"
    }}>
      {/* Header tabs */}
      {/* Mode toggle */}
      {phase === 4 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "8px 12px", flexShrink: 0,
          borderBottom: "1px solid var(--line-1)"
        }}>
          <div style={{
            display: "flex", background: "var(--bg-tint)", borderRadius: 8,
            border: "1px solid var(--line-2)", padding: 3, gap: 2
          }}>
            {["discuss", "execute"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: mode === m ? "var(--surface)" : "transparent",
                color: mode === m ? (m === "execute" ? "var(--amber)" : "var(--indigo)") : "var(--ink-3)",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                boxShadow: mode === m ? "var(--shadow-1)" : "none",
                transition: "all 180ms",
                textTransform: m === "execute" ? "capitalize" : "capitalize"
              }}>{m === "execute" ? "Execute" : "Discuss"}</button>
            ))}
          </div>
          <span style={{ fontSize: 10, color: "var(--ink-4)", flex: 1 }}>
            {mode === "discuss" ? "Ask questions, get guidance" : "Modify sections, elaborate"}
          </span>
        </div>
      )}

      {/* Messages / History */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto", padding: "12px",
        display: "flex", flexDirection: "column", gap: 10
      }}>
        <>
            {messages.length === 0 && phase < 4 && (
              <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--ink-4)", fontSize: 11.5 }}>
                Chat will activate once the consultation begins.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row",
                gap: 7, alignItems: "flex-start"
              }}>
                {m.role === "seneca" && (
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "linear-gradient(135deg,#1A1A1A,#3A3A3A)",
                    display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1
                  }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4m6 6l4 4M5 19l4-4m6-6l4-4"/>
                    </svg>
                  </div>
                )}
                <div style={{
                   maxWidth: "85%", padding: "8px 10px",
                   borderRadius: m.role === "user" ? "10px 10px 3px 10px" : "10px 10px 10px 3px",
                   background: m.role === "user" ? "var(--indigo-tint)" : "var(--bg-tint)",
                   border: `1px solid ${m.role === "user" ? "var(--indigo-tint-2)" : "var(--line-1)"}`,
                   fontSize: 13, lineHeight: 1.6, color: '#2D2D2C', whiteSpace: "pre-wrap", fontFamily: "inherit"
                 }}>
                   {m.role === "seneca" ? m.text.replace(/—/g, '-')
                     .replace(/\*\*(.*?)\*\*/g, '$1')
                     .replace(/\*(.*?)\*/g, '$1')
                     .replace(/\|/g, '')
                     .replace(/#{1,6}\s/g, '')
                     .replace(/^\s*[-•]\s/gm, '')
                     .trim() : m.text}
                 </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "linear-gradient(135deg,#1A1A1A,#3A3A3A)",
                  display: "grid", placeItems: "center", flexShrink: 0
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4m6 6l4 4M5 19l4-4m6-6l4-4"/>
                  </svg>
                </div>
                <div style={{
                  padding: "8px 10px", background: "var(--bg-tint)",
                  border: "1px solid var(--line-1)", borderRadius: "10px 10px 10px 3px",
                  fontSize: 11.5, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 5
                }}>
                  Thinking
                  <span style={{ display: "inline-block", width: "1.5px", height: 12, background: "var(--ink-3)", verticalAlign: "-2px", animation: "blink 1s steps(1,end) infinite" }} />
                </div>
              </div>
            )}
            {/* Suggestions */}
            {messages.length === 0 && phase === 4 && !loading && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink-4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Suggestions</div>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => send(s)} style={{
                    textAlign: "left", padding: "6px 9px", background: "var(--surface)",
                    border: "1px solid var(--line-2)", borderRadius: 7, fontSize: 11.5,
                    color: "var(--ink-2)", cursor: "pointer", fontFamily: "inherit",
                    transition: "all 180ms", lineHeight: 1.4
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--indigo)"; e.currentTarget.style.color = "var(--indigo)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.style.color = "var(--ink-2)"; }}
                  >{s}</button>
                ))}
              </div>
            )}
          </>
      </div>

      {/* Composer */}
      {(
        <div style={{
          padding: "8px 10px 10px", borderTop: "1px solid var(--line-1)",
          background: "var(--surface)", flexShrink: 0
        }}>
          <div style={{
            background: "var(--bg-tint)", border: "1px solid var(--line-2)",
            borderRadius: 10, padding: "8px 10px"
          }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKey}
              placeholder={phase < 4 ? "Available after consultation starts…" : mode === "discuss" ? "Ask anything about the report…" : "Request a change or elaboration…"}
              rows={2}
              disabled={loading || phase < 4}
              style={{
                width: "100%", border: "none", background: "transparent", outline: "none",
                resize: "none", fontSize: 12, color: "var(--ink)", fontFamily: "inherit",
                lineHeight: 1.5
              }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || phase < 4}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 7px", border: "1px solid var(--line-2)",
                  borderRadius: 5, background: "var(--surface)", fontSize: 10.5,
                  color: "var(--ink-3)", cursor: "pointer", fontFamily: "inherit"
                }}
              >
                📎 {uploading ? "Uploading…" : "Attach"}
              </button>
              <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleUpload}
                accept=".pdf,.docx,.txt,.xlsx,.csv,.html,.png,.jpg,.jpeg" />
              <button
                onClick={() => send()}
                disabled={loading || !draft.trim() || phase < 4}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px",
                  background: draft.trim() && phase >= 4 ? (mode === "execute" ? "var(--amber)" : "var(--indigo)") : "var(--bg-tint)",
                  color: draft.trim() && phase >= 4 ? "#fff" : "var(--ink-4)",
                  borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600,
                  cursor: draft.trim() && phase >= 4 ? "pointer" : "not-allowed",
                  fontFamily: "inherit", transition: "all 180ms"
                }}
              >
                {mode === "execute" ? "Execute" : "Send"}
                <span style={{ fontSize: 9, padding: "1px 3px", background: "rgba(255,255,255,0.2)", borderRadius: 3 }}>⌘↵</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}