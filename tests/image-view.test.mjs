import assert from "node:assert/strict";
import { test } from "node:test";
import { INITIAL_IMAGE_VIEW, panImageBy, wheelZoomFactor, zoomImageAt } from "../app/image-view.ts";

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("zoom preserves the image point under the cursor after panning", () => {
  const view = { scale: 2, x: -180, y: 70 };
  for (const point of [{ x: 0, y: 0 }, { x: 420, y: 310 }, { x: 73, y: 251 }]) {
    const next = zoomImageAt(view, point, 1.4);
    near((point.x - next.x) / next.scale, (point.x - view.x) / view.scale);
    near((point.y - next.y) / next.scale, (point.y - view.y) / view.scale);
    const restored = zoomImageAt(next, point, 1 / 1.4);
    near(restored.scale, view.scale);
    near(restored.x, view.x);
    near(restored.y, view.y);
  }
});

test("zoom limits keep the cursor anchor stable without drifting at the limit", () => {
  const point = { x: 250, y: 120 };
  const maximum = zoomImageAt(INITIAL_IMAGE_VIEW, point, 100);
  assert.equal(maximum.scale, 8);
  assert.deepEqual(zoomImageAt(maximum, point, 2), maximum);
  const minimum = zoomImageAt(INITIAL_IMAGE_VIEW, point, 0.001);
  assert.equal(minimum.scale, 0.5);
  assert.deepEqual(zoomImageAt(minimum, point, 0.5), minimum);
  assert.deepEqual(zoomImageAt(INITIAL_IMAGE_VIEW, point, NaN), INITIAL_IMAGE_VIEW);
});

test("panning uses screen pixels at any zoom and leaves the reset view unchanged", () => {
  const view = zoomImageAt(INITIAL_IMAGE_VIEW, { x: 120, y: 240 }, 3);
  const moved = panImageBy(view, 30, -55);
  assert.equal(moved.x - view.x, 30);
  assert.equal(moved.y - view.y, -55);
  assert.equal(moved.scale, 3);
  assert.deepEqual(INITIAL_IMAGE_VIEW, { scale: 1, x: 0, y: 0 });
});

test("wheel supports pixel, line, and page deltas with bounded zoom steps", () => {
  assert.ok(wheelZoomFactor(-100, 0, 400) > 1);
  assert.ok(wheelZoomFactor(100, 0, 400) < 1);
  assert.equal(wheelZoomFactor(1, 1, 400), wheelZoomFactor(16, 0, 400));
  assert.equal(wheelZoomFactor(1, 2, 400), wheelZoomFactor(400, 0, 400));
  assert.ok(Number.isFinite(wheelZoomFactor(-1e10, 0, 400)));
  assert.equal(wheelZoomFactor(0, 0, 400), 1);
});
