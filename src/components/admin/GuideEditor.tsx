"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Trash2,
  Heading2,
  Bold,
  Link2,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  PenLine,
  Music2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import type { GuidePack } from "@/components/guides/GuidePackEmbed";
import { saveGuide, deleteGuide, type GuideInput } from "@/app/actions/guides";
import { GUIDE_CLUSTERS, getGuideChecks, slugify, type Guide, type GuideCluster } from "@/lib/guide-utils";

interface GuideEditorProps {
  guide?: Guide;
  packs: GuidePack[];
  otherGuides: { slug: string; title: string }[];
}

const EMPTY: GuideInput = {
  slug: "",
  cluster: "Sample clearance",
  isPillar: false,
  published: false,
  title: "",
  seoTitle: null,
  description: "",
  lead: "",
  body: "",
  keyTakeaways: [""],
  faqs: [],
  sources: [],
  related: [],
};

const SNIPPETS = [
  { label: "Heading", icon: Heading2, text: "\n## Section heading\n\n" },
  { label: "Bold", icon: Bold, text: "**bold text**" },
  { label: "Link", icon: Link2, text: "[link text](/subscribe)" },
  { label: "Tip", icon: Lightbulb, text: "\n> [!TIP] Your tip here.\n\n" },
  { label: "Watch out", icon: AlertTriangle, text: "\n> [!WARNING] What to watch out for.\n\n" },
  { label: "SSC way", icon: Sparkles, text: "\n> [!SSC] How Soul Sample Club does it.\n\n" },
  { label: "Chris box", icon: PenLine, text: "\n> [!CHRIS] Note to self: what to write here.\n\n" },
];

export function GuideEditor({ guide, packs, otherGuides }: GuideEditorProps) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const initial = useMemo<GuideInput>(
    () => (guide ? { ...guide, keyTakeaways: guide.keyTakeaways.length ? guide.keyTakeaways : [""] } : EMPTY),
    [guide]
  );
  const [form, setForm] = useState<GuideInput>(initial);
  const [slugTouched, setSlugTouched] = useState(!!guide);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState<null | "save" | "publish" | "unpublish" | "delete">(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [saved, setSaved] = useState<GuideInput>(initial);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const checks = getGuideChecks(form);
  const blocking = checks.filter((c) => c.level === "block");
  const packMap = useMemo(() => Object.fromEntries(packs.map((p) => [p.id, p])), [packs]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof GuideInput>(key: K, value: GuideInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const insert = (text: string) => {
    const el = bodyRef.current;
    if (!el) return set("body", form.body + text);
    const { selectionStart: start, selectionEnd: end } = el;
    const next = form.body.slice(0, start) + text + form.body.slice(end);
    set("body", next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + text.length;
    });
  };

  const submit = async (action: "save" | "publish" | "unpublish") => {
    setSaving(action);
    setMessage(null);
    const published = action === "publish" ? true : action === "unpublish" ? false : form.published;
    const result = await saveGuide({ ...form, id: guide?.id, published });
    setSaving(null);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    const next = { ...form, published, slug: result.slug };
    setForm(next);
    setSaved(next);
    setMessage({
      kind: "ok",
      text: action === "publish" ? "Published. It's live on the site." : action === "unpublish" ? "Unpublished. It's now a draft." : "Saved.",
    });
    if (!guide) router.replace(`/admin/guides/${result.id}`);
    else router.refresh();
  };

  const remove = async () => {
    if (!guide || !confirm(`Delete "${guide.title}"? This can't be undone.`)) return;
    setSaving("delete");
    const result = await deleteGuide(guide.id);
    setSaving(null);
    if (!result.ok) return setMessage({ kind: "error", text: result.error ?? "Couldn't delete" });
    router.replace("/admin/guides");
  };

  const googleTitle = `${form.seoTitle || form.title || "Guide title"} | Soul Sample Club`;

  return (
    <div className="max-w-7xl">
      {/* Top bar */}
      <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 mb-6 border-b border-grey-700 bg-charcoal/95 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/guides" className="text-text-muted hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{form.title || "New guide"}</p>
            <p className="text-xs text-text-subtle">
              {form.published ? "Published" : "Draft"}
              {dirty && " · Unsaved changes"}
            </p>
          </div>
          {guide && (
            <Link
              href={`/guides/${guide.slug}`}
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-white"
            >
              <ExternalLink className="h-4 w-4" /> View
            </Link>
          )}
          <button type="button" onClick={() => submit("save")} disabled={!!saving} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
            {saving === "save" && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
          {form.published ? (
            <button type="button" onClick={() => submit("unpublish")} disabled={!!saving} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
              {saving === "unpublish" && <Loader2 className="h-4 w-4 animate-spin" />} Unpublish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit("publish")}
              disabled={!!saving || blocking.length > 0}
              title={blocking.length ? blocking.map((b) => b.message).join("\n") : undefined}
              className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-40"
            >
              {saving === "publish" && <Loader2 className="h-4 w-4 animate-spin" />} Publish
            </button>
          )}
        </div>
        {message && (
          <p className={`mt-2 text-sm ${message.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>
        )}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8 min-w-0">
          {/* Basics */}
          <Section title="Basics">
            <Field label="Title" hint="The headline on the page.">
              <input
                className="input"
                value={form.title}
                onChange={(e) => {
                  set("title", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
                placeholder="How much does it cost to clear a sample?"
              />
            </Field>
            <Field
              label="Web address"
              hint={guide?.published ? "Changing this breaks links people have already shared or Google has saved." : undefined}
            >
              <div className="flex items-center rounded-xl border border-grey-700 bg-grey-900 focus-within:border-white/40">
                <span className="pl-3 text-sm text-text-subtle">/guides/</span>
                <input
                  className="w-full bg-transparent px-1 py-2.5 text-white outline-none"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                />
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Section">
                <select className="input" value={form.cluster} onChange={(e) => set("cluster", e.target.value as GuideCluster)}>
                  {GUIDE_CLUSTERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-3 self-end rounded-xl border border-grey-700 px-4 py-3 text-sm text-white">
                <input type="checkbox" checked={form.isPillar} onChange={(e) => set("isPillar", e.target.checked)} />
                Main guide for this section
              </label>
            </div>
          </Section>

          {/* Google */}
          <Section title="How it shows on Google">
            <Field label="Google title" hint="Leave blank to use the headline." count={googleTitle.length} max={60}>
              <input className="input" value={form.seoTitle ?? ""} onChange={(e) => set("seoTitle", e.target.value || null)} placeholder={form.title} />
            </Field>
            <Field label="Search description" hint="The grey text under the link in Google. Also used on the Guides page." count={form.description.length} max={155}>
              <textarea className="input !rounded-2xl min-h-[80px]" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </Section>

          {/* Intro */}
          <Section title="Intro">
            <Field label="Opening paragraph" hint="Shown large under the headline.">
              <textarea className="input !rounded-2xl min-h-[90px]" value={form.lead} onChange={(e) => set("lead", e.target.value)} />
            </Field>
            <ListEditor
              label="Key takeaways"
              items={form.keyTakeaways}
              onChange={(v) => set("keyTakeaways", v)}
              placeholder="One clear point per line"
            />
          </Section>

          {/* Article */}
          <Section title="Article">
            <div className="flex items-center gap-1 rounded-xl border border-grey-700 p-1 w-fit">
              {(["write", "preview"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-4 py-1.5 text-sm capitalize ${tab === t ? "bg-white text-charcoal font-semibold" : "text-text-muted hover:text-white"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "write" ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {SNIPPETS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => insert(s.text)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-grey-700 px-2.5 py-1.5 text-xs text-text-muted hover:border-white/30 hover:text-white"
                    >
                      <s.icon className="h-3.5 w-3.5" /> {s.label}
                    </button>
                  ))}
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-grey-700 px-2.5 py-1.5 text-xs text-text-muted hover:border-white/30">
                    <Music2 className="h-3.5 w-3.5" />
                    <select
                      className="bg-transparent text-text-muted outline-none"
                      value=""
                      onChange={(e) => {
                        const p = packMap[e.target.value];
                        if (p) insert(`\n[${p.name}](pack:${p.id})\n\n`);
                      }}
                    >
                      <option value="">Add a pack…</option>
                      {packs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <textarea
                  ref={bodyRef}
                  className="input !rounded-2xl min-h-[600px] font-mono text-[13px] leading-relaxed"
                  value={form.body}
                  onChange={(e) => set("body", e.target.value)}
                  spellCheck
                />
                <p className="text-xs text-text-subtle">
                  Formatting: <code>## Heading</code>, <code>**bold**</code>, <code>[text](/link)</code>, <code>- list item</code>. Use the
                  buttons above for boxes and packs.
                </p>
              </>
            ) : (
              <div className="rounded-2xl border border-grey-700 bg-charcoal p-6 sm:p-8">
                <GuideMarkdown body={form.body} packs={packMap} />
              </div>
            )}
          </Section>

          {/* FAQ */}
          <Section title="Questions producers ask" hint="Shown at the bottom of the page. Google can show these directly in search results.">
            {form.faqs.map((f, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-grey-700 p-4">
                <div className="flex gap-2">
                  <input
                    className="input"
                    value={f.q}
                    placeholder="Question"
                    onChange={(e) => set("faqs", form.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                  />
                  <RemoveButton onClick={() => set("faqs", form.faqs.filter((_, j) => j !== i))} />
                </div>
                <textarea
                  className="input !rounded-2xl min-h-[70px]"
                  value={f.a}
                  placeholder="Answer"
                  onChange={(e) => set("faqs", form.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                />
              </div>
            ))}
            <AddButton label="Add question" onClick={() => set("faqs", [...form.faqs, { q: "", a: "" }])} />
          </Section>

          {/* Sources */}
          <Section title="Sources" hint="Listed at the bottom so readers (and Google) can see where facts come from.">
            {form.sources.map((s, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="input"
                  value={s.label}
                  placeholder="Name"
                  onChange={(e) => set("sources", form.sources.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  className="input"
                  value={s.url}
                  placeholder="https://"
                  onChange={(e) => set("sources", form.sources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                />
                <RemoveButton onClick={() => set("sources", form.sources.filter((_, j) => j !== i))} />
              </div>
            ))}
            <AddButton label="Add source" onClick={() => set("sources", [...form.sources, { label: "", url: "" }])} />
          </Section>

          {/* Related */}
          <Section title="Keep reading" hint="Other guides linked at the bottom. Only published ones show.">
            {otherGuides.length === 0 ? (
              <p className="text-sm text-text-subtle">No other guides yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {otherGuides.map((g) => (
                  <label key={g.slug} className="flex items-center gap-3 rounded-xl border border-grey-700 px-4 py-3 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={form.related.includes(g.slug)}
                      onChange={(e) =>
                        set("related", e.target.checked ? [...form.related, g.slug] : form.related.filter((s) => s !== g.slug))
                      }
                    />
                    {g.title}
                  </label>
                ))}
              </div>
            )}
          </Section>

          {guide && (
            <div className="border-t border-grey-700 pt-6">
              <button type="button" onClick={remove} disabled={!!saving} className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300">
                <Trash2 className="h-4 w-4" /> Delete guide
              </button>
            </div>
          )}
        </div>

        {/* Side panel */}
        <aside className="space-y-6 xl:sticky xl:top-36 xl:self-start">
          <div className="rounded-2xl border border-grey-700 p-5">
            <p className="text-label text-text-muted">Checks</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              {checks.length === 0 && (
                <li className="flex gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" /> Ready to publish
                </li>
              )}
              {checks.map((c) => (
                <li key={c.message} className={`flex gap-2 ${c.level === "block" ? "text-red-300" : "text-yellow-200/90"}`}>
                  {c.level === "block" ? <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                  {c.message}
                </li>
              ))}
            </ul>
            {blocking.length > 0 && <p className="mt-3 text-xs text-text-subtle">Red items must be fixed before publishing.</p>}
          </div>

          <div className="rounded-2xl border border-grey-700 p-5">
            <p className="text-label text-text-muted">Google preview</p>
            <div className="mt-3 rounded-xl bg-white p-4">
              <p className="text-xs text-[#4d5156]">soulsampleclub.com › guides › {form.slug || "…"}</p>
              <p className="mt-1 text-[17px] leading-snug text-[#1a0dab] line-clamp-1">{googleTitle}</p>
              <p className="mt-1 text-[13px] leading-snug text-[#4d5156] line-clamp-2">{form.description || "Search description goes here."}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-grey-700 p-5 text-sm text-text-muted space-y-1.5">
            <p className="text-label text-text-muted mb-2">Status</p>
            <p>
              <Badge variant={form.published ? "success" : "default"}>{form.published ? "Published" : "Draft"}</Badge>
            </p>
            {guide?.publishedAt && <p>First published {new Date(guide.publishedAt).toLocaleDateString()}</p>}
            {guide && <p>Last saved {new Date(guide.updatedAt).toLocaleString()}</p>}
            {!form.published && <p className="text-xs text-text-subtle">Drafts are only visible to admins.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-text-subtle">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, count, max, children }: { label: string; hint?: string; count?: number; max?: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="label !mb-0">{label}</span>
        {count !== undefined && max !== undefined && (
          <span className={`text-xs ${count > max ? "text-yellow-200" : "text-text-subtle"}`}>
            {count}/{max}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="mt-1.5 text-caption text-text-subtle">{hint}</p>}
    </div>
  );
}

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input className="input" value={item} placeholder={placeholder} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            <RemoveButton onClick={() => onChange(items.filter((_, j) => j !== i))} />
          </div>
        ))}
      </div>
      <div className="mt-2">
        <AddButton label="Add takeaway" onClick={() => onChange([...items, ""])} />
      </div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-white">
      <Plus className="h-4 w-4" /> {label}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove" className="flex-shrink-0 rounded-lg px-2 text-text-subtle hover:text-red-400">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
