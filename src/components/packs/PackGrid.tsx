"use client";

import { motion } from "framer-motion";
import { PackCard } from "./PackCard";
import type { Pack } from "@/types/database";

interface PackWithSampleCount extends Pack {
  samples: { count: number }[];
}

interface PackGridProps {
  packs: PackWithSampleCount[];
  hasSubscription: boolean;
}

export function PackGrid({ packs, hasSubscription }: PackGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {packs.map((pack, index) => (
        <motion.div
          key={pack.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: index * 0.05,
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          <PackCard
            pack={pack}
            sampleCount={pack.samples[0]?.count || 0}
            hasSubscription={hasSubscription}
          />
        </motion.div>
      ))}
    </div>
  );
}
