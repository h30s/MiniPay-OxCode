#!/usr/bin/env node
/*
 * AI Token Usage — OxCode, OpenCode, Antigravity
 *
 * Copy this file into any project folder and run:   node ai-token-usage.js
 * It reports token usage for chats that were started in THIS folder only
 * (the folder this file sits in). Nothing outside that folder is shown.
 *
 * Options:
 *   node ai-token-usage.js "C:\path\to\other\folder"   check another folder
 *   node ai-token-usage.js --skip opencode             hide one or more agents (comma-separated)
 *   node ai-token-usage.js --only oxcode,antigravity   show only these agents
 *
 * Read-only: it only reads the agents' local log files. No network, no writes.
 * Requires Node.js 22+ (for the built-in SQLite reader used by OpenCode/Antigravity).
 */
"use strict";

// ─── Settings: set an agent to false to always hide it from the report ───
const SHOW = {
  OxCode: true,
  OpenCode: false,
  Antigravity: true,
};

// node:sqlite prints an "experimental" warning on some Node versions; hide only that one.
const emitWarning = process.emitWarning;
process.emitWarning = (warning, ...rest) => {
  const type = typeof rest[0] === "string" ? rest[0] : rest[0] && rest[0].type;
  if (type === "ExperimentalWarning" && /sqlite/i.test(String(warning))) return;
  return emitWarning.call(process, warning, ...rest);
};

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const HOME = os.homedir();
const APPDATA = process.env.APPDATA || path.join(HOME, "AppData", "Roaming");
// Command line: [folder] [--skip a,b] [--only a,b]
const ARGS = (() => {
  const out = { folder: null, skip: [], only: [] };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const m = a.match(/^--(skip|only)(?:=(.*))?$/);
    if (m) {
      const value = m[2] !== undefined ? m[2] : argv[++i] || "";
      out[m[1]].push(...value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean));
    } else if (a === "-h" || a === "--help") {
      out.help = true;
    } else if (!out.folder) {
      out.folder = a;
    }
  }
  return out;
})();

// realpath turns short 8.3 names (e.g. "HIMANS~1") into the full path the agents recorded.
const FOLDER = (() => {
  const p = path.resolve(ARGS.folder || __dirname);
  try { return fs.realpathSync.native(p); } catch { return p; }
})();

let sqlite = null;
try { sqlite = require("node:sqlite"); } catch { /* Node < 22: OpenCode/Antigravity are skipped with a notice */ }

const notes = []; // problems worth telling the user about (missing data, unreadable files)

// ───────────────────────── helpers ─────────────────────────

// "C:\Users\X\Proj", "c:/users/x/proj/" and "file:///c:/Users/X/Proj" all become "c:/users/x/proj".
function normFolder(p) {
  let s = String(p || "");
  try { s = decodeURIComponent(s); } catch { /* keep as is */ }
  return s.replace(/^file:\/\/\//i, "").replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

function cleanPrompt(t) {
  return String(t || "")
    .replace(/<ADDITIONAL_METADATA>[\s\S]*?(<\/ADDITIONAL_METADATA>|$)/g, "")
    .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?(<\/USER_SETTINGS_CHANGE>|$)/g, "")
    .replace(/<\/?USER_REQUEST>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readJsonl(file) {
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch { return []; }
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip a broken/partial line */ }
  }
  return out;
}

function openDb(file) {
  if (!sqlite) return null;
  try { return new sqlite.DatabaseSync(file, { readOnly: true }); } catch { return null; }
}

const listDir = dir => { try { return fs.readdirSync(dir); } catch { return []; } };

// One entry per prompt. Chats group prompts; agents group chats.
function newPrompt(text, time) {
  return { text: cleanPrompt(text) || "(prompt text not saved)", time: time || null,
    models: new Set(), calls: 0, input: 0, cached: 0, output: 0 };
}

// ───────────────────────── OxCode ─────────────────────────
// Sessions live in <editor>/User/globalStorage/oxloai.oxcode-ai/sessions/<id>/<chat>.jsonl
// where <id> = first 16 hex chars of sha256(workspace folder path). Editors pass the path with a
// lowercase drive letter ("c:\..."), so both spellings are hashed.
// Each finished prompt writes one {"type":"runMeta","usage":{...}}; promptTokens INCLUDES cached tokens.

function oxcode(folder) {
  const abs = path.resolve(folder);
  const spellings = new Set([abs, abs[0].toLowerCase() + abs.slice(1), abs[0].toUpperCase() + abs.slice(1)]);
  const ids = new Set([...spellings].map(s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16)));
  const editors = ["Code", "Code - Insiders", "Cursor", "Windsurf", "Antigravity", "VSCodium"];
  const chats = [];
  let installed = false;

  for (const editor of editors) {
    const base = path.join(APPDATA, editor, "User", "globalStorage", "oxloai.oxcode-ai", "sessions");
    if (!fs.existsSync(base)) continue;
    installed = true;
    for (const id of ids) {
      const dir = path.join(base, id);
      for (const f of listDir(dir).filter(n => n.endsWith(".jsonl"))) {
        const chat = { id: path.basename(f, ".jsonl"), title: null, prompts: [] };
        let text = "", time = null;
        for (const o of readJsonl(path.join(dir, f))) {
          if (o.type === "userMsg") {
            text = o.text; time = o.ts;
            if (!chat.title) chat.title = cleanPrompt(o.text);
          } else if (o.type === "runMeta" && o.usage) {
            const u = o.usage, p = newPrompt(text, time);
            Object.keys(u.byModel || {}).forEach(m => p.models.add(m));
            p.calls = u.calls || 0;
            p.input = u.promptTokens || 0;
            p.cached = u.cachedPromptTokens || 0;
            p.output = u.completionTokens || 0;
            chat.prompts.push(p);
          }
        }
        if (chat.prompts.length) chats.push(chat);
      }
    }
  }
  return { installed, chats };
}

// ───────────────────────── OpenCode ─────────────────────────
// SQLite DB: ~/.local/share/opencode/opencode.db (or $XDG_DATA_HOME/opencode/opencode.db).
//   session_v2.directory  = folder the chat was started in; parent_id set = subagent session
//   session_message       = messages; assistant messages carry
//                           tokens {input, output, reasoning, cache:{read, write}}
// tokens.input EXCLUDES cache, so input here = input + cache.read + cache.write.
// Subagent tokens are added to the parent prompt that started them.

function opencode(folder) {
  const dataHome = process.env.XDG_DATA_HOME || path.join(HOME, ".local", "share");
  const dbFile = path.join(dataHome, "opencode", "opencode.db");
  if (!fs.existsSync(dbFile)) return { installed: false, chats: [] };
  if (!sqlite) { notes.push("OpenCode: needs Node.js 22+ to read its database. Skipped."); return { installed: true, chats: [] }; }
  const db = openDb(dbFile);
  if (!db) { notes.push("OpenCode: could not open its database. Skipped."); return { installed: true, chats: [] }; }

  const chats = [];
  try {
    const sessions = db.prepare("select id, parent_id, title, directory from session_v2").all();
    const byId = new Map(sessions.map(s => [s.id, s]));
    const rootOf = id => { let n = 0; while (byId.get(id) && byId.get(id).parent_id && n++ < 50) id = byId.get(id).parent_id; return id; };
    const want = normFolder(folder);
    const chatById = new Map();
    for (const s of sessions) {
      if (!s.parent_id && normFolder(s.directory) === want) chatById.set(s.id, { id: s.id, title: s.title, prompts: [], current: null });
    }
    if (chatById.size) {
      const rows = db.prepare("select session_id, type, time_created, data from session_message order by time_created, seq").all();
      for (const m of rows) {
        const chat = chatById.get(rootOf(m.session_id));
        if (!chat) continue;
        let d;
        try { d = JSON.parse(m.data); } catch { continue; }
        if (m.type === "user" && chat.id === m.session_id) {
          chat.current = newPrompt(d.text, m.time_created);
          chat.prompts.push(chat.current);
        } else if (m.type === "assistant" && d.tokens) {
          if (!chat.current) { chat.current = newPrompt("", m.time_created); chat.prompts.push(chat.current); }
          const t = d.tokens, p = chat.current;
          const read = (t.cache && t.cache.read) || 0, write = (t.cache && t.cache.write) || 0;
          p.calls++;
          p.input += (t.input || 0) + read + write;
          p.cached += read;
          p.output += (t.output || 0) + (t.reasoning || 0);
          if (d.model && d.model.id) p.models.add(d.model.id);
        }
      }
      for (const c of chatById.values()) {
        c.prompts = c.prompts.filter(p => p.calls > 0);
        delete c.current;
        if (c.prompts.length) chats.push(c);
      }
    }
  } catch (e) {
    notes.push(`OpenCode: database format not recognised (${e.message}). Skipped.`);
  } finally {
    db.close();
  }
  return { installed: true, chats };
}

// ───────────────────────── Antigravity ─────────────────────────
// ~/.gemini/<variant>/ where variant = antigravity (VS Code extension), antigravity-cli, antigravity-ide
//   conversations/<id>.db  SQLite; table trajectory_metadata_blob holds protobuf with the workspace
//                          as "file:///c:/.../Folder" (the byte before it is the string length)
//   brain/<id>/.system_generated/logs/transcript.jsonl
//                          USER_INPUT steps = prompts; MODEL steps carry
//                          input_tokens (EXCLUDES cache), cache_read_tokens, output_tokens
// The standalone IDE does not record token counts; such chats are reported as "no token data".

function antigravityWorkspace(dbFile) {
  const db = openDb(dbFile);
  if (!db) return null;
  let data = null;
  try {
    const r = db.prepare("select data from trajectory_metadata_blob").get();
    data = r && r.data ? Buffer.from(r.data) : null;
  } catch { /* table missing */ } finally { db.close(); }
  if (!data) return null;
  const i = data.indexOf("file:///");
  if (i < 1) return null;
  let len = data[i - 1];
  if (i >= 2 && data[i - 2] >= 0x80 && data[i - 1] < 0x80) len = (data[i - 2] & 0x7f) | (data[i - 1] << 7);
  return data.subarray(i, i + len).toString("utf8");
}

function antigravity(folder) {
  const want = normFolder(folder);
  const surfaces = { "antigravity": "VS Code", "antigravity-cli": "CLI", "antigravity-ide": "IDE" };
  const chats = [];
  let installed = false;
  const noTokens = {}; // surface -> number of chats in this folder without token data

  for (const [variant, surface] of Object.entries(surfaces)) {
    const base = path.join(HOME, ".gemini", variant);
    const convDir = path.join(base, "conversations");
    if (!fs.existsSync(convDir)) continue;
    installed = true;
    if (!sqlite) continue;
    for (const f of listDir(convDir).filter(n => n.endsWith(".db"))) {
      const id = path.basename(f, ".db");
      if (normFolder(antigravityWorkspace(path.join(convDir, f))) !== want) continue;
      const steps = readJsonl(path.join(base, "brain", id, ".system_generated", "logs", "transcript.jsonl"));
      const chat = { id, title: null, prompts: [] };
      let current = null, sawTokens = false;
      for (const o of steps) {
        if (o.type === "USER_INPUT") {
          current = newPrompt(o.content, Date.parse(o.created_at));
          current.models.add(surface);
          if (!chat.title) chat.title = current.text;
          chat.prompts.push(current);
        } else if (o.source === "MODEL" && o.input_tokens != null) {
          sawTokens = true;
          if (!current) { current = newPrompt("", Date.parse(o.created_at)); current.models.add(surface); chat.prompts.push(current); }
          current.calls++;
          current.input += (o.input_tokens || 0) + (o.cache_read_tokens || 0);
          current.cached += o.cache_read_tokens || 0;
          current.output += o.output_tokens || 0;
        }
      }
      chat.prompts = chat.prompts.filter(p => p.calls > 0);
      if (chat.prompts.length) chats.push(chat);
      else if (!sawTokens) noTokens[surface] = (noTokens[surface] || 0) + 1;
    }
  }
  if (installed && !sqlite) notes.push("Antigravity: needs Node.js 22+ to read its conversation files. Skipped.");
  const missing = Object.entries(noTokens);
  if (missing.length) {
    const n = missing.reduce((a, [, c]) => a + c, 0);
    const where = missing.map(([s, c]) => `${s}: ${c}`).join(", ");
    notes.push(`Antigravity: ${n} chat(s) in this folder have no token data and are not counted (${where}). ` +
      (noTokens.IDE ? "The standalone Antigravity IDE does not record token counts." : "Their transcript is missing or empty."));
  }
  return { installed, chats };
}

// ───────────────────────── report ─────────────────────────

const ALL_AGENTS = [
  { name: "OxCode", read: oxcode },
  { name: "OpenCode", read: opencode },
  { name: "Antigravity", read: antigravity },
];

// SHOW settings first, then --only / --skip from the command line.
function pickAgents() {
  const known = ALL_AGENTS.map(a => a.name.toLowerCase());
  const unknown = [...ARGS.only, ...ARGS.skip].filter(n => !known.includes(n));
  if (unknown.length) {
    console.error(`Unknown agent name: ${unknown.join(", ")}. Use: oxcode, opencode, antigravity`);
    process.exit(1);
  }
  return ALL_AGENTS.filter(a => {
    const key = a.name.toLowerCase();
    if (SHOW[a.name] === false) return false;
    if (ARGS.only.length && !ARGS.only.includes(key)) return false;
    return !ARGS.skip.includes(key);
  });
}

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = code => s => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = paint("1"), dim = paint("2"), cyan = paint("36"), green = paint("32"), yellow = paint("33");

const num = n => Number(n || 0).toLocaleString("en-US");
const short = n => n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n || 0);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const plural = (n, w) => `${num(n)} ${w}${n === 1 ? "" : "s"}`;
const date = ms => ms && !isNaN(ms) ? new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "unknown date";
const fit = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n); };

function sum(prompts) {
  const t = { calls: 0, input: 0, cached: 0, output: 0 };
  for (const p of prompts) { t.calls += p.calls; t.input += p.input; t.cached += p.cached; t.output += p.output; }
  t.total = t.input + t.output;
  return t;
}

// Fixed-width table: first column left-aligned, the rest right-aligned.
function table(head, rows, widths) {
  const line = cells => "  " + cells.map((c, i) => (i === 0 ? fit(c, widths[i]) : String(c).padStart(widths[i]))).join("  ");
  const out = [dim(line(head)), dim("  " + widths.map(w => "─".repeat(w)).join("  "))];
  for (const r of rows) out.push(r.bold ? bold(line(r.cells)) : line(r.cells));
  return out.join("\n");
}

function main() {
  if (ARGS.help) {
    console.log([
      "Usage: node ai-token-usage.js [folder] [--skip <agents>] [--only <agents>]",
      "",
      "  folder            folder to check (default: the folder this script is in)",
      "  --skip opencode   hide these agents (comma-separated)",
      "  --only oxcode     show only these agents (comma-separated)",
      "",
      "Agents: oxcode, opencode, antigravity",
      "To hide an agent permanently, set it to false in SHOW at the top of this file.",
    ].join("\n"));
    return;
  }
  const AGENTS = pickAgents();
  if (!AGENTS.length) {
    console.log("\n All agents are hidden (check SHOW at the top of the file and --skip / --only).\n");
    return;
  }
  const results = AGENTS.map(a => {
    const r = a.read(FOLDER);
    for (const c of r.chats) {
      Object.assign(c, sum(c.prompts));
      c.start = Math.min(...c.prompts.map(p => p.time || Infinity));
      c.models = [...new Set(c.prompts.flatMap(p => [...p.models]))];
      if (!c.title) c.title = c.prompts[0].text;
    }
    r.chats.sort((x, y) => x.start - y.start);
    const all = r.chats.flatMap(c => c.prompts);
    return { ...a, ...r, promptCount: all.length, ...sum(all) };
  });
  const used = results.filter(r => r.chats.length);
  const grand = sum(used.flatMap(r => r.chats.flatMap(c => c.prompts)));
  const chatCount = used.reduce((a, r) => a + r.chats.length, 0);
  const promptCount = used.reduce((a, r) => a + r.promptCount, 0);
  const rule = dim("═".repeat(96));

  console.log("");
  console.log(rule);
  console.log(bold(" AI TOKEN USAGE REPORT"));
  console.log(` Folder : ${cyan(FOLDER)}`);
  console.log(` Scope  : chats started in this exact folder only`);
  console.log(` Agents : ${AGENTS.map(a => a.name).join(", ")}`);
  console.log(` Created: ${date(Date.now())}`);
  console.log(rule);

  if (!used.length) {
    console.log(`\n No ${AGENTS.map(a => a.name).join(" / ")} chats were found for this folder.`);
    console.log(dim(" Tip: put this script in the same folder you opened in the agent, then run it again."));
    for (const r of results) if (!r.installed) console.log(dim(` • ${r.name}: no local data found on this computer`));
    for (const n of notes) console.log(yellow(` ! ${n}`));
    console.log("");
    return;
  }

  // Summary
  console.log(`\n ${bold("SUMMARY")}  ${used.length} of ${AGENTS.length} agent${AGENTS.length === 1 ? "" : "s"} used · ${plural(chatCount, "chat")} · ${plural(promptCount, "prompt")} · ${plural(grand.calls, "AI call")}\n`);
  const W = [14, 6, 8, 9, 14, 14, 12, 14];
  const sumRows = results.map(r => r.chats.length
    ? { cells: [r.name, num(r.chats.length), num(r.promptCount), num(r.calls), num(r.input), num(r.cached), num(r.output), num(r.total)] }
    : { cells: [r.name, "-", "-", "-", "-", "-", "-", r.installed ? "not used here" : "not installed"] });
  sumRows.push({ bold: true, cells: ["ALL AGENTS", num(chatCount), num(promptCount), num(grand.calls), num(grand.input), num(grand.cached), num(grand.output), num(grand.total)] });
  console.log(table(["Agent", "Chats", "Prompts", "AI calls", "Input", "Cached", "Output", "Total"], sumRows, W));
  console.log(dim(`\n  Total = Input + Output. Input already includes Cached (${pct(grand.cached, grand.input)}% of input was cached; cached input is billed cheaper).`));

  // Per agent → per chat → per prompt
  for (const r of used) {
    console.log(`\n${rule}`);
    console.log(bold(` ${r.name.toUpperCase()}`) + `  ·  ${plural(r.chats.length, "chat")}  ·  ${plural(r.promptCount, "prompt")}  ·  ${green(short(r.total) + " tokens")} (${num(r.total)})`);
    console.log(rule);
    r.chats.forEach((c, i) => {
      console.log(`\n ${bold(`Chat ${i + 1}`)}: ${fit(c.title, 70).trimEnd()}`);
      console.log(dim(`   Started ${date(c.start)}${c.models.length ? "  ·  " + c.models.join(", ") : ""}`));
      const rows = c.prompts.map((p, j) => ({ cells: [`${j + 1}. ${p.text}`, num(p.calls), num(p.input), num(p.cached), num(p.output), num(p.total = p.input + p.output)] }));
      if (c.prompts.length > 1) rows.push({ bold: true, cells: ["Chat total", num(c.calls), num(c.input), num(c.cached), num(c.output), num(c.total)] });
      console.log(table(["Prompt", "Calls", "Input", "Cached", "Output", "Total"], rows, [44, 6, 12, 12, 10, 12]));
    });
  }

  console.log(`\n${rule}`);
  console.log(` ${bold("GRAND TOTAL")}  ${green(num(grand.total) + " tokens")}  (input ${num(grand.input)} · output ${num(grand.output)})`);
  for (const n of notes) console.log(yellow(` ! ${n}`));
  console.log(rule + "\n");
}

main();
