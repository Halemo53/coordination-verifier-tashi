import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckStatus,
  ParseResult,
  VerificationReport,
  VerdictType
} from "../types/proof";
import { computeProofDifferences, parseProofInput } from "../lib/verifier";
import { VALID_EXAMPLE_PROOF, TAMPERED_EXAMPLE_PROOF } from "../data/examples";

/* ============================================================================
 * [SECTION 8: COMPARISON & BATCH SCREENS — CONSISTENCY]
 * - Two-column comparison input: 32px gap (24px mobile). Labels "FIRST PROOF",
 *   "SECOND PROOF" in uppercase small style.
 * - Comparison result: if both share the same verdict, show ONE combined banner
 *   spanning full width ("Both proofs verify.").
 * ============================================================================ */

interface CompareScreenProps {
  mode: "input" | "result";
  firstInput: string;
  secondInput: string;
  onChangeFirstInput: (val: string) => void;
  onChangeSecondInput: (val: string) => void;
  firstReport: VerificationReport | null;
  secondReport: VerificationReport | null;
  firstError: ParseResult | null;
  secondError: ParseResult | null;
  onSubmitCompare: () => void;
  onBackToCompareInput: () => void;
  onBackToSingle: () => void;
  firstTextareaRef?: React.RefObject<HTMLTextAreaElement | null>;
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

function getCombinedVerdictSentence(verdict: VerdictType): string {
  switch (verdict) {
    case "VERIFIED":
      return "Both proofs verify.";
    case "FAILED":
      return "Neither proof verifies.";
    case "VERIFIED WITH WARNINGS":
      return "Both proofs verify, with warnings.";
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

function getCheckStatusWord(status: CheckStatus): string {
  switch (status) {
    case "pass":
      return "PASS";
    case "fail":
      return "FAIL";
    case "warn":
      return "WARN";
  }
}

export const CompareScreen: React.FC<CompareScreenProps> = ({
  mode,
  firstInput,
  secondInput,
  onChangeFirstInput,
  onChangeSecondInput,
  firstReport,
  secondReport,
  firstError,
  secondError,
  onSubmitCompare,
  onBackToCompareInput,
  onBackToSingle,
  firstTextareaRef
}) => {
  const [draggingSlot, setDraggingSlot] = useState<"first" | "second" | null>(null);
  const firstFileInputRef = useRef<HTMLInputElement | null>(null);
  const secondFileInputRef = useRef<HTMLInputElement | null>(null);
  const localFirstRef = useRef<HTMLTextAreaElement | null>(null);
  const secondTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resolvedFirstRef = firstTextareaRef || localFirstRef;

  /* [SECTION 6 & 9: Snap textarea auto-grow between 220px and 480px] */
  useEffect(() => {
    const el1 = resolvedFirstRef.current;
    if (el1) {
      el1.style.height = "220px";
      el1.style.height = `${Math.min(480, Math.max(220, el1.scrollHeight))}px`;
    }
  }, [firstInput, resolvedFirstRef, mode]);

  useEffect(() => {
    const el2 = secondTextareaRef.current;
    if (el2) {
      el2.style.height = "220px";
      el2.style.height = `${Math.min(480, Math.max(220, el2.scrollHeight))}px`;
    }
  }, [secondInput, mode]);

  const liveFirstParse = useMemo(() => {
    if (!firstInput.trim()) return null;
    return parseProofInput(firstInput);
  }, [firstInput]);

  const liveSecondParse = useMemo(() => {
    if (!secondInput.trim()) return null;
    return parseProofInput(secondInput);
  }, [secondInput]);

  const activeFirstError =
    firstError && !firstError.ok
      ? firstError
      : liveFirstParse && !liveFirstParse.ok
        ? liveFirstParse
        : null;

  const activeSecondError =
    secondError && !secondError.ok
      ? secondError
      : liveSecondParse && !liveSecondParse.ok
        ? liveSecondParse
        : null;

  const readFileIntoSlot = (file: File, slot: "first" | "second") => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = typeof ev.target?.result === "string" ? ev.target.result : "";
      if (slot === "first") {
        onChangeFirstInput(text);
      } else {
        onChangeSecondInput(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDropSlot = (
    e: React.DragEvent<HTMLTextAreaElement>,
    slot: "first" | "second"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSlot(null);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      readFileIntoSlot(file, slot);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      (e.metaKey || e.ctrlKey) &&
      e.key === "Enter" &&
      firstInput.trim().length > 0 &&
      secondInput.trim().length > 0
    ) {
      e.preventDefault();
      onSubmitCompare();
    }
  };

  const differences = useMemo(() => {
    if (!firstReport || !secondReport) return [];
    return computeProofDifferences(firstReport, secondReport);
  }, [firstReport, secondReport]);

  if (mode === "result" && firstReport && secondReport) {
    const sameOutcomeHash =
      firstReport.proof.outcome_hash === secondReport.proof.outcome_hash;
    const sameVerdict = firstReport.verdict === secondReport.verdict;

    return (
      <div className="fade-transition pt-[40px] sm:pt-[48px]">
        <div className="mb-[24px] flex flex-wrap items-center justify-between gap-[16px]">
          <h1 className="type-page-title">Comparison Result</h1>
          <div className="flex items-center gap-[16px] text-[12px]">
            <button
              type="button"
              onClick={onBackToCompareInput}
              className="btn-ghost text-[12px] cursor-pointer whitespace-nowrap shrink-0"
            >
              Edit compared proofs
            </button>
            <button
              type="button"
              onClick={onBackToSingle}
              className="btn-ghost text-[12px] font-medium text-[#2D5A3D] cursor-pointer whitespace-nowrap shrink-0"
            >
              Back to single verification
            </button>
          </div>
        </div>

        {/* [SECTION 8: If both share the same verdict, show ONE combined banner spanning full width] */}
        {sameVerdict ? (
          <section aria-label="Combined comparison verdict">
            <div className="relative border-t border-b border-[#E5E1D8] py-[16px] pl-[23px] pr-[16px]">
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ backgroundColor: getVerdictColor(firstReport.verdict) }}
              />
              <div className="flex flex-wrap items-baseline justify-between gap-[16px]">
                <div
                  className="text-[16px] font-semibold tracking-[-0.01em] leading-[1.3]"
                  style={{ color: getVerdictColor(firstReport.verdict) }}
                >
                  {getCombinedVerdictSentence(firstReport.verdict)}
                </div>
                <span
                  className="font-mono text-[12px] font-medium"
                  style={{ color: getVerdictColor(firstReport.verdict) }}
                >
                  {firstReport.verdict}
                </span>
              </div>
              <div className="mt-[8px] font-mono text-[12px] text-[#9C968A] tabular-nums">
                <span>
                  First: {firstReport.proof.mesh_id} ({firstReport.windowMs.toLocaleString()}ms)
                </span>
                <span aria-hidden="true" className="mx-[8px]">
                  ·
                </span>
                <span>
                  Second: {secondReport.proof.mesh_id} ({secondReport.windowMs.toLocaleString()}ms)
                </span>
              </div>
            </div>
          </section>
        ) : (
          <section
            aria-label="Side-by-side verdict banners"
            className="grid grid-cols-1 md:grid-cols-2 gap-[24px] md:gap-[32px]"
          >
            {[
              { title: "FIRST PROOF", report: firstReport },
              { title: "SECOND PROOF", report: secondReport }
            ].map(({ title, report }) => {
              const vColor = getVerdictColor(report.verdict);
              return (
                <div key={title}>
                  <div className="spec-header">{title}</div>
                  <div className="relative border-t border-b border-[#E5E1D8] py-[16px] pl-[23px] pr-[16px]">
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ backgroundColor: vColor }}
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
                      <div
                        className="text-[16px] font-semibold tracking-[-0.01em] leading-[1.3]"
                        style={{ color: vColor }}
                      >
                        {report.verdictSentence}
                      </div>
                      <span
                        className="font-mono text-[12px] font-medium"
                        style={{ color: vColor }}
                      >
                        {report.verdict}
                      </span>
                    </div>
                    <div className="mt-[8px] font-mono text-[12px] text-[#9C968A] tabular-nums">
                      <span>{report.proof.mesh_id}</span>
                      <span aria-hidden="true" className="mx-[8px]">
                        ·
                      </span>
                      <span>{report.proof.participants.length} participants</span>
                      <span aria-hidden="true" className="mx-[8px]">
                        ·
                      </span>
                      <span>{report.proof.events.length} events</span>
                      <span aria-hidden="true" className="mx-[8px]">
                        ·
                      </span>
                      <span>{report.windowMs.toLocaleString()}ms window</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Prominent understated line if outcome_hash matches */}
        {sameOutcomeHash && (
          <div className="mt-[16px] border-l-2 border-[#2D5A3D] pl-[12px] py-[4px] text-[13px] font-medium text-[#2D5A3D]">
            Same outcome hash. Both proofs attest to the same result.{" "}
            <code className="inline-code-chip ml-[4px]">
              {firstReport.proof.outcome_hash.slice(0, 16)}…
            </code>
          </div>
        )}

        {/* Comparison Table of all 8 Checks */}
        <section aria-labelledby="comparison-checks-heading" className="mt-[32px]">
          <h2 id="comparison-checks-heading" className="spec-header">
            CHECKS COMPARISON
          </h2>

          <div className="mobile-table-scroll-wrap">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E5E1D8]">
                    <th className="table-header-cell py-[12px] pr-[16px] w-[26%]">Check</th>
                    <th className="table-header-cell py-[12px] px-[16px] w-[37%]">First proof</th>
                    <th className="table-header-cell py-[12px] pl-[16px] w-[37%]">Second proof</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {firstReport.checks.map((c1, idx) => {
                    const c2 = secondReport.checks[idx];
                    const color1 = getCheckColor(c1.status);
                    const color2 = c2 ? getCheckColor(c2.status) : "#5A5449";
                    return (
                      <tr
                        key={c1.id}
                        className="border-b border-[#E5E1D8] last:border-b-0 align-top"
                      >
                        <td className="py-[12px] pr-[16px] font-medium text-[#1A1815] whitespace-nowrap">
                          {c1.label}
                        </td>
                        <td className="py-[12px] px-[16px]">
                          <div className="flex items-start gap-[8px]">
                            <span
                              aria-hidden="true"
                              className="mt-[6px] inline-block h-[8px] w-[8px] rounded-full shrink-0"
                              style={{ backgroundColor: color1 }}
                            />
                            <div>
                              <span
                                className="font-mono text-[12px] font-medium mr-[8px]"
                                style={{ color: color1 }}
                              >
                                {getCheckStatusWord(c1.status)}
                              </span>
                              <span className="text-[12px] text-[#5A5449]">{c1.details}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-[12px] pl-[16px]">
                          {c2 ? (
                            <div className="flex items-start gap-[8px]">
                              <span
                                aria-hidden="true"
                                className="mt-[6px] inline-block h-[8px] w-[8px] rounded-full shrink-0"
                                style={{ backgroundColor: color2 }}
                              />
                              <div>
                                <span
                                  className="font-mono text-[12px] font-medium mr-[8px]"
                                  style={{ color: color2 }}
                                >
                                  {getCheckStatusWord(c2.status)}
                                </span>
                                <span className="text-[12px] text-[#5A5449]">{c2.details}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#9C968A]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Differences Section */}
        <section
          aria-labelledby="comparison-diffs-heading"
          className="mt-[32px] border-t border-[#E5E1D8] pt-[32px]"
        >
          <div className="flex items-baseline justify-between gap-[16px] mb-[12px]">
            <h2 id="comparison-diffs-heading" className="spec-header !mb-0">
              DIFFERENCES ({differences.length})
            </h2>
            <span className="type-tertiary">Only differing fields shown</span>
          </div>

          {differences.length === 0 ? (
            <p className="type-secondary py-[8px]">
              No differences detected. Both proofs are structurally and cryptographically identical.
            </p>
          ) : (
            <div className="mobile-table-scroll-wrap">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E5E1D8]">
                      <th className="table-header-cell py-[12px] pr-[16px]">Field</th>
                      <th className="table-header-cell py-[12px] px-[16px]">First proof</th>
                      <th className="table-header-cell py-[12px] pl-[16px]">Second proof</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[12.5px] tabular-nums">
                    {differences.map((diff) => (
                      <tr
                        key={diff.field}
                        className="border-b border-[#E5E1D8] last:border-b-0 align-top"
                      >
                        <td className="py-[12px] pr-[16px] font-medium text-[#1A1815] whitespace-nowrap">
                          {diff.field}
                        </td>
                        <td className="py-[12px] px-[16px] text-[#8A6A2F] break-all">
                          {diff.firstValue}
                        </td>
                        <td className="py-[12px] pl-[16px] text-[#8A6A2F] break-all">
                          {diff.secondValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Bottom Navigation */}
        <div className="mt-[32px] border-t border-[#E5E1D8] pt-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
          <button
            type="button"
            onClick={onBackToCompareInput}
            className="btn-secondary w-full sm:w-auto h-[44px] sm:h-[40px] px-[20px] cursor-pointer whitespace-nowrap shrink-0"
          >
            Compare another pair
          </button>

          <button
            type="button"
            onClick={onBackToSingle}
            className="btn-ghost text-[13px] font-medium text-[#2D5A3D] cursor-pointer whitespace-nowrap shrink-0"
          >
            Back to single verification
          </button>
        </div>
      </div>
    );
  }

  // Input Mode for Compare
  return (
    <div className="fade-transition pt-[40px] sm:pt-[64px]">
      <div className="mb-[32px] flex flex-wrap items-baseline justify-between gap-[16px]">
        <div>
          <h1 className="type-page-title">Compare Two Proofs</h1>
          <p className="mt-[8px] max-w-[620px] text-[15px] leading-[1.65] text-[#5A5449]">
            Run independent verification on two Proof of Coordination records and inspect any field
            or signature divergence.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToSingle}
          className="btn-ghost text-[12px] font-medium text-[#2D5A3D] cursor-pointer whitespace-nowrap shrink-0"
        >
          Back to single verification
        </button>
      </div>

      {/* [SECTION 8: Two-column comparison input — 32px gap (24px mobile), labels "FIRST PROOF" and "SECOND PROOF"] */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] md:gap-[32px]">
        {/* Left Column: FIRST PROOF */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-[8px] mb-[12px]">
            <label htmlFor="compare-first-textarea" className="spec-header !mb-0">
              FIRST PROOF
            </label>
            <div className="flex items-center gap-[8px] text-[12px]">
              <button
                type="button"
                onClick={() => onChangeFirstInput(JSON.stringify(VALID_EXAMPLE_PROOF, null, 2))}
                className="btn-ghost text-[12px] font-medium text-[#2D5A3D] cursor-pointer whitespace-nowrap shrink-0"
              >
                Load example
              </button>
              <span aria-hidden="true" className="text-[#9C968A]">
                ·
              </span>
              <button
                type="button"
                onClick={() => firstFileInputRef.current?.click()}
                className="btn-ghost text-[12px] text-[#5A5449] cursor-pointer whitespace-nowrap shrink-0"
              >
                Load file
              </button>
              <input
                ref={firstFileInputRef}
                type="file"
                accept=".json,application/json,text/plain"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) readFileIntoSlot(f, "first");
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>
          </div>

          <textarea
            ref={resolvedFirstRef}
            id="compare-first-textarea"
            value={firstInput}
            onChange={(e) => onChangeFirstInput(e.target.value)}
            onDragOver={(e) => {
              e.preventDefault();
              setDraggingSlot("first");
            }}
            onDragLeave={() => setDraggingSlot(null)}
            onDrop={(e) => handleDropSlot(e, "first")}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder="Paste first proof (JSON or base64) or drop .json file..."
            className={`proof-textarea w-full min-h-[220px] max-h-[480px] overflow-y-auto resize-none block ${
              draggingSlot === "first"
                ? "!border-[#2D5A3D] !bg-[#F7F5F0]"
                : activeFirstError
                  ? "!border-[#8B3A2E]"
                  : ""
            }`}
          />

          {activeFirstError && (
            <div
              role="alert"
              className="mt-[12px] rounded-[6px] border border-[#8B3A2E] bg-[#FFFFFF] p-[12px] text-[13px] text-[#8B3A2E]"
            >
              <span className="font-semibold">{activeFirstError.errorTitle || "Parse error"}: </span>
              <span className="text-[#1A1815]">{activeFirstError.errorMessage}</span>
            </div>
          )}

          {liveFirstParse?.ok && liveFirstParse.proof && (
            <div className="mt-[12px] font-mono text-[12px] text-[#9C968A]">
              <span className="text-[#2D5A3D] font-medium">Parsed OK</span> ·{" "}
              {liveFirstParse.proof.mesh_id} · {liveFirstParse.proof.participants.length}{" "}
              participants
            </div>
          )}
        </div>

        {/* Right Column: SECOND PROOF */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-[8px] mb-[12px]">
            <label htmlFor="compare-second-textarea" className="spec-header !mb-0">
              SECOND PROOF
            </label>
            <div className="flex items-center gap-[8px] text-[12px]">
              <button
                type="button"
                onClick={() =>
                  onChangeSecondInput(JSON.stringify(TAMPERED_EXAMPLE_PROOF, null, 2))
                }
                className="btn-ghost text-[12px] text-[#5A5449] cursor-pointer whitespace-nowrap shrink-0"
              >
                Load tampered
              </button>
              <span aria-hidden="true" className="text-[#9C968A]">
                ·
              </span>
              <button
                type="button"
                onClick={() => secondFileInputRef.current?.click()}
                className="btn-ghost text-[12px] text-[#5A5449] cursor-pointer whitespace-nowrap shrink-0"
              >
                Load file
              </button>
              <input
                ref={secondFileInputRef}
                type="file"
                accept=".json,application/json,text/plain"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) readFileIntoSlot(f, "second");
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>
          </div>

          <textarea
            ref={secondTextareaRef}
            id="compare-second-textarea"
            value={secondInput}
            onChange={(e) => onChangeSecondInput(e.target.value)}
            onDragOver={(e) => {
              e.preventDefault();
              setDraggingSlot("second");
            }}
            onDragLeave={() => setDraggingSlot(null)}
            onDrop={(e) => handleDropSlot(e, "second")}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder="Paste second proof (JSON or base64) or drop .json file..."
            className={`proof-textarea w-full min-h-[220px] max-h-[480px] overflow-y-auto resize-none block ${
              draggingSlot === "second"
                ? "!border-[#2D5A3D] !bg-[#F7F5F0]"
                : activeSecondError
                  ? "!border-[#8B3A2E]"
                  : ""
            }`}
          />

          {activeSecondError && (
            <div
              role="alert"
              className="mt-[12px] rounded-[6px] border border-[#8B3A2E] bg-[#FFFFFF] p-[12px] text-[13px] text-[#8B3A2E]"
            >
              <span className="font-semibold">
                {activeSecondError.errorTitle || "Parse error"}:{" "}
              </span>
              <span className="text-[#1A1815]">{activeSecondError.errorMessage}</span>
            </div>
          )}

          {liveSecondParse?.ok && liveSecondParse.proof && (
            <div className="mt-[12px] font-mono text-[12px] text-[#9C968A]">
              <span className="text-[#2D5A3D] font-medium">Parsed OK</span> ·{" "}
              {liveSecondParse.proof.mesh_id} · {liveSecondParse.proof.participants.length}{" "}
              participants
            </div>
          )}
        </div>
      </div>

      <div className="mt-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]">
        <button
          type="button"
          onClick={onSubmitCompare}
          disabled={!firstInput.trim() || !secondInput.trim()}
          className="btn-primary w-full sm:w-auto min-w-[160px] h-[44px] sm:h-[40px] px-[24px] cursor-pointer whitespace-nowrap shrink-0"
        >
          Verify and compare
        </button>

        <button
          type="button"
          onClick={() => {
            onChangeFirstInput("");
            onChangeSecondInput("");
          }}
          disabled={!firstInput && !secondInput}
          className="btn-ghost w-full sm:w-auto justify-center h-[44px] sm:h-[40px] text-[13px] cursor-pointer whitespace-nowrap shrink-0"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
