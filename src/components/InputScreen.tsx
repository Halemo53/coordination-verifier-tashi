import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ParseResult, RecentVerificationEntry } from "../types/proof";
import { parseProofInput } from "../lib/verifier";
import { RecentVerifications } from "./RecentVerifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "./ui/dialog";

/* ============================================================================
 * [SECTION 6: INPUT SCREEN — REFINE THE FOCAL POINT]
 * [SECTION 9: MICRO-INTERACTIONS — RESTRAINED (snap textarea auto-grow, 150ms chevron)]
 * [SECTION 12: MOBILE — PROPORTIONAL (40px top padding mobile, 64px desktop)]
 * ============================================================================ */

interface InputScreenProps {
  rawInput: string;
  onChangeInput: (val: string) => void;
  onLoadValidExample: () => void;
  onLoadTamperedExample: () => void;
  onVerify: () => void;
  onClear: () => void;
  submittedError: ParseResult | null;
  recentEntries: RecentVerificationEntry[];
  onSelectRecentEntry: (entry: RecentVerificationEntry) => void;
  onClearHistory: () => void;
  onSwitchToCompare: () => void;
  onSwitchToBatch: () => void;
  onOpenAbout: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  explainerOpenExternal?: boolean;
  onExplainerOpenChange?: (open: boolean) => void;
}

const INLINE_EXPLAINER_CHECKS = [
  "Schema validity — all required fields are present.",
  "Timestamp sanity — end time is after start time; window is reasonable.",
  "Participant authorization — every participant was authorized for this mesh.",
  "Signature presence — every participant signed.",
  "Signature validity — signatures verify against public keys.",
  "Supermajority — valid signatures meet the threshold.",
  "DAG integrity — no forward references or cycles.",
  "Reputation eligibility — flags participants below neutral (1.0)."
];

export const InputScreen: React.FC<InputScreenProps> = ({
  rawInput,
  onChangeInput,
  onLoadValidExample,
  onLoadTamperedExample,
  onVerify,
  onClear,
  submittedError,
  recentEntries,
  onSelectRecentEntry,
  onClearHistory,
  onSwitchToCompare,
  onSwitchToBatch,
  onOpenAbout,
  textareaRef,
  explainerOpenExternal,
  onExplainerOpenChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [internalExplainerOpen, setInternalExplainerOpen] = useState(false);
  const [fetchUrlOpen, setFetchUrlOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resolvedTextareaRef = textareaRef || localTextareaRef;

  const explainerOpen =
    explainerOpenExternal !== undefined ? explainerOpenExternal : internalExplainerOpen;

  const toggleExplainer = () => {
    const next = !explainerOpen;
    setInternalExplainerOpen(next);
    onExplainerOpenChange?.(next);
  };

  /* [SECTION 6 & 9: Textarea min-height 220px, auto-grow up to 480px, snap with no animation] */
  useEffect(() => {
    const el = resolvedTextareaRef.current;
    if (!el) return;
    el.style.height = "220px";
    const nextHeight = Math.min(480, Math.max(220, el.scrollHeight));
    el.style.height = `${nextHeight}px`;
  }, [rawInput, resolvedTextareaRef]);

  const liveParse = useMemo(() => {
    if (!rawInput.trim()) return null;
    return parseProofInput(rawInput);
  }, [rawInput]);

  const activeError =
    submittedError && !submittedError.ok
      ? submittedError
      : liveParse && !liveParse.ok
        ? liveParse
        : null;

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const readFileContent = (file: File) => {
    setFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = typeof event.target?.result === "string" ? event.target.result : "";
      onChangeInput(text);
    };
    reader.onerror = () => {
      setFileError("Unable to read the dropped file. Verify file permissions and encoding.");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    readFileContent(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFileContent(file);
    }
    e.target.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && rawInput.trim().length > 0) {
      e.preventDefault();
      onVerify();
    }
  };

  const handlePasteFromClipboard = async () => {
    setFileError(null);
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        setFileError("Clipboard access was denied by your browser.");
        return;
      }
      const text = await navigator.clipboard.readText();
      onChangeInput(text);
    } catch {
      setFileError("Clipboard access was denied by your browser.");
    }
  };

  const handleFetchFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUrl = urlInput.trim();
    if (!targetUrl) return;
    setUrlFetching(true);
    setUrlError(null);
    setFileError(null);

    try {
      const response = await fetch(targetUrl, {
        headers: { Accept: "application/json, text/plain, */*" }
      });
      if (!response.ok) {
        setUrlError(`HTTP ${response.status}: Failed to retrieve proof from URL.`);
        setUrlFetching(false);
        return;
      }
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        onChangeInput(JSON.stringify(parsed, null, 2));
      } catch {
        onChangeInput(text);
      }
      setFetchUrlOpen(false);
      setUrlInput("");
    } catch {
      setUrlError(
        "This URL blocked the fetch (CORS). Try downloading the file and dropping it here instead."
      );
    } finally {
      setUrlFetching(false);
    }
  };

  const parsedProof = liveParse?.ok ? liveParse.proof : undefined;
  const windowMs =
    parsedProof &&
    typeof parsedProof.timestamp_end === "number" &&
    typeof parsedProof.timestamp_start === "number"
      ? parsedProof.timestamp_end - parsedProof.timestamp_start
      : null;

  return (
    <div className="fade-transition pt-[40px] sm:pt-[64px]">
      {/* [SECTION 6: Subtitle — max-w-[620px], 15px, #5A5449, line-height 1.65, mb-[32px]] */}
      <p className="max-w-[620px] text-[15px] leading-[1.65] text-[#5A5449] mb-[32px]">
        An independent verifier for Tashi&apos;s Proof of Coordination records. Runs entirely in
        your browser. No data leaves this page.
      </p>

      {/* [SECTION 6: "What this tool checks" collapsible — mb-[24px], 8px item spacing, 12px left indent, 90deg chevron] */}
      <div className="mb-[24px]">
        <button
          type="button"
          onClick={toggleExplainer}
          aria-expanded={explainerOpen}
          className="btn-ghost gap-[4px] text-[13px] font-medium cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>What this tool checks</span>
          <ChevronRight
            className={`h-[14px] w-[14px] text-[#5A5449] transition-transform duration-150 ease-out ${
              explainerOpen ? "rotate-90" : "rotate-0"
            }`}
          />
        </button>

        {explainerOpen && (
          <div className="mt-[8px] border-l border-[#E5E1D8] pl-[12px] space-y-[8px] text-[13px] leading-[1.6] text-[#5A5449]">
            {INLINE_EXPLAINER_CHECKS.map((line) => (
              <div key={line}>· {line}</div>
            ))}
            <div className="pt-[4px] text-[12px] font-medium tracking-[0.01em] text-[#9C968A]">
              Full methodology in the{" "}
              <button
                type="button"
                onClick={onOpenAbout}
                className="text-[#2D5A3D] underline underline-offset-[2px] hover:text-[#1A1815] cursor-pointer"
              >
                About dialog
              </button>
              .
            </div>
          </div>
        )}
      </div>

      {/* [SECTION 6: Textarea block] */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-[8px] mb-[12px]">
          <label htmlFor="proof-input-textarea" className="spec-header !mb-0">
            Paste a Proof of Coordination (JSON or base64)
          </label>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost text-[12px] font-medium cursor-pointer whitespace-nowrap shrink-0"
          >
            Load .json file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,text/plain"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload a Proof of Coordination JSON file"
          />
        </div>

        <div className="relative">
          <textarea
            ref={resolvedTextareaRef}
            id="proof-input-textarea"
            value={rawInput}
            onChange={(e) => {
              setFileError(null);
              onChangeInput(e.target.value);
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            placeholder={'{\n  "version": "1.0",\n  "mesh_id": "mesh-vertex-eu-central-042",\n  "outcome_hash": "...",\n  "participants": [...],\n  "events": [...],\n  "signatures": [...]\n}'}
            className={`proof-textarea w-full min-h-[220px] max-h-[480px] overflow-y-auto resize-none block ${
              isDragging
                ? "!border-[#2D5A3D] !bg-[#F7F5F0]"
                : activeError || fileError
                  ? "!border-[#8B3A2E]"
                  : ""
            }`}
          />
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[6px] border-2 border-dashed border-[#2D5A3D] bg-[#F7F5F0]/90 text-[13px] font-medium text-[#2D5A3D]">
              Drop .json proof file to load
            </div>
          )}
        </div>

        {/* [SECTION 6: Below textarea — 12px gap, then Paste from clipboard · Fetch from URL ... auto margin ... Load example proof] */}
        <div className="mt-[12px] flex flex-wrap items-center gap-[8px] text-[12px]">
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="btn-ghost text-[12px] text-[#5A5449] cursor-pointer whitespace-nowrap shrink-0"
          >
            Paste from clipboard
          </button>
          <span aria-hidden="true" className="text-[#9C968A]">
            ·
          </span>
          <button
            type="button"
            onClick={() => {
              setUrlError(null);
              setFetchUrlOpen(true);
            }}
            className="btn-ghost text-[12px] text-[#5A5449] cursor-pointer whitespace-nowrap shrink-0"
          >
            Fetch from URL
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-[8px]">
            <button
              type="button"
              onClick={onLoadValidExample}
              className="btn-ghost text-[12px] font-medium text-[#2D5A3D] cursor-pointer whitespace-nowrap shrink-0"
            >
              Load example proof
            </button>
            <span aria-hidden="true" className="text-[#9C968A]">
              ·
            </span>
            <button
              type="button"
              onClick={onLoadTamperedExample}
              className="btn-ghost text-[12px] text-[#5A5449] cursor-pointer whitespace-nowrap shrink-0"
            >
              Load tampered example
            </button>
          </div>
        </div>
      </div>

      {/* [SECTION 10: Fetch from URL Dialog] */}
      <Dialog open={fetchUrlOpen} onOpenChange={setFetchUrlOpen}>
        <DialogContent aria-describedby="fetch-url-dialog-description">
          <DialogHeader>
            <DialogTitle>Fetch Proof from URL</DialogTitle>
            <DialogDescription id="fetch-url-dialog-description">
              Load a Proof of Coordination record directly from a remote endpoint.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFetchFromUrl} className="mt-[16px] space-y-[16px]">
            <div>
              <label
                htmlFor="proof-remote-url-input"
                className="block text-[13px] font-medium text-[#1A1815] mb-[8px]"
              >
                Paste a URL to a .json proof
              </label>
              <input
                id="proof-remote-url-input"
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.org/proof-of-coordination.json"
                className="w-full h-[40px] rounded-[4px] border border-[#E5E1D8] bg-[#FFFFFF] px-[12px] font-mono text-[12.5px] text-[#1A1815] placeholder:text-[#9C968A]"
              />
              <p className="mt-[8px] text-[12px] font-medium text-[#8A6A2F]">
                The URL you fetch will see your IP address. Only use URLs you trust.
              </p>
            </div>

            {urlError && (
              <div
                role="alert"
                className="rounded-[4px] border border-[#8B3A2E] bg-[#F7F5F0] p-[12px] text-[13px] text-[#8B3A2E]"
              >
                {urlError}
              </div>
            )}

            <div className="flex items-center justify-end gap-[12px] pt-[8px]">
              <button
                type="button"
                onClick={() => setFetchUrlOpen(false)}
                className="btn-secondary px-[16px] cursor-pointer whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={urlFetching || !urlInput.trim()}
                className="btn-primary px-[16px] cursor-pointer whitespace-nowrap shrink-0"
              >
                {urlFetching ? "Fetching..." : "Fetch proof"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Parsing Stage Status Panel */}
      {fileError && (
        <div
          role="alert"
          className="mt-[24px] rounded-[6px] border border-[#8B3A2E] bg-[#FFFFFF] p-[16px] text-[13px]"
        >
          <div className="flex items-center gap-[8px] font-semibold text-[#8B3A2E]">
            <span
              aria-hidden="true"
              className="inline-block h-[8px] w-[8px] rounded-full bg-[#8B3A2E]"
            />
            <span>Input error</span>
          </div>
          <p className="mt-[8px] text-[#1A1815]">{fileError}</p>
        </div>
      )}

      {activeError && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-[24px] rounded-[6px] border border-[#8B3A2E] bg-[#FFFFFF] p-[16px] text-[13px]"
        >
          <div className="flex items-center gap-[8px] font-semibold text-[#8B3A2E]">
            <span
              aria-hidden="true"
              className="inline-block h-[8px] w-[8px] rounded-full bg-[#8B3A2E]"
            />
            <span>{activeError.errorTitle || "Parse error"}</span>
          </div>
          <p className="mt-[8px] text-[#1A1815] leading-[1.6]">{activeError.errorMessage}</p>
          {activeError.errorHint && (
            <p className="mt-[8px] font-mono text-[12.5px] text-[#5A5449]">
              Parser detail: {activeError.errorHint}
            </p>
          )}
        </div>
      )}

      {liveParse?.ok && parsedProof && (
        <div
          role="status"
          aria-live="polite"
          className="mt-[24px] flex flex-wrap items-center justify-between gap-[12px] rounded-[6px] border border-[#E5E1D8] bg-[#FFFFFF] px-[16px] py-[12px] text-[13px]"
        >
          <div className="flex items-center gap-[8px]">
            <span
              aria-hidden="true"
              className="inline-block h-[8px] w-[8px] rounded-full bg-[#2D5A3D] shrink-0"
            />
            <span className="font-semibold text-[#2D5A3D]">Parsed OK</span>
            {liveParse.encoding === "base64" && (
              <span className="text-[12px] text-[#9C968A]">(decoded from base64)</span>
            )}
          </div>
          <div className="font-mono text-[12.5px] text-[#5A5449] tabular-nums">
            <span className="text-[#1A1815] font-medium">{parsedProof.mesh_id}</span>
            <span aria-hidden="true" className="mx-[8px] text-[#9C968A]">
              ·
            </span>
            <span>
              {Array.isArray(parsedProof.participants) ? parsedProof.participants.length : 0}{" "}
              participants
            </span>
            <span aria-hidden="true" className="mx-[8px] text-[#9C968A]">
              ·
            </span>
            <span>
              {Array.isArray(parsedProof.events) ? parsedProof.events.length : 0} events
            </span>
            <span aria-hidden="true" className="mx-[8px] text-[#9C968A]">
              ·
            </span>
            <span>{windowMs !== null ? `${windowMs.toLocaleString()}ms window` : "—"}</span>
          </div>
        </div>
      )}

      {/* [SECTION 6 & 12: Actions row — 24px top margin. Left: Verify proof (min-w 140px, 40px/44px height). Right: Clear text button] */}
      <div className="mt-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-[12px]">
        <button
          type="button"
          onClick={onVerify}
          disabled={rawInput.trim().length === 0}
          className="btn-primary w-full sm:w-auto min-w-[140px] h-[44px] sm:h-[40px] px-[24px] cursor-pointer whitespace-nowrap shrink-0"
        >
          Verify proof
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={rawInput.length === 0}
          className="btn-ghost w-full sm:w-auto justify-center h-[44px] sm:h-[40px] text-[13px] cursor-pointer whitespace-nowrap shrink-0"
        >
          Clear
        </button>
      </div>

      {/* [SECTION 6: Compare & Batch links BELOW actions row, separated by 16px, single horizontal row with 24px gap] */}
      <div className="mt-[16px] flex flex-wrap items-center gap-[24px] text-[12px]">
        <button
          type="button"
          onClick={onSwitchToCompare}
          className="btn-ghost text-[12px] text-[#5A5449] cursor-pointer whitespace-nowrap shrink-0"
        >
          Compare two proofs instead
        </button>

        <button
          type="button"
          onClick={onSwitchToBatch}
          className="btn-ghost text-[12px] text-[#5A5449] cursor-pointer whitespace-nowrap shrink-0"
        >
          Verify multiple proofs at once
        </button>
      </div>

      {/* Recent Verifications (localStorage, max 10) */}
      <RecentVerifications
        entries={recentEntries}
        onSelectEntry={onSelectRecentEntry}
        onClearHistory={onClearHistory}
      />
    </div>
  );
};
