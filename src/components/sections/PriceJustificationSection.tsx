"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

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

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function PriceJustificationSection() {
  return (
    <section className="relative bg-charcoal py-16 sm:py-24 lg:py-28 overflow-hidden">
      {/* Ambient glow behind the SSC column */}
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[130px] translate-x-1/4" />
      </div>

      <div className="container-app relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-2xl mx-auto text-center mb-10 sm:mb-14"
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/30 font-medium mb-5">
            The math
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.15] tracking-tight mb-5">
            Better samples. A fraction of the price.
          </h2>
          <p className="text-white/45 text-base sm:text-lg leading-relaxed">
            One pack of 25+ pre-cleared samples elsewhere costs $30 to $70.
            <br />
            Here, you start for $0.99.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[1.2fr_1fr_1fr] gap-2 sm:gap-3 mb-3">
            <div />
            <div className="text-center">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/30 font-medium">
                Everywhere else
              </span>
            </div>
            <div className="text-center">
              <span className="inline-block text-[10px] sm:text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                Soul Sample Club
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white/[0.02]">
            {ROWS.map((row, i) => (
              <motion.div
                key={row.label}
                variants={rowVariants}
                className={`grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[1.2fr_1fr_1fr] items-center gap-2 sm:gap-3 px-3 sm:px-5 py-4 ${
                  i !== ROWS.length - 1 ? "border-b border-white/[0.06]" : ""
                }`}
              >
                <span className="text-[13px] sm:text-sm text-white/60 font-medium">
                  {row.label}
                </span>
                <div className="flex items-center justify-center gap-1.5 text-center">
                  <X className="w-3.5 h-3.5 text-white/20 flex-shrink-0 hidden sm:block" />
                  <span className="text-[12px] sm:text-sm text-white/35 line-through decoration-white/20">
                    {row.elsewhere}
                  </span>
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.1 + i * 0.05 }}
                  className="flex items-center justify-center gap-1.5 text-center bg-emerald-500/[0.08] rounded-lg px-3 py-1.5 -my-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-[12px] sm:text-sm text-white font-semibold">
                    {row.ssc}
                  </span>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
