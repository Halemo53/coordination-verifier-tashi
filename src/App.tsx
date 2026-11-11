/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { InputScreen } from "./components/InputScreen";
import { ResultScreen } from "./components/ResultScreen";
import { CompareScreen } from "./components/CompareScreen";
import { BatchScreen, QueuedBatchFile } from "./components/BatchScreen";
import { ToastProvider, useToast } from "./components/ui/toast";
import { VALID_EXAMPLE_PROOF, TAMPERED_EXAMPLE_PROOF } from "./data/examples";
import {
  buildShareableProofUrl,
  decodeBatchFromHashPayload,
  decodeProofFromHashPayload,
  encodeBatchToHashPayload,
  encodeProofToHashPayload,
  formatPlainTextReport,
  parseProofInput,
  verifyProof
} from "./lib/verifier";
import {
  AppRoute,
  BatchVerificationItem,
  ParseResult,
  RecentVerificationEntry,
  VerificationReport
} from "./types/proof";

const STORAGE_KEY = "tashi_coordination_verifier_recent_v1";
const MAX_RECENT = 10;

function loadRecentEntries(): RecentVerificationEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function saveRecentEntries(entries: RecentVerificationEntry[]) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_RECENT))
    );
  } catch {
    // Ignore storage quota errors
  }
}

function setHashQuietly(hashValue: string) {
  try {
    window.history.replaceState(null, "", hashValue);
  } catch {
    window.location.hash = hashValue;
  }
}

function VerifierWorkspace() {
  const { toast } = useToast();
  const [route, setRoute] = useState<AppRoute>("input");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  // Single verification state
  const [rawInput, setRawInput] = useState<string>("");
  const [submittedError, setSubmittedError] = useState<ParseResult | null>(null);
  const [activeReport, setActiveReport] = useState<VerificationReport | null>(null);
  const [viewedFromBatch, setViewedFromBatch] = useState<boolean>(false);

  // Comparison mode state
  const [compareFirstInput, setCompareFirstInput] = useState<string>("");
  const [compareSecondInput, setCompareSecondInput] = useState<string>("");
  const [compareFirstReport, setCompareFirstReport] =
    useState<VerificationReport | null>(null);
  const [compareSecondReport, setCompareSecondReport] =
    useState<VerificationReport | null>(null);
  const [compareFirstError, setCompareFirstError] = useState<ParseResult | null>(null);
  const [compareSecondError, setCompareSecondError] = useState<ParseResult | null>(null);

  // Batch mode state
  const [queuedBatchFiles, setQueuedBatchFiles] = useState<QueuedBatchFile[]>([]);
  const [batchResults, setBatchResults] = useState<BatchVerificationItem[]>([]);
  const [batchLoadedFromSharedLink, setBatchLoadedFromSharedLink] = useState(false);

  // Local history
  const [recentEntries, setRecentEntries] = useState<RecentVerificationEntry[]>(() =>
    loadRecentEntries()
  );

  const singleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const compareFirstTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    saveRecentEntries(recentEntries);
  }, [recentEntries]);

  const recordRecentVerification = useCallback((report: VerificationReport) => {
    const newEntry: RecentVerificationEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: report.verifiedAt,
      mesh_id: report.proof.mesh_id,
      verdict: report.verdict,
      participant_count: Array.isArray(report.proof.participants)
        ? report.proof.participants.length
        : 0,
      event_count: Array.isArray(report.proof.events) ? report.proof.events.length : 0,
      window_ms: report.windowMs,
      raw_proof: JSON.stringify(report.proof, null, 2)
    };

    setRecentEntries((prev) => {
      const filtered = prev.filter(
        (item) =>
          !(
            item.mesh_id === newEntry.mesh_id &&
            item.verdict === newEntry.verdict &&
            item.raw_proof === newEntry.raw_proof
          )
      );
      return [newEntry, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  // Lightweight custom hash router (< 80 lines)
  useEffect(() => {
    const syncFromLocationHash = () => {
      const rawHash = window.location.hash || "";
      const clean = rawHash.replace(/^#\/?/, "");

      if (clean.startsWith("proof=")) {
        const compressed = clean.slice("proof=".length);
        const decodedProof = decodeProofFromHashPayload(compressed);
        if (!decodedProof) {
          setSubmittedError({
            ok: false,
            errorTitle: "Corrupted shared link",
            errorMessage: "The proof in this link is corrupted or incomplete."
          });
          setActiveReport(null);
          setRoute("input");
          return;
        }
        const formatted = JSON.stringify(decodedProof, null, 2);
        setRawInput(formatted);
        setSubmittedError(null);
        const report = verifyProof(decodedProof, "json");
        report.loadedFromSharedLink = true;
        setActiveReport(report);
        setViewedFromBatch(false);
        setRoute("result");
        return;
      }

      if (clean.startsWith("batch=")) {
        const compressed = clean.slice("batch=".length);
        const decodedBatch = decodeBatchFromHashPayload(compressed);
        if (!decodedBatch || decodedBatch.length === 0) {
          setSubmittedError({
            ok: false,
            errorTitle: "Corrupted shared link",
            errorMessage: "The proof in this link is corrupted or incomplete."
          });
          setRoute("input");
          return;
        }
        setBatchResults(decodedBatch);
        setBatchLoadedFromSharedLink(true);
        setRoute("batch-result");
        return;
      }

      const routeMap: Record<string, AppRoute> = {
        "": "input",
        result: "result",
        compare: "compare",
        "compare-result": "compare-result",
        batch: "batch",
        "batch-result": "batch-result"
      };
      const mapped = routeMap[clean];
      if (mapped) {
        setRoute(mapped);
      } else {
        setRoute("input");
      }
    };

    syncFromLocationHash();
    window.addEventListener("hashchange", syncFromLocationHash);
    return () => window.removeEventListener("hashchange", syncFromLocationHash);
  }, []);

  const navigateToRoute = useCallback((nextRoute: AppRoute, customHash?: string) => {
    setRoute(nextRoute);
    if (customHash !== undefined) {
      setHashQuietly(customHash);
    } else if (nextRoute === "input") {
      setHashQuietly("#/");
    } else {
      setHashQuietly(`#/${nextRoute}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setRawInput(value);
    setSubmittedError(null);
  }, []);

  const handleLoadValidExample = useCallback(() => {
    const formatted = JSON.stringify(VALID_EXAMPLE_PROOF, null, 2);
    setRawInput(formatted);
    setSubmittedError(null);
    toast("Loaded valid example proof (4 participants, 6 DAG events).", "accent");
  }, [toast]);

  const handleLoadTamperedExample = useCallback(() => {
    const formatted = JSON.stringify(TAMPERED_EXAMPLE_PROOF, null, 2);
    setRawInput(formatted);
    setSubmittedError(null);
    toast("Loaded tampered example proof (unauthorized node + corrupted signature).", "danger");
  }, [toast]);

  const handleClearInput = useCallback(() => {
    setRawInput("");
    setSubmittedError(null);
  }, []);

  const runVerificationAndRecord = useCallback(
    (inputStr: string, fromSharedLink = false) => {
      const parseRes = parseProofInput(inputStr);
      if (!parseRes.ok || !parseRes.proof) {
        setSubmittedError(parseRes);
        navigateToRoute("input", "#/");
        return;
      }

      setSubmittedError(null);
      const report = verifyProof(parseRes.proof, parseRes.encoding ?? "json");
      report.loadedFromSharedLink = fromSharedLink;
      setActiveReport(report);
      setViewedFromBatch(false);

      const compressedPayload = encodeProofToHashPayload(report.proof);
      navigateToRoute("result", `#proof=${compressedPayload}`);
      recordRecentVerification(report);
    },
    [navigateToRoute, recordRecentVerification]
  );

  const handleVerifyClick = useCallback(() => {
    runVerificationAndRecord(rawInput, false);
  }, [rawInput, runVerificationAndRecord]);

  const handleVerifyAnother = useCallback(() => {
    setRawInput("");
    setSubmittedError(null);
    setActiveReport(null);
    setViewedFromBatch(false);
    navigateToRoute("input", "#/");
  }, [navigateToRoute]);

  const handleEditCurrentProof = useCallback(() => {
    if (activeReport) {
      setRawInput(JSON.stringify(activeReport.proof, null, 2));
    }
    setSubmittedError(null);
    setViewedFromBatch(false);
    navigateToRoute("input", "#/");
  }, [activeReport, navigateToRoute]);

  const handleSelectRecentEntry = useCallback(
    (entry: RecentVerificationEntry) => {
      setRawInput(entry.raw_proof);
      runVerificationAndRecord(entry.raw_proof, false);
    },
    [runVerificationAndRecord]
  );

  const handleClearHistory = useCallback(() => {
    setRecentEntries([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    toast("Cleared local verification history.", "default");
  }, [toast]);

  const handleSubmitCompare = useCallback(() => {
    const p1 = parseProofInput(compareFirstInput);
    const p2 = parseProofInput(compareSecondInput);
    setCompareFirstError(p1.ok ? null : p1);
    setCompareSecondError(p2.ok ? null : p2);

    if (!p1.ok || !p1.proof || !p2.ok || !p2.proof) {
      return;
    }

    const r1 = verifyProof(p1.proof, p1.encoding ?? "json");
    const r2 = verifyProof(p2.proof, p2.encoding ?? "json");
    setCompareFirstReport(r1);
    setCompareSecondReport(r2);
    navigateToRoute("compare-result", "#/compare-result");
  }, [compareFirstInput, compareSecondInput, navigateToRoute]);

  const handleBatchComplete = useCallback(
    (results: BatchVerificationItem[]) => {
      setBatchResults(results);
      setBatchLoadedFromSharedLink(false);
      const validOnes = results.filter((r) => r.parseOk && r.report);
      if (validOnes.length > 0) {
        const compressedBatch = encodeBatchToHashPayload(results);
        navigateToRoute("batch-result", `#batch=${compressedBatch}`);
      } else {
        navigateToRoute("batch-result", "#/batch-result");
      }
    },
    [navigateToRoute]
  );

  const handleSelectBatchItem = useCallback(
    (item: BatchVerificationItem) => {
      if (!item.report) return;
      setActiveReport(item.report);
      setRawInput(item.rawText);
      setViewedFromBatch(true);
      const compressedPayload = encodeProofToHashPayload(item.report.proof);
      navigateToRoute("result", `#proof=${compressedPayload}`);
    },
    [navigateToRoute]
  );

  // Single root keydown listener for keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase() || "";
      const isEditable =
        tagName === "input" ||
        tagName === "textarea" ||
        target?.isContentEditable === true;

      // Cmd/Ctrl + Enter — Verify proof (allowed while textarea is focused)
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (route === "input" && rawInput.trim().length > 0) {
          e.preventDefault();
          handleVerifyClick();
        } else if (
          route === "compare" &&
          compareFirstInput.trim().length > 0 &&
          compareSecondInput.trim().length > 0
        ) {
          e.preventDefault();
          handleSubmitCompare();
        }
        return;
      }

      if (isEditable) return;

      // Cmd/Ctrl + K — Focus textarea / paste area
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K") && !e.shiftKey) {
        e.preventDefault();
        if (route === "compare") {
          compareFirstTextareaRef.current?.focus();
        } else if (route === "input") {
          singleTextareaRef.current?.focus();
        } else {
          navigateToRoute("input", "#/");
          window.setTimeout(() => singleTextareaRef.current?.focus(), 40);
        }
        return;
      }

      // Cmd/Ctrl + Shift + C — Copy verification report (in result mode)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === "c" || e.key === "C") &&
        route === "result" &&
        activeReport
      ) {
        e.preventDefault();
        const reportText = formatPlainTextReport(activeReport);
        navigator.clipboard?.writeText(reportText).catch(() => {});
        toast("Verification report copied to clipboard.", "accent");
        return;
      }

      // Cmd/Ctrl + Shift + L — Copy shareable link (in result mode)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === "l" || e.key === "L") &&
        route === "result" &&
        activeReport
      ) {
        e.preventDefault();
        const shareUrl = buildShareableProofUrl(activeReport.proof);
        navigator.clipboard?.writeText(shareUrl).catch(() => {});
        toast(
          "Link copied. The proof is embedded in the URL — no server involved.",
          "accent"
        );
        return;
      }

      // Esc — Return to input screen from result mode (if no dialog is open)
      if (e.key === "Escape" && !aboutOpen && !shortcutsOpen) {
        if (route === "result") {
          e.preventDefault();
          navigateToRoute("input", "#/");
        } else if (route === "compare-result") {
          e.preventDefault();
          navigateToRoute("compare", "#/compare");
        } else if (route === "batch-result") {
          e.preventDefault();
          navigateToRoute("batch", "#/batch");
        }
        return;
      }

      // ? — Open keyboard shortcuts dialog
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    route,
    rawInput,
    compareFirstInput,
    compareSecondInput,
    activeReport,
    aboutOpen,
    shortcutsOpen,
    handleVerifyClick,
    handleSubmitCompare,
    navigateToRoute,
    toast
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-[#1A1815]">
      <Header
        onResetToInput={() => navigateToRoute("input", "#/")}
        onShowChecksExplainer={() => {
          setExplainerOpen(true);
          navigateToRoute("input", "#/");
        }}
        aboutOpen={aboutOpen}
        onAboutOpenChange={setAboutOpen}
        shortcutsOpen={shortcutsOpen}
        onShortcutsOpenChange={setShortcutsOpen}
      />

      {/* [SECTION 1, 3, 12: Single content column max-width 880px, centered, 20px mobile / 32px tablet / 48px desktop horizontal padding, 64px bottom padding] */}
      <main className="flex-1 w-full mx-auto max-w-[880px] px-[20px] sm:px-[32px] md:px-[48px] pb-[64px]">
        {route === "compare" || route === "compare-result" ? (
          <CompareScreen
            mode={route === "compare-result" && compareFirstReport && compareSecondReport ? "result" : "input"}
            firstInput={compareFirstInput}
            secondInput={compareSecondInput}
            onChangeFirstInput={(val) => {
              setCompareFirstInput(val);
              setCompareFirstError(null);
            }}
            onChangeSecondInput={(val) => {
              setCompareSecondInput(val);
              setCompareSecondError(null);
            }}
            firstReport={compareFirstReport}
            secondReport={compareSecondReport}
            firstError={compareFirstError}
            secondError={compareSecondError}
            onSubmitCompare={handleSubmitCompare}
            onBackToCompareInput={() => navigateToRoute("compare", "#/compare")}
            onBackToSingle={() => navigateToRoute("input", "#/")}
            firstTextareaRef={compareFirstTextareaRef}
          />
        ) : route === "batch" || route === "batch-result" ? (
          <BatchScreen
            mode={route === "batch-result" && batchResults.length > 0 ? "result" : "input"}
            queuedFiles={queuedBatchFiles}
            onChangeQueuedFiles={setQueuedBatchFiles}
            batchResults={batchResults}
            onBatchComplete={handleBatchComplete}
            onSelectBatchItem={handleSelectBatchItem}
            onBackToBatchInput={() => navigateToRoute("batch", "#/batch")}
            onBackToSingle={() => navigateToRoute("input", "#/")}
            loadedFromSharedLink={batchLoadedFromSharedLink}
          />
        ) : route === "result" && activeReport ? (
          <ResultScreen
            report={activeReport}
            onVerifyAnother={handleVerifyAnother}
            onEditCurrentProof={handleEditCurrentProof}
            recentEntries={recentEntries}
            onSelectRecentEntry={handleSelectRecentEntry}
            onClearHistory={handleClearHistory}
            onBackToBatchResults={
              viewedFromBatch && batchResults.length > 0
                ? () => {
                    const compressedBatch = encodeBatchToHashPayload(batchResults);
                    navigateToRoute("batch-result", `#batch=${compressedBatch}`);
                  }
                : undefined
            }
          />
        ) : (
          <InputScreen
            rawInput={rawInput}
            onChangeInput={handleInputChange}
            onLoadValidExample={handleLoadValidExample}
            onLoadTamperedExample={handleLoadTamperedExample}
            onVerify={handleVerifyClick}
            onClear={handleClearInput}
            submittedError={submittedError}
            recentEntries={recentEntries}
            onSelectRecentEntry={handleSelectRecentEntry}
            onClearHistory={handleClearHistory}
            onSwitchToCompare={() => navigateToRoute("compare", "#/compare")}
            onSwitchToBatch={() => navigateToRoute("batch", "#/batch")}
            onOpenAbout={() => setAboutOpen(true)}
            textareaRef={singleTextareaRef}
            explainerOpenExternal={explainerOpen}
            onExplainerOpenChange={setExplainerOpen}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <VerifierWorkspace />
    </ToastProvider>
  );
}

