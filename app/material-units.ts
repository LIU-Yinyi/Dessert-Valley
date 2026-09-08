export const MATERIAL_UNITS = ["mg", "g", "kg", "lb", "oz", "piece", "bar"] as const;

const gramsPerUnit: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  lb: 453.59237,
  oz: 28.349523125,
};

const standardAliases: Record<string, string> = {
  mg: "mg", milligram: "mg", milligrams: "mg", 毫克: "mg",
  g: "g", gram: "g", grams: "g", 克: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg", 千克: "kg", 公斤: "kg",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb", 磅: "lb",
  oz: "oz", ounce: "oz", ounces: "oz", 盎司: "oz",
  piece: "piece", pieces: "piece", pc: "piece", pcs: "piece", 个: "piece",
  bar: "bar", bars: "bar",
};

export function normalizeMaterialUnit(unit: string) {
  const trimmed = unit.trim();
  return Object.hasOwn(standardAliases, trimmed.toLowerCase())
    ? standardAliases[trimmed.toLowerCase()]
    : trimmed;
}

export function materialGroupKey(name: string, unit: string) {
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, " ");
  const normalizedUnit = normalizeMaterialUnit(unit);
  if (!normalizedName || !normalizedUnit) return null;
  const group = Object.hasOwn(gramsPerUnit, normalizedUnit) ? "weight" : normalizedUnit;
  return JSON.stringify([normalizedName, Object.hasOwn(gramsPerUnit, normalizedUnit) ? "mass" : "unit", group]);
}

export function convertMaterialAmount(amount: number, from: string, to: string): number | null {
  const source = normalizeMaterialUnit(from);
  const target = normalizeMaterialUnit(to);
  if (!Number.isFinite(amount) || amount < 0 || !source || !target) return null;
  if (source === target) return amount;
  if (!Object.hasOwn(gramsPerUnit, source) || !Object.hasOwn(gramsPerUnit, target)) return null;
  const converted = amount * gramsPerUnit[source] / gramsPerUnit[target];
  return Number.isFinite(converted) ? converted : null;
}

// Stored prices are per unit. Reuse a compatible saved price without changing its basis.
export function compatibleMaterialPrice(prices: Record<string, number>, name: string, unit: string) {
  const prefix = `${name.trim().toLowerCase().replace(/\s+/g, " ")}::`;
  for (const [key, price] of Object.entries(prices)) {
    if (!key.startsWith(prefix) || !Number.isFinite(price) || price < 0) continue;
    const factor = convertMaterialAmount(1, unit, key.slice(prefix.length));
    if (factor !== null && Number.isFinite(price * factor)) return price * factor;
  }
  return 0;
}

type Material = { name: string; amount: string; unit: string; note: string };

function numericAmount(value: string) {
  const text = value.trim().replace(",", ".");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

// Keep the first row's identity and unit, and never treat an unknown amount as zero.
export function consolidateMaterials<T extends Material>(rows: readonly T[]): T[] {
  const result: T[] = [];
  const positions = new Map<string, number>();
  for (const source of rows) {
    const row = { ...source, unit: normalizeMaterialUnit(source.unit) };
    const key = materialGroupKey(row.name, row.unit);
    const amount = numericAmount(row.amount);
    const index = key && amount !== null ? positions.get(key) : undefined;
    const existing = index === undefined ? undefined : result[index];
    const converted = existing && amount !== null
      ? convertMaterialAmount(amount, row.unit, existing.unit)
      : null;
    const total = existing && converted !== null ? Number(existing.amount) + converted : NaN;
    if (existing && Number.isFinite(total)) {
      existing.amount = String(Number(total.toPrecision(15)));
      existing.note = [...new Set([existing.note.trim(), row.note.trim()].filter(Boolean))].join("; ");
    } else {
      if (key && amount !== null) positions.set(key, result.length);
      if (amount !== null) row.amount = String(amount);
      result.push(row);
    }
  }
  return result;
}
