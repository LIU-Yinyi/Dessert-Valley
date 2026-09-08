const MAX_REQUEST_BYTES = 26 * 1024 * 1024;
const MAX_AUDIO_BYTES = 18 * 1024 * 1024;
const MAX_TEXT_LENGTH = 16_000;
const audioMimeTypes = new Set([
  "audio/flac", "audio/m4a", "audio/mp3", "audio/mp4", "audio/mpeg",
  "audio/mpga", "audio/ogg", "audio/wav", "audio/webm", "audio/x-m4a",
  "audio/x-wav", "video/mp4", "video/webm",
]);

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function failure(code: string, status: number) {
  return json({ error: { code } }, status);
}

function parseAudio(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const source = value as { content?: unknown; filename?: unknown; mimeType?: unknown };
  if (typeof source.content !== "string") return null;
  const match = /^data:([^;,]+);base64,([a-z0-9+/=\r\n]+)$/i.exec(source.content);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const declaredType = typeof source.mimeType === "string"
    ? source.mimeType.toLowerCase().split(";")[0].trim()
    : "";
  const encoded = match[2].replace(/\s/g, "");
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  const byteLength = Math.floor(encoded.length * 3 / 4) - padding;
  if (
    !audioMimeTypes.has(mimeType) || byteLength <= 0 || byteLength > MAX_AUDIO_BYTES ||
    (declaredType && declaredType !== mimeType)
  ) return null;

  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const filename = typeof source.filename === "string"
      ? source.filename.replace(/[\r\n/\\]/g, "_").trim().slice(0, 180)
      : "";
    return {
      audio: new Blob([bytes], { type: mimeType }),
      filename: filename || "voice-note.webm",
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    return failure("invalid_request", 415);
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES) {
    return failure("invalid_request", 413);
  }

  let body: unknown;
  try {
    // Bound streamed requests as well as requests carrying Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return failure("invalid_request", 400);
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return failure("invalid_request", 413);
      }
      chunks.push(chunk.value);
    }
    body = JSON.parse(await new Blob(chunks).text());
  } catch {
    return failure("invalid_request", 400);
  }
  const source = parseAudio(body);
  if (!source) return failure("invalid_request", 400);

  let cloudflareEnv: { OPENAI_API_KEY?: string } = {};
  try {
    const runtime = await import("cloudflare:workers");
    cloudflareEnv = runtime.env as unknown as { OPENAI_API_KEY?: string };
  } catch {
    // Local validation uses the process environment instead of Worker bindings.
  }
  const apiKey = (cloudflareEnv.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "").trim();
  if (!apiKey) return failure("not_configured", 503);

  const form = new FormData();
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("response_format", "json");
  form.append("file", source.audio, source.filename);
  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch {
    return failure("transcription_failed", 503);
  }
  const payload = (await upstream.json().catch(() => null)) as {
    text?: unknown;
    error?: { code?: unknown; message?: unknown };
  } | null;
  if (!upstream.ok) {
    if (upstream.status === 401 || upstream.status === 403) return failure("not_configured", 503);
    if (upstream.status === 429) return failure("rate_limit", 429);
    const errorText = [payload?.error?.code, payload?.error?.message]
      .filter((value): value is string => typeof value === "string").join(" ");
    if (/safety|moderation/i.test(errorText)) return failure("transcription_blocked", 422);
    return failure("transcription_failed", 502);
  }
  if (typeof payload?.text !== "string") return failure("transcription_failed", 502);
  const text = payload.text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
  return text ? json({ text }) : failure("empty_transcription", 422);
}
