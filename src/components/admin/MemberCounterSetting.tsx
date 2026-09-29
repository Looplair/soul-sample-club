"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { setPatreonMemberCount } from "@/app/actions/free-pack";

// The homepage "X of 5,000 spots taken" counter. Stripe members are counted
// automatically; Patreon members come from this box.
export function MemberCounterSetting({ stripe, linked, manual, cap }: { stripe: number; linked: number; manual: number | null; cap: number }) {
  const [value, setValue] = useState(manual != null ? String(manual) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const patreon = value.trim() ? Number(value) : linked;
  const total = stripe + (Number.isFinite(patreon) ? patreon : 0);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const res = await setPatreonMemberCount(value.trim() ? Number(value) : null);
    setSaving(false);
    setMessage(res.ok ? { ok: true, text: "Saved. The counter updates within a few minutes." } : { ok: false, text: res.error ?? "Couldn't save" });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        The public counter shows real members out of {cap.toLocaleString()}. Stripe members are counted automatically ({stripe}). Enter your
        Patreon member total from the Patreon dashboard, since most patrons never link an account here. Left empty, it uses the {linked} who
        have linked.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder={`Patreon members (linked: ${linked})`}
          className="input !rounded-xl sm:max-w-xs"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="button" onClick={save} disabled={saving} className="btn-primary flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
        <span className="text-sm text-text-muted">
          Counter will show <span className="font-semibold text-white">{total.toLocaleString()}</span> of {cap.toLocaleString()}
        </span>
      </div>
      {message && <p className={`text-sm ${message.ok ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>}
    </div>
  );
}
