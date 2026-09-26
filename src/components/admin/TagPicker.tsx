"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagPickerProps {
  label: string;
  hint?: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

// Tappable chips, pick as many as fit, plus "add your own"
export function TagPicker({ label, hint, options, value, onChange }: TagPickerProps) {
  const [custom, setCustom] = useState("");
  const all = [...options, ...value.filter((v) => !options.some((o) => o.toLowerCase() === v.toLowerCase()))];
  const selected = (tag: string) => value.some((v) => v.toLowerCase() === tag.toLowerCase());

  const toggle = (tag: string) =>
    onChange(selected(tag) ? value.filter((v) => v.toLowerCase() !== tag.toLowerCase()) : [...value, tag]);

  const addCustom = () => {
    const tag = custom.trim().replace(/\s+/g, " ");
    if (!tag) return;
    const existing = all.find((t) => t.toLowerCase() === tag.toLowerCase());
    if (!selected(existing ?? tag)) onChange([...value, existing ?? tag]);
    setCustom("");
  };

  return (
    <div>
      <label className="label">{label}</label>
      {hint && <p className="text-caption text-snow/40 -mt-1 mb-3">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {all.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              selected(tag)
                ? "border-white bg-white text-charcoal font-medium"
                : "border-grey-700 text-snow/70 hover:border-white/40 hover:text-white"
            )}
          >
            {selected(tag) && <Check className="h-3.5 w-3.5" />}
            {tag}
          </button>
        ))}
        <div className="inline-flex items-center rounded-full border border-dashed border-grey-700 pl-3.5 pr-1 focus-within:border-white/40">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Add your own"
            className="w-28 bg-transparent py-1.5 text-sm text-white outline-none placeholder:text-snow/40"
          />
          <button type="button" onClick={addCustom} aria-label="Add tag" className="rounded-full p-1 text-snow/60 hover:text-white">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
