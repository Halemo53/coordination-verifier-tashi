import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  CheckStatus,
  RecentVerificationEntry,
  VerificationReport,
  VerdictType
} from "../types/proof";
import { buildShareableProofUrl, formatPlainTextReport } from "../lib/verifier";
import { JsonHighlighter } from "./JsonHighlighter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "./ui/toast";
import { RecentVerifications } from "./RecentVerifications";

/* ============================================================================
 * [SECTION 3: ALIGNMENT & OPTICAL BALANCE]
 * [SECTION 7: RESULT SCREEN — THE HEART OF THE APP]
 * [SECTION 9: MICRO-INTERACTIONS — RESTRAINED (150ms chevron & check expand)]
 * [SECTION 12: MOBILE — PROPORTIONAL]
 * ============================================================================ */

interface ResultScreenProps {
  report: VerificationReport;
  onVerifyAnother: () => void;
  onEditCurrentProof: () => void;
  recentEntries: RecentVerificationEntry[];
  onSelectRecentEntry: (entry: RecentVerificationEntry) => void;
  onClearHistory: () => void;
  onBackToBatchResults?: () => void;
}

function getVerdictColor(verdict: VerdictType): string {
  switch (verdict) {
    case "VERIFIED":
      return "#2D5A3D";
    case "FAILED":
      return "#8B3A2E";
    case "VERIFIED WITH WARNINGS":
      return "#8A6A2F";
  }
}

function getCheckColor(status: CheckStatus): string {
  switch (status) {
    case "pass":
      return "#2D5A3D";
    case "fail":
      return "#8B3A2E";
    case "warn":
      return "#8A6A2F";
  }
}

function getReputationBarColor(rep: number): string {
  if (rep < 1.0) return "#8B3A2E";
  if (Math.abs(rep - 1.0) < 0.001) return "#6B665D";
  return "#2D5A3D";
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  report,
  onVerifyAnother,
  onEditCurrentProof,
  recentEntries,
  onSelectRecentEntry,
  onClearHistory,
  onBackToBatchResults
}) => {
  const { toast } = useToast();
  const { proof, verdict, verdictSentence, windowMs, checks, signatureResults } = report;

  // Default expand any failed or warning checks so issues are immediately transparent
  const [expandedChecks, setExpandedChecks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    checks.forEach((c) => {
      if (c.status !== "pass") {
        initial[c.id] = true;
      }
    });
    return initial;
  });

  const [rawProofOpen, setRawProofOpen] = useState<boolean>(false);

  const toggleCheck = (id: string) => {
    setExpandedChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allExpanded = checks.every((c) => expandedChecks[c.id]);
  const handleToggleAllChecks = () => {
    if (allExpanded) {
      setExpandedChecks({});
    } else {
      const next: Record<string, boolean> = {};
      checks.forEach((c) => {
        next[c.id] = true;
      });
      setExpandedChecks(next);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const handleCopyReport = async () => {
    const text = formatPlainTextReport(report);
    await copyToClipboard(text);
    toast("Verification report copied to clipboard.", "accent");
  };

  const handleCopyShareableLink = async () => {
    const shareUrl = buildShareableProofUrl(proof);
    await copyToClipboard(shareUrl);
    toast("Link copied. The proof is embedded in the URL — no server involved.", "accent");
  };

  const handleDownloadTxt = () => {
    const text = formatPlainTextReport(report);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeMesh = (proof.mesh_id || "proof").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `tashi-verification-${safeMesh}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast(`Downloaded tashi-verification-${safeMesh}.txt`, "default");
  };

  const verdictColor = getVerdictColor(verdict);
  const totalParticipants = proof.participants.length;
  const atRiskParticipantsCount = proof.participants.filter(
    (p) => typeof p.reputation === "number" && p.reputation < 1.0
  ).length;
  const aboveNeutralCount = totalParticipants - atRiskParticipantsCount;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="fade-transition pt-[40px] sm:pt-[48px]">
        {/* [SECTION 7: "Loaded from shared link" notice — 12px mono line ABOVE verdict banner, 2px forest-green left border, 8px left padding] */}
        {(report.loadedFromSharedLink || onBackToBatchResults) && (
          <div className="mb-[16px] flex flex-wrap items-center justify-between gap-[12px]">
            {report.loadedFromSharedLink ? (
              <div className="border-l-2 border-[#2D5A3D] pl-[8px] font-mono text-[12px] text-[#5A5449]">
                Loaded from shared link.
              </div>
            ) : (
              <span />
            )}

            {onBackToBatchResults && (
              <button
                type="button"
                onClick={onBackToBatchResults}
                className="btn-ghost text-[12px] font-medium text-[#2D5A3D] cursor-pointer whitespace-nowrap shrink-0"
              >
                Back to batch results
              </button>
            )}
          </div>
        )}

        {/* [SECTION 7: Verdict banner — full-width band, no fill, 1px top & bottom border, 3px left accent bar at exact x=0, 16px vertical padding, 20px left padding] */}
        <section aria-label="Verification verdict">
          <div className="relative border-t border-b border-[#E5E1D8] py-[16px] pl-[23px] pr-[16px]">
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ backgroundColor: verdictColor }}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-[16px]">
              <div>
                <h1
                  className="text-[16px] font-semibold tracking-[-0.01em] leading-[1.3]"
                  style={{ color: verdictColor }}
                >
                  {verdictSentence}
                </h1>
                {report.majorityBelowNeutralReputation && (
                  <p className="mt-[4px] text-[12px] font-medium text-[#8A6A2F]">
                    Majority of participants are below neutral reputation.
                  </p>
                )}
              </div>

              <span
                className="font-mono text-[12px] font-medium tracking-[0.01em]"
                style={{ color: verdictColor }}
              >
                {verdict}
              </span>
            </div>

            {/* Summary line below inside or right under verdict text: 12px mono, tertiary color */}
            <div className="mt-[8px] font-mono text-[12px] text-[#9C968A] tabular-nums">
              <span>{proof.mesh_id}</span>
              <span aria-hidden="true" className="mx-[8px]">
                ·
              </span>
              <span>{proof.participants.length} participants</span>
              <span aria-hidden="true" className="mx-[8px]">
                ·
              </span>
              <span>{proof.events.length} events</span>
              <span aria-hidden="true" className="mx-[8px]">
                ·
              </span>
              <span>{windowMs.toLocaleString()}ms window</span>
            </div>
          </div>
        </section>

        {/* [SECTION 7: Below banner 32px gap, then section header "CHECKS"] */}
        <section aria-labelledby="checks-section-heading" className="mt-[32px]">
          <div className="flex items-center justify-between gap-[16px] mb-[12px]">
            <h2 id="checks-section-heading" className="spec-header !mb-0">
              CHECKS
            </h2>
            <button
              type="button"
              onClick={handleToggleAllChecks}
              className="btn-ghost text-[12px] font-medium cursor-pointer whitespace-nowrap shrink-0"
            >
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          </div>

          {/* [SECTION 3 & 7: Dotted left notebook margin aligned at exact x=0 with CHECKS header above] */}
          <div className="border-l border-dotted border-[#E5E1D8] pl-[16px]">
            {checks.map((check) => {
              const dotColor = getCheckColor(check.status);
              const isExpanded = !!expandedChecks[check.id];
              return (
                <div
                  key={check.id}
                  className="border-b border-[#E5E1D8] py-[14px] last:border-b-0"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-controls={`check-raw-${check.id}`}
                    onClick={() => toggleCheck(check.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleCheck(check.id);
                      }
                    }}
                    className="flex items-start justify-between gap-[16px] cursor-pointer group"
                  >
                    <div className="flex items-start gap-[12px] min-w-0">
                      {/* 8x8px dot, radius 50%, positioned 2px below text baseline for optical centering */}
                      <span
                        aria-hidden="true"
                        className="mt-[7px] inline-block h-[8px] w-[8px] shrink-0 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium leading-[1.4] text-[#1A1815]">
                          {check.label}
                        </div>
                        <p className="mt-[2px] text-[12px] leading-[1.5] text-[#6B665D]">
                          {check.details}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex h-[24px] w-[24px] items-center justify-center shrink-0 text-[#5A5449] group-hover:text-[#1A1815]">
                      <ChevronRight
                        className={`h-[14px] w-[14px] transition-transform duration-150 ease-out ${
                          isExpanded ? "rotate-90" : "rotate-0"
                        }`}
                      />
                    </span>
                  </div>

                  {/* [SECTION 7: Expanded state — 12px top/bottom padding, #F7F5F0 inset with 1px left border #E5E1D8 and 12px left padding] */}
                  <div
                    id={`check-raw-${check.id}`}
                    className={`overflow-hidden transition-all duration-150 ease-out ${
                      isExpanded ? "max-h-[480px] opacity-100 mt-[8px]" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="ml-[20px] border-l border-[#E5E1D8] bg-[#F7F5F0] py-[12px] pl-[12px] font-mono text-[12.5px] leading-[1.55] text-[#5A5449]">
                      {check.rawOutput.map((line, i) => (
                        <div key={i} className="break-all">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* [SECTION 7: Participants & Signatures section — two columns on desktop (gap 32px), stacked on mobile (gap 24px)] */}
        <section
          aria-label="Participants and Signatures"
          className="mt-[32px] border-t border-[#E5E1D8] pt-[32px] grid grid-cols-1 lg:grid-cols-2 gap-[24px] lg:gap-[32px]"
        >
          {/* Left: PARTICIPANTS */}
          <div>
            <h2 className="spec-header">PARTICIPANTS</h2>
            <p className="mb-[12px] text-[12px] font-medium tracking-[0.01em] text-[#9C968A] tabular-nums">
              {aboveNeutralCount} of {totalParticipants} participants are above neutral reputation
              (1.0). {atRiskParticipantsCount}{" "}
              {atRiskParticipantsCount === 1 ? "is" : "are"} at risk.
            </p>

            <div className="mobile-table-scroll-wrap">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E5E1D8]">
                      <th className="table-header-cell py-[12px] pr-[12px]">ID</th>
                      <th className="table-header-cell py-[12px] px-[12px]">Role</th>
                      <th className="table-header-cell py-[12px] px-[12px] text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted underline-offset-[2px] cursor-help">
                              Reputation
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Tashi reputation scale (0.0 to 2.0), with 1.0 neutral. Sustained
                            downtime drops reputation below 1.0 and triggers progressive slashing.
                          </TooltipContent>
                        </Tooltip>
                      </th>
                      <th className="table-header-cell py-[12px] pl-[12px] text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted underline-offset-[2px] cursor-help">
                              Auth
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Whether the participant node was authorized for this mesh epoch.
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[12.5px] tabular-nums">
                    {proof.participants.map((p) => {
                      const repVal = typeof p.reputation === "number" ? p.reputation : 0;
                      const isLowRep = repVal < 1.0;
                      const isUnauthorized = p.authorized !== true;
                      const widthPct = Math.max(0, Math.min(100, (repVal / 2.0) * 100));
                      const barColor = getReputationBarColor(repVal);

                      return (
                        <tr
                          key={p.id}
                          className="border-b border-[#E5E1D8] last:border-b-0"
                        >
                          <td className="py-[12px] pr-[12px] font-medium text-[#1A1815] whitespace-nowrap align-top">
                            {p.id}
                          </td>
                          <td className="py-[12px] px-[12px] text-[#5A5449] whitespace-nowrap align-top">
                            {p.role}
                          </td>
                          <td
                            className="py-[12px] px-[12px] text-right whitespace-nowrap font-medium align-top"
                            style={{
                              color: isLowRep ? "#8A6A2F" : "#1A1815"
                            }}
                          >
                            <div>
                              {typeof p.reputation === "number"
                                ? p.reputation.toFixed(2)
                                : String(p.reputation)}
                            </div>
                            {/* [SECTION 7: Reputation bar — height 3px, width 64px, bg #E5E1D8, tick at 1.0 as 1px vertical line in #6B665D] */}
                            <div
                              className="relative mt-[4px] ml-auto h-[3px] w-[64px] bg-[#E5E1D8]"
                              title={`Reputation ${repVal.toFixed(2)} / 2.00 (1.00 neutral)`}
                            >
                              <div
                                className="h-full"
                                style={{
                                  width: `${widthPct}%`,
                                  backgroundColor: barColor
                                }}
                              />
                              <span
                                aria-hidden="true"
                                className="absolute top-[-2px] bottom-[-2px] left-1/2 w-[1px] bg-[#6B665D]"
                              />
                            </div>
                          </td>
                          <td
                            className="py-[12px] pl-[12px] text-center whitespace-nowrap font-medium align-top"
                            style={{
                              color: isUnauthorized ? "#8B3A2E" : "#1A1815"
                            }}
                          >
                            {p.authorized ? "yes" : "no"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: SIGNATURES */}
          <div>
            <h2 className="spec-header">SIGNATURES</h2>
            <p className="mb-[12px] text-[12px] font-medium tracking-[0.01em] text-[#9C968A] tabular-nums">
              {report.validSignatureCount} of {report.authorizedParticipantCount} authorized
              signatures verified ({(report.supermajorityRatio * 100).toFixed(1)}% vs{" "}
              {(proof.supermajority_threshold * 100).toFixed(1)}% threshold).
            </p>

            <div className="mobile-table-scroll-wrap">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E5E1D8]">
                      <th className="table-header-cell py-[12px] pr-[12px]">Participant ID</th>
                      <th className="table-header-cell py-[12px] px-[12px]">Signature</th>
                      <th className="table-header-cell py-[12px] pl-[12px] text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted underline-offset-[2px] cursor-help">
                              Valid
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Cryptographic Ed25519 signature verification over outcome_hash.
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[12.5px] tabular-nums">
                    {signatureResults.map((sig, idx) => {
                      const isFailed = !sig.valid;
                      return (
                        <tr
                          key={`${sig.participant_id}-${idx}`}
                          className="border-b border-[#E5E1D8] last:border-b-0"
                        >
                          <td className="py-[12px] pr-[12px] font-medium text-[#1A1815] whitespace-nowrap">
                            {sig.participant_id}
                          </td>
                          <td
                            className="py-[12px] px-[12px] text-[#5A5449] whitespace-nowrap"
                            title={sig.reason}
                          >
                            {sig.signature_preview}
                          </td>
                          <td
                            className="py-[12px] pl-[12px] text-center whitespace-nowrap font-semibold"
                            style={{
                              color: isFailed ? "#8B3A2E" : "#2D5A3D"
                            }}
                          >
                            {sig.valid ? "yes" : "no"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* [SECTION 7: Raw proof collapsible — 24px top margin, section header "RAW PROOF"] */}
        <section
          aria-labelledby="raw-proof-heading"
          className="mt-[24px] border-t border-[#E5E1D8] pt-[24px]"
        >
          <div className="flex items-center justify-between gap-[16px]">
            <button
              type="button"
              onClick={() => setRawProofOpen((prev) => !prev)}
              aria-expanded={rawProofOpen}
              aria-controls="raw-proof-panel"
              className="btn-ghost gap-[8px] text-left cursor-pointer"
            >
              <span id="raw-proof-heading" className="spec-header !mb-0">
                RAW PROOF
              </span>
              <ChevronRight
                className={`h-[14px] w-[14px] text-[#5A5449] transition-transform duration-150 ease-out ${
                  rawProofOpen ? "rotate-90" : "rotate-0"
                }`}
              />
            </button>

            <button
              type="button"
              onClick={onEditCurrentProof}
              className="btn-ghost text-[12px] font-medium cursor-pointer whitespace-nowrap shrink-0"
            >
              Edit in input
            </button>
          </div>

          {rawProofOpen && (
            <div id="raw-proof-panel" className="mt-[12px]">
              <Tabs defaultValue="json">
                <TabsList aria-label="Proof inspection views">
                  <TabsTrigger value="json">Parsed JSON</TabsTrigger>
                  <TabsTrigger value="dag">Causal Event DAG ({proof.events.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="json">
                  <JsonHighlighter data={proof} />
                </TabsContent>

                <TabsContent value="dag">
                  <div className="mobile-table-scroll-wrap">
                    <div className="overflow-x-auto rounded-[6px] border border-[#E5E1D8] bg-[#F1EDE4] p-[16px]">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-[#E5E1D8]">
                            <th className="table-header-cell py-[12px] pr-[12px]">Index</th>
                            <th className="table-header-cell py-[12px] px-[12px]">Event Hash</th>
                            <th className="table-header-cell py-[12px] px-[12px]">Sender</th>
                            <th className="table-header-cell py-[12px] px-[12px]">
                              Parent References
                            </th>
                            <th className="table-header-cell py-[12px] pl-[12px] text-right">
                              Timestamp (ms)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-[12.5px] tabular-nums">
                          {proof.events.map((ev) => (
                            <tr
                              key={`${ev.index}-${ev.event_hash}`}
                              className="border-b border-[#E5E1D8] last:border-b-0"
                            >
                              <td className="py-[12px] pr-[12px] font-medium text-[#1A1815] whitespace-nowrap">
                                #{ev.index}
                              </td>
                              <td className="py-[12px] px-[12px] text-[#2D5A3D] whitespace-nowrap">
                                {ev.event_hash.slice(0, 16)}…
                              </td>
                              <td className="py-[12px] px-[12px] text-[#1A1815] whitespace-nowrap">
                                {ev.sender_id}
                              </td>
                              <td className="py-[12px] px-[12px] text-[#5A5449]">
                                {Array.isArray(ev.references) && ev.references.length > 0
                                  ? ev.references.map((r) => `${r.slice(0, 10)}…`).join(", ")
                                  : "genesis (none)"}
                              </td>
                              <td className="py-[12px] pl-[12px] text-right text-[#5A5449] whitespace-nowrap">
                                {ev.timestamp}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </section>

        {/* [SECTION 7: Actions row at the bottom — 32px top margin. Left-group three text buttons (24px gap), Right-group primary "Verify another proof" button] */}
        <section
          aria-label="Report actions"
          className="mt-[32px] border-t border-[#E5E1D8] pt-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]"
        >
          <div className="flex flex-wrap items-center gap-[24px]">
            <button
              type="button"
              onClick={handleCopyReport}
              className="btn-ghost text-[13px] font-medium text-[#1A1815] cursor-pointer whitespace-nowrap shrink-0"
            >
              Copy verification report
            </button>

            <button
              type="button"
              onClick={handleCopyShareableLink}
              className="btn-ghost text-[13px] font-medium text-[#1A1815] cursor-pointer whitespace-nowrap shrink-0"
            >
              Copy shareable link
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="btn-ghost text-[13px] font-medium text-[#1A1815] cursor-pointer whitespace-nowrap shrink-0"
            >
              Download full report
            </button>
          </div>

          <button
            type="button"
            onClick={onVerifyAnother}
            className="btn-primary w-full sm:w-auto h-[44px] sm:h-[40px] px-[20px] cursor-pointer whitespace-nowrap shrink-0"
          >
            Verify another proof
          </button>
        </section>

        {/* Recent Verifications */}
        <RecentVerifications
          entries={recentEntries}
          onSelectEntry={onSelectRecentEntry}
          onClearHistory={onClearHistory}
        />
      </div>
    </TooltipProvider>
  );
};
