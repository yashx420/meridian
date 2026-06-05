import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/* ── Markdown → clean HTML ── */
function markdownToHtml(md) {
  if (!md) return '<p>No content.</p>';

  const lines = md.split('\n');
  const out = [];
  let inTable = false;
  let tableRows = [];
  let inList = false;

  const inline = (text) =>
    text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

  const flushTable = () => {
    if (!tableRows.length) return;
    const valid = tableRows.filter(r => !/^\s*\|[\s\-:]+\|/.test(r));
    if (valid.length > 0) {
      const parse = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
      const [head, ...body] = valid;
      out.push(`<table><thead><tr>${parse(head).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${parse(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    }
    tableRows = [];
    inTable = false;
  };

  const flushList = () => {
    if (inList) { out.push('</ul>'); inList = false; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim().startsWith('|')) {
      flushList();
      inTable = true;
      tableRows.push(line);
      continue;
    }
    if (inTable) { flushTable(); }

    if (line.match(/^#{1,4}\s/)) {
      flushList();
      const level = line.match(/^#+/)[0].length;
      const text = inline(line.replace(/^#+\s/, ''));
      out.push(`<h${level}>${text}</h${level}>`);
    } else if (line.match(/^[-*]\s/)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(line.replace(/^[-*]\s/, ''))}</li>`);
    } else if (line.match(/^\d+\.\s/)) {
      if (!inList) { out.push('<ol>'); inList = true; }
      out.push(`<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>`);
    } else if (line.match(/^---+$/)) {
      flushList();
      out.push('<hr/>');
    } else if (line.trim() === '') {
      flushList();
      out.push('');
    } else {
      flushList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  if (inTable) flushTable();
  flushList();
  return out.join('\n');
}

/* ── Full HTML document ── */
function buildHtmlDocument(synthesis, twinFields, orgFields) {
  const orgName = orgFields?.org_name || orgFields?.display_name || 'Organisation';
  const consultant = twinFields?.full_name || twinFields?.display_name || '';
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Meridian Master Briefing - ${orgName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; max-width: 860px; margin: 48px auto; padding: 0 40px 60px; color: #1A1A1A; background: #fff; font-size: 13.5px; line-height: 1.7; -webkit-font-smoothing: antialiased; }
  .cover { margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #4F46E5; }
  .cover h1 { font-size: 28px; font-weight: 700; color: #1A1A1A; letter-spacing: -0.02em; margin-bottom: 6px; }
  .cover .subtitle { font-size: 15px; color: #5C5A55; margin-bottom: 14px; }
  .badge { display: inline-block; background: #FEF7E6; color: #B45309; border: 1px solid rgba(180,83,9,0.25); border-radius: 4px; padding: 3px 10px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; background: #F7F6F3; border-radius: 10px; padding: 16px 20px; margin: 20px 0 32px; }
  .meta-item .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8A877F; margin-bottom: 3px; }
  .meta-item .value { font-size: 13px; font-weight: 600; color: #1A1A1A; }
  h2 { font-size: 17px; font-weight: 700; color: #1A1A1A; margin: 32px 0 10px; padding-left: 12px; border-left: 4px solid #4F46E5; letter-spacing: -0.01em; }
  h3 { font-size: 14px; font-weight: 600; color: #2D2D2C; margin: 22px 0 8px; }
  h4 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8A877F; margin: 16px 0 6px; }
  p { margin: 8px 0; color: #2D2D2C; }
  ul, ol { padding-left: 22px; margin: 10px 0; }
  li { margin: 5px 0; color: #2D2D2C; }
  strong { font-weight: 600; color: #1A1A1A; }
  em { font-style: italic; }
  code { background: #F0F0EE; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 0.88em; }
  hr { border: none; border-top: 1px solid #E6E3DC; margin: 28px 0; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12.5px; border-radius: 8px; overflow: hidden; box-shadow: 0 0 0 1px #E6E3DC; }
  thead tr { background: #4F46E5; }
  th { background: #4F46E5; color: #fff; font-weight: 600; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; padding: 10px 14px; text-align: left; border: none; }
  td { padding: 9px 14px; border-bottom: 1px solid #F0EDE8; vertical-align: top; color: #2D2D2C; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) { background: #FAFAF8; }
  tbody tr:hover { background: #F5F3EF; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E6E3DC; font-size: 11px; color: #8A877F; display: flex; justify-content: space-between; }
  @media print {
    body { margin: 20px; font-size: 12px; }
    h2 { page-break-before: auto; }
    table { page-break-inside: avoid; }
    @page { margin: 2cm; }
  }
</style>
</head>
<body>
<div class="cover">
  <h1>Meridian Master Briefing</h1>
  <div class="subtitle">Sovereign Exit Pathway Analysis</div>
  <span class="badge">Confidential</span>
</div>
<div class="meta-grid">
  ${orgName ? `<div class="meta-item"><div class="label">Organisation</div><div class="value">${orgName}</div></div>` : ''}
  ${consultant ? `<div class="meta-item"><div class="label">Lead Consultant</div><div class="value">${consultant}</div></div>` : ''}
  <div class="meta-item"><div class="label">Generated</div><div class="value">${date}</div></div>
  <div class="meta-item"><div class="label">Engine</div><div class="value">Meridian TCE · 5 Specialists</div></div>
</div>
${markdownToHtml(synthesis)}
<div class="footer">
  <span>Meridian Team Consultation Engine</span>
  <span>Generated ${date} · Confidential</span>
</div>
</body>
</html>`;
}

/* ── PDF using jsPDF (text-based, reliable) ── */
function exportPDF(synthesis, twinFields, orgFields) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const orgName = orgFields?.org_name || orgFields?.display_name || 'Organisation';
  const consultant = twinFields?.full_name || twinFields?.display_name || '';
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const pageW = 210, margin = 20, contentW = pageW - margin * 2;
  let y = 20;

  const checkPage = (needed = 10) => {
    if (y + needed > 280) { doc.addPage(); y = 20; }
  };

  // Cover
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(26, 26, 26);
  doc.text('Meridian Master Briefing', margin, y + 10); y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(92, 90, 85);
  doc.text('Sovereign Exit Pathway Analysis', margin, y); y += 7;
  doc.setFillColor(254, 247, 230);
  doc.setDrawColor(180, 83, 9);
  doc.roundedRect(margin, y, 30, 6, 1, 1, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text('CONFIDENTIAL', margin + 2, y + 4); y += 12;

  // Meta
  doc.setFillColor(247, 246, 243);
  doc.roundedRect(margin, y, contentW, 18, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(138, 135, 127);
  doc.text('ORGANISATION', margin + 4, y + 5);
  doc.text('LEAD CONSULTANT', margin + 60, y + 5);
  doc.text('GENERATED', margin + 120, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(26, 26, 26);
  doc.text(orgName.slice(0, 30), margin + 4, y + 12);
  doc.text(consultant.slice(0, 25), margin + 60, y + 12);
  doc.text(date, margin + 120, y + 12);
  y += 24;

  doc.setDrawColor(230, 227, 220);
  doc.line(margin, y, pageW - margin, y); y += 8;

  // Content
  const lines = (synthesis || '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) { y += 3; continue; }
    checkPage(12);

    if (line.startsWith('## ')) {
      y += 4;
      checkPage(14);
      doc.setFillColor(79, 70, 229);
      doc.rect(margin, y - 4, 3, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(26, 26, 26);
      const text = line.replace(/^#+\s/, '').replace(/\*\*/g, '');
      doc.text(text, margin + 6, y + 4); y += 12;
    } else if (line.startsWith('### ')) {
      checkPage(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(45, 45, 44);
      doc.text(line.replace(/^#+\s/, '').replace(/\*\*/g, ''), margin, y); y += 8;
    } else if (line.startsWith('#### ')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(138, 135, 127);
      doc.text(line.replace(/^#+\s/, '').toUpperCase(), margin, y); y += 6;
    } else if (line.startsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableRows.push(lines[i].trim());
        i++;
      }
      i--;
      const valid = tableRows.filter(r => !/^\s*\|[\s\-:]+\|/.test(r));
      if (valid.length > 0) {
        const parseRow = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim().replace(/\*\*/g, '').replace(/\*/g, ''));
        const head = parseRow(valid[0]);
        const body = valid.slice(1).map(parseRow);
        
        autoTable(doc, {
          startY: y,
          head: [head],
          body: body,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8.5, font: 'helvetica', textColor: [45, 45, 44] },
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5 },
          theme: 'grid'
        });
        y = doc.lastAutoTable.finalY + 8;
      }
    } else if (line.match(/^[-*]\s/)) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(45, 45, 44);
      const clean = line.replace(/^[-*]\s/, '').replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize('• ' + clean, contentW - 4);
      checkPage(wrapped.length * 5.5);
      doc.text(wrapped, margin + 2, y); y += wrapped.length * 5.5 + 1;
    } else if (line.match(/^\d+\.\s/)) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(45, 45, 44);
      const clean = line.replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize(clean, contentW - 4);
      checkPage(wrapped.length * 5.5);
      doc.text(wrapped, margin + 2, y); y += wrapped.length * 5.5 + 1;
    } else if (line.match(/^---+$/)) {
      doc.setDrawColor(230, 227, 220);
      doc.line(margin, y, pageW - margin, y); y += 6;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(45, 45, 44);
      const clean = line.replace(/\*\*/g, '').replace(/\*/g, '');
      const wrapped = doc.splitTextToSize(clean, contentW);
      checkPage(wrapped.length * 5.5);
      doc.text(wrapped, margin, y); y += wrapped.length * 5.5 + 2;
    }
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 177, 170);
    doc.text('Meridian TCE · Confidential', margin, 292);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, 292, { align: 'right' });
  }

  const slug = orgName.replace(/\s+/g, '-').toLowerCase().slice(0, 40);
  doc.save(`meridian-briefing-${slug}.pdf`);
}

/* ── File download helper ── */
function downloadFile(content, filename, mimeType) {
  try {
    // Try blob URL first
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  } catch (e) {
    // Fallback: open in new tab
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}

/* ── Component ── */
export default function DownloadReport({ synthesis, twinFields, orgFields }) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  const orgName = orgFields?.org_name || orgFields?.display_name || 'Organisation';
  const slug = orgName.replace(/\s+/g, '-').toLowerCase().slice(0, 40);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.top - 186, left: rect.left });
    }
    setOpen(o => !o);
  };

  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setOpen(false);
    };
    // Use timeout so click on items fires before this closes
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleHTML = () => {
    downloadFile(buildHtmlDocument(synthesis, twinFields, orgFields), `meridian-briefing-${slug}.html`, 'text/html;charset=utf-8');
    setOpen(false);
  };

  const handlePDF = () => {
    exportPDF(synthesis, twinFields, orgFields);
    setOpen(false);
  };

  const handleJSON = () => {
    downloadFile(JSON.stringify({ generated_at: new Date().toISOString(), consultant: twinFields, organisation: orgFields, synthesis }, null, 2), `meridian-briefing-${slug}.json`, 'application/json');
    setOpen(false);
  };

  const handleDOCX = () => {
    const body = markdownToHtml(synthesis);
    const doc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'/><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1A1A1A;}h1{font-size:20pt;color:#1A1A1A;}h2{font-size:14pt;color:#1A1A1A;border-left:4px solid #4F46E5;padding-left:8px;}h3{font-size:12pt;}table{border-collapse:collapse;width:100%;}th{background:#4F46E5;color:#fff;padding:6px 10px;font-size:9pt;}td{padding:6px 10px;border:1px solid #E5E7EB;}tr:nth-child(even) td{background:#FAFAF8;}</style></head><body>${body}</body></html>`;
    downloadFile(doc, `meridian-briefing-${slug}.doc`, 'application/msword');
    setOpen(false);
  };

  const items = [
    { label: 'PDF document', icon: '📄', fn: handlePDF },
    { label: 'HTML file', icon: '🌐', fn: handleHTML },
    { label: 'Word / DOCX', icon: '📝', fn: handleDOCX },
    { label: 'JSON data', icon: '{ }', fn: handleJSON },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 8, fontSize: 12, color: 'var(--ink-1)', fontWeight: 550, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 200ms' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.color = 'var(--indigo)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.color = 'var(--ink-1)'; }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export briefing
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>

      {open && createPortal(
        <div ref={dropdownRef} style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, background: '#fff', border: '1px solid #E6E3DC', borderRadius: 10, boxShadow: '0 -4px 24px rgba(20,18,12,0.12), 0 2px 8px rgba(20,18,12,0.06)', overflow: 'hidden', zIndex: 99999, minWidth: 190 }}>
          <div style={{ padding: '7px 12px 6px', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A877F', borderBottom: '1px solid #F0EDE8' }}>
            Export format
          </div>
          {items.map(item => (
            <button key={item.label} onClick={item.fn} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', background: 'none', border: 'none', borderBottom: '1px solid #F0EDE8', fontSize: 12.5, color: '#2D2D2C', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F6F3'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}