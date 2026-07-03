import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

/* ============================================================
   Trade Ledger — personal trading journal
   Storage design:
     - "entry:YYYY-MM-DD" -> full day JSON (images, notes, P/L, tags)
     - "index"            -> lightweight map of all dates (P/L, tags,
                             preview, search text) for fast calendar,
                             weekday review, analytics and search
     - "settings"         -> { currency }
   ============================================================ */

const CSS = `
.tj-root{--bg:#0A0D13;--panel:#11151F;--panel2:#161C29;--panel3:#1B2231;--line:#232B3D;--line2:#2C3650;
  --text:#E8ECF4;--muted:#8B95A9;--faint:#5A6376;
  --up:#31C77F;--up-bg:rgba(49,199,127,.10);--up-line:rgba(49,199,127,.35);
  --down:#F0564D;--down-bg:rgba(240,86,77,.10);--down-line:rgba(240,86,77,.35);
  --amber:#F2A93B;--amber-bg:rgba(242,169,59,.12);
  --mono:ui-monospace,"SF Mono","Cascadia Code",Consolas,"Roboto Mono",Menlo,monospace;
  min-height:100vh;background:var(--bg);color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Inter","Helvetica Neue",Arial,sans-serif;
  font-size:14px;line-height:1.5;}
.tj-root *{box-sizing:border-box}
.tj-root ::selection{background:rgba(242,169,59,.30)}
.tj-root input,.tj-root textarea,.tj-root select,.tj-root button{font-family:inherit;font-size:14px;color:var(--text)}
.tj-root :focus-visible{outline:2px solid var(--amber);outline-offset:1px;border-radius:6px}

.tj-shell{max-width:1160px;margin:0 auto;padding:0 20px 80px}
.tj-header{display:flex;align-items:center;gap:14px;padding:18px 0 10px;flex-wrap:wrap}
.tj-logo{display:flex;align-items:center;gap:10px;min-width:0}
.tj-logo h1{font-size:17px;font-weight:700;letter-spacing:.06em;margin:0;text-transform:uppercase}
.tj-logo .tj-sub{font-size:11px;color:var(--faint);letter-spacing:.14em;text-transform:uppercase;margin-top:-2px}
.tj-header-spacer{flex:1}
.tj-total-chip{display:flex;flex-direction:column;align-items:flex-end;gap:0}
.tj-total-chip .tj-tc-label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.tj-total-chip .tj-tc-val{font-family:var(--mono);font-size:17px;font-weight:600;font-variant-numeric:tabular-nums}
.tj-iconbtn{background:var(--panel);border:1px solid var(--line);border-radius:8px;width:36px;height:36px;
  display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);flex:0 0 auto}
.tj-iconbtn:hover{border-color:var(--line2);color:var(--text)}

.tj-tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}
.tj-tabs::-webkit-scrollbar{display:none}
.tj-tab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 14px;cursor:pointer;
  color:var(--muted);font-weight:600;font-size:13px;letter-spacing:.04em;white-space:nowrap}
.tj-tab:hover{color:var(--text)}
.tj-tab.tj-active{color:var(--amber);border-bottom-color:var(--amber)}

.tj-panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px}
.tj-panel + .tj-panel{margin-top:16px}
.tj-h2{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 12px}
.tj-hint{font-size:12px;color:var(--faint)}

.tj-btn{background:var(--panel3);border:1px solid var(--line2);border-radius:8px;padding:8px 14px;cursor:pointer;
  font-weight:600;font-size:13px;color:var(--text);display:inline-flex;align-items:center;gap:7px}
.tj-btn:hover{border-color:#3A4560}
.tj-btn:disabled{opacity:.5;cursor:not-allowed}
.tj-btn.tj-primary{background:var(--amber);border-color:var(--amber);color:#141008}
.tj-btn.tj-primary:hover{background:#F7B958}
.tj-btn.tj-danger{border-color:var(--down-line);color:var(--down)}
.tj-btn.tj-danger:hover{background:var(--down-bg)}
.tj-btn.tj-ghost{background:none;border-color:transparent;color:var(--muted)}
.tj-btn.tj-ghost:hover{color:var(--text)}

.tj-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
.tj-label{font-size:11px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:var(--muted)}
.tj-input,.tj-select,.tj-textarea{background:var(--panel2);border:1px solid var(--line);border-radius:8px;
  padding:8px 10px;color:var(--text);width:100%}
.tj-input::placeholder,.tj-textarea::placeholder{color:var(--faint)}
.tj-input:focus,.tj-textarea:focus,.tj-select:focus{border-color:var(--amber);outline:none}
.tj-textarea{resize:vertical;min-height:76px;line-height:1.55}
.tj-mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
.tj-up{color:var(--up)}.tj-down{color:var(--down)}.tj-flat{color:var(--muted)}

.tj-log-grid{display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start;margin-top:16px}
.tj-side{position:sticky;top:12px}
.tj-banner{display:flex;align-items:center;gap:8px;background:var(--amber-bg);border:1px solid rgba(242,169,59,.35);
  color:var(--amber);border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:12px}
.tj-banner.tj-warn{background:var(--down-bg);border-color:var(--down-line);color:var(--down)}
.tj-banner.tj-info{background:var(--panel2);border-color:var(--line);color:var(--muted)}

.tj-drop{border:1.5px dashed var(--line2);border-radius:10px;padding:22px;text-align:center;cursor:pointer;
  color:var(--muted);transition:border-color .15s,background .15s}
.tj-drop:hover{border-color:var(--amber)}
.tj-drop.tj-over{border-color:var(--amber);background:var(--amber-bg)}
.tj-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-top:12px}
.tj-thumb{position:relative;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#000;
  aspect-ratio:16/10;cursor:zoom-in}
.tj-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.tj-thumb .tj-x{position:absolute;top:5px;right:5px;background:rgba(10,13,19,.85);border:1px solid var(--line2);
  color:var(--text);border-radius:6px;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;
  justify-content:center;font-size:13px;line-height:1}
.tj-thumb .tj-x:hover{color:var(--down);border-color:var(--down-line)}
.tj-meter{height:5px;border-radius:3px;background:var(--panel3);overflow:hidden;margin-top:6px}
.tj-meter>div{height:100%;background:var(--up);border-radius:3px;transition:width .2s}
.tj-meter.tj-hot>div{background:var(--amber)}
.tj-meter.tj-full>div{background:var(--down)}

.tj-tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.tj-tag{display:inline-flex;align-items:center;gap:5px;background:var(--panel3);border:1px solid var(--line2);
  border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;color:var(--text)}
.tj-tag button{background:none;border:none;color:var(--muted);cursor:pointer;padding:0;font-size:13px;line-height:1}
.tj-tag button:hover{color:var(--down)}
.tj-tag.tj-static{cursor:default}
.tj-tag-suggest{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.tj-tag-suggest button{background:none;border:1px dashed var(--line2);border-radius:999px;padding:2px 9px;
  font-size:12px;color:var(--muted);cursor:pointer}
.tj-tag-suggest button:hover{color:var(--amber);border-color:var(--amber)}

.tj-cal-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.tj-cal-title{font-size:16px;font-weight:700;min-width:150px}
.tj-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.tj-cal-dow{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);
  text-align:center;padding:4px 0}
.tj-cell{border:1px solid var(--line);border-radius:8px;min-height:72px;padding:6px 7px;position:relative;
  background:var(--panel2);display:flex;flex-direction:column;justify-content:space-between}
.tj-cell.tj-none{background:transparent}
.tj-cell.tj-clickable{cursor:pointer}
.tj-cell.tj-clickable:hover{border-color:var(--line2)}
.tj-cell.tj-cup{background:var(--up-bg);border-color:var(--up-line)}
.tj-cell.tj-cdown{background:var(--down-bg);border-color:var(--down-line)}
.tj-cell.tj-today{outline:1.5px solid var(--amber);outline-offset:-1.5px}
.tj-cell .tj-dnum{font-size:11px;color:var(--muted);font-weight:600}
.tj-cell .tj-dpl{font-family:var(--mono);font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;text-align:right}
.tj-cell .tj-dplus{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--faint);
  font-size:16px;opacity:0;transition:opacity .1s}
.tj-cell.tj-none:hover .tj-dplus{opacity:.8}
.tj-legend{display:flex;gap:14px;margin-top:12px;font-size:12px;color:var(--muted);flex-wrap:wrap}
.tj-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}

.tj-wk-picker{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.tj-wk-btn{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:7px 13px;cursor:pointer;
  font-weight:600;font-size:13px;color:var(--muted)}
.tj-wk-btn:hover{color:var(--text)}
.tj-wk-btn.tj-on{background:var(--amber-bg);border-color:var(--amber);color:var(--amber)}
.tj-wk-stats{display:flex;gap:22px;flex-wrap:wrap;background:var(--panel2);border:1px solid var(--line);
  border-radius:10px;padding:12px 16px;margin-bottom:14px}
.tj-wk-stat .tj-ws-l{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.tj-wk-stat .tj-ws-v{font-family:var(--mono);font-size:16px;font-weight:600;font-variant-numeric:tabular-nums}
.tj-gallery{display:flex;flex-direction:column;gap:10px;max-height:640px;overflow-y:auto;padding-right:4px}
.tj-card{display:flex;gap:12px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;
  padding:12px;cursor:pointer;text-align:left;width:100%}
.tj-card:hover{border-color:var(--line2);background:var(--panel3)}
.tj-card-thumbs{display:flex;gap:6px;flex:0 0 auto}
.tj-card-thumbs .tj-ct{width:72px;height:48px;border-radius:6px;object-fit:cover;border:1px solid var(--line);background:#000}
.tj-card-thumbs .tj-ct-more{width:72px;height:48px;border-radius:6px;border:1px dashed var(--line2);display:flex;
  align-items:center;justify-content:center;color:var(--faint);font-size:12px;font-family:var(--mono)}
.tj-card-body{min-width:0;flex:1}
.tj-card-top{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.tj-card-date{font-weight:700;font-size:13px}
.tj-card-pl{font-family:var(--mono);font-weight:600;font-size:13px;font-variant-numeric:tabular-nums}
.tj-card-prev{color:var(--muted);font-size:12.5px;margin-top:3px;display:-webkit-box;-webkit-line-clamp:2;
  -webkit-box-orient:vertical;overflow:hidden}
.tj-skel{background:linear-gradient(90deg,var(--panel2),var(--panel3),var(--panel2));background-size:200% 100%;
  animation:tjsk 1.2s infinite;border-radius:6px}
@keyframes tjsk{0%{background-position:0% 0}100%{background-position:-200% 0}}

.tj-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.tj-stat{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.tj-stat .tj-s-l{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.tj-stat .tj-s-v{font-family:var(--mono);font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;margin-top:3px}
.tj-stat .tj-s-sub{font-size:11px;color:var(--muted);margin-top:2px}
.tj-table-wrap{overflow-x:auto}
.tj-table{width:100%;border-collapse:collapse;font-size:13px}
.tj-table th{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);text-align:left;
  padding:7px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
.tj-table td{padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
.tj-table td.tj-num,.tj-table th.tj-num{text-align:right;font-family:var(--mono);font-variant-numeric:tabular-nums}
.tj-table tr:last-child td{border-bottom:none}
.tj-table tbody tr:hover{background:var(--panel2)}

.tj-overlay{position:fixed;inset:0;background:rgba(4,6,10,.78);backdrop-filter:blur(3px);z-index:60;
  display:flex;align-items:flex-start;justify-content:center;padding:30px 16px;overflow-y:auto}
.tj-modal{background:var(--panel);border:1px solid var(--line2);border-radius:14px;max-width:860px;width:100%;
  padding:20px;box-shadow:0 22px 70px rgba(0,0,0,.55)}
.tj-modal-sm{max-width:440px}
.tj-modal-lg{max-width:1080px}
.tj-modal-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
.tj-modal-title{font-size:17px;font-weight:700;margin:0}
.tj-modal-sub{font-size:12px;color:var(--muted);margin-top:1px}
.tj-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}
.tj-note-block{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin-bottom:8px}
.tj-note-block .tj-nb-l{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--amber);font-weight:700}
.tj-note-block p{margin:4px 0 0;white-space:pre-wrap;color:var(--text);font-size:13.5px}
.tj-meta-row{display:flex;gap:16px;flex-wrap:wrap;color:var(--muted);font-size:13px;margin-bottom:12px}
.tj-meta-row b{color:var(--text);font-family:var(--mono)}

.tj-lightbox{position:fixed;inset:0;background:rgba(2,3,6,.94);z-index:80;display:flex;align-items:center;
  justify-content:center}
.tj-lb-img-wrap{max-width:94vw;max-height:88vh;overflow:auto;display:flex;align-items:center;justify-content:center}
.tj-lb-img-wrap img{max-width:92vw;max-height:84vh;object-fit:contain;cursor:zoom-in;display:block}
.tj-lb-img-wrap.tj-zoomed{align-items:flex-start;justify-content:flex-start}
.tj-lb-img-wrap.tj-zoomed img{max-width:none;max-height:none;cursor:zoom-out}
.tj-lb-nav{position:fixed;top:50%;transform:translateY(-50%);z-index:81}
.tj-lb-nav.tj-left{left:14px}.tj-lb-nav.tj-right{right:14px}
.tj-lb-top{position:fixed;top:14px;right:14px;display:flex;gap:8px;z-index:81;align-items:center}
.tj-lb-count{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);color:var(--muted);
  font-family:var(--mono);font-size:12px;background:rgba(10,13,19,.7);padding:3px 10px;border-radius:999px}

.tj-cmp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.tj-cmp-col{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:14px;min-width:0}
.tj-cmp-imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin:10px 0}

.tj-search-wrap{position:relative}
.tj-search-panel{position:absolute;right:0;top:44px;width:min(460px,90vw);background:var(--panel);
  border:1px solid var(--line2);border-radius:12px;padding:12px;z-index:70;box-shadow:0 18px 50px rgba(0,0,0,.5)}
.tj-search-res{max-height:380px;overflow-y:auto;margin-top:10px;display:flex;flex-direction:column;gap:4px}
.tj-sr-row{display:flex;gap:10px;align-items:baseline;padding:8px 10px;border-radius:8px;cursor:pointer;
  background:none;border:none;text-align:left;width:100%}
.tj-sr-row:hover{background:var(--panel3)}
.tj-sr-date{font-weight:700;font-size:13px;white-space:nowrap}
.tj-sr-pl{font-family:var(--mono);font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
.tj-sr-snip{color:var(--muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}

.tj-toasts{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:100;display:flex;
  flex-direction:column;gap:8px;align-items:center;pointer-events:none}
.tj-toast{background:var(--panel3);border:1px solid var(--line2);border-radius:10px;padding:9px 16px;font-size:13px;
  font-weight:600;box-shadow:0 8px 30px rgba(0,0,0,.45);animation:tjin .18s ease-out}
.tj-toast.tj-ok{border-color:var(--up-line);color:var(--up)}
.tj-toast.tj-err{border-color:var(--down-line);color:var(--down)}
.tj-toast.tj-warn{border-color:rgba(242,169,59,.4);color:var(--amber)}
@keyframes tjin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

.tj-empty{text-align:center;color:var(--muted);padding:40px 16px}
.tj-empty .tj-e-big{font-size:15px;font-weight:600;color:var(--text);margin-bottom:5px}
.tj-boot{min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:var(--muted)}
.tj-spin{width:26px;height:26px;border:3px solid var(--line2);border-top-color:var(--amber);border-radius:50%;
  animation:tjspin .8s linear infinite}
@keyframes tjspin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.tj-root *{animation-duration:.01ms !important;transition-duration:.01ms !important}}

@media(max-width:920px){
  .tj-log-grid{grid-template-columns:1fr}
  .tj-side{position:static}
  .tj-cmp-grid{grid-template-columns:1fr}
  .tj-stats-grid{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:560px){
  .tj-shell{padding:0 12px 70px}
  .tj-cell{min-height:56px;padding:4px 5px}
  .tj-cell .tj-dpl{font-size:10px}
  .tj-thumbs{grid-template-columns:repeat(auto-fill,minmax(96px,1fr))}
}
`;

/* ---------------- storage layer (with in-memory fallback) ---------------- */

const memStore = new Map();
const hasRealStorage =
  typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";

const store = {
  async get(key) {
    if (!hasRealStorage) return memStore.has(key) ? memStore.get(key) : null;
    try {
      const r = await window.storage.get(key);
      return r && r.value != null ? r.value : null;
    } catch (e) {
      return null; // missing key (or read error) -> treat as absent
    }
  },
  async set(key, value) {
    if (!hasRealStorage) { memStore.set(key, value); return; }
    const r = await window.storage.set(key, value);
    if (!r) throw new Error("Storage write failed");
  },
  async del(key) {
    if (!hasRealStorage) { memStore.delete(key); return; }
    try { await window.storage.delete(key); } catch (e) { /* already gone */ }
  },
  async list(prefix) {
    if (!hasRealStorage) return [...memStore.keys()].filter((k) => k.startsWith(prefix || ""));
    try {
      const r = await window.storage.list(prefix);
      return r && Array.isArray(r.keys) ? r.keys : [];
    } catch (e) {
      return [];
    }
  },
};

async function readJSON(key) {
  const raw = await store.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

/* ---------------- date & format utilities ---------------- */

const pad2 = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayKey = () => toKey(new Date());
const parseKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const weekdayOf = (dateKey) => parseKey(dateKey).getDay();

function fmtDateLong(k) {
  const d = parseKey(k);
  return `${DAY_NAMES[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}
function fmtDateShort(k) {
  const d = parseKey(k);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
}
function fmtMonthKey(mk) {
  const [y, m] = mk.split("-").map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
}

function fmtNum(v, currency) {
  const locale = currency === "₹" ? "en-IN" : "en-US";
  return Math.abs(v).toLocaleString(locale, { maximumFractionDigits: 2 });
}
function fmtPL(v, currency, signed = true) {
  const n = Number(v) || 0;
  const body = `${currency}${fmtNum(n, currency)}`;
  if (n > 0) return signed ? `+${body}` : body;
  if (n < 0) return `-${body}`;
  return body;
}
function plClass(v) { return v > 0 ? "tj-up" : v < 0 ? "tj-down" : "tj-flat"; }
function compactNum(v) {
  const a = Math.abs(v);
  if (a >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  return String(Math.round(v));
}
function fmtBytes(b) {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ---------------- image compression ---------------- */

const MAX_DAY_BYTES = 4 * 1024 * 1024; // ~4MB of images per day

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}
function loadImg(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Not a valid image"));
    img.src = src;
  });
}
async function compressImage(file, maxW = 1200, quality = 0.7) {
  const src = await fileToDataUrl(file);
  const img = await loadImg(src);
  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  const scale = Math.min(1, maxW / w0);
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0A0D13";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
function dataUrlBytes(dataUrl) {
  const i = dataUrl.indexOf(",");
  return Math.round((dataUrl.length - i - 1) * 0.75);
}

/* ---------------- index helpers ---------------- */

const EMPTY_INDEX = { version: 1, entries: {} };
const NOTE_FIELDS = [
  { key: "plan", label: "Pre-market plan", ph: "Bias, key levels, scenarios, news to watch…" },
  { key: "review", label: "Trade review", ph: "What you took — entries, exits, execution quality…" },
  { key: "mistakes", label: "Mistakes", ph: "Rule breaks, chasing, sizing errors, early exits…" },
  { key: "lessons", label: "Lessons learned", ph: "What to repeat, what to change tomorrow…" },
  { key: "emotions", label: "Emotions & psychology", ph: "FOMO, revenge, hesitation, overconfidence…" },
];

function metaFromEntry(entry) {
  const notes = entry.notes || {};
  const firstNote =
    NOTE_FIELDS.map((f) => (notes[f.key] || "").trim()).find((t) => t.length > 0) || "";
  const searchText = [
    ...NOTE_FIELDS.map((f) => notes[f.key] || ""),
    entry.instruments || "",
    (entry.tags || []).join(" "),
  ].join(" \n ").toLowerCase();
  return {
    pl: Number(entry.pl) || 0,
    trades: entry.trades == null ? null : Number(entry.trades),
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    instruments: entry.instruments || "",
    preview: firstNote.slice(0, 150),
    searchText: searchText.slice(0, 6000),
    imageCount: Array.isArray(entry.images) ? entry.images.length : 0,
    updatedAt: entry.updatedAt || Date.now(),
  };
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
}

/* ---------------- tiny icons ---------------- */

const Ic = {
  search: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>),
  compare: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3l4 4-4 4"/><path d="M20 7H8"/><path d="M8 13l-4 4 4 4"/><path d="M4 17h12"/></svg>),
  close: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>),
  left: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>),
  right: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>),
  upload: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/></svg>),
  logo: (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F2A93B" strokeWidth="2" strokeLinecap="round"><path d="M7 4v3M7 17v3M7 7h0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" fill="rgba(242,169,59,.15)"/><path d="M17 2v4M17 15v4M17 6h0a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" fill="rgba(49,199,127,.18)" stroke="#31C77F"/></svg>),
};

/* ---------------- shared atoms ---------------- */

function PL({ v, currency, style }) {
  return (
    <span className={`tj-mono ${plClass(v)}`} style={style}>
      {fmtPL(v, currency)}
    </span>
  );
}

function EmptyState({ big, small }) {
  return (
    <div className="tj-empty">
      <div className="tj-e-big">{big}</div>
      <div>{small}</div>
    </div>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="tj-toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`tj-toast ${t.type === "ok" ? "tj-ok" : t.type === "err" ? "tj-err" : "tj-warn"}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ state }) {
  if (!state) return null;
  const done = (val) => state.resolve(val);
  return (
    <div className="tj-overlay" style={{ alignItems: "center", zIndex: 90 }} onClick={() => done(false)}>
      <div className="tj-modal tj-modal-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="tj-modal-title" style={{ marginBottom: 6 }}>{state.title}</h3>
        <div style={{ color: "var(--muted)", fontSize: 13.5, whiteSpace: "pre-wrap" }}>{state.message}</div>
        <div className="tj-modal-actions">
          <button className="tj-btn tj-ghost" onClick={() => done(false)}>Cancel</button>
          <button className={`tj-btn ${state.danger ? "tj-danger" : "tj-primary"}`} onClick={() => done(true)}>
            {state.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Lightbox({ state, onClose }) {
  const [i, setI] = useState(state.index || 0);
  const [zoomed, setZoomed] = useState(false);
  const imgs = state.images || [];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setI((x) => (x + 1) % imgs.length);
      else if (e.key === "ArrowLeft") setI((x) => (x - 1 + imgs.length) % imgs.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imgs.length, onClose]);

  useEffect(() => { setZoomed(false); }, [i]);
  if (!imgs.length) return null;

  return (
    <div className="tj-lightbox" onClick={onClose}>
      <div className="tj-lb-top" onClick={(e) => e.stopPropagation()}>
        <span className="tj-hint">{zoomed ? "click image to fit" : "click image to zoom"}</span>
        <button className="tj-iconbtn" onClick={onClose} aria-label="Close">{Ic.close}</button>
      </div>
      {imgs.length > 1 && (
        <button className="tj-iconbtn tj-lb-nav tj-left" aria-label="Previous"
          onClick={(e) => { e.stopPropagation(); setI((x) => (x - 1 + imgs.length) % imgs.length); }}>
          {Ic.left}
        </button>
      )}
      <div className={`tj-lb-img-wrap ${zoomed ? "tj-zoomed" : ""}`} onClick={(e) => e.stopPropagation()}>
        <img src={imgs[i].dataUrl} alt={imgs[i].name || `Chart ${i + 1}`} onClick={() => setZoomed((z) => !z)} />
      </div>
      {imgs.length > 1 && (
        <button className="tj-iconbtn tj-lb-nav tj-right" aria-label="Next"
          onClick={(e) => { e.stopPropagation(); setI((x) => (x + 1) % imgs.length); }}>
          {Ic.right}
        </button>
      )}
      <div className="tj-lb-count">{i + 1} / {imgs.length}{imgs[i].name ? ` · ${imgs[i].name}` : ""}</div>
    </div>
  );
}

function TagInput({ tags, setTags, suggestions }) {
  const [text, setText] = useState("");
  const add = (raw) => {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setText("");
  };
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(text); }
    else if (e.key === "Backspace" && !text && tags.length) setTags(tags.slice(0, -1));
  };
  const unused = suggestions.filter((s) => !tags.includes(s)).slice(0, 8);
  return (
    <div>
      <div className="tj-tags" style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px" }}>
        {tags.map((t) => (
          <span key={t} className="tj-tag">
            {t}
            <button onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}>×</button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => add(text)}
          placeholder={tags.length ? "" : "breakout, reversal, news play…"}
          style={{ background: "none", border: "none", outline: "none", flex: 1, minWidth: 110, padding: "2px 4px" }}
        />
      </div>
      {unused.length > 0 && (
        <div className="tj-tag-suggest">
          {unused.map((s) => (
            <button key={s} onClick={() => add(s)}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Log Entry tab ================= */

function LogTab({ index, settings, getEntry, persistEntry, confirmAsk, toast, editRequest, onOpenLightbox }) {
  const [date, setDate] = useState(todayKey());
  const [images, setImages] = useState([]); // {id, name, dataUrl, bytes}
  const [notes, setNotes] = useState({ plan: "", review: "", mistakes: "", lessons: "", emotions: "" });
  const [pl, setPl] = useState("");
  const [trades, setTrades] = useState("");
  const [instruments, setInstruments] = useState("");
  const [tags, setTags] = useState([]);
  const [existing, setExisting] = useState(null); // meta of loaded saved entry
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const snapRef = useRef("");

  const serialize = useCallback(
    () => JSON.stringify({
      date,
      imgs: images.map((i) => i.id),
      notes, pl, trades, instruments, tags,
    }),
    [date, images, notes, pl, trades, instruments, tags]
  );
  const dirty = serialize() !== snapRef.current;

  const fillFrom = useCallback((d, entry) => {
    setDate(d);
    if (entry) {
      const imgs = (entry.images || []).map((im) => ({
        id: im.id || uid(),
        name: im.name || "",
        dataUrl: im.dataUrl,
        bytes: dataUrlBytes(im.dataUrl),
      }));
      setImages(imgs);
      const n = entry.notes || {};
      setNotes({
        plan: n.plan || "", review: n.review || "", mistakes: n.mistakes || "",
        lessons: n.lessons || "", emotions: n.emotions || "",
      });
      setPl(entry.pl != null ? String(entry.pl) : "");
      setTrades(entry.trades != null ? String(entry.trades) : "");
      setInstruments(entry.instruments || "");
      setTags(Array.isArray(entry.tags) ? [...entry.tags] : []);
      setExisting({ updatedAt: entry.updatedAt });
      snapRef.current = JSON.stringify({
        date: d,
        imgs: imgs.map((i) => i.id),
        notes: {
          plan: n.plan || "", review: n.review || "", mistakes: n.mistakes || "",
          lessons: n.lessons || "", emotions: n.emotions || "",
        },
        pl: entry.pl != null ? String(entry.pl) : "",
        trades: entry.trades != null ? String(entry.trades) : "",
        instruments: entry.instruments || "",
        tags: Array.isArray(entry.tags) ? [...entry.tags] : [],
      });
    } else {
      setImages([]);
      setNotes({ plan: "", review: "", mistakes: "", lessons: "", emotions: "" });
      setPl(""); setTrades(""); setInstruments(""); setTags([]);
      setExisting(null);
      snapRef.current = JSON.stringify({
        date: d, imgs: [],
        notes: { plan: "", review: "", mistakes: "", lessons: "", emotions: "" },
        pl: "", trades: "", instruments: "", tags: [],
      });
    }
  }, []);

  const loadFor = useCallback(async (d) => {
    if (index.entries[d]) {
      setLoadingEntry(true);
      try {
        const entry = await getEntry(d);
        fillFrom(d, entry);
        if (!entry) toast("warn", "Saved entry could not be read — starting fresh for this date");
      } catch (e) {
        fillFrom(d, null);
        toast("err", "Couldn't load the saved entry for that date");
      } finally {
        setLoadingEntry(false);
      }
    } else {
      fillFrom(d, null);
    }
  }, [index.entries, getEntry, fillFrom, toast]);

  // initial load for today
  const bootRef = useRef(false);
  useEffect(() => {
    if (!bootRef.current) { bootRef.current = true; loadFor(todayKey()); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestDate = useCallback(async (d) => {
    if (!d) return;
    if (d === date) return;
    if (dirty) {
      const ok = await confirmAsk({
        title: "Discard unsaved changes?",
        message: `You have unsaved changes for ${fmtDateLong(date)}. Switching to ${fmtDateLong(d)} will discard them.`,
        confirmLabel: "Discard & switch",
        danger: true,
      });
      if (!ok) return;
    }
    loadFor(d);
  }, [date, dirty, confirmAsk, loadFor]);

  // external "edit this date" requests (from calendar / day view / weekday cards)
  const lastEditReq = useRef(null);
  useEffect(() => {
    if (editRequest && editRequest.ts !== lastEditReq.current) {
      lastEditReq.current = editRequest.ts;
      if (editRequest.date === date) loadFor(editRequest.date);
      else requestDate(editRequest.date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequest]);

  /* ---- images ---- */
  const totalBytes = images.reduce((s, i) => s + i.bytes, 0);
  const pct = Math.min(100, (totalBytes / MAX_DAY_BYTES) * 100);

  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) { toast("warn", "No image files found in that drop"); return; }
    setCompressing(true);
    let running = images.reduce((s, i) => s + i.bytes, 0);
    const added = [];
    for (const f of files) {
      try {
        const dataUrl = await compressImage(f, 1200, 0.7);
        const bytes = dataUrlBytes(dataUrl);
        if (running + bytes > MAX_DAY_BYTES) {
          toast("warn", `"${f.name}" skipped — this day would exceed the ${fmtBytes(MAX_DAY_BYTES)} image limit`);
          continue;
        }
        running += bytes;
        added.push({ id: uid(), name: f.name, dataUrl, bytes });
      } catch (e) {
        toast("err", `Couldn't process "${f.name}"`);
      }
    }
    if (added.length) setImages((prev) => [...prev, ...added]);
    setCompressing(false);
  }, [images, toast]);

  // paste screenshots straight from clipboard
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      const files = [];
      for (const it of items) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) { e.preventDefault(); addFiles(files); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  /* ---- save ---- */
  const save = async () => {
    if (!date) { toast("err", "Pick a date first"); return; }
    const plNum = pl.trim() === "" ? 0 : Number(pl);
    if (Number.isNaN(plNum)) { toast("err", "P/L must be a number (it can be negative)"); return; }
    const tradesNum = trades.trim() === "" ? null : Math.max(0, Math.round(Number(trades)));
    const entry = {
      date,
      images: images.map(({ id, name, dataUrl }) => ({ id, name, dataUrl })),
      notes: { ...notes },
      pl: plNum,
      trades: Number.isNaN(tradesNum) ? null : tradesNum,
      instruments: instruments.trim(),
      tags: tags.filter(Boolean),
      updatedAt: Date.now(),
    };
    setSaving(true);
    try {
      const result = await persistEntry(entry);
      snapRef.current = serialize();
      setExisting({ updatedAt: entry.updatedAt });
      if (result && result.indexOk === false) {
        toast("warn", "Entry saved, but the index update failed — run Settings → Rebuild index");
      } else {
        toast("ok", `${fmtDateLong(date)} saved`);
      }
    } catch (e) {
      toast("err", "Save failed — your input is still here, try again");
    } finally {
      setSaving(false);
    }
  };

  const allTags = useMemo(() => {
    const set = new Set();
    Object.values(index.entries).forEach((m) => (m.tags || []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [index.entries]);

  const meterClass = pct >= 100 ? "tj-full" : pct >= 75 ? "tj-hot" : "";

  return (
    <div>
      {loadingEntry && (
        <div className="tj-banner tj-info"><span className="tj-spin" style={{ width: 14, height: 14, borderWidth: 2 }} /> Loading saved entry…</div>
      )}
      {!loadingEntry && existing && (
        <div className="tj-banner">
          Editing the saved entry for {fmtDateLong(date)} — saving will update it, not create a duplicate.
        </div>
      )}
      {!loadingEntry && !existing && dirty && (
        <div className="tj-banner tj-info">New entry for {fmtDateLong(date)} — unsaved</div>
      )}

      <div className="tj-log-grid">
        <div>
          <div className="tj-panel">
            <h2 className="tj-h2">Chart screenshots</h2>
            <div
              className={`tj-drop ${dragOver ? "tj-over" : ""}`}
              onClick={() => fileRef.current && fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current && fileRef.current.click(); } }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6, color: "var(--amber)" }}>{Ic.upload}</div>
              <div style={{ fontWeight: 600, color: "var(--text)" }}>
                {compressing ? "Compressing…" : "Drop charts here, click to browse, or paste from clipboard"}
              </div>
              <div className="tj-hint" style={{ marginTop: 3 }}>
                Resized to 1200px wide · JPEG · up to {fmtBytes(MAX_DAY_BYTES)} per day
              </div>
            </div>
            <input
              ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
            {images.length > 0 && (
              <>
                <div className="tj-thumbs">
                  {images.map((im, i) => (
                    <div key={im.id} className="tj-thumb" onClick={() => onOpenLightbox(images, i)}>
                      <img src={im.dataUrl} alt={im.name || `Chart ${i + 1}`} />
                      <button
                        className="tj-x" aria-label="Remove image"
                        onClick={(e) => { e.stopPropagation(); setImages(images.filter((x) => x.id !== im.id)); }}
                      >×</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }} className="tj-hint">
                  <span>{images.length} image{images.length === 1 ? "" : "s"}</span>
                  <span className="tj-mono">{fmtBytes(totalBytes)} / {fmtBytes(MAX_DAY_BYTES)}</span>
                </div>
                <div className={`tj-meter ${meterClass}`}><div style={{ width: `${pct}%` }} /></div>
              </>
            )}
          </div>

          <div className="tj-panel">
            <h2 className="tj-h2">Session notes</h2>
            {NOTE_FIELDS.map((f) => (
              <div className="tj-field" key={f.key}>
                <label className="tj-label">{f.label}</label>
                <textarea
                  className="tj-textarea"
                  value={notes[f.key]}
                  placeholder={f.ph}
                  onChange={(e) => setNotes({ ...notes, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="tj-side">
          <div className="tj-panel">
            <div className="tj-field">
              <label className="tj-label">Session date</label>
              <input
                className="tj-input tj-mono" type="date" value={date} max={todayKey()}
                onChange={(e) => requestDate(e.target.value)}
              />
            </div>
            <div className="tj-field">
              <label className="tj-label">P/L for the day ({settings.currency})</label>
              <input
                className="tj-input tj-mono" type="number" step="any" inputMode="decimal"
                placeholder="e.g. 4500 or -1200" value={pl}
                onChange={(e) => setPl(e.target.value)}
                style={{ color: pl.trim() === "" ? undefined : Number(pl) > 0 ? "var(--up)" : Number(pl) < 0 ? "var(--down)" : undefined, fontWeight: 600 }}
              />
            </div>
            <div className="tj-field">
              <label className="tj-label">Number of trades <span style={{ color: "var(--faint)", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <input className="tj-input tj-mono" type="number" min="0" step="1" inputMode="numeric" value={trades}
                onChange={(e) => setTrades(e.target.value)} placeholder="e.g. 3" />
            </div>
            <div className="tj-field">
              <label className="tj-label">Instrument(s) <span style={{ color: "var(--faint)", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
              <input className="tj-input" value={instruments} onChange={(e) => setInstruments(e.target.value)}
                placeholder="NIFTY, BANKNIFTY, RELIANCE…" />
            </div>
            <div className="tj-field">
              <label className="tj-label">Strategy / setup tags</label>
              <TagInput tags={tags} setTags={setTags} suggestions={allTags} />
            </div>
            <button className="tj-btn tj-primary" style={{ width: "100%", justifyContent: "center", padding: "11px 14px", marginTop: 4 }}
              onClick={save} disabled={saving || loadingEntry}>
              {saving ? "Saving…" : existing ? "Update entry" : "Save entry"}
            </button>
            {dirty && !saving && (
              <div className="tj-hint" style={{ textAlign: "center", marginTop: 8 }}>Unsaved changes</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= Calendar tab ================= */

function CalendarTab({ index, settings, onOpenDay, onLogDate }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() }); // m: 0-11
  const currency = settings.currency;

  const move = (delta) => {
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const firstDow = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7; // Monday-start offset
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const tKey = todayKey();
  let monthTotal = 0, monthCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const k = `${ym.y}-${pad2(ym.m + 1)}-${pad2(d)}`;
    const meta = index.entries[k];
    if (meta) { monthTotal += meta.pl; monthCount++; }
  }

  return (
    <div className="tj-panel">
      <div className="tj-cal-head">
        <button className="tj-iconbtn" onClick={() => move(-1)} aria-label="Previous month">{Ic.left}</button>
        <div className="tj-cal-title">{MONTH_NAMES[ym.m]} {ym.y}</div>
        <button className="tj-iconbtn" onClick={() => move(1)} aria-label="Next month">{Ic.right}</button>
        <button className="tj-btn tj-ghost" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>Today</button>
        <div className="tj-header-spacer" />
        {monthCount > 0 && (
          <div style={{ textAlign: "right" }}>
            <div className="tj-hint">{monthCount} session{monthCount === 1 ? "" : "s"}</div>
            <PL v={monthTotal} currency={currency} style={{ fontSize: 16, fontWeight: 700 }} />
          </div>
        )}
      </div>
      <div className="tj-cal-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="tj-cal-dow">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const k = `${ym.y}-${pad2(ym.m + 1)}-${pad2(d)}`;
          const meta = index.entries[k];
          const cls = meta ? (meta.pl > 0 ? "tj-cup" : meta.pl < 0 ? "tj-cdown" : "") : "tj-none";
          return (
            <div
              key={k}
              className={`tj-cell tj-clickable ${cls} ${k === tKey ? "tj-today" : ""}`}
              onClick={() => (meta ? onOpenDay(k) : onLogDate(k))}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") (meta ? onOpenDay(k) : onLogDate(k)); }}
              title={meta ? `${fmtDateLong(k)} · ${fmtPL(meta.pl, currency)}` : `Log ${fmtDateLong(k)}`}
            >
              <span className="tj-dnum">{d}</span>
              {meta ? (
                <span className={`tj-dpl ${plClass(meta.pl)}`}>{fmtPL(meta.pl, currency)}</span>
              ) : (
                <span className="tj-dplus">+</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="tj-legend">
        <span><i style={{ background: "var(--up)" }} /> Profit</span>
        <span><i style={{ background: "var(--down)" }} /> Loss</span>
        <span><i style={{ background: "var(--line2)" }} /> No entry (click to log)</span>
      </div>
    </div>
  );
}

/* ================= Weekday review tab ================= */

function WeekdayCard({ date, meta, currency, getEntry, onOpen }) {
  const [entry, setEntry] = useState(undefined); // undefined = loading
  useEffect(() => {
    let live = true;
    getEntry(date)
      .then((e) => { if (live) setEntry(e); })
      .catch(() => { if (live) setEntry(null); });
    return () => { live = false; };
  }, [date, getEntry]);

  const thumbs = entry && entry.images ? entry.images.slice(0, 3) : [];
  const extra = entry && entry.images ? entry.images.length - thumbs.length : 0;

  return (
    <button className="tj-card" onClick={() => onOpen(date)}>
      <div className="tj-card-thumbs">
        {entry === undefined ? (
          <div className="tj-skel" style={{ width: 72, height: 48 }} />
        ) : thumbs.length ? (
          <>
            {thumbs.map((im, i) => (
              <img key={im.id || i} className="tj-ct" src={im.dataUrl} alt="" />
            ))}
            {extra > 0 && <div className="tj-ct-more">+{extra}</div>}
          </>
        ) : (
          <div className="tj-ct-more">no chart</div>
        )}
      </div>
      <div className="tj-card-body">
        <div className="tj-card-top">
          <span className="tj-card-date">{fmtDateLong(date)}</span>
          <span className={`tj-card-pl ${plClass(meta.pl)}`}>{fmtPL(meta.pl, currency)}</span>
          {meta.trades != null && <span className="tj-hint tj-mono">{meta.trades} trade{meta.trades === 1 ? "" : "s"}</span>}
        </div>
        {(meta.tags || []).length > 0 && (
          <div className="tj-tags" style={{ marginTop: 5 }}>
            {meta.tags.map((t) => <span key={t} className="tj-tag tj-static">{t}</span>)}
          </div>
        )}
        {meta.preview && <div className="tj-card-prev">{meta.preview}</div>}
      </div>
    </button>
  );
}

function WeekdayTab({ index, settings, getEntry, onOpenDay }) {
  const [dow, setDow] = useState(new Date().getDay()); // default: today's weekday
  const currency = settings.currency;
  const order = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

  const dates = useMemo(
    () => Object.keys(index.entries).filter((k) => weekdayOf(k) === dow).sort((a, b) => (a < b ? 1 : -1)),
    [index.entries, dow]
  );

  const stats = useMemo(() => {
    let total = 0, wins = 0, losses = 0;
    dates.forEach((d) => {
      const p = index.entries[d].pl;
      total += p;
      if (p > 0) wins++; else if (p < 0) losses++;
    });
    const wr = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
    return { total, wins, losses, wr };
  }, [dates, index.entries]);

  return (
    <div className="tj-panel">
      <h2 className="tj-h2">Review by day of week</h2>
      <div className="tj-wk-picker">
        {order.map((d) => (
          <button key={d} className={`tj-wk-btn ${d === dow ? "tj-on" : ""}`} onClick={() => setDow(d)}>
            {DAY_NAMES[d]}
          </button>
        ))}
      </div>

      {dates.length === 0 ? (
        <EmptyState big={`No ${DAY_NAMES[dow]} sessions yet`} small="Entries you log on this weekday will collect here." />
      ) : (
        <>
          <div className="tj-wk-stats">
            <div className="tj-wk-stat">
              <div className="tj-ws-l">{DAY_NAMES[dow]}s</div>
              <div className="tj-ws-v">{dates.length} entr{dates.length === 1 ? "y" : "ies"}</div>
            </div>
            <div className="tj-wk-stat">
              <div className="tj-ws-l">Total P/L</div>
              <div className={`tj-ws-v ${plClass(stats.total)}`}>{fmtPL(stats.total, currency)}</div>
            </div>
            <div className="tj-wk-stat">
              <div className="tj-ws-l">Win rate</div>
              <div className="tj-ws-v">{stats.wr == null ? "—" : `${stats.wr}%`}</div>
            </div>
            <div className="tj-wk-stat">
              <div className="tj-ws-l">Record</div>
              <div className="tj-ws-v"><span className="tj-up">{stats.wins}W</span> · <span className="tj-down">{stats.losses}L</span></div>
            </div>
          </div>
          <div className="tj-gallery">
            {dates.map((d) => (
              <WeekdayCard key={d} date={d} meta={index.entries[d]} currency={currency} getEntry={getEntry} onOpen={onOpenDay} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= Analytics tab ================= */

function ChartTip({ active, payload, currency, kind }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const box = {
    background: "var(--panel3)", border: "1px solid var(--line2)", borderRadius: 8,
    padding: "8px 11px", fontSize: 12.5,
  };
  if (kind === "equity") {
    return (
      <div style={box}>
        <div style={{ fontWeight: 700, marginBottom: 3 }}>{fmtDateLong(p.date)}</div>
        <div>Equity: <span className={`tj-mono ${plClass(p.cum)}`}>{fmtPL(p.cum, currency)}</span></div>
        <div>Day: <span className={`tj-mono ${plClass(p.pl)}`}>{fmtPL(p.pl, currency)}</span></div>
      </div>
    );
  }
  return (
    <div style={box}>
      <div style={{ fontWeight: 700, marginBottom: 3 }}>{p.name}</div>
      <div>Total: <span className={`tj-mono ${plClass(p.total)}`}>{fmtPL(p.total, currency)}</span></div>
      <div>Sessions: <span className="tj-mono">{p.count}</span></div>
      <div>Avg / session: <span className={`tj-mono ${plClass(p.avg)}`}>{fmtPL(p.avg, currency)}</span></div>
    </div>
  );
}

function AnalyticsTab({ index, settings }) {
  const currency = settings.currency;

  const rows = useMemo(
    () => Object.entries(index.entries)
      .map(([date, m]) => ({ date, ...m }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [index.entries]
  );

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const wins = rows.filter((r) => r.pl > 0);
    const losses = rows.filter((r) => r.pl < 0);
    const total = rows.reduce((s, r) => s + r.pl, 0);
    const grossWin = wins.reduce((s, r) => s + r.pl, 0);
    const grossLoss = losses.reduce((s, r) => s + r.pl, 0);
    const avgWin = wins.length ? grossWin / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;
    let best = rows[0], worst = rows[0];
    rows.forEach((r) => { if (r.pl > best.pl) best = r; if (r.pl < worst.pl) worst = r; });
    // current streak (most recent backwards, breakeven ends it)
    let streak = 0, dir = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      const s = rows[i].pl > 0 ? 1 : rows[i].pl < 0 ? -1 : 0;
      if (s === 0) break;
      if (dir === 0) { dir = s; streak = 1; }
      else if (s === dir) streak++;
      else break;
    }
    const winRate = wins.length + losses.length > 0
      ? Math.round((wins.length / (wins.length + losses.length)) * 100) : null;
    const profitFactor = grossLoss !== 0 ? grossWin / Math.abs(grossLoss) : (grossWin > 0 ? Infinity : null);
    return { total, wins: wins.length, losses: losses.length, winRate, avgWin, avgLoss, best, worst, streak, dir, profitFactor };
  }, [rows]);

  const equity = useMemo(() => {
    let cum = 0;
    return rows.map((r) => ({ date: r.date, pl: r.pl, cum: Math.round((cum += r.pl) * 100) / 100 }));
  }, [rows]);

  const weekdayData = useMemo(() => {
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map((d) => {
      const list = rows.filter((r) => weekdayOf(r.date) === d);
      const total = list.reduce((s, r) => s + r.pl, 0);
      return {
        name: DAY_NAMES[d].slice(0, 3),
        total: Math.round(total * 100) / 100,
        count: list.length,
        avg: list.length ? Math.round((total / list.length) * 100) / 100 : 0,
      };
    });
  }, [rows]);

  const monthly = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const mk = r.date.slice(0, 7);
      if (!map[mk]) map[mk] = { month: mk, count: 0, wins: 0, losses: 0, total: 0, best: -Infinity, worst: Infinity };
      const m = map[mk];
      m.count++; m.total += r.pl;
      if (r.pl > 0) m.wins++; else if (r.pl < 0) m.losses++;
      if (r.pl > m.best) m.best = r.pl;
      if (r.pl < m.worst) m.worst = r.pl;
    });
    return Object.values(map).sort((a, b) => (a.month < b.month ? 1 : -1));
  }, [rows]);

  const tagStats = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      (r.tags || []).forEach((t) => {
        if (!map[t]) map[t] = { tag: t, days: 0, wins: 0, losses: 0, total: 0 };
        const m = map[t];
        m.days++; m.total += r.pl;
        if (r.pl > 0) m.wins++; else if (r.pl < 0) m.losses++;
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [rows]);

  if (!rows.length) {
    return (
      <div className="tj-panel">
        <EmptyState big="No data to analyze yet" small="Log a few sessions and your equity curve, weekday edge and streaks will appear here." />
      </div>
    );
  }

  const eqColor = equity[equity.length - 1].cum >= 0 ? "#31C77F" : "#F0564D";
  const axis = { tick: { fill: "#79839B", fontSize: 11, fontFamily: "var(--mono)" }, stroke: "#2A3347" };
  const streakLabel = stats.streak === 0 ? "—" : `${stats.streak} ${stats.dir > 0 ? "win" : "loss"}${stats.streak > 1 ? (stats.dir > 0 ? "s" : "es") : ""}`;

  return (
    <div>
      <div className="tj-stats-grid">
        <div className="tj-stat">
          <div className="tj-s-l">Total P/L</div>
          <div className={`tj-s-v ${plClass(stats.total)}`}>{fmtPL(stats.total, currency)}</div>
          <div className="tj-s-sub">{rows.length} sessions</div>
        </div>
        <div className="tj-stat">
          <div className="tj-s-l">Win rate</div>
          <div className="tj-s-v">{stats.winRate == null ? "—" : `${stats.winRate}%`}</div>
          <div className="tj-s-sub"><span className="tj-up">{stats.wins}W</span> / <span className="tj-down">{stats.losses}L</span></div>
        </div>
        <div className="tj-stat">
          <div className="tj-s-l">Avg win</div>
          <div className="tj-s-v tj-up">{fmtPL(stats.avgWin, currency)}</div>
          <div className="tj-s-sub">per winning day</div>
        </div>
        <div className="tj-stat">
          <div className="tj-s-l">Avg loss</div>
          <div className="tj-s-v tj-down">{fmtPL(stats.avgLoss, currency)}</div>
          <div className="tj-s-sub">per losing day</div>
        </div>
        <div className="tj-stat">
          <div className="tj-s-l">Best day</div>
          <div className={`tj-s-v ${plClass(stats.best.pl)}`}>{fmtPL(stats.best.pl, currency)}</div>
          <div className="tj-s-sub">{fmtDateLong(stats.best.date)}</div>
        </div>
        <div className="tj-stat">
          <div className="tj-s-l">Worst day</div>
          <div className={`tj-s-v ${plClass(stats.worst.pl)}`}>{fmtPL(stats.worst.pl, currency)}</div>
          <div className="tj-s-sub">{fmtDateLong(stats.worst.date)}</div>
        </div>
        <div className="tj-stat">
          <div className="tj-s-l">Current streak</div>
          <div className={`tj-s-v ${stats.dir > 0 ? "tj-up" : stats.dir < 0 ? "tj-down" : ""}`}>{streakLabel}</div>
          <div className="tj-s-sub">consecutive {stats.dir >= 0 ? "green" : "red"} days</div>
        </div>
        <div className="tj-stat">
          <div className="tj-s-l">Profit factor</div>
          <div className="tj-s-v">{stats.profitFactor == null ? "—" : stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}</div>
          <div className="tj-s-sub">gross win ÷ gross loss</div>
        </div>
      </div>

      <div className="tj-panel">
        <h2 className="tj-h2">Equity curve — cumulative P/L</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={equity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tjEqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={eqColor} stopOpacity={0.32} />
                <stop offset="100%" stopColor={eqColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1B2232" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDateShort} minTickGap={32} {...axis} />
            <YAxis width={62} tickFormatter={compactNum} {...axis} />
            <Tooltip content={<ChartTip currency={currency} kind="equity" />} />
            <ReferenceLine y={0} stroke="#3A455E" />
            <Area type="monotone" dataKey="cum" stroke={eqColor} strokeWidth={2} fill="url(#tjEqFill)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="tj-panel">
        <h2 className="tj-h2">Performance by weekday — total P/L</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weekdayData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1B2232" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis width={62} tickFormatter={compactNum} {...axis} />
            <Tooltip content={<ChartTip currency={currency} kind="weekday" />} cursor={{ fill: "rgba(255,255,255,.04)" }} />
            <ReferenceLine y={0} stroke="#3A455E" />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {weekdayData.map((d, i) => (
                <Cell key={i} fill={d.count === 0 ? "#2A3347" : d.total >= 0 ? "#31C77F" : "#F0564D"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="tj-panel">
        <h2 className="tj-h2">Monthly breakdown</h2>
        <div className="tj-table-wrap">
          <table className="tj-table">
            <thead>
              <tr>
                <th>Month</th><th className="tj-num">Sessions</th><th className="tj-num">W / L</th>
                <th className="tj-num">Win rate</th><th className="tj-num">Best day</th>
                <th className="tj-num">Worst day</th><th className="tj-num">Total P/L</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => {
                const wr = m.wins + m.losses > 0 ? `${Math.round((m.wins / (m.wins + m.losses)) * 100)}%` : "—";
                return (
                  <tr key={m.month}>
                    <td style={{ fontWeight: 600 }}>{fmtMonthKey(m.month)}</td>
                    <td className="tj-num">{m.count}</td>
                    <td className="tj-num"><span className="tj-up">{m.wins}</span> / <span className="tj-down">{m.losses}</span></td>
                    <td className="tj-num">{wr}</td>
                    <td className={`tj-num ${plClass(m.best)}`}>{fmtPL(m.best, currency)}</td>
                    <td className={`tj-num ${plClass(m.worst)}`}>{fmtPL(m.worst, currency)}</td>
                    <td className={`tj-num ${plClass(m.total)}`} style={{ fontWeight: 700 }}>{fmtPL(m.total, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {tagStats.length > 0 && (
        <div className="tj-panel">
          <h2 className="tj-h2">Breakdown by strategy / tag</h2>
          <div className="tj-table-wrap">
            <table className="tj-table">
              <thead>
                <tr>
                  <th>Tag</th><th className="tj-num">Days</th><th className="tj-num">W / L</th>
                  <th className="tj-num">Win rate</th><th className="tj-num">Avg / day</th><th className="tj-num">Total P/L</th>
                </tr>
              </thead>
              <tbody>
                {tagStats.map((t) => {
                  const wr = t.wins + t.losses > 0 ? `${Math.round((t.wins / (t.wins + t.losses)) * 100)}%` : "—";
                  return (
                    <tr key={t.tag}>
                      <td><span className="tj-tag tj-static">{t.tag}</span></td>
                      <td className="tj-num">{t.days}</td>
                      <td className="tj-num"><span className="tj-up">{t.wins}</span> / <span className="tj-down">{t.losses}</span></td>
                      <td className="tj-num">{wr}</td>
                      <td className={`tj-num ${plClass(t.total / t.days)}`}>{fmtPL(t.total / t.days, currency)}</td>
                      <td className={`tj-num ${plClass(t.total)}`} style={{ fontWeight: 700 }}>{fmtPL(t.total, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="tj-hint" style={{ marginTop: 8 }}>
            Days with multiple tags are counted under each of their tags.
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Settings tab ================= */

function SettingsTab({ index, settings, saveSettings, getEntry, reloadAll, confirmAsk, toast }) {
  const [currency, setCurrency] = useState(settings.currency);
  const [busy, setBusy] = useState(null); // string progress label
  const [importMode, setImportMode] = useState("merge");
  const importRef = useRef(null);
  const entryCount = Object.keys(index.entries).length;
  const dates = Object.keys(index.entries).sort();

  useEffect(() => { setCurrency(settings.currency); }, [settings.currency]);

  const applyCurrency = async () => {
    const c = currency.trim() || "₹";
    try {
      await saveSettings({ ...settings, currency: c });
      toast("ok", `Currency symbol set to ${c}`);
    } catch (e) {
      toast("err", "Couldn't save settings");
    }
  };

  const exportAll = async () => {
    setBusy("Preparing export…");
    try {
      const all = [];
      const keys = Object.keys(index.entries).sort();
      for (let i = 0; i < keys.length; i++) {
        setBusy(`Reading entries… ${i + 1}/${keys.length}`);
        const e = await getEntry(keys[i]);
        if (e) all.push(e);
      }
      const payload = {
        app: "trade-ledger",
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: { currency: settings.currency },
        entries: all,
      };
      downloadTextFile(`trade-journal-backup-${todayKey()}.json`, JSON.stringify(payload));
      toast("ok", `Exported ${all.length} entr${all.length === 1 ? "y" : "ies"}`);
    } catch (e) {
      toast("err", "Export failed — try again");
    } finally {
      setBusy(null);
    }
  };

  const importFile = async (file) => {
    if (!file) return;
    setBusy("Reading file…");
    try {
      const text = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(new Error("read failed"));
        r.readAsText(file);
      });
      const data = JSON.parse(text);
      const list = Array.isArray(data.entries) ? data.entries : null;
      if (!list) throw new Error("bad shape");
      const valid = list.filter((e) => e && typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date));
      if (!valid.length) { toast("err", "No valid entries found in that file"); setBusy(null); return; }

      const ok = await confirmAsk({
        title: importMode === "replace" ? "Replace all data?" : "Import backup?",
        message: importMode === "replace"
          ? `This deletes your ${entryCount} existing entr${entryCount === 1 ? "y" : "ies"} and restores ${valid.length} from the backup.`
          : `${valid.length} entr${valid.length === 1 ? "y" : "ies"} will be imported. Dates that already exist will be overwritten by the backup.`,
        confirmLabel: importMode === "replace" ? "Replace everything" : "Import",
        danger: importMode === "replace",
      });
      if (!ok) { setBusy(null); return; }

      let baseEntries = {};
      if (importMode === "replace") {
        setBusy("Clearing existing entries…");
        const keys = await store.list("entry:");
        for (const k of keys) await store.del(k);
      } else {
        baseEntries = { ...index.entries };
      }

      const newIndexEntries = { ...baseEntries };
      for (let i = 0; i < valid.length; i++) {
        setBusy(`Importing… ${i + 1}/${valid.length}`);
        const raw = valid[i];
        const entry = {
          date: raw.date,
          images: (Array.isArray(raw.images) ? raw.images : [])
            .filter((im) => im && typeof im.dataUrl === "string" && im.dataUrl.startsWith("data:image"))
            .map((im) => ({ id: im.id || uid(), name: im.name || "", dataUrl: im.dataUrl })),
          notes: {
            plan: (raw.notes && raw.notes.plan) || "",
            review: (raw.notes && raw.notes.review) || "",
            mistakes: (raw.notes && raw.notes.mistakes) || "",
            lessons: (raw.notes && raw.notes.lessons) || "",
            emotions: (raw.notes && raw.notes.emotions) || "",
          },
          pl: Number(raw.pl) || 0,
          trades: raw.trades == null || Number.isNaN(Number(raw.trades)) ? null : Number(raw.trades),
          instruments: raw.instruments || "",
          tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).toLowerCase()) : [],
          updatedAt: raw.updatedAt || Date.now(),
        };
        await store.set(`entry:${entry.date}`, JSON.stringify(entry));
        newIndexEntries[entry.date] = metaFromEntry(entry);
      }
      setBusy("Updating index…");
      await store.set("index", JSON.stringify({ version: 1, entries: newIndexEntries }));
      if (data.settings && data.settings.currency) {
        await store.set("settings", JSON.stringify({ currency: String(data.settings.currency) }));
      }
      await reloadAll();
      toast("ok", `Imported ${valid.length} entr${valid.length === 1 ? "y" : "ies"}`);
    } catch (e) {
      toast("err", "Import failed — is this a Trade Ledger backup file?");
    } finally {
      setBusy(null);
    }
  };

  const rebuildIndex = async () => {
    setBusy("Scanning entries…");
    try {
      const keys = await store.list("entry:");
      const entries = {};
      for (let i = 0; i < keys.length; i++) {
        setBusy(`Rebuilding… ${i + 1}/${keys.length}`);
        const raw = await store.get(keys[i]);
        if (!raw) continue;
        try {
          const e = JSON.parse(raw);
          if (e && e.date) entries[e.date] = metaFromEntry(e);
        } catch (err) { /* skip corrupt */ }
      }
      await store.set("index", JSON.stringify({ version: 1, entries }));
      await reloadAll();
      toast("ok", `Index rebuilt from ${Object.keys(entries).length} entr${Object.keys(entries).length === 1 ? "y" : "ies"}`);
    } catch (e) {
      toast("err", "Rebuild failed");
    } finally {
      setBusy(null);
    }
  };

  const deleteAll = async () => {
    const ok = await confirmAsk({
      title: "Delete all journal data?",
      message: `This permanently deletes all ${entryCount} entr${entryCount === 1 ? "y" : "ies"}, including screenshots. Export a backup first if you might want this data back.`,
      confirmLabel: "Delete everything",
      danger: true,
    });
    if (!ok) return;
    setBusy("Deleting…");
    try {
      const keys = await store.list("entry:");
      for (const k of keys) await store.del(k);
      await store.del("index");
      await reloadAll();
      toast("ok", "All journal data deleted");
    } catch (e) {
      toast("err", "Some data could not be deleted — try again");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {busy && (
        <div className="tj-banner tj-info" style={{ position: "sticky", top: 8, zIndex: 5 }}>
          <span className="tj-spin" style={{ width: 14, height: 14, borderWidth: 2 }} /> {busy}
        </div>
      )}

      <div className="tj-panel">
        <h2 className="tj-h2">Currency</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {["₹", "$", "€", "£", "¥"].map((c) => (
            <button key={c} className={`tj-wk-btn ${currency === c ? "tj-on" : ""}`} onClick={() => setCurrency(c)}>{c}</button>
          ))}
          <input className="tj-input" style={{ width: 90 }} maxLength={4} value={currency}
            onChange={(e) => setCurrency(e.target.value)} aria-label="Custom currency symbol" />
          <button className="tj-btn tj-primary" onClick={applyCurrency} disabled={!!busy}>Save</button>
        </div>
        <div className="tj-hint" style={{ marginTop: 10 }}>
          Preview: <span className="tj-mono tj-up">{fmtPL(12500, currency.trim() || "₹")}</span> · <span className="tj-mono tj-down">{fmtPL(-3250, currency.trim() || "₹")}</span>
        </div>
      </div>

      <div className="tj-panel">
        <h2 className="tj-h2">Backup & restore</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="tj-btn" onClick={exportAll} disabled={!!busy || entryCount === 0}>
            Export all data (JSON)
          </button>
          <span className="tj-hint">{entryCount} entr{entryCount === 1 ? "y" : "ies"}{dates.length ? ` · ${fmtDateShort(dates[0])} → ${fmtDateShort(dates[dates.length - 1])}` : ""}</span>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="tj-btn" onClick={() => importRef.current && importRef.current.click()} disabled={!!busy}>
            Import backup…
          </button>
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
            <input type="radio" name="tj-imp" checked={importMode === "merge"} onChange={() => setImportMode("merge")} />
            Merge with existing
          </label>
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
            <input type="radio" name="tj-imp" checked={importMode === "replace"} onChange={() => setImportMode("replace")} />
            Replace all data
          </label>
          <input ref={importRef} type="file" accept="application/json,.json" style={{ display: "none" }}
            onChange={(e) => { importFile(e.target.files && e.target.files[0]); e.target.value = ""; }} />
        </div>
      </div>

      <div className="tj-panel">
        <h2 className="tj-h2">Maintenance</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="tj-btn" onClick={rebuildIndex} disabled={!!busy}>Rebuild index from entries</button>
          <button className="tj-btn tj-danger" onClick={deleteAll} disabled={!!busy || entryCount === 0}>Delete all data</button>
        </div>
        <div className="tj-hint" style={{ marginTop: 10 }}>
          Rebuild the index if the calendar or analytics ever look out of sync with your saved days.
          Each day is stored under its own key (<span className="tj-mono">entry:YYYY-MM-DD</span>); the index only holds
          lightweight stats so charts load without touching your screenshots.
        </div>
      </div>
    </div>
  );
}

/* ================= Day view modal ================= */

function DayViewModal({ date, index, settings, getEntry, onClose, onEdit, onDelete, onCompare, onOpenLightbox }) {
  const [entry, setEntry] = useState(undefined);
  const meta = index.entries[date];

  useEffect(() => {
    let live = true;
    setEntry(undefined);
    getEntry(date)
      .then((e) => { if (live) setEntry(e); })
      .catch(() => { if (live) setEntry(null); });
    return () => { live = false; };
  }, [date, getEntry]);

  const currency = settings.currency;
  const noteBlocks = entry
    ? NOTE_FIELDS.map((f) => ({ ...f, text: (entry.notes && entry.notes[f.key] || "").trim() })).filter((b) => b.text)
    : [];

  return (
    <div className="tj-overlay" onClick={onClose}>
      <div className="tj-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tj-modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="tj-modal-title">{fmtDateLong(date)}</h3>
            <div className="tj-modal-sub">{DAY_NAMES[weekdayOf(date)]} session</div>
          </div>
          {meta && <PL v={meta.pl} currency={currency} style={{ fontSize: 22, fontWeight: 700 }} />}
          <button className="tj-iconbtn" onClick={onClose} aria-label="Close">{Ic.close}</button>
        </div>

        {entry === undefined ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="tj-skel" style={{ height: 130 }} />
            <div className="tj-skel" style={{ height: 60 }} />
            <div className="tj-skel" style={{ height: 60 }} />
          </div>
        ) : entry === null ? (
          <EmptyState big="Entry could not be loaded" small="The saved data for this day is missing or unreadable. Try Settings → Rebuild index." />
        ) : (
          <>
            <div className="tj-meta-row">
              {entry.trades != null && <span>Trades: <b>{entry.trades}</b></span>}
              {entry.instruments && <span>Instruments: <b style={{ fontFamily: "inherit" }}>{entry.instruments}</b></span>}
              {(entry.tags || []).length > 0 && (
                <span className="tj-tags">
                  {entry.tags.map((t) => <span key={t} className="tj-tag tj-static">{t}</span>)}
                </span>
              )}
            </div>

            {(entry.images || []).length > 0 && (
              <div className="tj-thumbs" style={{ marginBottom: 14, marginTop: 0 }}>
                {entry.images.map((im, i) => (
                  <div key={im.id || i} className="tj-thumb" onClick={() => onOpenLightbox(entry.images, i)}>
                    <img src={im.dataUrl} alt={im.name || `Chart ${i + 1}`} />
                  </div>
                ))}
              </div>
            )}

            {noteBlocks.length ? (
              noteBlocks.map((b) => (
                <div className="tj-note-block" key={b.key}>
                  <div className="tj-nb-l">{b.label}</div>
                  <p>{b.text}</p>
                </div>
              ))
            ) : (
              <div className="tj-hint" style={{ margin: "6px 0 4px" }}>No notes were logged for this day.</div>
            )}

            <div className="tj-modal-actions">
              <button className="tj-btn tj-ghost" onClick={() => onCompare(date)}>{Ic.compare} Compare</button>
              <button className="tj-btn tj-danger" onClick={() => onDelete(date)}>Delete</button>
              <button className="tj-btn tj-primary" onClick={() => onEdit(date)}>Edit entry</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= Compare modal ================= */

function CompareCol({ date, setDate, allDates, index, settings, getEntry, onOpenLightbox }) {
  const [entry, setEntry] = useState(undefined);
  useEffect(() => {
    let live = true;
    if (!date) { setEntry(null); return; }
    setEntry(undefined);
    getEntry(date).then((e) => live && setEntry(e)).catch(() => live && setEntry(null));
    return () => { live = false; };
  }, [date, getEntry]);

  const currency = settings.currency;
  const meta = date ? index.entries[date] : null;

  return (
    <div className="tj-cmp-col">
      <select className="tj-select tj-mono" value={date || ""} onChange={(e) => setDate(e.target.value)}>
        <option value="" disabled>Select a day…</option>
        {allDates.map((d) => (
          <option key={d} value={d}>
            {fmtDateLong(d)} · {fmtPL(index.entries[d].pl, currency)}
          </option>
        ))}
      </select>
      {date && meta && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <PL v={meta.pl} currency={currency} style={{ fontSize: 20, fontWeight: 700 }} />
            <span className="tj-hint">{DAY_NAMES[weekdayOf(date)]}{meta.trades != null ? ` · ${meta.trades} trades` : ""}</span>
          </div>
          {(meta.tags || []).length > 0 && (
            <div className="tj-tags" style={{ marginTop: 6 }}>
              {meta.tags.map((t) => <span key={t} className="tj-tag tj-static">{t}</span>)}
            </div>
          )}
          {entry === undefined ? (
            <div className="tj-skel" style={{ height: 90, marginTop: 10 }} />
          ) : entry ? (
            <>
              {(entry.images || []).length > 0 && (
                <div className="tj-cmp-imgs">
                  {entry.images.map((im, i) => (
                    <div key={im.id || i} className="tj-thumb" onClick={() => onOpenLightbox(entry.images, i)}>
                      <img src={im.dataUrl} alt="" />
                    </div>
                  ))}
                </div>
              )}
              {NOTE_FIELDS.map((f) => {
                const t = (entry.notes && entry.notes[f.key] || "").trim();
                if (!t) return null;
                return (
                  <div className="tj-note-block" key={f.key}>
                    <div className="tj-nb-l">{f.label}</div>
                    <p>{t}</p>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="tj-hint" style={{ marginTop: 10 }}>Entry could not be loaded.</div>
          )}
        </div>
      )}
    </div>
  );
}

function CompareModal({ initialA, index, settings, getEntry, onClose, onOpenLightbox }) {
  const allDates = useMemo(
    () => Object.keys(index.entries).sort((a, b) => (a < b ? 1 : -1)),
    [index.entries]
  );
  const [a, setA] = useState(initialA || allDates[0] || "");
  const [b, setB] = useState(() => {
    const first = initialA || allDates[0];
    return allDates.find((d) => d !== first) || "";
  });

  return (
    <div className="tj-overlay" onClick={onClose}>
      <div className="tj-modal tj-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="tj-modal-head">
          <div style={{ flex: 1 }}>
            <h3 className="tj-modal-title">Compare two days</h3>
            <div className="tj-modal-sub">Charts, notes and P/L side by side</div>
          </div>
          <button className="tj-iconbtn" onClick={onClose} aria-label="Close">{Ic.close}</button>
        </div>
        {allDates.length < 2 ? (
          <EmptyState big="Need at least two saved days" small="Log another session to unlock comparison." />
        ) : (
          <div className="tj-cmp-grid">
            <CompareCol date={a} setDate={setA} allDates={allDates} index={index} settings={settings} getEntry={getEntry} onOpenLightbox={onOpenLightbox} />
            <CompareCol date={b} setDate={setB} allDates={allDates} index={index} settings={settings} getEntry={getEntry} onOpenLightbox={onOpenLightbox} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Search ================= */

function SearchBox({ index, settings, onOpen }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  const currency = settings.currency;

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return Object.entries(index.entries)
      .filter(([d, m]) =>
        d.includes(query) ||
        (m.searchText && m.searchText.includes(query)) ||
        (m.tags || []).some((t) => t.includes(query))
      )
      .sort((x, y) => (x[0] < y[0] ? 1 : -1))
      .slice(0, 50)
      .map(([d, m]) => {
        let snip = m.preview || "";
        if (m.searchText) {
          const at = m.searchText.indexOf(query);
          if (at >= 0) snip = `…${m.searchText.slice(Math.max(0, at - 24), at + 66).replace(/\s+/g, " ")}…`;
        }
        return { date: d, pl: m.pl, snip, tags: m.tags || [] };
      });
  }, [q, index.entries]);

  return (
    <div className="tj-search-wrap">
      <button className="tj-iconbtn" onClick={() => setOpen((o) => !o)} aria-label="Search notes and tags" title="Search notes & tags">
        {Ic.search}
      </button>
      {open && (
        <div className="tj-search-panel">
          <input
            ref={inputRef} className="tj-input" placeholder="Search notes, tags, instruments, dates…"
            value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          />
          <div className="tj-search-res">
            {q.trim() === "" ? (
              <div className="tj-hint" style={{ padding: "8px 4px" }}>Try a mistake you keep making, a setup tag, or an instrument.</div>
            ) : results.length === 0 ? (
              <div className="tj-hint" style={{ padding: "8px 4px" }}>No entries match "{q.trim()}".</div>
            ) : (
              results.map((r) => (
                <button key={r.date} className="tj-sr-row" onClick={() => { setOpen(false); onOpen(r.date); }}>
                  <span className="tj-sr-date">{fmtDateShort(r.date)} '{r.date.slice(2, 4)}</span>
                  <span className={`tj-sr-pl ${plClass(r.pl)}`}>{fmtPL(r.pl, currency)}</span>
                  <span className="tj-sr-snip">{r.snip}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Root app ================= */

const TABS = [
  { id: "log", label: "Log Entry" },
  { id: "calendar", label: "Calendar" },
  { id: "weekday", label: "Weekday Review" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

export default function TradeLedger() {
  const [booted, setBooted] = useState(false);
  const [tab, setTab] = useState("log");
  const [index, setIndex] = useState(EMPTY_INDEX);
  const [settings, setSettings] = useState({ currency: "₹" });
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [dayView, setDayView] = useState(null);      // date string
  const [compare, setCompare] = useState(null);      // { a } or {}
  const [lightbox, setLightbox] = useState(null);    // { images, index }
  const [editRequest, setEditRequest] = useState(null);
  const cacheRef = useRef(new Map());
  const indexRef = useRef(index);
  useEffect(() => { indexRef.current = index; }, [index]);

  const toast = useCallback((type, msg) => {
    const id = uid();
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const confirmAsk = useCallback((opts) => new Promise((resolve) => {
    setConfirmState({ ...opts, resolve: (v) => { setConfirmState(null); resolve(v); } });
  }), []);

  const reloadAll = useCallback(async () => {
    cacheRef.current.clear();
    const [idx, st] = await Promise.all([readJSON("index"), readJSON("settings")]);
    setIndex(idx && idx.entries ? idx : EMPTY_INDEX);
    if (st && st.currency) setSettings({ currency: String(st.currency) });
  }, []);

  useEffect(() => {
    (async () => {
      try { await reloadAll(); } catch (e) { /* start fresh */ }
      setBooted(true);
    })();
  }, [reloadAll]);

  const getEntry = useCallback(async (date) => {
    const c = cacheRef.current;
    if (c.has(date)) return c.get(date);
    const raw = await store.get(`entry:${date}`);
    if (!raw) return null;
    try {
      const e = JSON.parse(raw);
      c.set(date, e);
      return e;
    } catch (err) {
      return null;
    }
  }, []);

  const persistEntry = useCallback(async (entry) => {
    await store.set(`entry:${entry.date}`, JSON.stringify(entry)); // throws on failure
    const cur = indexRef.current;
    const next = { ...cur, version: 1, entries: { ...cur.entries, [entry.date]: metaFromEntry(entry) } };
    let indexOk = true;
    try {
      await store.set("index", JSON.stringify(next));
    } catch (e) {
      try { await store.set("index", JSON.stringify(next)); } catch (e2) { indexOk = false; }
    }
    cacheRef.current.set(entry.date, entry);
    setIndex(next);
    return { indexOk };
  }, []);

  const deleteEntry = useCallback(async (date) => {
    const ok = await confirmAsk({
      title: "Delete this entry?",
      message: `${fmtDateLong(date)} — including its screenshots and notes — will be permanently deleted.`,
      confirmLabel: "Delete entry",
      danger: true,
    });
    if (!ok) return;
    try {
      await store.del(`entry:${date}`);
      const cur = indexRef.current;
      const entries = { ...cur.entries };
      delete entries[date];
      const next = { ...cur, entries };
      await store.set("index", JSON.stringify(next));
      cacheRef.current.delete(date);
      setIndex(next);
      setDayView(null);
      toast("ok", `${fmtDateLong(date)} deleted`);
    } catch (e) {
      toast("err", "Delete failed — try again");
    }
  }, [confirmAsk, toast]);

  const openDay = useCallback((date) => setDayView(date), []);
  const editDate = useCallback((date) => {
    setDayView(null);
    setTab("log");
    setEditRequest({ date, ts: Date.now() });
  }, []);
  const openLightbox = useCallback((images, i) => setLightbox({ images, index: i }), []);

  const totals = useMemo(() => {
    const vals = Object.values(index.entries);
    return { pl: vals.reduce((s, m) => s + m.pl, 0), n: vals.length };
  }, [index.entries]);

  if (!booted) {
    return (
      <div className="tj-root">
        <style>{CSS}</style>
        <div className="tj-boot">
          <div className="tj-spin" />
          <div>Loading your journal…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="tj-root">
      <style>{CSS}</style>
      <div className="tj-shell">
        <header className="tj-header">
          <div className="tj-logo">
            {Ic.logo}
            <div>
              <h1>Trade Ledger</h1>
              <div className="tj-sub">personal trading journal</div>
            </div>
          </div>
          <div className="tj-header-spacer" />
          {totals.n > 0 && (
            <div className="tj-total-chip">
              <span className="tj-tc-label">All-time · {totals.n} sessions</span>
              <span className={`tj-tc-val ${plClass(totals.pl)}`}>{fmtPL(totals.pl, settings.currency)}</span>
            </div>
          )}
          <SearchBox index={index} settings={settings} onOpen={openDay} />
          <button className="tj-iconbtn" onClick={() => setCompare({})} aria-label="Compare two days" title="Compare two days">
            {Ic.compare}
          </button>
        </header>

        {!hasRealStorage && (
          <div className="tj-banner tj-warn" style={{ marginBottom: 12 }}>
            Persistent storage isn't available in this environment — entries will be lost when you close this page.
          </div>
        )}

        <nav className="tj-tabs" style={{ marginBottom: 16 }}>
          {TABS.map((t) => (
            <button key={t.id} className={`tj-tab ${tab === t.id ? "tj-active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "log" && (
          <LogTab
            index={index} settings={settings} getEntry={getEntry} persistEntry={persistEntry}
            confirmAsk={confirmAsk} toast={toast} editRequest={editRequest} onOpenLightbox={openLightbox}
          />
        )}
        {tab === "calendar" && (
          <CalendarTab index={index} settings={settings} onOpenDay={openDay} onLogDate={editDate} />
        )}
        {tab === "weekday" && (
          <WeekdayTab index={index} settings={settings} getEntry={getEntry} onOpenDay={openDay} />
        )}
        {tab === "analytics" && <AnalyticsTab index={index} settings={settings} />}
        {tab === "settings" && (
          <SettingsTab
            index={index} settings={settings} getEntry={getEntry} reloadAll={reloadAll}
            confirmAsk={confirmAsk} toast={toast}
            saveSettings={async (s) => { await store.set("settings", JSON.stringify(s)); setSettings(s); }}
          />
        )}
      </div>

      {dayView && (
        <DayViewModal
          date={dayView} index={index} settings={settings} getEntry={getEntry}
          onClose={() => setDayView(null)} onEdit={editDate} onDelete={deleteEntry}
          onCompare={(d) => { setDayView(null); setCompare({ a: d }); }}
          onOpenLightbox={openLightbox}
        />
      )}
      {compare && (
        <CompareModal
          initialA={compare.a} index={index} settings={settings} getEntry={getEntry}
          onClose={() => setCompare(null)} onOpenLightbox={openLightbox}
        />
      )}
      {lightbox && <Lightbox state={lightbox} onClose={() => setLightbox(null)} />}
      <ConfirmDialog state={confirmState} />
      <Toasts toasts={toasts} />
    </div>
  );
}