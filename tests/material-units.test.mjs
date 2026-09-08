import assert from "node:assert/strict";
import { test } from "node:test";
import { compatibleMaterialPrice, consolidateMaterials, convertMaterialAmount, materialGroupKey, normalizeMaterialUnit } from "../app/material-units.ts";

const row = (id, amount, unit, name = "Sugar", note = "") => ({ id, name, amount, unit, note });

test("converts all weight units while keeping the first row's chosen unit and identity", () => {
  assert.deepEqual(consolidateMaterials([
    row(1, "1", "kg"), row(2, "250", "g"), row(3, "500", "mg"),
  ]), [row(1, "1.2505", "kg")]);
  assert.deepEqual(consolidateMaterials([row(1, "1", "lb"), row(2, "16", "oz")]), [row(1, "2", "lb")]);
  assert.equal(convertMaterialAmount(1, "lb", "g"), 453.59237);
  assert.equal(convertMaterialAmount(1, "oz", "mg"), 28349.523125);
  assert.equal(convertMaterialAmount(1000, "mg", "g"), 1);
  assert.equal(convertMaterialAmount(0.001, "g", "mg"), 1);
});

test("combines only the same material and compatible units, preserving distinct custom units", () => {
  const inputs = [row(1, "2", "piece"), row(2, "3", "piece"), row(3, "1", "bar"),
    row(4, "2", "bar"), row(5, "10", "g"), row(6, "2", "box"), row(7, "1", "box"),
    row(8, "2", "Box"), row(9, "1", "bag"), row(10, "1", "ml"), row(11, "1", "l"),
    row(12, "1", "kg", "Brown sugar")];
  assert.deepEqual(consolidateMaterials(inputs), [row(1, "5", "piece"), row(3, "3", "bar"),
    row(5, "10", "g"), row(6, "3", "box"), ...inputs.slice(7)]);
  for (const [from, to] of [["g", "piece"], ["piece", "bar"], ["box", "bag"], ["Box", "box"], ["ml", "l"], ["", ""]]) {
    assert.equal(convertMaterialAmount(1, from, to), null);
  }
});

test("normalizes standard aliases and names without guessing equivalence between ingredients", () => {
  assert.deepEqual(consolidateMaterials([row(1, "250", "grams", "Sugar"),
    row(2, "0.25", "公斤", " sugar "), row(3, "10", "g", "Brown sugar")]),
  [row(1, "500", "g"), row(3, "10", "g", "Brown sugar")]);
  assert.equal(normalizeMaterialUnit("  Handful  "), "Handful");
  assert.equal(materialGroupKey(" Sugar ", "kg"), materialGroupKey("sugar", "mg"));
  assert.notEqual(materialGroupKey("Sugar", "g"), materialGroupKey("Brown sugar", "g"));
  assert.notEqual(materialGroupKey("Sugar", "weight"), materialGroupKey("Sugar", "g"));
  assert.equal(normalizeMaterialUnit("constructor"), "constructor");
  assert.equal(convertMaterialAmount(1, "constructor", "g"), null);
});

test("keeps missing or invalid amounts and units separate without losing notes or changing input", () => {
  const inputs = [row(1, "0,5", "kg", "Sugar", "base"), row(2, "250", "g", "Sugar", "topping"),
    row(3, "", "g"), row(4, "unknown", "g"), row(5, "2", ""), row(6, "3", ""),
    row(7, "-1", "g")];
  const snapshot = structuredClone(inputs);
  const result = consolidateMaterials(inputs);
  assert.deepEqual(result, [row(1, "0.75", "kg", "Sugar", "base; topping"), ...inputs.slice(2)]);
  assert.deepEqual(inputs, snapshot);
  assert.equal(convertMaterialAmount(Infinity, "g", "kg"), null);
  assert.deepEqual(consolidateMaterials([row(1, "0.1", "g"), row(2, "0.2", "g")]), [row(1, "0.3", "g")]);
});

test("scales production amounts before converting to the consolidated row's unit", () => {
  const gramsForTwoBatches = convertMaterialAmount(250 * 2, "g", "g");
  const kilogramsForVariant = convertMaterialAmount(0.5 * 3 * 2, "kg", "g");
  assert.equal(gramsForTwoBatches + kilogramsForVariant, 3500);
  assert.equal(convertMaterialAmount(3500, "g", "kg"), 3.5);
});

test("converts saved unit prices with quantities and never prices incompatible units", () => {
  assert.equal(compatibleMaterialPrice({ "sugar::kg": 10 }, "Sugar", "g"), 0.01);
  assert.equal(compatibleMaterialPrice({ "sugar::g": 0.01 }, "Sugar", "kg"), 10);
  assert.equal(compatibleMaterialPrice({ "sugar::lb": 16 }, "Sugar", "oz"), 1);
  assert.equal(compatibleMaterialPrice({ "sugar::kg": 10 }, "Sugar", "box"), 0);
  assert.equal(compatibleMaterialPrice({ "sugar::box": 3 }, "Sugar", "box"), 3);
  assert.equal(compatibleMaterialPrice({ "sugar::box": 3 }, "Sugar", "Box"), 0);
  assert.equal(compatibleMaterialPrice({ "sugar::kg": 10 }, "Brown sugar", "g"), 0);
  assert.equal(3500 * compatibleMaterialPrice({ "sugar::kg": 10 }, "Sugar", "g"), 35);
});
