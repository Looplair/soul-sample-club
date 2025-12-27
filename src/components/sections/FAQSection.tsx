"use client";

import { useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// FAQ DATA
// ============================================
const faqs = [
  {
    question: "What exactly is the Soul Sample Club",
    answer:
      "The Soul Sample Club is a membership library of original soul compositions made specifically for sampling. Every sound is created in house, pre cleared, and ready for real world releases without paperwork or future clearance.",
  },
  {
    question: "Are the samples really royalty free",
    answer:
      "Yes. Every sample inside the Soul Sample Club is pre cleared and royalty free at every stage. There are no thresholds, no conditions, and no changes later if a record grows.\n\nWhat you use today stays cleared forever.",
  },
  {
    question: "Will I ever need to clear a sample later",
    answer:
      "No. There is nothing to clear now or in the future.\n\nIndependent release, label release, sync, or commercial placement. The terms never change.",
  },
  {
    question: "What makes this different from other sample platforms",
    answer:
      "Most platforms rely on recordings, third party sources, or layered licensing rules.\n\nThe Soul Sample Club is built entirely from original compositions. That means full creative control, zero clearance risk, and no surprises down the line.",
  },
  {
    question: "What kind of sounds are inside the club",
    answer:
      "The focus is soul in all its forms. Gospel, slow jams, dusty grooves, live instrumentation, and emotional textures designed to be flipped, chopped, and reworked.\n\nThese are not generic loops. They are compositions made with sampling in mind.",
  },
  {
    question: "How often is new content added",
    answer:
      "New content is currently added monthly.\n\nWe are in the process of moving to a weekly release schedule, with smaller but more frequent drops to keep the library fresh and focused.",
  },
  {
    question: "Can I use the sounds in commercial releases",
    answer:
      "Yes. You can use the sounds in commercial releases without restriction.\n\nStreaming platforms, physical releases, client work, sync, and advertising are all covered.",
  },
  {
    question: "Can major labels use these samples",
    answer:
      "Yes. There is no distinction between independent and major label use.\n\nIf a record grows or changes hands later, your usage rights remain exactly the same.",
  },
  {
    question: "Do I keep access to samples if I cancel",
    answer:
      "You keep the rights to anything you used and downloaded while you were a member.\n\nAccess to download new material stops if you cancel, but your existing releases remain fully cleared.",
  },
  {
    question: "Are the samples exclusive to members",
    answer:
      "The Soul Sample Club is the only place these compositions live.\n\nSome material rotates or expires over time, but anything available inside the club is exclusive to the membership while active.",
  },
  {
    question: "Can I download and keep the files",
    answer:
      "Yes. Files download as high quality WAVs and are yours to work with.\n\nThere is no watermarking, no locked formats, and no streaming only restrictions.",
  },
  {
    question: "Is this for beginners or experienced producers",
    answer:
      "Both.\n\nIf you are new, it removes fear around clearance and gives you confidence to release music.\nIf you are experienced, it gives you trusted material you can use without second guessing.",
  },
  {
    question: "How does the free trial work",
    answer:
      "You can explore the platform and download samples during the trial period.\n\nIf it is not for you, cancel before the trial ends and you will not be charged.",
  },
  {
    question: "Can I use the samples across multiple projects",
    answer:
      "Yes. Use them across as many songs and projects as you like.\n\nThere is no limit on how often or where you use them.",
  },
  {
    question: "Who is behind the Soul Sample Club",
    answer:
      "The Soul Sample Club is built by Looplair, a platform trusted by over 30,000 producers worldwide.\n\nThe focus has always been originality, soul, and long term trust.",
  },
  {
    question: "What happens if licensing rules change in the future",
    answer:
      "They do not.\n\nThe entire point of the Soul Sample Club is stability. What is cleared today stays cleared tomorrow, next year, and beyond.",
  },
  {
    question: "Is this a loop pack subscription",
    answer:
      "No.\n\nThis is a curated library of compositions designed for sampling, not a revolving loop pack service.\n\nThe emphasis is musical depth, not quantity.",
  },
  {
    question: "What if I still have questions",
    answer:
      "If you have any questions at all, you can reach us directly at hello@soulsampleclub.com\n\nWe are happy to clarify anything before you join.",
  },
];

// ============================================
// FAQ ITEM COMPONENT
// ============================================
function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
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
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN FAQ SECTION COMPONENT
// ============================================
export function FAQSection() {
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
