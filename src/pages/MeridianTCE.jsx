import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import OnboardingChat from "@/components/onboarding/OnboardingChat";
import DownloadReport from "@/components/onboarding/DownloadReport";
import SidebarChat from "@/components/sidebar/SidebarChat";
import SettingsPanel from "@/components/settings/SettingsPanel";
import ClientView from "@/components/client/ClientView";
import ExecuteReport from "@/components/consultation/ExecuteReport";
import TeamAssembly from "@/components/consultation/TeamAssembly";
import { PERSONAS, PERSONA_BY_ID, DEFAULT_TEAM } from "@/lib/personas";

/* ── Inject CSS ─────────────────────────────────────────────── */
const CSS = `
:root {
  --bg:#FAFAF8;--bg-tint:#F5F4F0;--surface:#FFFFFF;--surface-alt:#FBFAF7;
  --line-1:#EFEDE8;--line-2:#E6E3DC;--line-3:#D9D5CC;
  --ink:#1A1A1A;--ink-1:#2D2D2C;--ink-2:#5C5A55;--ink-3:#8A877F;--ink-4:#B5B2A9;--ink-5:#D1CEC5;
  --indigo:#4F46E5;--indigo-deep:#3E37C7;--indigo-hover:#4338CA;--indigo-tint:#EEF0FF;--indigo-tint-2:#E2E5FF;
  --green:#15803D;--green-tint:#ECFDF3;--amber-tint:#FEF7E6;--amber:#B45309;
  --shadow-1:0 1px 2px rgba(20,18,12,0.04),0 1px 1px rgba(20,18,12,0.03);
  --shadow-2:0 1px 3px rgba(20,18,12,0.06),0 4px 12px -2px rgba(20,18,12,0.04);
  --shadow-3:0 2px 8px rgba(20,18,12,0.04),0 14px 40px -10px rgba(20,18,12,0.08);
  --r-sm:6px;--r-md:10px;--r-lg:14px;--r-xl:18px;
  --ease:cubic-bezier(0.16,1,0.3,1);
}
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-feature-settings:'ss01','cv11','cv02';background:var(--bg);color:var(--ink);font-size:13.5px;line-height:1.5;letter-spacing:-0.005em;-webkit-font-smoothing:antialiased;overflow:hidden;}
.app{width:100%;min-height:100vh;height:100vh;margin:0 auto;background:var(--bg);display:grid;grid-template-rows:56px 1fr;grid-template-columns:180px 1fr 280px;grid-template-areas:"top top top" "side main chat";position:relative;overflow:hidden;}
.chat-panel{grid-area:chat;background:var(--surface);border-left:1px solid var(--line-1);display:flex;flex-direction:column;overflow:hidden;}
.topbar{grid-area:top;display:flex;align-items:center;justify-content:space-between;padding:0 22px;background:var(--surface);border-bottom:1px solid var(--line-1);}
.top-left{display:flex;align-items:center;gap:14px;}
.brand{display:flex;align-items:center;gap:9px;}
.brand-mark{width:22px;height:22px;display:grid;place-items:center;}
.brand-name{font-size:14.5px;font-weight:600;color:var(--ink);letter-spacing:-0.01em;}
.brand-sep{width:1px;height:16px;background:var(--line-2);margin:0 2px;}
.tce-label{font-size:13px;font-weight:500;color:var(--ink-1);}
.tce-tag{font-size:9.5px;padding:2px 6px;background:var(--indigo-tint);color:var(--indigo);border-radius:4px;font-weight:550;letter-spacing:0.04em;text-transform:uppercase;margin-left:6px;}
.stepper{display:flex;align-items:center;gap:4px;padding:4px;background:var(--bg-tint);border-radius:999px;border:1px solid var(--line-1);}
.step{display:flex;align-items:center;gap:7px;padding:4px 11px 4px 8px;border-radius:999px;font-size:11.5px;color:var(--ink-3);cursor:pointer;transition:all 280ms var(--ease);font-weight:500;white-space:nowrap;}
.step-num{width:18px;height:18px;display:grid;place-items:center;border-radius:50%;background:var(--surface);border:1px solid var(--line-2);font-size:10px;font-weight:600;color:var(--ink-3);transition:all 280ms var(--ease);}
.step.active{background:var(--surface);color:var(--ink);box-shadow:var(--shadow-1);}
.step.active .step-num{background:var(--indigo);color:#fff;border-color:var(--indigo);}
.step.done .step-num{background:var(--ink-1);color:#fff;border-color:var(--ink-1);}
.top-right{display:flex;align-items:center;gap:10px;}
.engagement-chip{display:flex;align-items:center;gap:7px;padding:5px 10px;background:var(--surface);border:1px solid var(--line-2);border-radius:999px;font-size:11.5px;color:var(--ink-1);font-weight:500;}
.engagement-chip .dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(21,128,61,0.12);}
.sov-toggle{display:flex;align-items:center;padding:3px;background:var(--bg-tint);border:1px solid var(--line-1);border-radius:8px;}
.sov-label{font-size:10px;font-weight:550;color:var(--ink-3);letter-spacing:0.06em;text-transform:uppercase;padding:0 8px 0 9px;display:flex;align-items:center;gap:5px;}
.sov-opt{padding:4px 9px;font-size:11px;font-weight:500;color:var(--ink-2);border-radius:5px;cursor:pointer;transition:all 200ms var(--ease);}
.sov-opt.active{background:var(--surface);color:var(--indigo);box-shadow:var(--shadow-1);}
.icon-btn{width:32px;height:32px;display:grid;place-items:center;border-radius:8px;background:transparent;border:1px solid transparent;cursor:pointer;color:var(--ink-2);transition:all 200ms var(--ease);}
.icon-btn:hover{background:var(--bg-tint);color:var(--ink);}
.avatar-chip{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#E2E5FF,#C7CCFF);display:grid;place-items:center;font-size:11px;font-weight:600;color:var(--indigo-deep);}
.sidebar{grid-area:side;background:var(--surface);border-right:1px solid var(--line-1);display:flex;flex-direction:column;overflow:hidden;}
.side-section{padding:18px 18px 16px;border-bottom:1px solid var(--line-1);}
.side-section.scroll{flex:1;min-height:0;overflow-y:auto;}
.side-label{display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:600;color:var(--ink-3);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;}
.side-label-act{color:var(--ink-3);font-size:11px;cursor:pointer;}
.twin{position:relative;padding:14px;background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-md);transition:all 300ms var(--ease);}
.twin.empty{border-style:dashed;border-color:var(--line-3);background:var(--surface-alt);}
.twin-head{display:flex;align-items:center;gap:12px;margin-bottom:13px;}
.twin-ring{position:relative;width:46px;height:46px;flex-shrink:0;}
.twin-ring svg{width:100%;height:100%;transform:rotate(-90deg);}
.twin-ring-track{fill:none;stroke:var(--line-2);stroke-width:2.5;}
.twin-ring-fill{fill:none;stroke:var(--indigo);stroke-width:2.5;stroke-linecap:round;transition:stroke-dashoffset 600ms var(--ease);}
.twin-pct{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--ink);}
.twin-pct small{font-size:7.5px;font-weight:500;color:var(--ink-3);letter-spacing:0.06em;}
.twin-info{min-width:0;flex:1;}
.twin-name{font-size:13px;font-weight:600;color:var(--ink);}
.twin-name.placeholder{color:var(--ink-4);font-weight:500;}
.twin-role{font-size:11px;color:var(--ink-3);margin-top:1px;}
.twin-fields{display:flex;flex-direction:column;gap:8px;}
.twin-field{display:flex;flex-direction:column;gap:3px;}
.twin-field-k{font-size:9.5px;font-weight:550;color:var(--ink-3);letter-spacing:0.05em;text-transform:uppercase;}
.twin-field-v{font-size:11.5px;color:var(--ink-1);font-weight:500;}
.twin-tags{display:flex;flex-wrap:wrap;gap:4px;}
.twin-tag{font-size:10px;padding:2px 7px;background:var(--bg-tint);border:1px solid var(--line-1);color:var(--ink-1);border-radius:4px;font-weight:500;}
.twin-tag.indigo{background:var(--indigo-tint);border-color:transparent;color:var(--indigo-deep);}
.nav-list{display:flex;flex-direction:column;gap:1px;}
.nav-item{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:7px;font-size:12.5px;color:var(--ink-2);cursor:pointer;transition:all 180ms var(--ease);font-weight:500;}
.nav-item:hover{background:var(--bg-tint);color:var(--ink);}
.nav-item.active{background:var(--indigo-tint);color:var(--indigo-deep);}
.nav-item.disabled{color:var(--ink-4);cursor:default;}
.nav-item.disabled:hover{background:transparent;}
.nav-item-icon{width:16px;display:grid;place-items:center;opacity:0.85;}
.nav-item-label{flex:1;}
.nav-item-pill{font-size:9px;padding:1px 6px;background:var(--bg-tint);border:1px solid var(--line-2);border-radius:999px;color:var(--ink-3);font-weight:550;letter-spacing:0.04em;text-transform:uppercase;flex-shrink:0;}
.kb-list{display:flex;flex-direction:column;gap:2px;}
.kb-item{display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:7px;cursor:pointer;transition:background 180ms var(--ease);}
.kb-item:hover{background:var(--bg-tint);}
.kb-icon{width:22px;height:26px;background:var(--surface);border:1px solid var(--line-2);border-radius:3px;flex-shrink:0;display:grid;place-items:center;font-size:7.5px;font-weight:600;color:var(--ink-3);}
.kb-meta{flex:1;min-width:0;}
.kb-name{font-size:11.5px;font-weight:500;color:var(--ink-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.kb-sub{font-size:9.5px;color:var(--ink-3);margin-top:1px;}
.side-foot{padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line-1);background:var(--surface-alt);}
.consultant-mini{display:flex;align-items:center;gap:9px;}
.consultant-mini-name{font-size:11.5px;font-weight:550;color:var(--ink-1);}
.consultant-mini-role{font-size:10px;color:var(--ink-3);}
.main{grid-area:main;display:flex;flex-direction:column;overflow:hidden;position:relative;height:100%;}
.main-header{padding:18px 32px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:1px solid var(--line-1);background:var(--bg);flex-shrink:0;}
.main-title-block{min-width:0;}
.main-eyebrow{display:flex;align-items:center;gap:8px;font-size:10.5px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px;}
.main-eyebrow b{color:var(--indigo);}
.main-title{font-size:19px;font-weight:600;color:var(--ink);letter-spacing:-0.018em;line-height:1.25;}
.main-sub{font-size:12.5px;color:var(--ink-2);margin-top:4px;}
.main-meta{display:flex;align-items:center;gap:18px;font-size:11px;color:var(--ink-3);}
.main-meta-item b{color:var(--ink-1);font-weight:600;}
.main-meta-sep{width:1px;height:14px;background:var(--line-2);}
.content{flex:1;min-height:0;overflow-y:auto;padding:28px 32px 24px;scroll-behavior:smooth;}
.content::-webkit-scrollbar{width:10px;}
.content::-webkit-scrollbar-thumb{background:var(--line-2);border-radius:5px;border:3px solid var(--bg);}
.aria-stream{display:flex;flex-direction:column;gap:14px;max-width:760px;margin:0 auto;}
.msg{display:flex;gap:12px;animation:msgIn 420ms var(--ease) backwards;}
@keyframes msgIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.msg-avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;font-size:11px;font-weight:600;}
.msg-avatar.aria{background:linear-gradient(135deg,#1A1A1A,#3A3A3A);color:#fff;position:relative;}
.msg-avatar.aria::after{content:'';position:absolute;inset:-2px;border-radius:50%;border:1px solid var(--indigo-tint-2);opacity:0.7;}
.msg-avatar.user{background:var(--bg-tint);border:1px solid var(--line-2);color:var(--ink-1);}
.msg-body{flex:1;min-width:0;padding-top:3px;}
.msg-author{display:flex;align-items:baseline;gap:7px;margin-bottom:4px;}
.msg-author-name{font-size:12px;font-weight:600;color:var(--ink);}
.msg-author-time{font-size:10.5px;color:var(--ink-3);}
.msg-content{font-size:13.5px;color:var(--ink-1);line-height:1.55;}
.msg-content p+p{margin-top:8px;}
.cursor{display:inline-block;width:1.5px;height:14px;background:var(--ink);vertical-align:-2px;margin-left:1px;animation:blink 1s steps(1,end) infinite;}
@keyframes blink{50%{opacity:0;}}
.composer{background:var(--surface);border-top:1px solid var(--line-1);padding:14px 32px 16px;flex-shrink:0;}
.composer-inner{background:var(--bg-tint);border:1px solid var(--line-2);border-radius:var(--r-lg);padding:12px 14px;}
.composer-input{font-size:13.5px;color:var(--ink);outline:none;width:100%;border:none;background:transparent;font-family:inherit;resize:none;min-height:18px;max-height:90px;line-height:1.5;}
.composer-input::placeholder{color:var(--ink-4);}
.composer-foot{margin-top:10px;display:flex;align-items:center;justify-content:space-between;}
.composer-tools{display:flex;align-items:center;gap:4px;}
.composer-tool{display:flex;align-items:center;gap:6px;padding:4px 9px;border-radius:6px;font-size:11px;color:var(--ink-2);border:1px solid var(--line-1);background:transparent;cursor:pointer;font-weight:500;transition:all 180ms var(--ease);}
.composer-tool:hover{background:var(--bg-tint);color:var(--ink);}
.composer-tool.context{background:var(--bg-tint);color:var(--ink-1);}
.composer-send{display:flex;align-items:center;gap:6px;padding:6px 13px;background:var(--indigo);color:#fff;border-radius:7px;border:none;font-size:12px;font-weight:550;cursor:pointer;transition:all 180ms var(--ease);font-family:inherit;}
.composer-send:hover{background:var(--indigo-hover);}
.composer-send:disabled{background:var(--bg-tint);color:var(--ink-4);cursor:not-allowed;}
.composer-kbd{font-size:9.5px;padding:1px 4px;background:rgba(255,255,255,0.18);border-radius:3px;}
.persona-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:760px;margin:16px auto 0;}
.persona{position:relative;padding:14px 16px;background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-md);display:flex;flex-direction:column;gap:10px;animation:cardSlide 500ms var(--ease) backwards;transition:all 300ms var(--ease);}
@keyframes cardSlide{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
.persona:hover{border-color:var(--line-3);box-shadow:var(--shadow-1);}
.persona.consulting{border-color:var(--indigo-tint-2);background:linear-gradient(180deg,var(--surface),#FDFCFF);box-shadow:0 0 0 3px rgba(79,70,229,0.04);}
.persona.complete .persona-pill{background:var(--green-tint);color:var(--green);}
.p-head{display:flex;align-items:center;gap:11px;}
.p-icon{width:34px;height:34px;border-radius:9px;background:var(--bg-tint);border:1px solid var(--line-2);display:grid;place-items:center;color:var(--ink-1);flex-shrink:0;}
.persona.consulting .p-icon{background:var(--indigo-tint);border-color:var(--indigo-tint-2);color:var(--indigo-deep);}
.p-info{flex:1;min-width:0;}
.p-role{font-size:12.5px;font-weight:600;color:var(--ink);}
.p-spec{font-size:10.5px;color:var(--ink-3);margin-top:1px;}
.persona-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:var(--green-tint);color:var(--green);font-size:10.5px;font-weight:600;border-radius:999px;flex-shrink:0;}
.persona-pill .pill-dot{width:5px;height:5px;border-radius:50%;background:currentColor;}
.persona-pill.indigo{background:var(--indigo-tint);color:var(--indigo-deep);}
.persona-pill.indigo .pill-dot{animation:pulseDot 1.4s ease-in-out infinite;}
@keyframes pulseDot{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.35;transform:scale(0.85);}}
.persona-pill.muted{background:var(--bg-tint);color:var(--ink-3);}
.p-foot{display:flex;align-items:center;justify-content:space-between;padding-top:9px;border-top:1px solid var(--line-1);font-size:11px;color:var(--ink-3);}
.p-foot-stat{display:flex;align-items:center;gap:5px;}
.p-analysis-link{display:inline-flex;align-items:center;gap:4px;color:var(--indigo);font-size:11.5px;font-weight:550;cursor:pointer;}
.p-progress{height:2px;background:var(--line-1);border-radius:1px;overflow:hidden;position:relative;}
.p-progress-fill{position:absolute;top:0;left:0;height:100%;background:var(--indigo);border-radius:1px;transition:width 350ms var(--ease);}
.brief{max-width:760px;margin:0 auto 18px;padding:16px 18px;background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-md);}
.brief-label{display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);margin-bottom:8px;}
.brief-body{font-size:13px;color:var(--ink-1);line-height:1.55;}
.brief-meta{margin-top:12px;display:flex;align-items:center;gap:14px;padding-top:12px;border-top:1px solid var(--line-1);font-size:11px;color:var(--ink-3);}
.brief-meta-item b{color:var(--ink-1);font-weight:600;}
.report{max-width:760px;margin:24px auto 0;background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-2);}
.report-head{padding:18px 22px 14px;border-bottom:1px solid var(--line-1);background:linear-gradient(180deg,#FDFCFA,var(--surface));}
.report-eyebrow{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--indigo);margin-bottom:5px;}
.report-title{font-size:17px;font-weight:600;color:var(--ink);letter-spacing:-0.018em;line-height:1.25;}
.report-sub{display:flex;align-items:center;gap:12px;font-size:11px;color:var(--ink-3);margin-top:6px;}
.report-body{padding:18px 22px 22px;font-size:13px;color:var(--ink-1);line-height:1.6;}
.report.ready{border-color:var(--indigo-tint-2);}
.followup{max-width:760px;margin:18px auto 0;padding:16px 18px;background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-md);}
.followup-label{font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);margin-bottom:10px;}
.followup-row{display:flex;flex-wrap:wrap;gap:6px;}
.followup-chip{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;background:var(--surface-alt);border:1px solid var(--line-2);border-radius:8px;font-size:12px;color:var(--ink-1);cursor:pointer;font-weight:500;transition:all 200ms var(--ease);}
.followup-chip:hover{border-color:var(--indigo);background:var(--indigo-tint);color:var(--indigo-deep);}
.live-strip{max-width:760px;margin:0 auto 16px;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-md);font-size:11.5px;}
.live-strip-left{display:flex;align-items:center;gap:10px;color:var(--ink-2);}
.live-strip-dot{width:7px;height:7px;border-radius:50%;background:var(--indigo);position:relative;}
.live-strip-dot::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:1.5px solid var(--indigo);opacity:0.3;animation:ringPulse 1.8s ease-out infinite;}
@keyframes ringPulse{from{transform:scale(0.6);opacity:0.6;}to{transform:scale(1.6);opacity:0;}}
.live-strip-meta{display:flex;align-items:center;gap:14px;color:var(--ink-3);font-size:10.5px;}
.live-strip-meta b{color:var(--ink-1);font-weight:600;}
.settings-overlay{position:fixed;inset:0;background:rgba(20,18,12,0.28);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:200;}
.settings-panel{width:620px;max-height:82vh;background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-xl);box-shadow:var(--shadow-3);display:flex;flex-direction:column;overflow:hidden;}
.settings-head{padding:18px 22px;border-bottom:1px solid var(--line-1);display:flex;align-items:center;justify-content:space-between;}
.settings-body{flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:16px;}
.settings-card{background:var(--surface-alt);border:1px solid var(--line-1);border-radius:var(--r-md);padding:16px;}
.settings-card-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;}
.settings-card-title{font-size:13px;font-weight:600;color:var(--ink);}
.settings-card-sub{font-size:11px;color:var(--ink-3);margin-top:2px;}
.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
.settings-k{font-size:9.5px;font-weight:600;color:var(--ink-3);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:3px;}
.settings-v{font-size:12.5px;color:var(--ink-1);}
.settings-actions{display:flex;gap:6px;padding-top:12px;border-top:1px solid var(--line-1);}
`;

if (typeof document !== 'undefined' && !document.getElementById('meridian-styles')) {
  const style = document.createElement('style');
  style.id = 'meridian-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;550;600;700&display=swap';
  document.head.appendChild(link);
}

/* ── Icons ── */
const Icon = ({ children, size = 16, stroke = 1.5, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
);
const I = {
  Meridian: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#1A1A1A" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="4" stroke="#4F46E5" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="1.6" fill="#4F46E5" />
    </svg>
  ),
  LogOut: ({ size = 16 }) => <Icon size={size}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 8l4 4m-4 4l4-4M9 12h7"/></Icon>,
  Lock: () => <Icon size={12}><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 1 1 8 0v3.5"/></Icon>,
  Search: () => <Icon><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>,
  Plus: () => <Icon><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>,
  ArrowRight: () => <Icon size={14}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Icon>,
  Check: () => <Icon size={12}><polyline points="20 6 9 17 4 12"/></Icon>,
  Sparkle: () => <Icon size={13}><path d="M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4m6 6l4 4M5 19l4-4m6-6l4-4"/></Icon>,
  Send: () => <Icon size={13}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Icon>,
  Paperclip: () => <Icon size={13}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></Icon>,
  Download: () => <Icon size={13}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Icon>,
  Home: () => <Icon size={14}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/></Icon>,
  Engagements: () => <Icon size={14}><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="4" x2="9" y2="20"/></Icon>,
  Insights: () => <Icon size={14}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></Icon>,
  Settings: () => <Icon size={14}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>,
  Shield: () => <Icon size={18}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></Icon>,
  Cloud: () => <Icon size={18}><path d="M17.5 18a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6 9.5a5 5 0 0 0 1 9.9z"/></Icon>,
  Scale: () => <Icon size={18}><path d="M12 3v18"/><path d="M5 6h14"/><path d="M8 6l-3 7a3 3 0 0 0 6 0L8 6z"/><path d="M16 6l-3 7a3 3 0 0 0 6 0l-3-7z"/></Icon>,
  Chart: () => <Icon size={18}><line x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="12" width="3" height="6"/><rect x="11" y="8" width="3" height="10"/><rect x="16" y="4" width="3" height="14"/></Icon>,
  Compass: () => <Icon size={18}><circle cx="12" cy="12" r="9"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></Icon>,
  Network: () => <Icon size={18}><circle cx="12" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><line x1="12" y1="8" x2="6" y2="16"/><line x1="12" y1="8" x2="18" y2="16"/><line x1="8" y1="18" x2="16" y2="18"/></Icon>,
  Doc: () => <Icon size={11}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Icon>,
};

/* ── Persona definitions are shared from @/lib/personas (PERSONAS, etc.) ── */

/* ── Markdown Renderer ── */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++; }
      const rows = tableLines.filter(r => !/^\s*\|[\s\-:]+\|/.test(r));
      if (rows.length > 0) {
        const parseRow = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => cleanMarkdown(c.trim()));
        const header = parseRow(rows[0]);
        const body = rows.slice(1);
        elements.push(
          <div key={`table-${i}`} style={{overflowX:'auto',margin:'12px 0'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,lineHeight:1.5}}>
              <thead><tr>{header.map((h,ci)=>(
                <th key={ci} style={{padding:'7px 12px',background:'var(--surface-alt)',borderBottom:'2px solid var(--line-2)',borderRight:'1px solid var(--line-1)',textAlign:'left',fontSize:10,fontWeight:600,color:'var(--ink-3)',letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
              ))}</tr></thead>
              <tbody>{body.map((row,ri)=>{const cells=parseRow(row);return(<tr key={ri} style={{borderBottom:'1px solid var(--line-1)'}}>{cells.map((c,ci)=>(<td key={ci} style={{padding:'7px 12px',borderRight:'1px solid var(--line-1)',color:'var(--ink-1)',verticalAlign:'top',background:ri%2===0?'var(--surface)':'var(--surface-alt)'}}>{c}</td>))}</tr>);})}</tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    if (line.match(/^#{1,4}\s/)) {
      const level = line.match(/^#+/)[0].length;
      const text = cleanMarkdown(line.replace(/^#+\s/, '').trim());
      const sizes = {1:16, 2:14, 3:13, 4:11.5};
      const margins = {1:'24px 0 10px', 2:'22px 0 8px', 3:'20px 0 8px', 4:'18px 0 6px'};
      elements.push(<div key={i} style={{fontSize:sizes[level],fontWeight:600,color:'var(--ink)',margin:margins[level],letterSpacing:level===1?'-0.015em':level===2?'-0.012em':'-0.01em'}}>{text}</div>);
      i++;
      continue;
    }
    if (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)) {
      const listItems = [];
      const ordered = !!line.match(/^\d+\.\s/);
      while (i < lines.length && (lines[i].trim().match(/^[-*]\s/) || lines[i].trim().match(/^\d+\.\s/))) {
        const trimmed = lines[i].trim();
        const numMatch = trimmed.match(/^(\d+)\.\s/);
        const content = cleanMarkdown(trimmed.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, ''));
        listItems.push(
          <li key={i} style={{paddingLeft:ordered?24:18,position:'relative',marginTop:6,fontSize:12.5,color:'var(--ink-1)',lineHeight:1.65}}>
            {ordered
              ? <span style={{position:'absolute',left:0,top:0,fontSize:12.5,fontWeight:600,color:'var(--ink-2)'}}>{(numMatch?numMatch[1]:listItems.length+1)}.</span>
              : <span style={{position:'absolute',left:4,top:10,width:4,height:4,background:'var(--ink-3)',borderRadius:'50%',display:'inline-block'}}></span>}
            {content}
          </li>
        );
        i++;
      }
      elements.push(<ul key={`list-${i}`} style={{paddingLeft:0,listStyle:'none',margin:'6px 0'}}>{listItems}</ul>);
      continue;
    }
    if (line.match(/^---+$/)) { elements.push(<hr key={i} style={{border:'none',borderTop:'1px solid var(--line-2)',margin:'16px 0'}}/>); i++; continue; }
    if (line === '') { i++; continue; }
    elements.push(<p key={i} style={{fontSize:13,color:'var(--ink-1)',lineHeight:1.65,margin:'6px 0'}}>{cleanMarkdown(line)}</p>);
    i++;
  }
  return elements;
}

function cleanMarkdown(text) {
  if (!text) return text;
  return text.replace(/—/g, '-').replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').replace(/#/g, '');
}

function inlineFormat(text) {
  if (!text) return text;
  return text.replace(/—/g, '-').replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
}

/* ── Hooks ── */
function useTyper(text, speed = 14, start = true) {
  const [out, setOut] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!start) { setOut(''); setDone(false); return; }
    setOut(''); setDone(false); let i = 0;
    const id = setInterval(() => { i++; setOut(text.slice(0, i)); if (i >= text.length) { clearInterval(id); setDone(true); } }, speed);
    return () => clearInterval(id);
  }, [text, start, speed]);
  return [out, done];
}

/* ── Ring ── */
function Ring({ pct }) {
  const r = 19, c = 2 * Math.PI * r;
  return (
    <div className="twin-ring">
      <svg viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={r} className="twin-ring-track" />
        <circle cx="23" cy="23" r={r} className="twin-ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div className="twin-pct">{Math.round(pct)}<small>CAL</small></div>
    </div>
  );
}

/* ── Phase 3 - Team Assembly ── */
function Phase3({ onComplete }) {
  const [revealed, setRevealed] = useState(0);
  const [hDone, setHDone] = useState(false);
  useEffect(() => {
    if (!hDone) return;
    if (revealed >= PERSONAS.length) return;
    const id = setTimeout(() => setRevealed(r => r + 1), 520);
    return () => clearTimeout(id);
  }, [revealed, hDone]);

  return (
    <div className="aria-stream" style={{ maxWidth: 760 }}>
      <TyperMsg text="Configuring your specialist team for this engagement. Each persona is calibrated to your Digital Twin and conditioned on the Org Twin dossier." speed={11} time="just now" onDone={() => setHDone(true)} />
      <div className="persona-grid" style={{ marginTop: 18 }}>
        {PERSONAS.slice(0, revealed).map((p, i) => {
          const Ic = I[p.icon];
          return (
            <div key={p.id} className="persona" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="p-head">
                <div className="p-icon"><Ic /></div>
                <div className="p-info"><div className="p-role">{p.role}</div><div className="p-spec">{p.spec}</div></div>
                <span className="persona-pill"><span className="pill-dot"></span> Ready</span>
              </div>
            </div>
          );
        })}
        {Array.from({ length: PERSONAS.length - revealed }).map((_, i) => (
          <div key={`s${i}`} className="persona" style={{ opacity: 0.35, background: 'var(--surface-alt)', borderStyle: 'dashed' }}>
            <div className="p-head">
              <div className="p-icon" style={{ background: 'var(--bg-tint)', color: 'var(--ink-4)' }}><I.Network /></div>
              <div className="p-info"><div className="p-role" style={{ color: 'var(--ink-4)' }}>Assembling…</div></div>
              <span className="persona-pill muted"><span className="pill-dot"></span> Queued</span>
            </div>
          </div>
        ))}
      </div>
      {revealed >= PERSONAS.length && (
        <div style={{ marginTop: 16, textAlign: 'center', animation: 'msgIn 360ms var(--ease)' }}>
          <button className="composer-send" style={{ padding: '8px 18px' }} onClick={onComplete}>
            Open the Team Consultation Engine <I.ArrowRight />
          </button>
        </div>
      )}
    </div>
  );
}

function TyperMsg({ text, who = 'aria', name = 'Seneca', time, speed = 12, onDone }) {
  const [out, done] = useTyper(text, speed, true);
  useEffect(() => { if (done && onDone) onDone(); }, [done]);
  return (
    <div className="msg">
      <div className={`msg-avatar ${who}`}><I.Sparkle /></div>
      <div className="msg-body">
        <div className="msg-author"><div className="msg-author-name">{name}</div><div className="msg-author-time">{time}</div></div>
        <div className="msg-content"><p>{out}{!done && <span className="cursor" />}</p></div>
      </div>
    </div>
  );
}

/* ── Analysis Modal ── */
function AnalysisModal({ persona, analysis, onClose }) {
  if (!persona) return null;
  const Ic = I[persona.icon];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,12,0.32)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={onClose}>
      <div style={{ width: 680, maxHeight: '82vh', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="p-icon"><Ic /></div>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{persona.role}</div><div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{persona.spec}</div></div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ fontSize: 18 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-1)', lineHeight: 1.65 }}>{renderMarkdown(analysis)}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Event bus for follow-up ── */
const followUpBus = {
  listeners: [],
  emit(text) { this.listeners.forEach(fn => fn(text)); },
  on(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(l => l !== fn); }; }
};

/* ── Bottom Composer ── */
function BottomComposer({ disabled }) {
  const [draft, setDraft] = useState('');
  const send = () => { const q = draft.trim(); if (!q) return; setDraft(''); followUpBus.emit(q); };
  const onKey = e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } };
  return (
    <div className="composer">
      <div className="composer-inner">
        <textarea className="composer-input" placeholder="Ask a follow-up, deepen the analysis, request a deeper dive on any section…" rows={2} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey} disabled={disabled} />
        <div className="composer-foot">
          <div className="composer-tools">
            <button className="composer-tool context"><I.Network size={11} /> Routing: Full specialist team</button>
            <button className="composer-tool"><I.Paperclip /> Attach</button>
          </div>
          <button className="composer-send" onClick={send} disabled={disabled || !draft.trim()}>
            Continue consultation <I.Send /><span className="composer-kbd">⌘ ↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const FOLLOW_UP_CHIPS = [
  { icon: 'Sparkle', label: 'Deepen the compliance analysis' },
  { icon: 'Chart', label: 'Model a 3-year TCO comparison' },
  { icon: 'Doc', label: 'Generate a board-level 1-page summary' },
  { icon: 'Shield', label: 'Stress-test against worst-case scenarios' },
  { icon: 'Compass', label: 'Identify the top 3 vendor risks' },
];

/* ── Follow Up Thread ── */
function FollowUpThread({ synthesis, twinContext, orgContext, brief, twinFields, orgFields }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const loadingRef = useRef(false);

  // Load persisted elaboration results from DB on mount
  useEffect(() => {
    if (!twinContext?.id || !orgContext?.id) return;
    const loadElaborations = async () => {
      try {
        const me = await base44.auth.me();
        const elab = await base44.entities.ConsultationResult.filter({
          org_id: orgContext.id,
          consultant_id: twinContext.id,
          request_type: 'elaboration',
          created_by: me.email
        }, 'generated_at', 50);
        if (elab.length > 0) {
          const rebuilt = [];
          elab.forEach(r => {
            if (r.user_request) rebuilt.push({ role: 'user', text: r.user_request });
            rebuilt.push({ role: 'seneca', text: r.synthesis });
          });
          setMessages(rebuilt);
        }
      } catch (e) {
        console.error('Failed to load elaborations:', e);
      }
    };
    loadElaborations();
  }, [twinContext?.id, orgContext?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      const c = scrollRef.current.closest('.content');
      if (c) c.scrollTop = c.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text) => {
    const q = text.trim();
    if (!q || loadingRef.current) return;
    loadingRef.current = true;
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    const res = await base44.functions.invoke('personaConsult', {
      mode: 'followup', question: q, brief, synthesis, twinContext, orgContext
    });
    loadingRef.current = false;
    setLoading(false);
    const answer = res.data.answer;
    setMessages(prev => [...prev, { role: 'seneca', text: answer }]);

    // Save as new elaboration result
    try {
      await base44.entities.ConsultationResult.create({
        org_id: orgContext.id,
        consultant_id: twinContext.id,
        synthesis: answer,
        request_type: 'elaboration',
        user_request: q,
        generated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to save elaboration:', e);
    }
  };

  useEffect(() => { return followUpBus.on(send); }, [synthesis]);

  return (
    <div ref={scrollRef}>
      {messages.length === 0 && (
        <div className="followup" style={{ marginTop: 16 }}>
          <div className="followup-label">Continue the consultation</div>
          <div className="followup-row">
            {FOLLOW_UP_CHIPS.map((c, i) => { const Ic = I[c.icon] || I.Sparkle; return (
              <div key={i} className="followup-chip" onClick={() => followUpBus.emit(c.label)}>
                <Ic size={13} /> {c.label}
              </div>
            ); })}
          </div>
        </div>
      )}
      {messages.map((m, i) => (
        <div key={i} style={{ maxWidth: 760, margin: '14px auto 0' }}>
          {m.role === 'user'
            ? <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ maxWidth: '72%', background: 'var(--indigo-tint)', border: '1px solid var(--indigo-tint-2)', borderRadius: '12px 12px 4px 12px', padding: '10px 14px', fontSize: 13, color: 'var(--indigo-deep)', lineHeight: 1.55 }}>{m.text}</div>
              </div>
            : <div style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', padding: '16px 18px', boxShadow: 'var(--shadow-1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#1A1A1A,#3A3A3A)', display: 'grid', placeItems: 'center' }}><I.Sparkle size={11} color="#fff" /></div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>Seneca</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.7 }}>{renderMarkdown(m.text)}</div>
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-1)' }}>
                  <DownloadReport synthesis={m.text} twinFields={twinContext} orgFields={orgContext} />
                </div>
              </div>
          }
        </div>
      ))}
      {loading && (
        <div style={{ maxWidth: 760, margin: '14px auto 0', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#1A1A1A,#3A3A3A)', display: 'grid', placeItems: 'center' }}><I.Sparkle size={11} color="#fff" /></div>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Seneca is thinking…</span>
          <span className="cursor" style={{ marginLeft: 0 }} />
        </div>
      )}
    </div>
  );
}

/* ── Live Report ── */
function LiveReport({ synthesis, twinContext, orgContext }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDone(false);
    const id = setTimeout(() => setDone(true), 2800);
    return () => clearTimeout(id);
  }, [synthesis]);
  return (
    <div className="report ready" style={{ animation: 'msgIn 460ms var(--ease)', marginTop: 24, maxWidth: 760, margin: '24px auto 0' }}>
      <div className="report-head">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="report-eyebrow"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--indigo)', display: 'inline-block' }}></span>Seneca · Synthesised Master Briefing</div>
            <div className="report-title">Sovereign Exit Pathway Analysis</div>
            <div className="report-sub">
              <span>Drafted: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>·</span><span>Classification: <b style={{ color: 'var(--amber)' }}>Confidential</b></span>
              <span>·</span><span>5 specialist contributions</span>
            </div>
          </div>
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            <DownloadReport synthesis={synthesis} twinFields={twinContext} orgFields={orgContext} />
          </div>
        </div>
      </div>
      <div className="report-body">
        <div style={{ fontSize: 13, color: 'var(--ink-1)', lineHeight: 1.7, animation: done ? 'none' : 'wave 2.8s ease-in-out infinite', opacity: done ? 1 : 0.6 }}>
          {renderMarkdown(synthesis)}
        </div>
      </div>
      <style>{`@keyframes wave { 0%, 100% { opacity: 0.4; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }`}</style>
    </div>
  );
}

/* ── Sidebar Twin Display ── */
function TwinCard({ label, pct, fields, type }) {
  const isEmpty = !pct || pct < 5;
  const displayName = type === 'consultant'
    ? (fields?.full_name || fields?.display_name || '')
    : (fields?.org_name || fields?.display_name || '');
  const roleLabel = type === 'consultant'
    ? (fields?.role_title || 'Digital Twin')
    : (fields?.industry ? `${fields.industry} · ${fields?.size || ''}` : 'Org Twin');

  return (
    <div className={`twin ${isEmpty ? 'empty' : ''}`}>
      <div className="twin-head">
        <Ring pct={pct || 0} />
        <div className="twin-info">
          <div className={`twin-name ${isEmpty ? 'placeholder' : ''}`}>{displayName || 'Awaiting calibration…'}</div>
          <div className="twin-role">{roleLabel}</div>
        </div>
      </div>
      {!isEmpty && (
        <div className="twin-fields">
          {type === 'consultant' && <>
            {fields?.years_experience && <div className="twin-field"><div className="twin-field-k">Experience</div><div className="twin-field-v">{fields.years_experience} years</div></div>}
            {fields?.expertise_tags?.length > 0 && <div className="twin-field"><div className="twin-field-k">Expertise</div><div className="twin-tags">{fields.expertise_tags.slice(0, 4).map((t, i) => <span key={i} className="twin-tag indigo">{t}</span>)}</div></div>}
            {fields?.decision_style && <div className="twin-field"><div className="twin-field-k">Decision style</div><div className="twin-field-v">{fields.decision_style}</div></div>}
          </>}
          {type === 'org' && <>
            {fields?.size && <div className="twin-field"><div className="twin-field-k">Size</div><div className="twin-field-v">{fields.size}</div></div>}
            {fields?.compliance_frameworks?.length > 0 && <div className="twin-field"><div className="twin-field-k">Compliance</div><div className="twin-tags">{fields.compliance_frameworks.slice(0, 4).map((t, i) => <span key={i} className="twin-tag indigo">{t}</span>)}</div></div>}
            {fields?.engagement_trigger && <div className="twin-field"><div className="twin-field-k">Trigger</div><div className="twin-field-v">{fields.engagement_trigger}</div></div>}
          </>}
        </div>
      )}
    </div>
  );
}

/* ── Demo data ── */
const DEMO_TWIN = {
  display_name: 'Antoine Jansen',
  full_name: 'Antoine Jansen',
  role_title: 'Managing Partner, Humanising AI',
  years_experience: '18',
  sectors: ['Public Sector', 'Financial Services', 'Healthcare'],
  expertise_tags: ['Digital Sovereignty', 'Cloud Strategy', 'Data Governance', 'Zero-Trust Architecture', 'EU Regulatory Compliance'],
  methodologies: ['TOGAF', 'SABSA', 'ITIL v4'],
  decision_style: 'Evidence-driven with strong stakeholder alignment focus',
  communication_style: 'Direct, structured, board-ready narrative',
  notable_engagements: 'Led €120M cloud exit for EU finance regulator; advised DHS on sovereign AI stack selection',
  calibration_pct: 100,
  is_calibrated: true,
  docs: [
    { name: 'Jansen_CV_2025.pdf', url: '#' },
    { name: 'Sovereign_Cloud_White_Paper.pdf', url: '#' }
  ],
  raw_context: 'SENECA: Welcome to Meridian. What\'s your name and current role?\nUSER: Antoine Jansen, Managing Partner at Humanising AI.\nSENECA: Great. Tell me about your key areas of expertise.\nUSER: Digital sovereignty, cloud strategy, data governance and EU regulatory compliance - NIS2, GDPR, Schrems II. 18 years across public sector and financial services.'
};

const DEMO_ORG = {
  display_name: 'Ministerie van Justitie en Veiligheid',
  org_name: 'Ministerie van Justitie en Veiligheid',
  industry: 'Public Sector · National Government (Justice & Security)',
  size: '~30,000 employees',
  headquarters: 'The Hague, Netherlands',
  current_tech_stack: 'Microsoft 365 (primary), Azure, legacy on-premise systems',
  compliance_frameworks: ['NIS2', 'GDPR', 'Schrems II', 'BIO 2.0'],
  key_challenges: 'Heavy dependence on Microsoft 365 creates digital sovereignty and Schrems II exposure for a national justice ministry. Pressure to migrate to EU-sovereign, open-source alternatives while preserving continuity across ~30,000 staff.',
  engagement_trigger: 'Digital sovereignty mandate + Schrems II / NIS2 exposure on Microsoft 365',
  budget_envelope: '€8–12M over 3 years',
  timeline: '18 months to full migration',
  stakeholders: 'CIO, CISO, General Counsel, programme sponsor (SG office)',
  calibration_pct: 100,
  is_calibrated: true,
  docs: [
    { name: 'JenV_Cloud_Strategy_RFP.pdf', url: '#' },
    { name: 'Current_M365_Contract_Summary.pdf', url: '#' },
    { name: 'NIS2_Gap_Assessment_2025.pdf', url: '#' }
  ],
  raw_context: 'SENECA: Tell me about the organisation.\nUSER: Ministerie van Justitie en Veiligheid, The Hague. ~30,000 staff, heavily regulated - NIS2, GDPR, BIO 2.0. Currently on Microsoft 365 but facing real Schrems II and sovereignty exposure.\nSENECA: What is the primary engagement trigger?\nUSER: A digital sovereignty mandate to exit Microsoft 365 onto EU-sovereign open-source. €8-12M budget, 18 month timeline.'
};

/* ── Main Component ── */
export default function MeridianTCE() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [phase, setPhase] = useState(4);
  const [twinData, setTwinData] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [synthesis, setSynthesis] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingMode, setEditingMode] = useState(null); // 'twin' | 'org' | null for modal editing from settings
  const [team, setTeam] = useState(null); // assembled specialist team: [{ personaId, role }]

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.reload();
  };

  // Demo reset: wipe this account's data on the server, then hard-reload to a
  // clean slate (most reliable — clears all in-memory state and onboarding chat).
  // On reload, loadDemo finds no profiles and drops into Phase-1 onboarding.
  const handleResetDemo = async () => {
    await base44.demo.reset();
    window.location.assign('/');
  };

  // Auth gate
  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (!authed) {
        base44.auth.redirectToLogin();
      } else {
        base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
        setAuthChecked(true);
      }
    });
  }, []);

  useEffect(() => {
    // Load demo twins from database
    const loadDemo = async () => {
      try {
        const me = await base44.auth.me();
        const twins = await base44.entities.ConsultantProfile.filter({ created_by: me.email }, undefined, 1);
        const orgs = await base44.entities.OrgProfile.filter({ created_by: me.email }, undefined, 1);
        if (twins.length > 0) setTwinData(twins[0]);
        if (orgs.length > 0) setOrgData(orgs[0]);
        
        // Check if user just verified email (new signup) or has no twins yet
        const params = new URLSearchParams(window.location.search);
        const isNewSignup = params.get('verified') === 'true';
        const noTwinsYet = twins.length === 0 && orgs.length === 0;
        
        if (isNewSignup || noTwinsYet) {
          setPhase(1);
          setActiveTab('consultation');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        console.error('Failed to load demo data:', e);
        setPhase(1);
        setActiveTab('consultation');
      }
    };
    loadDemo();
  }, []);

  // Phase 3 is now the interactive Team Assembly screen; no auto-transition.
  // If we somehow reach Phase 4 without an assembled team (e.g. jumping via the
  // stepper or loading a saved result), fall back to the default core team.
  const activeTeam = team && team.length ? team : DEFAULT_TEAM;

  if (!authChecked) return null;

  if (currentUser?.role === 'client') {
    return <ClientView user={currentUser} />;
  }



  // Build brief from org data
  const brief = orgData ? [
    orgData.org_name && `Organisation: ${orgData.org_name}`,
    orgData.industry && `Industry: ${orgData.industry}`,
    orgData.size && `Size: ${orgData.size}`,
    orgData.current_tech_stack && `Current tech stack: ${orgData.current_tech_stack}`,
    orgData.compliance_frameworks?.length && `Compliance frameworks: ${orgData.compliance_frameworks.join(', ')}`,
    orgData.key_challenges && `Key challenges: ${orgData.key_challenges}`,
    orgData.engagement_trigger && `Engagement trigger: ${orgData.engagement_trigger}`,
    orgData.budget_envelope && `Budget: ${orgData.budget_envelope}`,
    orgData.timeline && `Timeline: ${orgData.timeline}`,
    orgData.stakeholders && `Key stakeholders: ${orgData.stakeholders}`,
    orgData.raw_context && `\n\nDetailed context from onboarding:\n${orgData.raw_context.slice(0, 2000)}`,
  ].filter(Boolean).join('\n') : '';

  const consultantInitials = twinData?.full_name
    ? twinData.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AJ';
  const consultantDisplayName = twinData?.full_name || twinData?.display_name || 'Consultant';
  const orgDisplayName = orgData?.org_name || orgData?.display_name || '';

  const header = (() => {
    switch (phase) {
      case 1: return { eyebrow: <><span>Phase 01</span> · <b>Digital Twin Calibration</b></>, title: "Welcome to Meridian. Let's build your Digital Twin.", sub: 'Seneca will ask follow-up questions until your reasoning profile is fully calibrated. Upload documents anytime.' };
      case 2: return { eyebrow: <><span>Phase 02</span> · <b>Org Twin Onboarding</b></>, title: 'Building the Org Twin for this engagement.', sub: 'Tell Seneca everything about the client. The dossier assembles as you go.' };
      case 3: return { eyebrow: <><span>Phase 03</span> · <b>Specialist Team Assembly</b></>, title: 'Configuring your specialist team.', sub: 'Each persona is calibrated to your Digital Twin and conditioned on the Org Twin.' };
      default: return {
        eyebrow: <><span>Phase 04</span> · <b>Team Consultation Engine - Active</b></>,
        title: orgDisplayName ? `${orgDisplayName} · Consultation` : 'Active Consultation',
        sub: brief ? brief.split('\n')[0] : 'Specialist team analysis in progress'
      };
    }
  })();

  return (
    <div className="app">
      {/* Onboarding Modal - Triggered from Settings */}
      {editingMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,12,0.32)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ width: '90%', maxWidth: 960, maxHeight: '90vh', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <OnboardingChat
              mode={editingMode}
              existingProfile={editingMode === 'twin' ? twinData : orgData}
              onComplete={(data) => {
                if (editingMode === 'twin') setTwinData(data);
                else setOrgData(data);
                setEditingMode(null);
              }}
            />
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsPanel
          twinData={twinData}
          orgData={orgData}
          onClose={() => setSettingsOpen(false)}
          onEditTwin={() => { setSettingsOpen(false); setEditingMode('twin'); }}
          onEditOrg={() => { setSettingsOpen(false); setEditingMode('org'); }}
          onResetDemo={handleResetDemo}
          onDelete={(type) => {
            if (type === 'twin') { setTwinData(null); setPhase(1); }
            else { setOrgData(null); setPhase(twinData?.is_calibrated ? 2 : 1); }
          }}
        />
      )}

      {/* Top Bar */}
      <div className="topbar">
        <div className="top-left">
          <div className="brand"><div className="brand-mark"><I.Meridian size={22} /></div><div className="brand-name">Meridian</div></div>
          <div className="brand-sep"></div>
          <div style={{ display: 'flex', alignItems: 'center' }}><div className="tce-label">The Consultation Engine</div><div className="tce-tag">TCE</div></div>
        </div>
        {activeTab === 'consultation' && phase < 4 && (
          <div className="stepper">
            {[
              { n: 1, label: 'Digital Twin', d: 1 },
              { n: 2, label: 'Org Twin', d: 2 },
              { n: 3, label: 'Team Assembly', d: 3 },
              { n: 4, label: 'Consultation', d: 4 }
            ].map(s => (
              <div key={s.n} className={`step ${phase === s.n ? 'active' : ''} ${phase > s.n ? 'done' : ''}`}
                onClick={() => { if (s.n === 3 && orgData) setPhase(3); else if (s.n === 4 && orgData && phase > 3) setPhase(4); }}>
                <div className="step-num">{phase > s.n ? <I.Check /> : s.d}</div>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="top-right">
          {orgDisplayName && <div className="engagement-chip"><span className="dot"></span><span>{orgDisplayName}</span></div>}
          <button className="icon-btn"><I.Search /></button>
          <button className="icon-btn" onClick={() => setSettingsOpen(true)}><I.Settings /></button>
          <div className="avatar-chip">{consultantInitials}</div>
        </div>
      </div>

      {/* Left Nav */}
      <div className="sidebar">
        <div className="side-section" style={{ flex: 1 }}>
          <div className="side-label"><span>Workspace</span></div>
          <div className="nav-list">
            <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><div className="nav-item-icon"><I.Home /></div><div className="nav-item-label">Dashboard</div></div>
            <div className={`nav-item ${activeTab === 'consultation' ? 'active' : ''}`} onClick={() => setActiveTab('consultation')}><div className="nav-item-icon"><I.Compass /></div><div className="nav-item-label">Consultation</div></div>
            <div className={`nav-item ${activeTab === 'engagements' ? 'active' : ''}`} onClick={() => setActiveTab('engagements')}><div className="nav-item-icon"><I.Engagements /></div><div className="nav-item-label">Engagements</div></div>
            <div className={`nav-item ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}><div className="nav-item-icon"><I.Insights /></div><div className="nav-item-label">Insights</div></div>
          </div>
        </div>
        <div className="side-foot">
          <div className="consultant-mini">
            <div className="avatar-chip" style={{ width: 26, height: 26, fontSize: 10 }}>{consultantInitials}</div>
            <div>
              <div className="consultant-mini-name">{consultantDisplayName}</div>
              <div className="consultant-mini-role">{twinData?.role_title || 'Consultant'}</div>
            </div>
          </div>
          <button className="icon-btn" onClick={handleLogout} title="Sign out"><I.LogOut size={16} /></button>
        </div>
      </div>

      {/* Right Chat Panel - Only show during active consultation */}
      {phase === 4 && (
        <div className="chat-panel">
          <SidebarChat
            twinData={twinData}
            orgData={orgData}
            synthesis={synthesis}
            brief={brief}
            phase={phase}
          />
        </div>
      )}

      {/* Main */}
      <div className="main">
        <div className="main-header">
          <div className="main-title-block">
            <div className="main-eyebrow">{header.eyebrow}</div>
            <div className="main-title">{header.title}</div>
            <div className="main-sub">{header.sub}</div>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="content">
            <DashboardView accountName={consultantDisplayName} orgName={orgDisplayName} />
          </div>
        )}

        {/* Engagements Tab (read-only) */}
        {activeTab === 'engagements' && (
          <div className="content">
            <EngagementsView orgName={orgDisplayName} />
          </div>
        )}

        {/* Insights Tab (read-only) */}
        {activeTab === 'insights' && (
          <div className="content">
            <InsightsView />
          </div>
        )}

        {/* Phase 1: Digital Twin Onboarding */}
        {activeTab === 'consultation' && phase === 1 && (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex' }}>
            <OnboardingChat
              mode="twin"
              existingProfile={twinData}
              onComplete={(data) => {
                setTwinData(data);
                setPhase(2);
              }}
            />
          </div>
        )}

        {/* Phase 2: Org Twin Onboarding */}
        {activeTab === 'consultation' && phase === 2 && (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex' }}>
            <OnboardingChat
              mode="org"
              existingProfile={orgData}
              onComplete={(data) => {
                setOrgData(data);
                setPhase(3);
              }}
            />
          </div>
        )}

        {/* Phase 3: Interactive Specialist Team Assembly */}
        {activeTab === 'consultation' && phase === 3 && (
          <div className="content">
            <TeamAssembly
              iconSet={I}
              orgName={orgDisplayName}
              orgData={orgData}
              twinData={twinData}
              brief={brief}
              onExecute={(assembled) => { setTeam(assembled); setPhase(4); }}
            />
          </div>
        )}

        {/* Consultation Tab - Only Phase 4 */}
        {activeTab === 'consultation' && phase === 4 && (
          <div className="content">
            <Phase4ConsultationWrapper twinContext={twinData} orgContext={orgData} brief={brief} team={activeTeam} onSynthesis={setSynthesis} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Dashboard Component ── */
// Representative demo metrics so the dashboard always reads as an active
// workspace, even on a freshly reset demo with no real consultations yet.
const DEMO_METRICS = {
  creditsUsed: 1240,
  sessionCount: 7,
  reportsGenerated: 12,
  dailyCredits: [22, 38, 31, 47, 55, 41, 63, 58, 72, 66, 81, 78],
};

function DashboardView({ accountName, orgName }) {
  const [stats, setStats] = useState({
    totalTokens: 0,
    creditsUsed: DEMO_METRICS.creditsUsed,
    sessionCount: DEMO_METRICS.sessionCount,
    reportsGenerated: DEMO_METRICS.reportsGenerated,
    dailyCredits: DEMO_METRICS.dailyCredits,
  });

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const me = await base44.auth.me();
        const results = await base44.entities.ConsultationResult.filter({ created_by: me.email }, '-generated_at', 100);
        const threads = await base44.entities.ConsultationThread.filter({ created_by: me.email }, '-last_message_at', 100);

        // No real activity yet (e.g. just after a demo reset) → keep the
        // representative figures so the dashboard never looks empty.
        if (results.length === 0 && threads.length === 0) return;

        let totalTokens = 0;
        results.forEach(r => {
          if (r.tokens) totalTokens += r.tokens;
        });

        const creditsUsed = Math.max(Math.round(totalTokens / 1000), DEMO_METRICS.creditsUsed);

        setStats({
          totalTokens,
          creditsUsed,
          sessionCount: Math.max(threads.length, DEMO_METRICS.sessionCount),
          reportsGenerated: Math.max(results.length, DEMO_METRICS.reportsGenerated),
          dailyCredits: DEMO_METRICS.dailyCredits,
        });
      } catch (e) {
        console.error('Failed to load metrics:', e);
      }
    };

    loadMetrics();
  }, []);

  const maxDaily = Math.max(...stats.dailyCredits);
  const totalMonthly = 3300;
  const credPct = Math.round((stats.creditsUsed / totalMonthly) * 100);

  return (
    <div style={{ padding: '6px 4px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--ink-3)' }}>Project workspace</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2 }}>Ministry of Justice - Sovereign cloud migration</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>Welcome back, {accountName.split(' ')[0]} · <b style={{ color: 'var(--ink-2)' }}>{orgName}</b></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, background: 'linear-gradient(135deg, rgba(120,90,255,0.06), rgba(255,140,90,0.06))', border: '1px solid var(--line-1)', borderRadius: 'var(--r-md)', padding: 14 }}>
        {[
          { l: 'Credits Consumed', v: stats.creditsUsed.toLocaleString() },
          { l: 'Active Sessions', v: stats.sessionCount },
          { l: 'Reports Generated', v: stats.reportsGenerated },
        ].map((p) => (
          <div key={p.l}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--ink-3)' }}>{p.l}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-1)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{p.v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-md)', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>AI Credit Usage (This Month)</div>
          <span style={{ fontSize: 9.5, padding: '3px 8px', borderRadius: 999, background: credPct > 70 ? 'rgba(220,80,80,0.12)' : 'rgba(21,128,61,0.12)', color: credPct > 70 ? '#c14a4a' : '#15803d', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>{credPct}% used</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink-1)' }}>{stats.creditsUsed}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>/ {totalMonthly} credits this month</div>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-tint)', marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${credPct}%`, height: '100%', background: credPct > 70 ? 'linear-gradient(90deg, #ff6b6b, #ff3b3b)' : 'linear-gradient(90deg, #4f46e5, #3e37c7)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
          <span>Resets in 6 days</span>
          <span>Fair-use included in license</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--ink-3)', marginBottom: 8 }}>Daily credit consumption</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 56 }}>
            {stats.dailyCredits.map((b, i) => (
              <div key={i} style={{ flex: 1, height: `${maxDaily ? (b / maxDaily) * 100 : 0}%`, background: i === stats.dailyCredits.length - 1 ? '#ff6b6b' : 'var(--ink-5)', borderRadius: 3 }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { l: 'Credits Used', v: stats.creditsUsed.toLocaleString(), s: 'This month' },
          { l: 'Sessions', v: stats.sessionCount, s: 'Total active' },
          { l: 'Reports', v: stats.reportsGenerated, s: 'Generated' },

        ].map((stat) => (
          <div key={stat.l} style={{ background: 'var(--surface)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-md)', padding: '14px 16px', minHeight: 86, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--ink-3)' }}>{stat.l}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-1)', lineHeight: 1.1, marginTop: 6 }}>{stat.v}</div>
            {stat.s && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{stat.s}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Read-only module header badge ── */
function ReadOnlyBadge() {
  return (
    <span style={{ fontSize: 9.5, padding: '3px 9px', borderRadius: 999, background: 'var(--bg-tint)', border: '1px solid var(--line-2)', color: 'var(--ink-3)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
      Read-only preview
    </span>
  );
}

/* ── Engagements (read-only) ── */
const DEMO_ENGAGEMENTS = [
  { org: 'Ministerie van Justitie en Veiligheid', scope: 'Microsoft 365 sovereign exit', status: 'Active', stage: 'Consultation', specialists: 5, updated: 'Today' },
  { org: 'Provincie Noord-Holland', scope: 'Data residency & NIS2 readiness', status: 'In review', stage: 'Synthesis', specialists: 4, updated: '2 days ago' },
  { org: 'Belastingdienst', scope: 'Cloud TCO & vendor lock-in assessment', status: 'Completed', stage: 'Delivered', specialists: 5, updated: 'Last week' },
];

function EngagementsView({ orgName }) {
  const statusColor = (s) => s === 'Active' ? { bg: 'rgba(79,70,229,0.12)', fg: 'var(--indigo)' }
    : s === 'Completed' ? { bg: 'rgba(21,128,61,0.12)', fg: '#15803d' }
    : { bg: 'rgba(180,120,9,0.12)', fg: '#b4780b' };
  return (
    <div style={{ padding: '6px 4px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--ink-3)' }}>Engagements</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2 }}>Engagement portfolio</div>
        </div>
        <ReadOnlyBadge />
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 2.6fr 1fr 1.2fr 1fr', gap: 12, padding: '10px 16px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--line-2)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          <span>Organisation</span><span>Scope</span><span>Status</span><span>Stage</span><span>Updated</span>
        </div>
        {DEMO_ENGAGEMENTS.map((e, i) => {
          const c = statusColor(e.status);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.4fr 2.6fr 1fr 1.2fr 1fr', gap: 12, padding: '13px 16px', borderBottom: i < DEMO_ENGAGEMENTS.length - 1 ? '1px solid var(--line-1)' : 'none', alignItems: 'center', fontSize: 12.5, color: 'var(--ink-1)' }}>
              <span style={{ fontWeight: 600 }}>{e.org}</span>
              <span style={{ color: 'var(--ink-2)' }}>{e.scope}</span>
              <span><span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: c.bg, color: c.fg, fontWeight: 600 }}>{e.status}</span></span>
              <span style={{ color: 'var(--ink-2)' }}>{e.stage} · {e.specialists} specialists</span>
              <span style={{ color: 'var(--ink-3)' }}>{e.updated}</span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
        Full engagement management (timelines, document rooms, client portals) is on the roadmap. This preview is read-only.
      </div>
    </div>
  );
}

/* ── Insights (read-only) ── */
function InsightsView() {
  const bars = [
    { label: 'Compliance Sentinel', pct: 94 },
    { label: 'Cloud Architect', pct: 91 },
    { label: 'Financial Analyst', pct: 92 },
    { label: 'Legal Advisor', pct: 89 },
    { label: 'Risk Officer', pct: 88 },
  ];
  return (
    <div style={{ padding: '6px 4px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--ink-3)' }}>Insights</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-1)', marginTop: 2 }}>Consultation insights</div>
        </div>
        <ReadOnlyBadge />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { l: 'Avg. confidence', v: '90.8%' },
          { l: 'Avg. time to brief', v: '00:01:48' },
          { l: 'Specialists / engagement', v: '5' },
          { l: 'Briefings delivered', v: '12' },
        ].map((s) => (
          <div key={s.l} style={{ background: 'var(--surface)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--ink-3)' }}>{s.l}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-1)', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-md)', padding: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 14 }}>Average confidence by specialist</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bars.map((b) => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 140, fontSize: 11.5, color: 'var(--ink-2)' }}>{b.label}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--bg-tint)', overflow: 'hidden' }}>
                <div style={{ width: `${b.pct}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #3e37c7)' }} />
              </div>
              <span style={{ width: 38, textAlign: 'right', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-1)', fontVariantNumeric: 'tabular-nums' }}>{b.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
        Cross-engagement analytics (trends, benchmarking, export) is on the roadmap. This preview is read-only.
      </div>
    </div>
  );
}

/* ── Small toggle switch ── */
function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      title={label}
      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, color: checked ? 'var(--ink-1)' : 'var(--ink-3)' }}
    >
      <span style={{ fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ position: 'relative', width: 26, height: 15, borderRadius: 999, background: checked ? 'var(--indigo)' : 'var(--line-3)', transition: 'background 180ms', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: checked ? 13 : 2, width: 11, height: 11, borderRadius: '50%', background: '#fff', transition: 'left 180ms', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
      </span>
    </button>
  );
}

/* ── Phase4 wrapper to track synthesis and pass to download ── */
function Phase4ConsultationWrapper({ twinContext, orgContext, brief, team, onSynthesis }) {
  // Resolve a team descriptor (either an assembly list of {personaId, role,
  // dynamicPersona} or a list of already-resolved persona objects) into concrete
  // persona objects carrying their team role.
  const resolveTeam = (t) =>
    (t && t.length ? t : [])
      .map((m) => {
        if (m.dynamicPersona) return { ...m.dynamicPersona, teamRole: m.role };
        if (m.personaId) return PERSONA_BY_ID[m.personaId] ? { ...PERSONA_BY_ID[m.personaId], teamRole: m.role } : null;
        // Already a resolved persona object (e.g. rehydrated from a saved result).
        return m.id && m.role ? m : null;
      })
      .filter(Boolean);

  // The team is kept in state so a saved consultation can rehydrate the exact
  // roster that produced its analyses (persona ids must line up for lookups).
  const [teamPersonas, setTeamPersonas] = useState(() => resolveTeam(team));

  const [stage, setStage] = useState('loading');
  const [ps, setPs] = useState(teamPersonas.map(() => ({ status: 'pending', progress: 0 })));
  const [results, setResults] = useState({});
  const [synthesis, setSynthesis] = useState('');
  const [viewPersona, setViewPersona] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [executeReports, setExecuteReports] = useState([]); // Store execute mode reports
  // System defaults: both ON (per demo spec). Observer Audit surfaces a
  // read-only audit trail; Auto-recommend surfaces suggested deep-dives.
  const [observerAudit, setObserverAudit] = useState(true);
  const [autoRecommend, setAutoRecommend] = useState(true);
  const [dynamicRecommendations, setDynamicRecommendations] = useState([]);

  useEffect(() => {
    if (synthesis && autoRecommend) {
      base44.functions.invoke('generateNextExecutions', { synthesis, twinContext, orgContext })
        .then(res => setDynamicRecommendations(res.data.recommendations || []))
        .catch(console.error);
    }
  }, [synthesis, autoRecommend, twinContext, orgContext]);

  useEffect(() => {
    if (synthesis) {
      window.__meridian_synthesis = synthesis;
      if (onSynthesis) onSynthesis(synthesis);
    }
  }, [synthesis]);

  useEffect(() => { const t = setInterval(() => setElapsed(e => e + 1), 1000); return () => clearInterval(t); }, []);

  // Listen for execute report events from sidebar chat
  useEffect(() => {
    const handleExecuteReport = (e) => {
      const report = { id: Date.now(), ...e.detail };
      setExecuteReports(prev => [...prev, report]);
    };
    window.addEventListener('meridian:executeReport', handleExecuteReport);
    return () => window.removeEventListener('meridian:executeReport', handleExecuteReport);
  }, []);

  // Load existing consultation results on mount, or auto-run if both twins are calibrated
  useEffect(() => {
    // Wait until both IDs are actually resolved before doing anything
    if (!twinContext?.id || !orgContext?.id) return;

    const loadExisting = async () => {
      try {
        const me = await base44.auth.me();

        // Fetch latest initial consultation result for this exact org+consultant pair owned by this user
        const existing = await base44.entities.ConsultationResult.filter({
          org_id: orgContext.id,
          consultant_id: twinContext.id,
          request_type: 'initial',
          created_by: me.email
        }, '-generated_at', 1);

        if (existing.length > 0) {
          const latest = existing[0];
          setSynthesis(latest.synthesis);

          // Rehydrate the exact team that produced these analyses so persona ids
          // line up with the saved persona_analyses keys. Older records predate
          // the saved team, so fall back to the current roster for those.
          const savedTeam = resolveTeam(latest.team);
          const personaList = savedTeam.length ? savedTeam : teamPersonas;
          if (savedTeam.length) setTeamPersonas(savedTeam);

          // Map saved analyses to personas by id, with a positional fallback for
          // legacy records whose persona_ids predate the current id scheme.
          const analyses = latest.persona_analyses || [];
          const byId = {};
          analyses.forEach(pa => { byId[pa.persona_id] = pa.analysis; });
          const personaMap = {};
          personaList.forEach((p, i) => {
            const a = byId[p.id] != null ? byId[p.id] : (analyses[i] ? analyses[i].analysis : '');
            if (a) personaMap[p.id] = a;
          });

          setResults(personaMap);
          // Only mark a persona complete if its analysis actually loaded, so the
          // "View analysis" link never opens an empty panel.
          setPs(personaList.map(p => personaMap[p.id]
            ? { status: 'complete', progress: 100 }
            : { status: 'pending', progress: 0 }));
          setStage('done');
        } else {
          runConsultation();
        }
      } catch (e) {
        console.error('Failed to load existing results:', e);
        runConsultation();
      }
    };

    loadExisting();
  }, [twinContext?.id, orgContext?.id]);

  const runConsultation = async () => {
    setStage('consulting');
    const collectedResults = {};
    let totalTokens = 0;
    
    for (let i = 0; i < teamPersonas.length; i++) {
      const p = teamPersonas[i];
      setPs(prev => { const x = [...prev]; x[i] = { status: 'consulting', progress: 5 }; return x; });
      const animInterval = setInterval(() => {
        setPs(prev => { const x = [...prev]; if (x[i] && x[i].progress < 90) x[i] = { ...x[i], progress: x[i].progress + 3 }; return x; });
      }, 280);
      const res = await base44.functions.invoke('personaConsult', {
        mode: 'persona', personaId: p.id, brief, twinContext, orgContext, teamRole: p.teamRole, dynamicPersona: p
      });
      clearInterval(animInterval);
      collectedResults[p.id] = res.data.analysis;
      totalTokens += (res.data.inputTokens || 0) + (res.data.outputTokens || 0);
      setResults(prev => ({ ...prev, [p.id]: res.data.analysis }));
      setPs(prev => { const x = [...prev]; x[i] = { status: 'complete', progress: 100 }; return x; });
    }
    const personaResults = teamPersonas.map(p => ({ role: p.role, analysis: collectedResults[p.id] || '' }));
    const synthRes = await base44.functions.invoke('personaConsult', {
      mode: 'synthesise', brief, twinContext, orgContext, personaResults
    });
    const newSynthesis = synthRes.data.synthesis;
    totalTokens += (synthRes.data.inputTokens || 0) + (synthRes.data.outputTokens || 0);
    setSynthesis(newSynthesis);
    
    // Save result with token usage and create/link to consultation thread
    try {
      const personaAnalyses = teamPersonas.map(p => ({ persona_id: p.id, analysis: collectedResults[p.id] || '' }));
      const result = await base44.entities.ConsultationResult.create({
        org_id: orgContext.id,
        consultant_id: twinContext.id,
        synthesis: newSynthesis,
        persona_analyses: personaAnalyses,
        // Persist the resolved roster so a reload can rehydrate the same persona
        // ids and render each "View analysis" against the right analysis.
        team: teamPersonas,
        request_type: 'initial',
        tokens: totalTokens,
        generated_at: new Date().toISOString()
      });
      
      // Create consultation thread if it doesn't exist
      let threadId = null;
      const existingThreads = await base44.entities.ConsultationThread.filter({
        org_id: orgContext.id,
        consultant_id: twinContext.id
      }, '-last_message_at', 1);
      
      if (existingThreads.length === 0) {
        const newThread = await base44.entities.ConsultationThread.create({
          org_id: orgContext.id,
          consultant_id: twinContext.id,
          messages: [
            { role: 'seneca', text: `Master briefing synthesised. Initial analysis complete.`, timestamp: new Date().toISOString() }
          ],
          last_message_at: new Date().toISOString()
        });
        threadId = newThread.id;
      } else {
        threadId = existingThreads[0].id;
      }
    } catch (e) {
      console.error('Failed to save result or thread:', e);
    }
    setStage('done');
  };

  const fmt = s => { const m = String(Math.floor(s / 60)).padStart(2, '0'); const sc = String(s % 60).padStart(2, '0'); return `00:${m}:${sc}`; };

  if (stage === 'waiting') {
    return (
      <div style={{ maxWidth: 760, margin: '80px auto', padding: '40px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-md)' }}>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
          Complete onboarding for both <b>Digital Twin</b> and <b>Org Twin</b> in Settings to auto-generate the master briefing and start the consultation.
        </div>
      </div>
    );
  }

  return (
    <div>
      {viewPersona && <AnalysisModal persona={viewPersona} analysis={results[viewPersona.id] || ''} onClose={() => setViewPersona(null)} />}
      <div className="live-strip">
        <div className="live-strip-left">
          <span className="live-strip-dot"></span>
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{stage === 'done' ? 'Consultation complete' : 'Consultation live'}</span>
          <span style={{ color: 'var(--ink-3)' }}>· {teamPersonas.length} specialists routing</span>
        </div>
        <div className="live-strip-meta">
          <Toggle label="Observer Audit" checked={observerAudit} onChange={setObserverAudit} />
          <Toggle label="Auto-recommend Execution Mode" checked={autoRecommend} onChange={setAutoRecommend} />
          <span>Elapsed <b>{fmt(elapsed)}</b></span>
        </div>
      </div>
      <div className="brief">
        <div className="brief-label"><span>Engagement Brief</span><b>Active</b></div>
        <div className="brief-body" style={{ whiteSpace: 'pre-wrap' }}>{brief}</div>
      </div>
      {observerAudit && (
        <div style={{ maxWidth: 760, margin: '0 auto 16px', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 999, background: 'rgba(21,128,61,0.12)', color: '#15803d', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>● Observer audit active</span>
            <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>Every specialist response is logged and attributable.</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {teamPersonas.map((p, i) => {
              const s = ps[i] || { status: 'pending', progress: 0 };
              const state = s.status === 'complete' ? 'verified' : s.status === 'consulting' ? 'in progress' : 'queued';
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-2)' }}>
                  <span>{p.role}<span style={{ color: 'var(--ink-4)' }}> · {p.teamRole}</span></span>
                  <span style={{ color: s.status === 'complete' ? '#15803d' : 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
                    {state}{s.status === 'complete' ? ` · ${p.confidence || 93}% confidence` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="persona-grid">
        {teamPersonas.map((p, i) => {
          const s = ps[i] || { status: 'pending', progress: 0 };
          const Ic = I[p.icon];
          const cls = s.status === 'consulting' ? 'consulting' : s.status === 'complete' ? 'complete' : '';
          return (
            <div key={p.id} className={`persona ${cls}`}>
              <div className="p-head">
                <div className="p-icon"><Ic /></div>
                <div className="p-info"><div className="p-role">{p.role} <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>· {p.teamRole}</span></div><div className="p-spec">{p.spec}</div></div>
                {s.status === 'pending' && <span className="persona-pill muted"><span className="pill-dot"></span> Queued</span>}
                {s.status === 'consulting' && <span className="persona-pill indigo"><span className="pill-dot"></span> Consulting…</span>}
                {s.status === 'complete' && <span className="persona-pill"><span className="pill-dot"></span> Complete</span>}
              </div>
              {(s.status === 'consulting' || s.status === 'complete') && <div className="p-progress"><div className="p-progress-fill" style={{ width: `${s.progress}%` }} /></div>}
              <div className="p-foot">
                <span className="p-foot-stat">Confidence {p.confidence || 93}%</span>
                {s.status === 'complete' && results[p.id] && <span className="p-analysis-link" onClick={() => setViewPersona(p)}>View analysis <I.ArrowRight /></span>}
              </div>
            </div>
          );
        })}
      </div>
      {stage === 'done' && synthesis && (
        <>
          <LiveReport synthesis={synthesis} twinContext={twinContext} orgContext={orgContext} />

          {/* Auto-recommend Execution Mode: suggested deep-dives that run a full
              specialist execution (with ROI reveal) on click. */}
          {autoRecommend && (
            <div style={{ maxWidth: 760, margin: '16px auto 0', padding: '14px 16px', background: 'linear-gradient(135deg, var(--indigo-tint), var(--amber-tint))', border: '1px solid var(--indigo-tint-2)', borderRadius: 'var(--r-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 999, background: 'var(--surface)', color: 'var(--indigo-deep)', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Recommended next executions</span>
                <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>Run a full specialist team on a focused question.</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(dynamicRecommendations.length > 0 ? dynamicRecommendations : [
                  'Model the 5-year TCO of the recommended sovereign stack vs Microsoft 365.',
                  'Draft the NIS2 and Schrems II compliance remediation roadmap.',
                  'Assess vendor lock-in and exit risks for the proposed migration.',
                ]).map((q) => (
                  <button
                    key={q}
                    onClick={() => window.dispatchEvent(new CustomEvent('meridian:executeReport', { detail: { question: q, twinData: twinContext, orgData: orgContext, brief, synthesis } }))}
                    style={{ textAlign: 'left', flex: '1 1 220px', padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 8, fontSize: 11.5, color: 'var(--ink-1)', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.4, transition: 'all 180ms' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.boxShadow = 'var(--shadow-1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <FollowUpThread synthesis={synthesis} twinContext={twinContext} orgContext={orgContext} brief={brief} />

          {/* Execute Mode Reports */}
          {executeReports.map(report => (
            <ExecuteReport
              key={report.id}
              twinContext={report.twinData}
              orgContext={report.orgData}
              brief={report.brief}
              question={report.question}
              messageHistory={report.messageHistory}
              team={teamPersonas}
              iconSet={I}
              onComplete={() => setExecuteReports(prev => prev.filter(r => r.id !== report.id))}
            />
          ))}
        </>
      )}
      {stage === 'consulting' && (
        <div style={{ maxWidth: 760, margin: '24px auto 0', padding: '20px', background: 'var(--surface)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-md)', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="live-strip-dot" style={{ flexShrink: 0 }}></span>
            Synthesising master briefing after all specialists complete…
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Bottom Composer for Phase 4 ── */
function BottomComposerPhase4({ twinContext, orgContext, brief }) {
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    return followUpBus.on(async (text) => {
      const q = text.trim();
      if (!q || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      const synthesis = window.__meridian_synthesis || '';
      const res = await base44.functions.invoke('personaConsult', {
        mode: 'followup', question: q, brief, synthesis, twinContext, orgContext
      });
      loadingRef.current = false;
      setLoading(false);
    });
  }, [brief, twinContext, orgContext]);

  const send = () => { const q = draft.trim(); if (!q) return; setDraft(''); followUpBus.emit(q); };
  const onKey = e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } };

  return (
    <div className="composer">
      <div className="composer-inner">
        <textarea className="composer-input" placeholder="Ask a follow-up, deepen the analysis, or request a deeper dive on any section…" rows={2} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey} disabled={loading} />
        <div className="composer-foot">
          <div className="composer-tools">
            <button className="composer-tool context"><I.Network size={11} /> Routing: Full specialist team</button>
            <button className="composer-tool"><I.Paperclip /> Attach</button>
          </div>
          <button className="composer-send" onClick={send} disabled={loading || !draft.trim()}>
            {loading ? 'Thinking…' : 'Continue consultation'} <I.Send /><span className="composer-kbd">⌘ ↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}