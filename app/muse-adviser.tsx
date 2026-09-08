"use client";

import { ArrowRight, BookOpen, Bot, LoaderCircle, Mic, RotateCcw, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { transcribeAudioToText } from "./audio-to-text";
import { askMuse } from "./muse-client";
import type { MuseAnswer, MuseContext, MuseMessage, MuseStage } from "./muse-context";

type ChatMessage = MuseMessage & { id: string; advice?: MuseAnswer };
const stageNames = { idea: ["Idea", "创意"], design: ["Design", "设计"], product: ["Product", "产品"], bake: ["Bake", "烘焙"] };
const starters = {
  idea: [["Help shape my idea", "帮我完善创意"], ["What should I do next?", "接下来该做什么？"]],
  design: [["What is missing from my design brief?", "我的设计意图还缺少什么？"], ["Help me choose textures and flavors", "帮我搭配口感与风味"]],
  product: [["Review my recipe and making plan", "检查我的配方和制作计划"], ["How should I test this recipe?", "这个配方该如何试做？"]],
  bake: [["Help me organize this bake", "帮我安排这次烘焙"], ["Explain my scaled material totals", "解释缩放后的材料总量"]],
};

export default function MuseAdviser({ open, language, context, onClose, onNavigate }: {
  open: boolean;
  language: "en" | "zh";
  context: MuseContext;
  onClose: () => void;
  onNavigate: (stage: MuseStage) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const locked = useRef(false);
  const label = (en: string, zh: string) => language === "zh" ? zh : en;
  const busy = Boolean(pending) || transcribing;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controllerRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    inputRef.current?.focus({ preventScroll: true });
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, [open]);

  useEffect(() => {
    if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, pending, error, open]);

  const send = async (draft = input) => {
    const question = draft.trim();
    if (locked.current || !question) return;
    if (question.length > 4000) { setError(label("Please shorten your question to 4,000 characters.", "请将问题缩短至 4,000 字以内。")); return; }
    locked.current = true;
    setInput(question);
    setPending(question);
    setError("");
    setFailed(false);
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 75_000);
    try {
      const advice = await askMuse({
        language, context,
        messages: [...messages.slice(-10).map(({ role, content }) => ({ role, content })), { role: "user", content: question }],
      }, controller.signal);
      if (!mounted.current) return;
      setMessages((current) => [...current.slice(-38),
        { id: crypto.randomUUID(), role: "user", content: question },
        { id: crypto.randomUUID(), role: "assistant", content: advice.answer, advice },
      ]);
      setInput("");
    } catch (caught) {
      if (!mounted.current) return;
      const code = caught instanceof Error ? caught.message : "";
      setFailed(true);
      setError(code === "not_configured" ? label("Muse's AI connection is unavailable. Please try again later.", "缪斯的 AI 连接暂不可用，请稍后重试。")
        : code === "rate_limit" ? label("Muse is busy. Please wait a moment and retry.", "缪斯正忙，请稍后重试。")
        : code === "muse_blocked" ? label("Muse could not answer this request. Try rephrasing your question.", "缪斯无法回答此请求，请换一种方式提问。")
        : label("Muse could not finish. Your question is kept below; please retry.", "缪斯暂未完成回答，问题已保留在下方，请重试。"));
    } finally {
      window.clearTimeout(timeout);
      locked.current = false;
      if (mounted.current) setPending("");
    }
  };

  const transcribe = async (file: File) => {
    if (locked.current) return;
    if (!file.size || file.size > 18 * 1024 * 1024) { setError(label("Choose a non-empty audio file under 18 MB.", "请选择不超过 18 MB 的有效音频文件。")); return; }
    locked.current = true;
    setTranscribing(true);
    setError("");
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 75_000);
    try {
      const extension = file.name.toLowerCase().split(".").pop() ?? "";
      const mimeType = file.type.split(";")[0] || ({ m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav", webm: "audio/webm", ogg: "audio/ogg", flac: "audio/flac" } as Record<string, string>)[extension] || "application/octet-stream";
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("audio_unreadable"));
        reader.readAsDataURL(new Blob([file], { type: mimeType }));
      });
      if (!mounted.current || controller.signal.aborted) return;
      const text = await transcribeAudioToText({ content, filename: file.name, mimeType }, controller.signal);
      if (!mounted.current) return;
      const combined = [input.trim(), text].filter(Boolean).join("\n");
      setInput(combined);
      if (combined.length > 4000) setError(label("The transcript is kept below. Shorten it to 4,000 characters before sending.", "转写文字已保留在下方，请缩短至 4,000 字以内再发送。"));
      setFailed(false);
      inputRef.current?.focus();
    } catch {
      if (mounted.current) setError(label("Could not transcribe this audio. Your text is kept; choose the file to retry.", "音频转写失败，原有文字已保留，请重新选择文件重试。"));
    } finally {
      window.clearTimeout(timeout);
      locked.current = false;
      if (mounted.current) setTranscribing(false);
    }
  };

  if (!open) return null;
  return (
    <aside id="pastry-agent-window" className="agent-window" role="dialog" aria-label={label("Ask Muse · AI pastry adviser", "问问缪斯 · AI 甜点顾问")}
      onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
      <header>
        <span className="panel-icon muse"><Bot size={21} /></span>
        <span><strong>{label("Ask Muse", "问问缪斯")}</strong><small>{label("Your AI pastry adviser", "你的 AI 甜点顾问")}</small></span>
        <button type="button" className="square-button" disabled={busy || !messages.length} onClick={() => { setMessages([]); setError(""); setFailed(false); inputRef.current?.focus(); }} aria-label={label("New conversation", "开始新对话")} title={label("New conversation", "开始新对话")}><RotateCcw size={16} /></button>
        <button className="square-button" type="button" onClick={onClose} aria-label={label("Close chat", "关闭对话")}><X size={18} /></button>
      </header>
      <div className="muse-context"><span>{stageNames[context.stage][language === "zh" ? 1 : 0]}</span><strong>{context.stage === "idea" && context.ideaDraft ? label("Your idea draft", "你的创意草稿") : context.dessert.title || label("Your workspace", "你的工作区")}</strong></div>
      <div className="agent-messages" ref={logRef} role="log" aria-label={label("Conversation with Muse", "与缪斯的对话")} aria-live="polite" aria-relevant="additions text" aria-busy={Boolean(pending)} tabIndex={0}>
        <div className="muse-welcome">
          <BookOpen size={23} aria-hidden="true" />
          <strong>{label("A little guidance, a little inspiration.", "一点指引，一点灵感。")}</strong>
          <p>{label("I can help with your dessert, recipe, techniques and next steps, using this workspace and a curated baking library.", "结合当前工作区与精选烘焙知识，我可以帮助你完善甜点、配方、制作技巧和下一步计划。")}</p>
          {!messages.length && !pending && <div className="muse-starters">{starters[context.stage].map(([en, zh]) => <button type="button" key={en} disabled={busy} onClick={() => { setInput(label(en, zh)); inputRef.current?.focus(); }}>{label(en, zh)}<ArrowRight size={14} /></button>)}</div>}
        </div>
        {messages.map((message) => <article className={`muse-message ${message.role}`} key={message.id}>
          <span className="muse-speaker">{message.role === "user" ? label("You", "你") : label("Muse", "缪斯")}</span>
          <p>{message.content}</p>
          {Boolean(message.advice?.sources.length) && <div className="muse-sources" aria-label={label("Sources", "参考来源")}>
            <span><BookOpen size={12} />{label("Sources", "参考来源")}</span>
            {message.advice?.sources.map((source) => source.url
              ? <a href={source.url} key={source.id} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>
              : <span key={source.id} className="muse-guide-source">{source.title}</span>)}
          </div>}
          {message.advice?.suggestedStage && <button type="button" className="muse-next" onClick={() => onNavigate(message.advice!.suggestedStage!)}>{label("Open", "前往")} {stageNames[message.advice.suggestedStage][language === "zh" ? 1 : 0]}<ArrowRight size={14} /></button>}
        </article>)}
        {pending && <><article className="muse-message user"><span className="muse-speaker">{label("You", "你")}</span><p>{pending}</p></article><div className="muse-thinking" role="status"><LoaderCircle size={17} className="spin" />{label("Muse Thinking", "缪斯思考中")}</div></>}
      </div>
      {error && <div className="muse-error" role="alert">{error}</div>}
      <form className="agent-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <input ref={fileRef} type="file" hidden accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg,.flac" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void transcribe(file); }} />
        <button type="button" className="square-button" disabled={busy} onClick={() => fileRef.current?.click()} aria-label={transcribing ? label("Transcribing audio", "音频转写中") : label("Transcribe an audio file", "转写音频文件")} title={label("Transcribe audio to text", "音频转成文字")}>
          {transcribing ? <LoaderCircle size={18} className="spin" /> : <Mic size={18} />}
        </button>
        <textarea ref={inputRef} rows={2} value={input} readOnly={busy} maxLength={4000} aria-label={label("Message to Muse", "向缪斯提问")} placeholder={label("Ask about this dessert…", "询问这个甜点…")}
          onChange={(event) => { setInput(event.target.value); setFailed(false); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
        <button className="square-button send" type="submit" disabled={busy || !input.trim() || input.trim().length > 4000} aria-label={failed ? label("Retry question", "重试提问") : label("Send", "发送")}>
          {pending ? <LoaderCircle size={18} className="spin" /> : failed ? <RotateCcw size={18} /> : <Send size={18} />}
        </button>
      </form>
      <div className="muse-footnote">{input.length > 3500 ? `${input.length} / 4000 · ` : ""}{label("Sends current workspace text to AI. Chat clears on refresh.", "向 AI 发送当前工作区文字，刷新后清除对话。")}</div>
    </aside>
  );
}
