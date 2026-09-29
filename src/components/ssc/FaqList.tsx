"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Faq {
  question: string;
  answer: string;
  href?: string;
  linkLabel?: string;
}

/** Each question its own glass box; one open at a time, the first open on load */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.question} className={cn("ssc-glass ssc-glass--plain rounded-[20px] transition-colors", isOpen && "border-white/15")}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
            >
              <span className="text-[16px] font-semibold text-white sm:text-[17px]">{f.question}</span>
              <Plus className={cn("h-5 w-5 flex-shrink-0 text-white/75 transition-transform duration-300", isOpen && "rotate-45")} />
            </button>
            <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <div className="overflow-hidden">
                <div className="px-6 pb-6 text-[15px] font-light leading-relaxed text-white/75">
                  {f.answer.split(/\n\n+/).map((para) => (
                    <p key={para.slice(0, 32)} className="mt-3 first:mt-0">
                      {para}
                    </p>
                  ))}
                  {f.href && (
                    <Link href={f.href} className="mt-3 inline-block font-medium text-white underline underline-offset-4">
                      {f.linkLabel ?? "Read more"}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
