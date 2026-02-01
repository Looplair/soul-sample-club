"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Sparkles, Download } from "lucide-react";

// ============================================
// CONFIGURATION
// ============================================

const SECTION_TITLE = "How It Works";
const SECTION_SUBHEADING = "Straight to the heat. No friction.";

const steps = [
  {
    step: "01",
    title: "Browse the catalog",
    description: "Explore exclusive soul compositions. Preview anything instantly.",
    icon: Search,
  },
  {
    step: "02",
    title: "Subscribe",
    description: "Get full access to every pack. Cancel anytime.",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "Download & create",
    description: "Download compositions and stems. Build real records.",
    icon: Download,
  },
];

// ============================================
// HOOKS
// ============================================

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

// ============================================
// COMPONENT
// ============================================

export function HowItWorksSection() {
  const { ref, isInView } = useInView(0.2);
  const [activeStep, setActiveStep] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Auto-advance through steps when in view
  useEffect(() => {
    if (!isInView || hasAnimated) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= steps.length - 1) {
          setHasAnimated(true);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isInView, hasAnimated]);

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="section bg-grey-900/50 scroll-mt-20 overflow-hidden"
    >
      <div className="container-app">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            className={`text-2xl sm:text-3xl font-bold text-white mb-3 transition-all duration-700 ${
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {SECTION_TITLE}
          </h2>
          <p
            className={`text-text-muted max-w-xl mx-auto transition-all duration-700 delay-100 ${
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {SECTION_SUBHEADING}
          </p>
        </div>

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Animated connector line */}
          <div className="hidden md:block absolute top-[4.5rem] left-[16.67%] right-[16.67%] h-px">
            <div className="relative w-full h-full bg-grey-700">
              {/* Animated progress line */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/60 via-white to-white/60 transition-all duration-700 ease-out"
                style={{
                  width: isInView ? `${((activeStep + 1) / steps.length) * 100}%` : "0%",
                }}
              />
              {/* Glow effect */}
              <div
                className="absolute inset-y-0 h-px bg-white blur-sm transition-all duration-700 ease-out"
                style={{
                  left: isInView ? `${((activeStep + 1) / steps.length) * 100 - 5}%` : "0%",
                  width: "10%",
                  opacity: isInView && activeStep < steps.length - 1 ? 1 : 0,
                }}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((item, index) => {
              const isActive = index <= activeStep;
              const isCurrent = index === activeStep;
              const Icon = item.icon;

              return (
                <div
                  key={item.step}
                  className={`relative transition-all duration-500 ${
                    isInView
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                  style={{
                    transitionDelay: `${index * 150 + 200}ms`,
                  }}
                >
                  <div className="text-center">
                    {/* Step number with icon */}
                    <div className="relative inline-block mb-6">
                      {/* Outer glow ring for current step */}
                      <div
                        className={`absolute -inset-2 rounded-2xl transition-all duration-500 ${
                          isCurrent && isInView
                            ? "bg-white/10 blur-xl scale-110"
                            : "bg-transparent scale-100"
                        }`}
                      />

                      {/* Main container */}
                      <div
                        className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          isActive && isInView
                            ? "bg-white/10 border-white/30"
                            : "bg-white/5 border-white/10"
                        } border`}
                      >
                        {/* Icon */}
                        <Icon
                          className={`w-7 h-7 transition-all duration-500 ${
                            isActive && isInView ? "text-white" : "text-white/50"
                          }`}
                        />

                        {/* Step number badge */}
                        <div
                          className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                            isActive && isInView
                              ? "bg-white text-charcoal"
                              : "bg-grey-700 text-white/60"
                          }`}
                        >
                          {item.step}
                        </div>
                      </div>

                      {/* Pulse animation for current step */}
                      {isCurrent && isInView && !hasAnimated && (
                        <div className="absolute -inset-1 rounded-2xl animate-ping bg-white/20" />
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className={`text-lg font-semibold mb-2 transition-colors duration-500 ${
                        isActive && isInView ? "text-white" : "text-white/60"
                      }`}
                    >
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p
                      className={`text-sm transition-colors duration-500 ${
                        isActive && isInView ? "text-text-secondary" : "text-text-muted"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
