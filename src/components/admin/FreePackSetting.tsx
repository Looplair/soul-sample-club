"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { setFreePack } from "@/app/actions/free-pack";

interface Option {
  id: string;
  name: string;
  archived: boolean;
}

// Pick the pack /free gives away. Only real packs with a ZIP are offered.
export function FreePackSetting({ options, current }: { options: Option[]; current: string | null }) {
  const [value, setValue] = useState(current ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const res = await setFreePack(value || null);
    setSaving(false);
    setMessage(res.ok ? { ok: true, text: value ? "Saved. /free now gives away this pack." : "Saved. /free is switched off." } : { ok: false, text: res.error ?? "Couldn't save" });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        The pack people get for signing up on the free pack page. Only real releases with a ZIP uploaded can be chosen. Leave it empty to
        switch the page off.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <select className="input !rounded-xl sm:max-w-sm" value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">No free pack (page off)</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.archived ? " (archived)" : ""}
            </option>
          ))}
        </select>
        <button type="button" onClick={save} disabled={saving} className="btn-primary flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
        {current && (
          <Link href="/free" target="_blank" className="inline-flex items-center gap-1.5 self-center text-sm text-text-muted hover:text-white">
            <ExternalLink className="h-4 w-4" /> View page
          </Link>
        )}
      </div>
      {message && <p className={`text-sm ${message.ok ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>}
      {options.length === 0 && <p className="text-sm text-yellow-200/80">No real packs have a ZIP yet. Upload one in the pack editor first.</p>}
    </div>
  );
}
