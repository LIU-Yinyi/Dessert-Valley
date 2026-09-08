export async function transcribeAudioToText(source: {
  content: string;
  filename: string;
  mimeType: string;
}, signal?: AbortSignal) {
  const response = await fetch("/api/audio-transcription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(source),
    signal,
  });
  const payload = (await response.json().catch(() => null)) as {
    text?: unknown;
    error?: { code?: string };
  } | null;
  if (!response.ok || typeof payload?.text !== "string" || !payload.text.trim()) {
    throw new Error(payload?.error?.code || "transcription_failed");
  }
  return payload.text.trim();
}
