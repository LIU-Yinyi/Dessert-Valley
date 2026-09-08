"use client";

import { LoaderCircle, Mic, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { transcribeAudioToText } from "./audio-to-text";
import { startAudioLevelMeter } from "./audio-level-meter";

export default function IdeaAudioInput({ language, disabled, onTranscript, onBusyChange, onError }: {
  language: "en" | "zh";
  disabled: boolean;
  onTranscript: (text: string) => void;
  onBusyChange: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "starting" | "recording" | "transcribing">("idle");
  const [level, setLevel] = useState(0);
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const locked = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const stopMeter = useRef<(() => void) | null>(null);
  const label = (en: string, zh: string) => language === "zh" ? zh : en;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestRef.current?.abort();
      stopMeter.current?.();
      stopMeter.current = null;
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
    stopMeter.current?.();
    stopMeter.current = null;
    locked.current = false;
    if (mounted.current) {
      setLevel(0);
      setStatus("idle");
      onBusyChange(false);
    }
  };

  const transcribe = async (file: File) => {
    locked.current = true;
    onBusyChange(true);
    setStatus("transcribing");
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
      if (code === "invalid_request" || code === "empty_transcription") setRetryFile(null);
      onError(code === "invalid_request"
        ? label("The recording is empty or too long. Try a shorter recording.", "录音为空或过长，请重新录制一段较短的语音。")
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
      onError(label("Recording is unavailable in this browser. You can type your idea instead.", "此浏览器暂不支持录音，请直接输入创意文字。"));
      return;
    }
    locked.current = true;
    setStatus("starting");
    setRetryFile(null);
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
      try {
        stopMeter.current = startAudioLevelMeter(stream, setLevel);
      } catch {
        // Recording remains available when this browser cannot meter audio.
      }
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
        onError(label("Recording stopped unexpectedly. Please try again.", "录音意外停止，请重试。"));
        finish();
      };
      recorder.onstop = () => {
        stopMeter.current?.();
        stopMeter.current = null;
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
      if (mounted.current) onError(label("Allow microphone access to record your idea.", "请允许麦克风访问以录制创意。"));
      finish();
    }
  };

  return (
    <div className="idea-audio-input">
        <button className={`tool-chip${status === "recording" ? " recording" : ""}`} type="button"
          onClick={() => status === "idle" && retryFile ? void transcribe(retryFile) : void toggleRecording()}
          disabled={(disabled && status !== "recording") || status === "starting" || status === "transcribing"}
          aria-pressed={status === "recording"}
          aria-label={status === "recording" ? label("Recording. Click to stop and transcribe", "正在录音，点击停止并转成文字") : undefined}
          title={status === "recording" ? label("Click to stop and transcribe", "点击停止并转成文字") : undefined}>
          {status === "transcribing" || status === "starting" ? <LoaderCircle className="spin" size={15} />
            : status === "recording" ? <span className="recording-level-icon" aria-hidden="true">
                {[0.45, 0.75, 1, 0.75, 0.45].map((weight, index) =>
                  <span key={index} style={{ height: `${3 + level * weight * 15}px` }} />)}
              </span> : retryFile ? <RotateCcw size={15} /> : <Mic size={15} />}
          <span aria-live="polite" aria-atomic="true">{status === "recording" ? label("Recording", "录音中")
            : status === "transcribing" ? label("Transcribing…", "正在转写……")
              : status === "starting" ? label("Opening microphone…", "正在打开麦克风……")
                : retryFile ? label("Retry transcription", "重试转写") : label("Record audio", "录制音频")}</span>
        </button>
    </div>
  );
}
