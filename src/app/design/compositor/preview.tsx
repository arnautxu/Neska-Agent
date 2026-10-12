"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { PreviewTheme } from "../preview-theme";
import s from "./compositor.module.css";

/* ------------------------------------------------------------------ model */

type Surface = "home" | "task" | "mobile";
type Effort = "fast" | "smart" | "expert";
type ChipKind = "project" | "file" | "connector" | "task" | "mode";
type Chip = { id: string; kind: ChipKind; name: string; meta?: string; state?: "uploading" | "ready" | "error"; progress?: number; note?: string };
type MenuKind = "slash" | "at" | "effort" | "attach" | "project";
type Action =
  | { type: "mode"; name: string } | { type: "panel"; panel: MenuKind } | { type: "stop" }
  | { type: "ref"; chip: Omit<Chip, "id"> } | { type: "effort"; effort: Effort } | { type: "project"; name: string }
  | { type: "pick-file" } | { type: "drive" } | { type: "at" };
type Option = { id: string; group?: string; label: string; desc?: string; aside?: string; disabled?: boolean; act: Action };

const EFFORTS: { id: Effort; name: string; desc: string; level: number }[] = [
  { id: "fast", name: "Ràpid", desc: "Consultes i respostes curtes", level: 1 },
  { id: "smart", name: "Normal", desc: "Redacció i feina del dia a dia", level: 2 },
  { id: "expert", name: "A fons", desc: "Anàlisi llarga · et proposo un pla primer", level: 3 },
];
const PROJECTS = ["Comptabilitat", "Vendes", "Personal"];
const CONNECTORS = [
  { name: "Gmail", ok: true, aside: "connectat" },
  { name: "Google Drive", ok: true, aside: "connectat" },
  { name: "Excel", ok: true, aside: "connectat" },
  { name: "Holded", ok: false, aside: "cal connectar" },
];
const FILES = [{ name: "factures-octubre.zip", meta: "4,2 MB" }, { name: "extracte-bbva.csv", meta: "88 KB" }];
const TASKS = [{ name: "Conciliació setembre", aside: "fa 3 setmanes" }];
const MAX_MB = 20;

let seq = 0;
const uid = () => `c${++seq}`;
const kb = (bytes: number) => bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Finds an open "/" (only at the very start) or "@" trigger right before the caret. */
function triggerAt(text: string, caret: number): { kind: "slash" | "at"; query: string; start: number } | null {
  const before = text.slice(0, caret);
  const at = /(^|\s)@([\p{L}\p{N}._-]*)$/u.exec(before);
  if (at) return { kind: "at", query: at[2], start: caret - at[2].length - 1 };
  const slash = /^\/([\p{L}·]*)$/u.exec(before);
  if (slash) return { kind: "slash", query: slash[1], start: 0 };
  return null;
}
const norm = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* --------------------------------------------------------------- composer */

type ComposerProps = {
  surface: Surface;
  initialText?: string;
  initialChips?: Chip[];
  initialEffort?: Effort;
  forceFocus?: boolean;
  forceMenu?: MenuKind;
  working?: boolean;
  sending?: boolean;
  offline?: boolean;
  dragging?: boolean;
  queued?: string[];
  onSend?: (text: string, chips: Chip[], effort: Effort) => void;
  onStop?: () => void;
  onUnqueue?: (index: number) => void;
};

function Composer({ surface, initialText = "", initialChips = [], initialEffort = "smart", forceFocus, forceMenu, working, sending, offline, dragging: forceDrag, queued = [], onSend, onStop, onUnqueue }: ComposerProps) {
  const base = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialText);
  const [caret, setCaret] = useState(initialText.length);
  const [chips, setChips] = useState<Chip[]>(() => surface === "home" && !initialChips.some(c => c.kind === "project") ? [{ id: uid(), kind: "project", name: PROJECTS[0] }, ...initialChips] : initialChips);
  const [effort, setEffort] = useState<Effort>(initialEffort);
  const [focused, setFocused] = useState(false);
  const [panel, setPanel] = useState<MenuKind | null>(forceMenu === "effort" || forceMenu === "attach" || forceMenu === "project" ? forceMenu : null);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState(false);
  const [announce, setAnnounce] = useState("");

  const isFocused = focused || !!forceFocus;
  const trigger = triggerAt(text, caret);
  const menu: MenuKind | null = panel ?? (trigger && isFocused && !dismissed ? trigger.kind : null);
  const dir = surface === "home" ? "down" : "up";

  // Auto-grow; the mirror follows the textarea's height and scroll.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [text, surface]);

  const addChip = useCallback((chip: Chip) => setChips(list => list.some(c => c.kind === chip.kind && c.name === chip.name) ? list : [...list, chip]), []);
  const removeChip = (chip: Chip) => {
    setChips(list => list.filter(c => c.id !== chip.id));
    if (chip.kind === "connector" || chip.kind === "file" || chip.kind === "task") setText(t => t.replace(`@${chip.name} `, "").replace(`@${chip.name}`, ""));
    setAnnounce(`${chip.name} tret`);
    inputRef.current?.focus();
  };

  const replaceTrigger = (insert: string) => {
    if (!trigger) { setText(t => t + insert); return; }
    const next = text.slice(0, trigger.start) + insert + text.slice(caret);
    const pos = trigger.start + insert.length;
    setText(next); setCaret(pos);
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(pos, pos); });
  };
  const close = () => { setPanel(null); setDismissed(true); setActive(0); };
  const done = () => { setPanel(null); setActive(0); requestAnimationFrame(() => inputRef.current?.focus()); };

  const upload = useCallback((files: { name: string; size: number }[]) => {
    for (const file of files) {
      const id = uid();
      if (file.size > MAX_MB * 1_048_576) {
        addChip({ id, kind: "file", name: file.name, state: "error", note: `massa gran · màxim ${MAX_MB} MB` });
        setAnnounce(`${file.name} és massa gran`);
        continue;
      }
      addChip({ id, kind: "file", name: file.name, meta: kb(file.size), state: "uploading", progress: 0 });
      let p = 0;
      const timer = window.setInterval(() => {
        p = Math.min(100, p + 9 + Math.random() * 14);
        setChips(list => list.map(c => c.id === id ? { ...c, progress: p, state: p >= 100 ? "ready" : "uploading" } : c));
        if (p >= 100) { window.clearInterval(timer); setAnnounce(`${file.name} adjuntat`); }
      }, 120);
    }
  }, [addChip]);

  const options: Option[] = (() => {
    const q = norm(trigger?.query ?? "");
    if (menu === "slash") {
      const cmds: Option[] = [
        { id: "pla", label: "/pla", desc: "Mostra'm el pla abans de començar", act: { type: "mode", name: "Pla primer" } },
        { id: "imatge", label: "/imatge", desc: "Crea una imatge", act: { type: "mode", name: "Imatge" } },
        { id: "recorda", label: "/recorda", desc: "Desa-ho a la memòria del projecte", act: { type: "mode", name: "Recorda" } },
        { id: "esforç", label: "/esforç", desc: "Canvia quant hi penso", act: { type: "panel", panel: "effort" } },
        ...(surface === "home" ? [{ id: "projecte", label: "/projecte", desc: "Tria on va la tasca", act: { type: "panel", panel: "project" } } as Option] : []),
        ...(working ? [{ id: "atura", label: "/atura", desc: "Atura la tasca en curs", act: { type: "stop" } } as Option] : []),
      ];
      return cmds.filter(c => norm(c.label.slice(1)).startsWith(q));
    }
    if (menu === "at") {
      const all: Option[] = [
        ...CONNECTORS.map((c): Option => ({ id: `k-${c.name}`, group: "Eines", label: c.name, aside: c.aside, act: { type: "ref", chip: c.ok ? { kind: "connector", name: c.name } : { kind: "connector", name: c.name, state: "error", note: "no connectat" } } })),
        ...FILES.map((f): Option => ({ id: `f-${f.name}`, group: "Fitxers del projecte", label: f.name, aside: f.meta, act: { type: "ref", chip: { kind: "file", name: f.name, meta: f.meta, state: "ready" } } })),
        ...TASKS.map((x): Option => ({ id: `t-${x.name}`, group: "Tasques", label: x.name, aside: x.aside, act: { type: "ref", chip: { kind: "task", name: x.name } } })),
      ];
      return all.filter(o => norm(o.label).includes(q));
    }
    if (menu === "effort") return EFFORTS.map((e): Option => ({ id: e.id, label: e.name, desc: e.desc, aside: effort === e.id ? "actual" : undefined, act: { type: "effort", effort: e.id } }));
    if (menu === "project") return [...PROJECTS, "Sense projecte"].map((p): Option => ({ id: p, label: p, aside: chips.some(c => c.kind === "project" && c.name === p) ? "actual" : undefined, act: { type: "project", name: p } }));
    if (menu === "attach") return [
      { id: "pc", label: "Fitxer de l'ordinador", aside: `fins a ${MAX_MB} MB`, act: { type: "pick-file" } },
      { id: "drive", label: "Des de Google Drive", act: { type: "drive" } },
      { id: "eina", label: "Una eina o connector", aside: "@", act: { type: "at" } },
    ];
    return [];
  })();

  const run = (act: Action) => {
    switch (act.type) {
      case "mode": replaceTrigger(""); addChip({ id: uid(), kind: "mode", name: act.name }); done(); break;
      case "panel": replaceTrigger(""); setPanel(act.panel); setActive(act.panel === "effort" ? EFFORTS.findIndex(e => e.id === effort) : 0); break;
      case "stop": replaceTrigger(""); onStop?.(); done(); break;
      case "ref": replaceTrigger(`@${act.chip.name} `); addChip({ id: uid(), ...act.chip }); setDismissed(true); setActive(0); break;
      case "effort": { const e = EFFORTS.find(x => x.id === act.effort)!; setEffort(e.id); setAnnounce(`Esforç: ${e.name}`); done(); break; }
      case "project": setChips(list => [{ id: uid(), kind: "project", name: act.name }, ...list.filter(c => c.kind !== "project")]); done(); break;
      case "pick-file": setPanel(null); fileRef.current?.click(); break;
      case "drive": upload([{ name: "pressupost-2027.xlsx", size: 312_000 }]); done(); break;
      case "at": {
        setPanel(null); setDismissed(false);
        const next = text + (text && !text.endsWith(" ") ? " @" : "@");
        setText(next); setCaret(next.length);
        requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(next.length, next.length); });
        break;
      }
    }
  };

  const selectable = options.filter(o => !o.disabled);
  const activeIndex = Math.min(active, Math.max(0, selectable.length - 1));
  const activeOption = selectable[activeIndex];

  const hasPayload = text.trim().length > 0 || chips.some(c => c.kind === "file" && c.state === "ready");
  const uploading = chips.some(c => c.state === "uploading");
  const blocked = chips.some(c => c.state === "error");
  const canSend = hasPayload && !uploading && !blocked && !offline && !sending;
  const stopMode = working && !hasPayload;

  const submit = () => {
    if (stopMode) { onStop?.(); return; }
    if (!canSend) return;
    onSend?.(text.trim(), chips, effort);
    setAnnounce(working ? "Afegit a la tasca en curs" : "Enviat");
    setText(""); setCaret(0); setChips(list => list.filter(c => c.kind === "project"));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (menu && selectable.length) {
      if (event.key === "ArrowDown") { event.preventDefault(); setActive((activeIndex + 1) % selectable.length); return; }
      if (event.key === "ArrowUp") { event.preventDefault(); setActive((activeIndex - 1 + selectable.length) % selectable.length); return; }
      if (event.key === "Enter" || event.key === "Tab") { event.preventDefault(); if (activeOption) run(activeOption.act); return; }
    }
    if (menu && event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); return; }
    if (event.key === "Backspace" && text === "" && chips.length) {
      const last = [...chips].reverse().find(c => c.kind !== "project");
      if (last) { event.preventDefault(); removeChip(last); }
    }
  };
  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value); setCaret(event.target.selectionStart); setDismissed(false); setActive(0);
    if (panel === "effort" || panel === "project" || panel === "attach") setPanel(null);
  };
  const syncCaret = () => setCaret(inputRef.current?.selectionStart ?? text.length);

  const onDrop = (event: DragEvent) => {
    event.preventDefault(); setDrag(false);
    upload(Array.from(event.dataTransfer.files).map(f => ({ name: f.name, size: f.size })));
  };

  // Inline tokens: highlight "@Name" for every referenced chip.
  const mirror = useMemo(() => {
    const names = chips.filter(c => c.kind === "connector" || c.kind === "file" || c.kind === "task").map(c => `@${c.name}`);
    if (!names.length) return [text, "\n"];
    const re = new RegExp(`(${names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
    return [...text.split(re).map((part, i) => names.includes(part) ? <mark key={i}>{part}</mark> : part), "\n"];
  }, [text, chips]);

  const placeholder = offline ? "Sense connexió. Pots continuar escrivint." : working ? "Afegeix context mentre treballo…" : surface === "home" ? "Què vols que faci?" : "Afegeix context o demana un canvi…";
  const current = EFFORTS.find(e => e.id === effort)!;
  const visibleChips = chips;
  const menuId = `${base}-menu`;
  const showDrag = drag || forceDrag;

  let hint: ReactNode = <><kbd>⏎</kbd> envia · <kbd>⇧⏎</kbd> línia · <kbd>/</kbd> ordres</>;
  if (stopMode) hint = "Pots afegir context mentre treballo";
  else if (working && hasPayload) hint = <><kbd>⏎</kbd> ho tindré en compte al proper pas</>;
  else if (uploading) hint = "Esperant els adjunts…";
  else if (blocked) hint = "Treu el que està ratllat per enviar";

  const sendLabel = stopMode ? "Atura la tasca" : sending ? "Enviant" : working ? "Afegeix a la tasca en curs" : "Envia";

  const menuEl = menu ? (
    <div className={s.menu} data-dir={dir} id={menuId} role="listbox" aria-label={menu === "slash" ? "Ordres" : menu === "at" ? "Referències" : menu === "effort" ? "Esforç" : menu === "project" ? "Projecte" : "Adjunta"}>
      {options.length === 0 ? <div className={s.empty}>{menu === "slash" ? "Cap ordre comença així." : "No trobo res amb aquest nom."}</div> : null}
      {options.map((o, i) => {
        const group = o.group && o.group !== options[i - 1]?.group ? <div className={`${s.menuGroup} ${s.lbl}`} key={`g-${o.group}`}>{o.group}</div> : null;
        const selected = activeOption?.id === o.id;
        const level = EFFORTS.find(e => e.id === o.id)?.level;
        return [group, (
          <button key={o.id} id={`${base}-${o.id}`} type="button" role="option" aria-selected={selected} tabIndex={-1} className={s.option}
            onMouseDown={e => e.preventDefault()} onMouseEnter={() => setActive(selectable.indexOf(o))} onClick={() => run(o.act)}>
            {level ? <Bars level={level} /> : null}
            {menu === "slash" ? <span className={s.cmd}>{o.label}</span> : <b>{o.label}</b>}
            {o.desc ? <span className={s.desc}>{o.desc}</span> : null}
            {o.aside ? <span className={s.aside}>{o.aside}</span> : null}
          </button>
        )];
      })}
      <div className={s.menuFoot}><span><kbd>↑↓</kbd> tria</span><span><kbd>⏎</kbd> fes-ho</span><span><kbd>esc</kbd> tanca</span></div>
    </div>
  ) : null;

  return (
    <div className={s.composer} data-surface={surface} data-focus={isFocused} data-menu={menu ? dir : undefined} data-drag={showDrag} data-offline={offline}
      onDragEnter={e => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } }}
      onDragOver={e => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); }}
      onDrop={onDrop}>
      {queued.length ? queued.map((q, i) => (
        <div className={s.queue} key={i}><span className={s.lbl}>En cua</span><q>{q}</q><button type="button" className={s.link} onClick={() => onUnqueue?.(i)}>Treu</button></div>
      )) : null}
      {dir === "up" ? menuEl : null}
      <div className={s.box} onClick={e => { if (e.target === e.currentTarget) inputRef.current?.focus(); }}>
        {showDrag ? <div className={s.drop}><div>Deixa-ho anar per adjuntar<small>Fins a {MAX_MB} MB per fitxer</small></div></div> : null}
        {offline ? <div className={s.note}><span className={s.cross}>✕</span>Sense connexió. Guardo el que escriguis i ho envio quan torni.</div> : null}
        {visibleChips.length ? (
          <div className={s.strip} aria-label="El que s'enviarà amb el missatge">
            {visibleChips.map(chip => <ChipView key={chip.id} chip={chip} onRemove={() => removeChip(chip)} onOpen={chip.kind === "project" ? () => { setPanel(panel === "project" ? null : "project"); setActive(0); } : undefined} />)}
          </div>
        ) : null}
        <div className={s.field}>
          <div ref={mirrorRef} className={s.mirror} aria-hidden="true">{mirror}</div>
          <textarea ref={inputRef} className={s.input} rows={surface === "home" ? 2 : 1} value={text} placeholder={placeholder} aria-label="Missatge per a Neska"
            role="combobox" aria-expanded={!!menu} aria-controls={menu ? menuId : undefined} aria-autocomplete="list" aria-activedescendant={menu && activeOption ? `${base}-${activeOption.id}` : undefined}
            onChange={onChange} onKeyDown={onKeyDown} onKeyUp={syncCaret} onClick={syncCaret} onSelect={syncCaret}
            onScroll={e => { if (mirrorRef.current) mirrorRef.current.scrollTop = e.currentTarget.scrollTop; }}
            onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setPanel(null); }} />
        </div>
        <div className={s.foot}>
          <button type="button" className={s.btnText} aria-label="Adjunta" aria-haspopup="listbox" aria-expanded={menu === "attach"} title="Adjunta"
            onMouseDown={e => e.preventDefault()} onClick={() => { setPanel(menu === "attach" ? null : "attach"); setActive(0); inputRef.current?.focus(); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
          <button type="button" className={s.btnText} aria-haspopup="listbox" aria-expanded={menu === "effort"} aria-label={`Esforç: ${current.name}`} title="Esforç"
            onMouseDown={e => e.preventDefault()} onClick={() => { setPanel(menu === "effort" ? null : "effort"); setActive(EFFORTS.findIndex(x => x.id === effort)); inputRef.current?.focus(); }}>
            <Bars level={current.level} /><span className={s.effortName}>{current.name}</span>
          </button>
          <span className={s.hint} aria-hidden="true">{hint}</span>
          <button type="button" className={s.send} data-kind={stopMode ? "stop" : "send"} disabled={!stopMode && !canSend} aria-label={sendLabel} title={sendLabel}
            onMouseDown={e => e.preventDefault()} onClick={submit}>
            {sending ? <span className={s.dots}><i /><i /><i /></span>
              : stopMode ? <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect width="10" height="10" fill="currentColor" /></svg>
              : <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 12V2M2.5 6.5 7 2l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>}
          </button>
        </div>
        <input ref={fileRef} type="file" multiple hidden onChange={e => { upload(Array.from(e.target.files ?? []).map(f => ({ name: f.name, size: f.size }))); e.target.value = ""; inputRef.current?.focus(); }} />
      </div>
      {dir === "down" ? menuEl : null}
      <span className={s.sr} aria-live="polite">{announce}</span>
    </div>
  );
}

function Bars({ level }: { level: number }) {
  return <span className={s.bars} aria-hidden="true">{[1, 2, 3].map(n => <i key={n} data-on={n <= level} />)}</span>;
}

function ChipView({ chip, onRemove, onOpen }: { chip: Chip; onRemove: () => void; onOpen?: () => void }) {
  const body = <>
    {chip.kind === "project" ? <span className={s.lbl}>Projecte</span> : null}
    {chip.state === "error" ? <span className={s.cross} aria-hidden="true">✕</span> : null}
    <span className={s.name}>{chip.name}</span>
    {chip.state === "uploading" ? <span className={s.meta}>{Math.round(chip.progress ?? 0)}%</span> : chip.note ? <span className={s.meta}>{chip.note}</span> : chip.meta ? <span className={s.meta}>{chip.meta}</span> : null}
  </>;
  return (
    <span className={s.chip} data-kind={chip.kind} data-state={chip.state}>
      {onOpen ? <button type="button" className={s.chipBtn} onMouseDown={e => e.preventDefault()} onClick={onOpen} aria-label={`Projecte: ${chip.name}. Canvia`}>{body}</button> : body}
      {chip.kind === "connector" && chip.state === "error" ? <button type="button" className={s.link}>Connecta</button> : null}
      {chip.kind !== "project" ? <button type="button" className={s.chipX} aria-label={`Treu ${chip.name}`} onClick={onRemove}>×</button> : null}
      {chip.state === "uploading" ? <span className={s.bar}><i style={{ width: `${chip.progress ?? 0}%` }} /></span> : null}
    </span>
  );
}

/* --------------------------------------------------------------- the page */

const STEPS = [
  { t: "Llegir les factures d'octubre", r: "0:41" },
  { t: "Normalitzar l'extracte del banc", r: "0:12" },
  { t: "Creuar imports, dates i NIF", r: "29 / 38", live: true },
  { t: "Generar l'informe de diferències", r: "" },
];

function Playground() {
  const [surface, setSurface] = useState<Surface>("task");
  const [phase, setPhase] = useState<"idle" | "sending" | "working">("idle");
  const [offline, setOffline] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);

  const begin = (summary: string) => {
    setLast(summary); setPhase("sending");
    window.setTimeout(() => { const t = Date.now(); setStartedAt(t); setNow(t); setPhase("working"); }, 700);
  };
  useEffect(() => {
    if (phase !== "working") return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const end = window.setTimeout(() => {
      if (queue.length) { setQueue(queue.slice(1)); begin(queue[0]); } else setPhase("idle");
    }, 14_000);
    return () => { window.clearInterval(tick); window.clearTimeout(end); };
  }, [phase, queue]);

  const send = (text: string, chips: Chip[], effort: Effort) => {
    const summary = text || chips.filter(c => c.kind === "file").map(c => c.name).join(", ");
    if (phase === "working") { setQueue(q => [...q, summary]); return; }
    begin(`${summary}${effort === "expert" ? "  · a fons" : ""}`);
  };
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const working = phase === "working";
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  const composer = readOnly
    ? <div className={s.readonly}>Només lectura · pots consultar l&apos;historial i els fitxers</div>
    : <Composer key={surface} surface={surface} working={working} sending={phase === "sending"} offline={offline} queued={queue}
        onSend={send} onStop={() => { setPhase("idle"); setQueue([]); }} onUnqueue={i => setQueue(q => q.filter((_, j) => j !== i))} />;

  const task = (
    <div className={s.taskCtx}>
      <h3>Conciliació de factures octubre</h3>
      <div className={s.taskMeta}>{working ? <><span className={s.live} />En curs · <span className={s.mono}>{clock}</span></> : phase === "sending" ? "Enviant…" : "Comptabilitat · ahir"}</div>
      {STEPS.map((step, i) => <div key={step.t} className={s.taskStep} data-live={working && step.live}><span className={s.n}>0{i + 1}</span><span>{step.t}</span><span className={s.r}>{step.r}</span></div>)}
      {last ? <p className={s.sent}><span>{last}</span></p> : null}
    </div>
  );

  return (
    <section className={s.section} aria-labelledby="pg">
      <div className={s.sectionHead}>
        <h2 id="pg">Prova&apos;l</h2>
        <p>Escriu <span className={s.mono}>/</span> o <span className={s.mono}>@</span>, arrossega un fitxer, envia.</p>
        <div className={s.controls}>
          <div className={s.seg} role="group" aria-label="Superfície">
            {(["home", "task", "mobile"] as const).map(v => <button key={v} type="button" className={s.ctrl} aria-pressed={surface === v} onClick={() => setSurface(v)}>{v === "home" ? "Inici" : v === "task" ? "Tasca" : "Mòbil"}</button>)}
          </div>
          <button type="button" className={s.ctrl} aria-pressed={working} onClick={() => { if (working) setPhase("idle"); else { const t = Date.now(); setStartedAt(t); setNow(t); setPhase("working"); } }}>Neska treballant</button>
          <button type="button" className={s.ctrl} aria-pressed={offline} onClick={() => setOffline(v => !v)}>Sense connexió</button>
          <button type="button" className={s.ctrl} aria-pressed={readOnly} onClick={() => setReadOnly(v => !v)}>Només lectura</button>
        </div>
      </div>
      <div className={s.stage} data-surface={surface}>
        {surface === "home" ? (
          <div className={s.home}>
            <h3>{working ? <span className={s.live} /> : null}Bon dia, Arnau</h3>
            <p className={s.sub}>{working ? <>Tinc una tasca en curs · <span className={s.mono}>{clock}</span></> : "Tens una tasca esperant el teu permís."}</p>
            {composer}
          </div>
        ) : surface === "mobile" ? (
          <div className={s.phone}>
            <div className={s.phoneBar}><span>9:41</span><span>Neska</span></div>
            {task}
            {composer}
          </div>
        ) : <>{task}<div className={s.dock}>{composer}</div></>}
      </div>
    </section>
  );
}

type GalleryItem = { n: string; title: string; why: string; tall?: boolean; down?: boolean; el: ReactNode };
const ready = (name: string, meta: string): Chip => ({ id: uid(), kind: "file", name, meta, state: "ready" });

const GALLERY: GalleryItem[] = [
  { n: "01", title: "Buit", why: "Només tres coses a la vista: adjunta, esforç i envia. El botó d'enviar està apagat fins que hi ha alguna cosa.", el: <Composer surface="task" /> },
  { n: "02", title: "Escrivint", why: "La vora passa a tinta. Les dreceres apareixen només amb el focus, a la dreta, molt discretes.", el: <Composer surface="task" forceFocus initialText="Revisa també les factures de proveïdors estrangers" /> },
  { n: "03", title: "Ordres · /", tall: true, why: "Sense botons extra: tot el que abans eren interruptors (Planifica, Imatge…) és una ordre. El menú s'enganxa al compositor i en comparteix la vora.", el: <Composer surface="task" forceFocus initialText="/" /> },
  { n: "04", title: "Referències · @", tall: true, why: "Eines, fitxers i tasques en un sol lloc, filtrats mentre escrius. Una eina sense connectar es pot triar igualment i et demana connectar-la.", el: <Composer surface="task" forceFocus initialText="Compara-ho amb @" /> },
  { n: "05", title: "Adjunts", why: "Tot el que viatja amb el missatge, en una sola línia a dalt. El fitxer que puja té una línia de progrés en nogal; el que falla es ratlla amb una creu, mai en vermell.", el: <Composer surface="task" forceFocus initialText="Fes la conciliació amb això" initialChips={[ready("factures-octubre.zip", "4,2 MB"), { id: uid(), kind: "file", name: "extracte-bbva.csv", meta: "88 KB", state: "uploading", progress: 62 }, { id: uid(), kind: "file", name: "escanejos-2026.pdf", state: "error", note: "massa gran · màxim 20 MB" }]} /> },
  { n: "06", title: "Eines a la frase", why: "La referència queda marcada dins del text i a la línia de context. Si treus una, desapareix de tots dos llocs.", el: <Composer surface="task" forceFocus initialText="Busca a @Gmail els correus de @Holded sobre aquesta factura" initialChips={[{ id: uid(), kind: "connector", name: "Gmail" }, { id: uid(), kind: "connector", name: "Holded", state: "error", note: "no connectat" }]} /> },
  { n: "07", title: "Esforç", tall: true, why: "Tres barres en lloc d'un desplegable amb noms de model. Diu quant hi pensarà Neska, no quin motor fa servir. A fons implica proposar un pla primer.", el: <Composer surface="task" forceFocus forceMenu="effort" initialEffort="expert" /> },
  { n: "08", title: "Inici", tall: true, down: true, why: "A l'inici, el projecte és la primera peça de context i es pot canviar amb un clic. Els menús s'obren cap avall perquè aquí el compositor és a dalt.", el: <Composer surface="home" forceFocus forceMenu="project" /> },
  { n: "09", title: "Pla primer", why: "Els modes són etiquetes petites en majúscules: es distingeixen dels fitxers i les eines sense icones.", el: <Composer surface="task" forceFocus initialText="Prepara els correus de reclamació per a cada diferència" initialChips={[{ id: uid(), kind: "mode", name: "Pla primer" }]} /> },
  { n: "10", title: "Enviant", why: "Un instant de tres punts. Res més es mou.", el: <Composer surface="task" sending initialText="Fes la conciliació" /> },
  { n: "11", title: "Neska treballant", why: "Buit, el botó passa a ser Atura (contorn, no ple). Pots continuar escrivint: el que envies s'afegeix a la tasca en curs.", el: <Composer surface="task" working /> },
  { n: "12", title: "Afegint mentre treballa", why: "Si Neska està enmig d'un pas, el missatge espera en cua a sobre i el pots treure abans que el llegeixi.", el: <Composer surface="task" working forceFocus queued={["Deixa fora les factures de menys de 10 €"]} initialText="I marca en negreta les diferències grans" /> },
  { n: "13", title: "Arrossegant", why: "La vora passa a discontínua i diu el límit abans que deixis anar.", el: <Composer surface="task" dragging /> },
  { n: "14", title: "Sense connexió", why: "No et treu el compositor: pots escriure, i ho envia sol quan torna.", el: <Composer surface="task" offline initialText="Envia-ho a la gestoria" /> },
  { n: "15", title: "Només lectura", why: "Sense caixa: una línia que explica per què no pots escriure.", el: <div className={s.readonly}>Només lectura · pots consultar l&apos;historial i els fitxers</div> },
  { n: "16", title: "Mòbil", why: "Mateixa estructura. Desapareixen les dreceres i el nom de l'esforç; queden les barres. Botons de 40 px.", el: <div style={{ maxWidth: 375 }}><Composer surface="mobile" initialText="Fes-ho també per a novembre" initialChips={[ready("novembre.zip", "3,1 MB")]} /></div> },
];

export function ComposerPreview() {
  return (
    <PreviewTheme>
      <div className={s.page}>
        <div className={s.wrap}>
          <header className={s.head}>
            <div>
              <span className={s.lbl}>Maqueta · dades fictícies</span>
              <h1>Compositor</h1>
              <p className={s.lead}>On parles amb Neska. Una caixa, una acció forta, i tota la resta a un teclat de distància.</p>
            </div>
            <ol className={s.ideas}>
              <li><span><b>El que envies, ho veus.</b> Projecte, fitxers, eines i modes, en una sola línia de context.</span></li>
              <li><span><b>Teclat primer.</b> <span className={s.mono}>/</span> per a ordres, <span className={s.mono}>@</span> per a eines, fitxers i tasques. Els botons només són portes als mateixos menús.</span></li>
              <li><span><b>Una sola acció forta.</b> Envia és l&apos;únic element ple, i canvia de sentit: envia, atura, afegeix.</span></li>
              <li><span><b>Esforç, no model.</b> Ràpid, Normal, A fons, amb tres barres.</span></li>
              <li><span><b>Mai et bloqueja.</b> Mentre treballa, sense connexió o amb un adjunt que falla, pots continuar escrivint.</span></li>
            </ol>
          </header>
          <Playground />
          <section className={s.section} aria-labelledby="st">
            <div className={s.sectionHead}><h2 id="st">Estats</h2><p>Cada estat és interactiu.</p></div>
            <div className={s.grid}>
              {GALLERY.map(item => (
                <div key={item.n} className={s.cell} data-tall={item.tall} data-down={item.down}>
                  <div className={s.cellHead}><span className={s.lbl}>{item.n}</span><span>{item.title}</span></div>
                  <p className={s.why}>{item.why}</p>
                  <div className={s.cellBody}>{item.el}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PreviewTheme>
  );
}
