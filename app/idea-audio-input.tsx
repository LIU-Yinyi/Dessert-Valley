"use client";

import { AudioLines, LoaderCircle, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { transcribeAudioToText } from "./audio-to-text";

export default function IdeaAudioInput({ language, disabled, onTranscript, onBusyChange }: {
  language: "en" | "zh";
  disabled: boolean;
  onTranscript: (text: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [status, setStatus] = useState<"idle" | "starting" | "recording" | "transcribing">("idle");
  const [error, setError] = useState("");
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const locked = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const label = (en: string, zh: string) => language === "zh" ? zh : en;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestRef.current?.abort();
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      onBusyChange(false);
    };
  }, [onBusyChange]);

  const finish = () => {
    locked.current = false;
    if (mounted.current) {
      setStatus("idle");
      onBusyChange(false);
    }
  };

  const transcribe = async (file: File) => {
    locked.current = true;
    onBusyChange(true);
    setStatus("transcribing");
    setError("");
    setRetryFile(file);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      if (!file.size || file.size > 18 * 1024 * 1024) throw new Error("invalid_request");
      const extension = file.name.toLowerCase().split(".").pop() ?? "";
      const mimeType = file.type.split(";")[0] || ({
        m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav", webm: "audio/webm",
        ogg: "audio/ogg", flac: "audio/flac", mp4: "audio/mp4",
      } as Record<string, string>)[extension] || "application/octet-stream";
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(new Blob([file], { type: mimeType }));
      });
      if (!mounted.current) return;
      const text = await transcribeAudioToText({ content, filename: file.name, mimeType }, controller.signal);
      if (!mounted.current) return;
      onTranscript(text);
      setRetryFile(null);
    } catch (caught) {
      if (!mounted.current) return;
      const code = caught instanceof Error ? caught.message : "";
      setError(code === "invalid_request"
        ? label("Choose a supported audio clip up to 18 MB.", "请选择 18 MB 以内的有效音频。")
        : code === "empty_transcription"
          ? label("No speech was recognized. Try another recording.", "没有识别到语音，请重新录制。")
          : label("Could not transcribe the audio. Your text is unchanged; try again.", "音频转写失败，原有文字已保留，请重试。"));
    } finally {
      finish();
    }
  };

  const toggleRecording = async () => {
    if (status === "recording") {
      if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      return;
    }
    if (disabled || locked.current) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(label("Recording is unavailable. Upload an audio file instead.", "当前无法录音，请上传音频文件。"));
      return;
    }
    locked.current = true;
    setStatus("starting");
    setError("");
    onBusyChange(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"]
        .find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      let failed = false;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        failed = true;
        stream.getTracks().forEach((track) => track.stop());
        if (!mounted.current) return;
        setError(label("Recording stopped unexpectedly. Please try again.", "录音意外停止，请重试。"));
        finish();
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (!mounted.current || failed) return;
        const type = (recorder.mimeType || mimeType || "audio/webm").split(";")[0];
        const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        void transcribe(new File(chunks, `idea-recording.${extension}`, { type }));
      };
      recorder.start(250);
      setStatus("recording");
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (mounted.current) setError(label("Allow microphone access or upload an audio file.", "请允许麦克风访问，或上传音频文件。"));
      finish();
    }
  };

  return (
    <div className="idea-audio-input">
      <div className="idea-audio-actions">
        <button className={`tool-chip${status === "recording" ? " recording" : ""}`} type="button"
          onClick={toggleRecording} disabled={disabled || status === "starting" || status === "transcribing"}
          aria-pressed={status === "recording"}>
          {status === "transcribing" || status === "starting" ? <LoaderCircle className="spin" size={15} />
            : status === "recording" ? <Square size={15} /> : <Mic size={15} />}
          {status === "recording" ? label("Stop & transcribe", "停止并转成文字")
            : status === "transcribing" ? label("Transcribing…", "正在转写……")
              : status === "starting" ? label("Opening microphone…", "正在打开麦克风……")
                : label("Record audio", "录制音频")}
        </button>
        <button className="tool-chip" type="button" disabled={disabled || status !== "idle"}
          onClick={() => fileInput.current?.click()}>
          <AudioLines size={15} /> {label("Upload audio", "上传音频")}
        </button>
        <input ref={fileInput} type="file" accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg,.flac" hidden
          disabled={disabled || status !== "idle"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file && !locked.current) void transcribe(file);
          }} />
      </div>
      <div aria-live="polite" className="idea-audio-feedback">
        {status === "recording" && <p>{label("Recording… Stop when you finish speaking.", "正在录音……说完后请停止录音。")}</p>}
        {error && <p role="alert">{error}</p>}
        {retryFile && error && status === "idle" && <button className="text-button" type="button"
          disabled={disabled} onClick={() => void transcribe(retryFile)}>{label("Retry transcription", "重试转写")}</button>}
      </div>
    </div>
  );
}
