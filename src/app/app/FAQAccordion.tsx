"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="divide-y divide-grey-700 border-t border-b border-grey-700">
      {items.map((item, index) => (
        <div key={index}>
          <button
            onClick={() => toggle(index)}
            className="w-full flex items-center justify-between py-5 sm:py-6 text-left group"
          >
            <span className="text-base sm:text-lg font-medium text-white pr-4 group-hover:text-white/80 transition-colors">
              {item.question}
            </span>
            <span className="flex-shrink-0 text-white/50 group-hover:text-white transition-colors">
              {openIndex === index ? (
                <Minus className="w-5 h-5" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </span>
          </button>

          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-out",
              openIndex === index ? "max-h-96 pb-6" : "max-h-0"
            )}
          >
            <p className="text-white/60 leading-relaxed pr-12">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
