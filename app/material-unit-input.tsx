"use client";

import { useId } from "react";
import { MATERIAL_UNITS } from "./material-units";

export default function MaterialUnitInput({ value, onChange, label, language }: {
  value: string;
  onChange: (unit: string) => void;
  label: string;
  language: "en" | "zh";
}) {
  const listId = useId();
  return (
    <>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list={listId}
        aria-label={label}
        autoComplete="off"
        placeholder={language === "zh" ? "自定义" : "Custom"}
        title={language === "zh" ? "选择单位，或输入自定义单位" : "Choose a unit or type a custom unit"}
      />
      <datalist id={listId}>
        {MATERIAL_UNITS.map((unit) => <option key={unit} value={unit} />)}
      </datalist>
    </>
  );
}
