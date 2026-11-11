import React, { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "./ui/dialog";

/* ============================================================================
 * [SECTION 5: HEADER — MAKE IT FEEL DELIBERATE]
 * [SECTION 10: DIALOGS & OVERLAYS]
 * ============================================================================ */

interface HeaderProps {
  onResetToInput?: () => void;
  onShowChecksExplainer?: () => void;
  aboutOpen?: boolean;
  onAboutOpenChange?: (open: boolean) => void;
  shortcutsOpen?: boolean;
  onShortcutsOpenChange?: (open: boolean) => void;
}

const KEYBOARD_SHORTCUTS = [
  { keys: "Cmd / Ctrl + Enter", description: "Verify proof (in input mode)" },
  { keys: "Cmd / Ctrl + K", description: "Focus the textarea / paste area" },
  { keys: "Cmd / Ctrl + Shift + C", description: "Copy verification report (in result mode)" },
  { keys: "Cmd / Ctrl + Shift + L", description: "Copy shareable link (in result mode)" },
  { keys: "Esc", description: "Return to input screen from result mode" },
  { keys: "?", description: "Open keyboard shortcuts dialog" }
];

export const Header: React.FC<HeaderProps> = ({
  onResetToInput,
  onShowChecksExplainer,
  aboutOpen,
  onAboutOpenChange,
  shortcutsOpen,
  onShortcutsOpenChange
}) => {
  const [scrolledPastThreshold, setScrolledPastThreshold] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolledPastThreshold(window.scrollY > 100);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 h-[56px] w-full bg-[#F7F5F0] border-b transition-colors duration-150 ${
        scrolledPastThreshold ? "border-[#D8D3C7]" : "border-[#E5E1D8]"
      }`}
    >
      {/* [SECTION 3 & 12: 880px max-width, 20px mobile / 32px tablet / 48px desktop horizontal padding] */}
      <div className="mx-auto flex h-full max-w-[880px] items-center px-[20px] sm:px-[32px] md:px-[48px]">
        <button
          type="button"
          onClick={onResetToInput}
          className="inline-flex min-h-[40px] items-center gap-[8px] text-left whitespace-nowrap shrink-0 cursor-pointer"
          aria-label="Coordination Verifier home"
        >
          <span
            aria-hidden="true"
            className="inline-block h-[6px] w-[6px] shrink-0 bg-[#2D5A3D]"
          />
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#1A1815]">
            Coordination Verifier
          </span>
        </button>

        {/* Right cluster separated by auto margin: "What this tool checks", 16px gap, "?" icon, 16px gap, "About" */}
        <div className="ml-auto flex items-center gap-[16px] shrink-0">
          <button
            type="button"
            onClick={onShowChecksExplainer}
            className="hidden sm:inline-flex min-h-[40px] items-center px-[8px] -mx-[8px] rounded-[4px] text-[12px] font-normal text-[#5A5449] hover:bg-[#F1EDE4] hover:text-[#1A1815] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            What this tool checks
          </button>

          <Dialog open={shortcutsOpen} onOpenChange={onShortcutsOpenChange}>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
                className="inline-flex h-[40px] w-[40px] -mx-[8px] items-center justify-center rounded-[4px] text-[#5A5449] hover:bg-[#F1EDE4] hover:text-[#1A1815] transition-colors cursor-pointer shrink-0"
              >
                <HelpCircle className="h-[16px] w-[16px]" strokeWidth={1.75} />
              </button>
            </DialogTrigger>
            <DialogContent aria-describedby="shortcuts-dialog-description">
              <DialogHeader>
                <DialogTitle>Keyboard Shortcuts</DialogTitle>
                <DialogDescription id="shortcuts-dialog-description">
                  Single-keystroke navigation and verification actions.
                </DialogDescription>
              </DialogHeader>

              {/* [SECTION 10: Shortcuts dialog — two-column table, keys in inline-code chips] */}
              <div className="mt-[16px] overflow-x-auto bg-[#FFFFFF] border-t border-[#E5E1D8]">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E5E1D8]">
                      <th className="table-header-cell py-[12px] pr-[16px]">Shortcut</th>
                      <th className="table-header-cell py-[12px] pl-[16px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px] leading-[1.65] text-[#1A1815]">
                    {KEYBOARD_SHORTCUTS.map((sc) => (
                      <tr key={sc.keys} className="border-b border-[#E5E1D8] last:border-b-0">
                        <td className="py-[12px] pr-[16px] whitespace-nowrap">
                          <code className="font-mono text-[12.5px] bg-[#F1EDE4] text-[#1A1815] px-[6px] py-[2px] rounded-[3px]">
                            {sc.keys}
                          </code>
                        </td>
                        <td className="py-[12px] pl-[16px] font-sans text-[#1A1815]">
                          {sc.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={aboutOpen} onOpenChange={onAboutOpenChange}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-[40px] items-center px-[8px] -mr-[8px] rounded-[4px] text-[12px] font-normal text-[#5A5449] hover:bg-[#F1EDE4] hover:text-[#1A1815] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                About
              </button>
            </DialogTrigger>
            <DialogContent aria-describedby="about-dialog-description">
              <DialogHeader>
                <DialogTitle>About Coordination Verifier</DialogTitle>
                <DialogDescription id="about-dialog-description">
                  Verification methodology and client-side guarantees.
                </DialogDescription>
              </DialogHeader>

              {/* [SECTION 10: About dialog — 3 short paragraphs + whitepaper link + community note] */}
              <div className="mt-[16px] space-y-[16px] text-[13px] leading-[1.65] text-[#1A1815]">
                <p>
                  Tashi Network serves as a coordination layer for autonomous systems. When its
                  consensus engine, Vertex, finalizes an outcome across a mesh, it produces a Proof
                  of Coordination: a compact, multi-signed record of the participating nodes, the
                  ordered DAG of events leading to finality, and Ed25519 signatures over the
                  finalized outcome digest.
                </p>

                <p>
                  This tool independently parses raw JSON or Base64-encoded proofs and executes
                  eight deterministic checks: schema validity, finality window sanity, mesh
                  participant authorization, signature cardinality, Ed25519 signature verification
                  over{" "}
                  <code className="inline-code-chip">outcome_hash</code>, supermajority threshold
                  compliance, causal DAG acyclicity, and participant reputation eligibility.
                </p>

                <p>
                  It does not connect to live Tashi mesh nodes, does not re-run Vertex consensus,
                  and does not transmit any proof data over the network. Every cryptographic check
                  executes locally in your browser.
                </p>

                <div className="border-t border-[#E5E1D8] pt-[16px] flex flex-col gap-[8px]">
                  <div>
                    <a
                      href="https://agents.tashi.network/whitepaper"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#2D5A3D] underline underline-offset-[2px] hover:text-[#1A1815]"
                    >
                      Read the Tashi Network Whitepaper
                    </a>
                  </div>
                  <p className="text-[12px] font-medium tracking-[0.01em] text-[#9C968A]">
                    Not an official Tashi tool. Built as a community contribution.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
};
