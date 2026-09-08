import { loadBrowserApiConfig, transcribeAudioToText as transcribe } from "./browser-ai.ts";

export function transcribeAudioToText(source: {
  content: string;
  filename: string;
  mimeType: string;
}, signal?: AbortSignal) {
  return transcribe(loadBrowserApiConfig(), source, signal);
}
