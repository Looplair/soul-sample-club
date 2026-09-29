"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Mail, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { faqs } from "@/lib/faqs";

// ============================================
// FAQ ITEM COMPONENT
// ============================================
function FAQItem({
  question,
  answer,
  guideHref,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  guideHref?: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-grey-700/50 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-5 sm:py-6 flex items-start justify-between gap-4 text-left group"
      >
        <span className="text-base sm:text-lg font-medium text-white group-hover:text-white/90 transition-colors">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-text-muted flex-shrink-0 mt-0.5 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100 pb-5 sm:pb-6" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <p className="text-text-secondary text-sm sm:text-base leading-relaxed whitespace-pre-line pr-8">
            {answer}
          </p>
          {guideHref && (
            <Link href={guideHref} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white hover:underline">
              How sample clearance works <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN FAQ SECTION COMPONENT
// ============================================
// clearanceGuideHref is only passed once the clearance guide is published
export function FAQSection({ clearanceGuideHref }: { clearanceGuideHref?: string } = {}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Split FAQs into two columns for desktop
  const midpoint = Math.ceil(faqs.length / 2);
  const leftColumn = faqs.slice(0, midpoint);
  const rightColumn = faqs.slice(midpoint);

  return (
    <section id="faq" className="section bg-charcoal scroll-mt-20">
      <div className="container-app">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="text-sm text-white/80 font-medium">Common Questions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Everything you need to know
          </h2>
          <p className="text-text-muted max-w-2xl mx-auto">
            Clear answers about how the Soul Sample Club works, licensing, and what makes it different.
          </p>
        </div>

        {/* FAQ Grid - Two columns on desktop */}
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 lg:gap-x-12">
            {/* Left Column */}
            <div>
              {leftColumn.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  guideHref={"guideLink" in faq && faq.guideLink ? clearanceGuideHref : undefined}
                  isOpen={openIndex === index}
                  onToggle={() => handleToggle(index)}
                />
              ))}
            </div>

            {/* Right Column */}
            <div>
              {rightColumn.map((faq, index) => (
                <FAQItem
                  key={index + midpoint}
                  question={faq.question}
                  answer={faq.answer}
                  guideHref={"guideLink" in faq && faq.guideLink ? clearanceGuideHref : undefined}
                  isOpen={openIndex === index + midpoint}
                  onToggle={() => handleToggle(index + midpoint)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 px-6 py-5 rounded-2xl bg-grey-800/50 border border-grey-700">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-white font-medium mb-1">Still have questions?</p>
              <a
                href="mailto:hello@soulsampleclub.com"
                className="text-text-muted hover:text-white transition-colors"
              >
                hello@soulsampleclub.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
