import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { startAudioLevelMeter } from "../app/audio-level-meter.ts";

const originals = {
  AudioContext: globalThis.AudioContext,
  requestAnimationFrame: globalThis.requestAnimationFrame,
  cancelAnimationFrame: globalThis.cancelAnimationFrame,
};
afterEach(() => {
  for (const [key, value] of Object.entries(originals)) {
    if (value === undefined) delete globalThis[key];
    else globalThis[key] = value;
  }
});

test("meter follows microphone samples and releases resources without stopping the recorder's stream", () => {
  let sampleValue = 128;
  let callback;
  let cancelled = false;
  let disconnected = 0;
  let closed = 0;
  const stream = {};
  globalThis.requestAnimationFrame = (fn) => { callback = fn; return 7; };
  globalThis.cancelAnimationFrame = (id) => { assert.equal(id, 7); cancelled = true; };
  globalThis.AudioContext = class {
    createMediaStreamSource(value) {
      assert.equal(value, stream);
      return { connect() {}, disconnect() { disconnected++; } };
    }
    createAnalyser() {
      return { fftSize: 0, getByteTimeDomainData(data) { data.fill(sampleValue); }, disconnect() { disconnected++; } };
    }
    async resume() {}
    async close() { closed++; }
  };
  const levels = [];
  const stop = startAudioLevelMeter(stream, (level) => levels.push(level));
  callback(100);
  assert.equal(levels[0], 0);
  sampleValue = 140;
  callback(200);
  assert.ok(levels[1] > 0 && levels[1] < 1);
  sampleValue = 255;
  callback(300);
  assert.equal(levels[2], 1);
  sampleValue = 128;
  callback(400);
  assert.ok(levels[3] < levels[2]);
  stop();
  stop();
  callback(500);
  assert.equal(levels.length, 4);
  assert.equal(cancelled, true);
  assert.equal(disconnected, 2);
  assert.equal(closed, 1);
});

test("meter closes its audio context if initialization fails", () => {
  let closed = false;
  globalThis.AudioContext = class {
    createMediaStreamSource() { throw new Error("unsupported stream"); }
    async close() { closed = true; }
  };
  assert.throws(() => startAudioLevelMeter({}, () => {}), /unsupported stream/);
  assert.equal(closed, true);
});
