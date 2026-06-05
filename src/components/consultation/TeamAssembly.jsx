import React, { useMemo, useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { TEAM_ROLES } from "@/lib/personas";
import { base44 } from "@/api/base44Client";

export default function TeamAssembly({ iconSet, orgName, orgData, twinData, brief, onExecute }) {
  const [loading, setLoading] = useState(true);
  const [dynamicLibrary, setDynamicLibrary] = useState([]);
  const [team, setTeam] = useState([]);
  const [query, setQuery] = useState("");
  const [suggestedCount, setSuggestedCount] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchTeam = async () => {
      try {
        const res = await base44.functions.invoke('assembleTeam', {
          twinContext: twinData,
          orgContext: orgData,
          brief
        });
        if (!active) return;
        const generated = res.data.personas || [];
        
        // Make sure all generated personas have an id
        generated.forEach(p => { 
          if (!p.id) p.id = p.role.toLowerCase().replace(/[^a-z0-9]/g, '-'); 
        });
        
        setDynamicLibrary(generated);
        
        // Pick the top ones for the suggested team
        const initialTeam = generated.slice(0, 5).map((p, i) => {
          let role = 'Contributor';
          if (i === 0) role = 'Lead';
          else if (i === 1) role = 'Synthesizer';
          else if (i === 2) role = 'Challenger';
          return { personaId: p.id, role, dynamicPersona: p };
        });
        
        setTeam(initialTeam);
        setSuggestedCount(initialTeam.length);
        setLoading(false);
      } catch (err) {
        console.error("Failed to assemble team dynamically:", err);
        setLoading(false);
      }
    };
    fetchTeam();
    return () => { active = false; };
  }, [orgData, twinData, brief]);

  const inTeam = useMemo(() => new Set(team.map((t) => t.personaId)), [team]);

  const library = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dynamicLibrary.filter(
      (p) => !inTeam.has(p.id) && (!q || p.role.toLowerCase().includes(q) || p.spec.toLowerCase().includes(q))
    );
  }, [query, inTeam, dynamicLibrary]);

  const addPersona = (id, index = team.length) => {
    if (inTeam.has(id)) return;
    const p = dynamicLibrary.find(x => x.id === id);
    if (!p) return;
    const next = [...team];
    next.splice(index, 0, { personaId: id, role: "Contributor", dynamicPersona: p });
    setTeam(next);
  };
  const removePersona = (id) => setTeam((t) => t.filter((m) => m.personaId !== id));
  const setRole = (id, role) => setTeam((t) => t.map((m) => (m.personaId === id ? { ...m, role } : m)));

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === "library" && destination.droppableId === "team") {
      const persona = library[source.index];
      if (persona) addPersona(persona.id, destination.index);
    } else if (source.droppableId === "team" && destination.droppableId === "team") {
      setTeam((t) => {
        const next = [...t];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        return next;
      });
    } else if (source.droppableId === "team" && destination.droppableId === "library") {
      const member = team[source.index];
      if (member) removePersona(member.personaId);
    }
  };

  const Ic = (icon) => {
    const C = iconSet?.[icon];
    return C ? <C /> : null;
  };

  const resetToSuggested = () => {
    const initialTeam = dynamicLibrary.slice(0, 5).map((p, i) => {
      let role = 'Contributor';
      if (i === 0) role = 'Lead';
      else if (i === 1) role = 'Synthesizer';
      else if (i === 2) role = 'Challenger';
      return { personaId: p.id, role, dynamicPersona: p };
    });
    setTeam(initialTeam);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 920, margin: "8px auto 0", width: "100%", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Assembling Specialist Team...</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 32 }}>Seneca is evaluating the engagement context to dynamically provision the perfect team of experts.</div>
        <div className="persona-grid">
           {Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="persona" style={{ opacity: 0.4, borderStyle: 'dashed', animation: 'pulseDot 1.4s ease-in-out infinite', animationDelay: `${i * 200}ms` }}>
               <div className="p-head">
                 <div className="p-icon" style={{ background: 'var(--bg-tint)', color: 'var(--ink-4)' }}></div>
                 <div className="p-info">
                   <div className="p-role" style={{ color: 'var(--ink-4)' }}>Calibrating...</div>
                 </div>
               </div>
             </div>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 920, margin: "8px auto 0", width: "100%" }}>
      {/* Seneca suggestion banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: "linear-gradient(135deg, var(--indigo-tint), var(--amber-tint))", border: "1px solid var(--indigo-tint-2)", borderRadius: "var(--r-md)", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>
          <b style={{ color: "var(--ink)" }}>Seneca recommends</b> this {suggestedCount}-specialist team for{orgName ? ` ${orgName}` : " this engagement"}, tailored to its stack, compliance profile and challenges. Adjust the roster and roles, then execute.
        </div>
        <button
          onClick={resetToSuggested}
          style={{ flexShrink: 0, padding: "7px 13px", background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: "var(--indigo-deep)", cursor: "pointer", fontFamily: "inherit" }}
        >
          Use Seneca's team
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 16, alignItems: "start" }}>
          {/* Library */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-1)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>Persona library</div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter specialists…"
                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--line-2)", borderRadius: 7, fontSize: 12, color: "var(--ink)", background: "var(--bg-tint)", outline: "none", fontFamily: "inherit" }}
              />
            </div>
            <Droppable droppableId="library">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 120 }}>
                  {library.map((p, i) => (
                    <Draggable key={p.id} draggableId={p.id} index={i}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 8, boxShadow: snap.isDragging ? "var(--shadow-2)" : "none", ...prov.draggableProps.style }}
                        >
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-tint)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center", color: "var(--ink-1)", flexShrink: 0 }}>{Ic(p.icon)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{p.role}</div>
                            <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{p.spec}</div>
                          </div>
                          <button onClick={() => addPersona(p.id)} title="Add to team" style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: "1px solid var(--line-2)", background: "var(--surface)", color: "var(--indigo)", cursor: "pointer", fontSize: 16, lineHeight: 1, fontFamily: "inherit" }}>+</button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {library.length === 0 && (
                    <div style={{ fontSize: 11.5, color: "var(--ink-4)", textAlign: "center", padding: "16px 0" }}>All matching specialists are on the team.</div>
                  )}
                </div>
              )}
            </Droppable>
          </div>

          {/* Team */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>Specialist team</div>
              <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{team.length} assigned</span>
            </div>
            <Droppable droppableId="team">
              {(provided, dropSnap) => (
                <div ref={provided.innerRef} {...provided.droppableProps} style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 160, background: dropSnap.isDraggingOver ? "var(--bg-tint)" : "transparent", transition: "background 160ms" }}>
                  {team.map((m, i) => {
                    const p = m.dynamicPersona;
                    if (!p) return null;
                    return (
                      <Draggable key={m.personaId} draggableId={`team-${m.personaId}`} index={i}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 8, boxShadow: snap.isDragging ? "var(--shadow-2)" : "none", ...prov.draggableProps.style }}
                          >
                            <span {...prov.dragHandleProps} title="Drag to reorder" style={{ cursor: "grab", color: "var(--ink-4)", fontSize: 14, lineHeight: 1, flexShrink: 0 }}>⋮⋮</span>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--bg-tint)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center", color: "var(--ink-1)", flexShrink: 0 }}>{Ic(p.icon)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{p.role}</div>
                              <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{p.spec}</div>
                            </div>
                            <select
                              value={m.role}
                              onChange={(e) => setRole(m.personaId, e.target.value)}
                              style={{ flexShrink: 0, padding: "5px 8px", border: "1px solid var(--line-2)", borderRadius: 6, fontSize: 11, color: "var(--ink-1)", background: "var(--bg-tint)", cursor: "pointer", fontFamily: "inherit" }}
                            >
                              {TEAM_ROLES.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                            <button onClick={() => removePersona(m.personaId)} title="Remove" style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: "1px solid var(--line-2)", background: "var(--surface)", color: "var(--ink-3)", cursor: "pointer", fontSize: 15, lineHeight: 1, fontFamily: "inherit" }}>×</button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  {team.length === 0 && (
                    <div style={{ fontSize: 11.5, color: "var(--ink-4)", textAlign: "center", padding: "28px 0" }}>Drag specialists here, or use Seneca's team.</div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>

      {/* Execute */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 18 }}>
        <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{team.length} specialists · roles assigned</span>
        <button
          onClick={() => onExecute(team)}
          disabled={team.length === 0}
          className="composer-send"
          style={{ padding: "9px 18px", opacity: team.length === 0 ? 0.5 : 1, cursor: team.length === 0 ? "default" : "pointer" }}
        >
          Execute as coordinated team →
        </button>
      </div>
    </div>
  );
}
