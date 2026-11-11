import React, { useRef, useState } from "react";
import { BatchVerificationItem, VerdictType } from "../types/proof";
import {
  buildShareableBatchUrl,
  formatBatchCsvReport,
  parseProofInput,
  verifyProof
} from "../lib/verifier";
import { SAMPLE_BATCH_PROOF_SET } from "../data/examples";
import { useToast } from "./ui/toast";

/* ============================================================================
 * [SECTION 8: COMPARISON & BATCH SCREENS — CONSISTENCY]
 * - Filename column max-width 240px with overflow ellipsis (title on hover).
 * - Status column uses dot + word, center-aligned.
 * - CSV download button styled as secondary button (1px border, transparent bg).
 * ============================================================================ */

export interface QueuedBatchFile {
  id: string;
  filename: string;
  content: string;
}

interface BatchScreenProps {
  mode: "input" | "result";
  queuedFiles: QueuedBatchFile[];
  onChangeQueuedFiles: (files: QueuedBatchFile[]) => void;
  batchResults: BatchVerificationItem[];
  onBatchComplete: (results: BatchVerificationItem[]) => void;
  onSelectBatchItem: (item: BatchVerificationItem) => void;
  onBackToBatchInput: () => void;
  onBackToSingle: () => void;
  loadedFromSharedLink?: boolean;
}

const MAX_BATCH_FILES = 50;

function getVerdictColor(verdict: VerdictType | "PARSE_ERROR"): string {
  switch (verdict) {
    case "VERIFIED":
      return "#2D5A3D";
    case "FAILED":
    case "PARSE_ERROR":
      return "#8B3A2E";
    case "VERIFIED WITH WARNINGS":
      return "#8A6A2F";
  }
}

export const BatchScreen: React.FC<BatchScreenProps> = ({
  mode,
  queuedFiles,
  onChangeQueuedFiles,
  batchResults,
  onBatchComplete,
  onSelectBatchItem,
  onBackToBatchInput,
  onBackToSingle,
  loadedFromSharedLink
}) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const readSelectedFiles = async (fileList: FileList) => {
    setBatchError(null);
    const incoming = Array.from(fileList);
    if (queuedFiles.length + incoming.length > MAX_BATCH_FILES) {
      setBatchError(`Batch limit is ${MAX_BATCH_FILES} files per batch. Extra files were omitted.`);
    }

    const allowed = incoming.slice(0, Math.max(0, MAX_BATCH_FILES - queuedFiles.length));
    const readPromises = allowed.map(
      (file) =>
        new Promise<QueuedBatchFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            resolve({
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              filename: file.name,
              content: typeof ev.target?.result === "string" ? ev.target.result : ""
            });
          };
          reader.onerror = () => {
            resolve({
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              filename: file.name,
              content: ""
            });
          };
          reader.readAsText(file);
        })
    );

    const loaded = await Promise.all(readPromises);
    onChangeQueuedFiles([...queuedFiles, ...loaded]);
  };

  const handleLoadSampleBatch = () => {
    setBatchError(null);
    const samples: QueuedBatchFile[] = SAMPLE_BATCH_PROOF_SET.map((s, idx) => ({
      id: `sample-${idx}-${Date.now()}`,
      filename: s.filename,
      content: JSON.stringify(s.proof, null, 2)
    }));
    onChangeQueuedFiles(samples);
    toast("Loaded 4 sample proof files for batch inspection.", "accent");
  };

  const handleVerifyAll = async () => {
    if (queuedFiles.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setProgressTotal(queuedFiles.length);
    setProgressIndex(0);

    const results: BatchVerificationItem[] = [];
    for (let i = 0; i < queuedFiles.length; i++) {
      setProgressIndex(i + 1);
      await new Promise((r) => window.setTimeout(r, 35));

      const item = queuedFiles[i];
      const parsed = parseProofInput(item.content);
      if (!parsed.ok || !parsed.proof) {
        results.push({
          filename: item.filename,
          parseOk: false,
          parseError: parsed.errorMessage || "Invalid JSON",
          rawText: item.content
        });
      } else {
        const report = verifyProof(parsed.proof, parsed.encoding ?? "json");
        results.push({
          filename: item.filename,
          parseOk: true,
          report,
          rawText: item.content
        });
      }
    }

    setIsProcessing(false);
    onBatchComplete(results);
  };

  const handleDownloadCsv = () => {
    const csv = formatBatchCsvReport(batchResults);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tashi-batch-verification-${batchResults.length}-proofs.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("Downloaded batch verification CSV report.", "default");
  };

  const handleCopyShareableBatchLink = async () => {
    const shareUrl = buildShareableBatchUrl(batchResults);
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    toast("Link copied. The proof is embedded in the URL — no server involved.", "accent");
  };

  if (mode === "result" && batchResults.length > 0) {
    const totalCount = batchResults.length;
    const passedCount = batchResults.filter(
      (r) => r.parseOk && r.report?.verdict === "VERIFIED"
    ).length;
    const failedCount = batchResults.filter(
      (r) => !r.parseOk || r.report?.verdict === "FAILED"
    ).length;
    const warnCount = batchResults.filter(
      (r) => r.parseOk && r.report?.verdict === "VERIFIED WITH WARNINGS"
    ).length;

    return (
      <div className="fade-transition pt-[40px] sm:pt-[48px]">
        {loadedFromSharedLink && (
          <div className="mb-[16px] border-l-2 border-[#2D5A3D] pl-[8px] font-mono text-[12px] text-[#5A5449]">
            Loaded from shared link.
          </div>
        )}

        <div className="mb-[24px] flex flex-wrap items-center justify-between gap-[16px]">
          <h1 className="type-page-title">Batch Verification Result</h1>
          <button
            type="button"
            onClick={onBackToSingle}
            className="btn-ghost text-[12px] font-medium text-[#2D5A3D] cursor-pointer whitespace-nowrap shrink-0"
          >
            Back to single verification
          </button>
        </div>

        {/* Top Summary Banner */}
        <section aria-label="Batch summary">
          <div className="relative border-t border-b border-[#E5E1D8] py-[16px] pl-[23px] pr-[16px]">
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{
                backgroundColor:
                  failedCount > 0 ? "#8B3A2E" : warnCount > 0 ? "#8A6A2F" : "#2D5A3D"
              }}
            />
            <div className="font-mono text-[14px] font-semibold text-[#1A1815] tabular-nums">
              <span>{totalCount} proofs verified</span>
              <span aria-hidden="true" className="mx-[8px] text-[#9C968A]">
                ·
              </span>
              <span className="text-[#2D5A3D]">{passedCount} passed</span>
              <span aria-hidden="true" className="mx-[8px] text-[#9C968A]">
                ·
              </span>
              <span className="text-[#8B3A2E]">{failedCount} failed</span>
              <span aria-hidden="true" className="mx-[8px] text-[#9C968A]">
                ·
              </span>
              <span className="text-[#8A6A2F]">{warnCount} with warnings</span>
            </div>
          </div>
        </section>

        {/* Compact Batch Results Table */}
        <section aria-labelledby="batch-table-heading" className="mt-[32px]">
          <div className="flex items-baseline justify-between mb-[12px]">
            <h2 id="batch-table-heading" className="spec-header !mb-0">
              VERIFIED FILES ({batchResults.length})
            </h2>
            <span className="type-tertiary">Click any row to inspect proof</span>
          </div>

          <div className="mobile-table-scroll-wrap">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E5E1D8]">
                    <th className="table-header-cell py-[12px] pr-[16px]">Filename</th>
                    <th className="table-header-cell py-[12px] px-[16px] text-center">Verdict</th>
                    <th className="table-header-cell py-[12px] px-[16px]">Mesh ID</th>
                    <th className="table-header-cell py-[12px] px-[16px] text-right">
                      Participants
                    </th>
                    <th className="table-header-cell py-[12px] pl-[16px] text-right">
                      Outcome hash
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[12.5px] tabular-nums">
                  {batchResults.map((item, idx) => {
                    const verdictLabel: VerdictType | "PARSE_ERROR" =
                      item.parseOk && item.report ? item.report.verdict : "PARSE_ERROR";
                    const vColor = getVerdictColor(verdictLabel);
                    const meshId =
                      item.parseOk && item.report ? item.report.proof.mesh_id : "—";
                    const pCount =
                      item.parseOk && item.report
                        ? item.report.proof.participants.length
                        : 0;
                    const shortHash =
                      item.parseOk && item.report && item.report.proof.outcome_hash
                        ? `${item.report.proof.outcome_hash.slice(0, 8)}…`
                        : "—";

                    return (
                      <tr
                        key={`${item.filename}-${idx}`}
                        onClick={() => {
                          if (item.parseOk && item.report) {
                            onSelectBatchItem(item);
                          }
                        }}
                        tabIndex={item.parseOk ? 0 : -1}
                        role={item.parseOk ? "button" : undefined}
                        onKeyDown={(e) => {
                          if (
                            item.parseOk &&
                            item.report &&
                            (e.key === "Enter" || e.key === " ")
                          ) {
                            e.preventDefault();
                            onSelectBatchItem(item);
                          }
                        }}
                        className={`border-b border-[#E5E1D8] last:border-b-0 transition-colors duration-75 ${
                          item.parseOk
                            ? "hover:bg-[#F1EDE4] cursor-pointer"
                            : "opacity-80 cursor-not-allowed"
                        }`}
                      >
                        {/* [SECTION 8: Filename column max-width 240px with overflow ellipsis and title on hover] */}
                        <td
                          title={item.filename}
                          className="py-[12px] pr-[16px] max-w-[240px] truncate font-medium text-[#1A1815]"
                        >
                          {item.filename}
                        </td>
                        <td className="py-[12px] px-[16px] text-center whitespace-nowrap">
                          <span
                            className="inline-flex items-center justify-center gap-[8px] font-semibold"
                            style={{ color: vColor }}
                          >
                            <span
                              aria-hidden="true"
                              className="inline-block h-[8px] w-[8px] rounded-full shrink-0"
                              style={{ backgroundColor: vColor }}
                            />
                            {verdictLabel}
                          </span>
                        </td>
                        <td className="py-[12px] px-[16px] text-[#1A1815] whitespace-nowrap">
                          {meshId}
                        </td>
                        <td className="py-[12px] px-[16px] text-right text-[#5A5449] whitespace-nowrap">
                          {item.parseOk ? pCount : "—"}
                        </td>
                        <td className="py-[12px] pl-[16px] text-right text-[#5A5449] whitespace-nowrap">
                          {shortHash}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* [SECTION 8: Actions — CSV download button styled as secondary button (1px border, transparent bg)] */}
        <div className="mt-[32px] border-t border-[#E5E1D8] pt-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
          <div className="flex flex-wrap items-center gap-[16px]">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="btn-secondary w-full sm:w-auto h-[44px] sm:h-[40px] px-[16px] cursor-pointer whitespace-nowrap shrink-0"
            >
              Download CSV report
            </button>

            <button
              type="button"
              onClick={handleCopyShareableBatchLink}
              className="btn-ghost text-[13px] font-medium text-[#1A1815] cursor-pointer whitespace-nowrap shrink-0"
            >
              Copy shareable link
            </button>
          </div>

          <button
            type="button"
            onClick={onBackToBatchInput}
            className="btn-primary w-full sm:w-auto h-[44px] sm:h-[40px] px-[20px] cursor-pointer whitespace-nowrap shrink-0"
          >
            Verify another batch
          </button>
        </div>
      </div>
    );
  }

  // Batch Input Mode
  const progressPct =
    progressTotal > 0 ? Math.min(100, Math.round((progressIndex / progressTotal) * 100)) : 0;

  return (
    <div className="fade-transition pt-[40px] sm:pt-[64px]">
      <div className="mb-[32px] flex flex-wrap items-baseline justify-between gap-[16px]">
        <div>
          <h1 className="type-page-title">Batch Verification</h1>
          <p className="mt-[8px] max-w-[620px] text-[15px] leading-[1.65] text-[#5A5449]">
            Verify up to {MAX_BATCH_FILES} Proof of Coordination .json files independently in a
            single pass.
          </p>
        </div>

        <div className="flex items-center gap-[12px] text-[12px]">
          <button
            type="button"
            onClick={handleLoadSampleBatch}
            className="btn-ghost text-[12px] font-medium text-[#2D5A3D] cursor-pointer whitespace-nowrap shrink-0"
          >
            Load 4 sample proofs
          </button>
          <span aria-hidden="true" className="text-[#9C968A]">
            ·
          </span>
          <button
            type="button"
            onClick={onBackToSingle}
            className="btn-ghost text-[12px] text-[#5A5449] cursor-pointer whitespace-nowrap shrink-0"
          >
            Back to single verification
          </button>
        </div>
      </div>

      {/* Large Drag and Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop multiple .json files here, or click to select"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            readSelectedFiles(e.dataTransfer.files);
          }
        }}
        className={`flex flex-col items-center justify-center rounded-[6px] border border-dashed px-[24px] py-[48px] text-center cursor-pointer transition-colors duration-75 ${
          isDragging
            ? "border-[#2D5A3D] bg-[#FFFFFF]"
            : "border-[#E5E1D8] bg-[#FFFFFF] hover:border-[#9C968A]"
        }`}
      >
        <p className="text-[15px] font-medium text-[#1A1815]">
          Drop multiple .json files here, or click to select
        </p>
        <p className="mt-[8px] text-[12px] font-medium tracking-[0.01em] text-[#9C968A]">
          Accepts up to {MAX_BATCH_FILES} .json files per batch ({queuedFiles.length} currently
          queued)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              readSelectedFiles(e.target.files);
            }
            e.target.value = "";
          }}
          className="hidden"
        />
      </div>

      {batchError && (
        <div
          role="alert"
          className="mt-[16px] rounded-[6px] border border-[#8A6A2F] bg-[#FFFFFF] p-[16px] text-[13px] text-[#8A6A2F]"
        >
          {batchError}
        </div>
      )}

      {/* Linear Progress Bar during processing */}
      {isProcessing && (
        <div className="mt-[24px] rounded-[6px] border border-[#E5E1D8] bg-[#FFFFFF] p-[16px]">
          <div className="flex items-center justify-between font-mono text-[12.5px] text-[#1A1815] mb-[8px]">
            <span>
              Verifying {progressIndex} of {progressTotal}...
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-[4px] w-full bg-[#E5E1D8]">
            <div
              className="h-full bg-[#2D5A3D] transition-all duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Queued Files List */}
      {queuedFiles.length > 0 && !isProcessing && (
        <div className="mt-[24px]">
          <div className="flex items-center justify-between mb-[12px]">
            <h2 className="spec-header !mb-0">QUEUED FILES ({queuedFiles.length})</h2>
            <button
              type="button"
              onClick={() => onChangeQueuedFiles([])}
              className="btn-ghost text-[12px] font-medium cursor-pointer"
            >
              Clear queue
            </button>
          </div>

          <div className="mobile-table-scroll-wrap">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E5E1D8]">
                    <th className="table-header-cell py-[12px] pr-[16px]">#</th>
                    <th className="table-header-cell py-[12px] px-[16px]">Filename</th>
                    <th className="table-header-cell py-[12px] px-[16px] text-right">Size</th>
                    <th className="table-header-cell py-[12px] pl-[16px] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[12.5px] tabular-nums">
                  {queuedFiles.map((file, idx) => (
                    <tr
                      key={file.id}
                      className="border-b border-[#E5E1D8] last:border-b-0"
                    >
                      <td className="py-[12px] pr-[16px] text-[#9C968A]">{idx + 1}</td>
                      <td
                        title={file.filename}
                        className="py-[12px] px-[16px] max-w-[240px] truncate text-[#1A1815] font-medium"
                      >
                        {file.filename}
                      </td>
                      <td className="py-[12px] px-[16px] text-right text-[#5A5449]">
                        {file.content.length.toLocaleString()} B
                      </td>
                      <td className="py-[12px] pl-[16px] text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onChangeQueuedFiles(queuedFiles.filter((q) => q.id !== file.id))
                          }
                          className="font-sans text-[12px] text-[#5A5449] hover:text-[#8B3A2E] hover:underline underline-offset-[2px] cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]">
        <button
          type="button"
          onClick={handleVerifyAll}
          disabled={queuedFiles.length === 0 || isProcessing}
          className="btn-primary w-full sm:w-auto min-w-[140px] h-[44px] sm:h-[40px] px-[24px] cursor-pointer whitespace-nowrap shrink-0"
        >
          Verify all
        </button>

        {queuedFiles.length > 0 && (
          <button
            type="button"
            onClick={() => onChangeQueuedFiles([])}
            disabled={isProcessing}
            className="btn-ghost w-full sm:w-auto justify-center h-[44px] sm:h-[40px] text-[13px] cursor-pointer whitespace-nowrap shrink-0"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
