import { Check, X } from "lucide-react";
import { GlassBox, Section, SectionHead } from "@/components/ssc/Glass";

// Used on /subscribe only. The comparison sits in one glass box; the Soul
// Sample Club column is the lit one.

const ROWS = [
  { label: "Starting price", elsewhere: "$30–70 per pack", ssc: "$0.99" },
  { label: "Sound", elsewhere: "Overused, generic", ssc: "Original & exclusive" },
  { label: "Audience", elsewhere: "Millions of users", ssc: "Capped at 5,000" },
  { label: "Clearance", elsewhere: "$5k–$100k+ risk", ssc: "Always included" },
  { label: "Stems", elsewhere: "Rarely included", ssc: "Every release" },
  { label: "Made by", elsewhere: "AI or stock libraries", ssc: "Real composers" },
  { label: "New material", elsewhere: "One and done", ssc: "Every week" },
  { label: "After you cancel", elsewhere: "Access revoked", ssc: "Yours, forever" },
];

export function PriceJustificationSection({ glow }: { glow?: string }) {
  return (
    <Section>
      <SectionHead
        pill="The math"
        title="Better samples. A fraction of the price."
        body={
          <>
            One pack of 25+ pre-cleared samples elsewhere costs $30 to $70.
            <br />
            Here, you start for $0.99.
          </>
        }
        align="center"
        className="mb-12 [text-wrap:balance]"
      />

      <GlassBox glow={glow} className="mx-auto max-w-3xl overflow-hidden rounded-[28px] p-2 sm:p-3">
        {/* Column headers */}
        <div className="grid grid-cols-[0.9fr_1fr_1fr] items-end gap-2 px-3 pb-3 pt-4 sm:grid-cols-[1.2fr_1fr_1fr] sm:gap-3 sm:px-5">
          <div />
          <p className="ssc-label text-center !text-[10px] sm:!text-[11px]">Everywhere else</p>
          <p className="ssc-label text-center !text-[10px] !text-white sm:!text-[11px]">Soul Sample Club</p>
        </div>

        <div className="divide-y divide-white/[0.07]">
          {ROWS.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[0.9fr_1fr_1fr] items-center gap-2 px-3 py-4 sm:grid-cols-[1.2fr_1fr_1fr] sm:gap-3 sm:px-5"
            >
              <span className="text-[12px] font-medium text-white/75 sm:text-[14px]">{row.label}</span>
              <div className="flex items-center justify-center gap-1.5 text-center">
                <X className="hidden h-3.5 w-3.5 flex-shrink-0 text-white/55 sm:block" />
                <span className="text-[12px] text-white/55 line-through decoration-white/30 sm:text-[14px]">{row.elsewhere}</span>
              </div>
              <div className="-my-1.5 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-2 py-1.5 text-center sm:px-3">
                <Check className="hidden h-3.5 w-3.5 flex-shrink-0 text-white sm:block" />
                <span className="text-[12px] font-semibold text-white sm:text-[14px]">{row.ssc}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassBox>
    </Section>
  );
}
