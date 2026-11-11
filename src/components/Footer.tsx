import React from "react";

/* ============================================================================
 * [SECTION 11: FOOTER — QUIET]
 * - 48px top margin, 1px top border #E5E1D8, 32px vertical padding.
 * - Two lines in 12px mono tertiary (#9C968A).
 * - Links styled as inline-code chips (bg #F1EDE4, mono 12px, padding 2px 6px, radius 3px).
 * - Left-aligned, no icons.
 * ============================================================================ */

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[#E5E1D8] bg-[#F7F5F0] mt-[48px]">
      <div className="mx-auto max-w-[880px] px-[20px] sm:px-[32px] md:px-[48px] py-[32px] text-left font-mono text-[12px] leading-[1.6] text-[#9C968A]">
        <p>
          Built as a community contribution to the Tashi Network. Not an official Tashi tool.
        </p>
        <p className="mt-[8px] flex flex-wrap items-center gap-[8px]">
          <span>Runs entirely client-side. No telemetry.</span>
          <a
            href="https://tashi.network"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[24px] items-center rounded-[3px] bg-[#F1EDE4] px-[6px] py-[2px] font-mono text-[12px] text-[#1A1815] hover:underline underline-offset-[2px]"
          >
            tashi.network
          </a>
          <a
            href="https://agents.tashi.network/whitepaper"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[24px] items-center rounded-[3px] bg-[#F1EDE4] px-[6px] py-[2px] font-mono text-[12px] text-[#1A1815] hover:underline underline-offset-[2px]"
          >
            whitepaper
          </a>
        </p>
      </div>
    </footer>
  );
};
