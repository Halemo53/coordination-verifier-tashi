import React from "react";
import { RecentVerificationEntry, VerdictType } from "../types/proof";

/* ============================================================================
 * [SECTION 1: GLOBAL SPACING & RHYTHM]
 * [SECTION 3: ALIGNMENT & OPTICAL BALANCE — Tables: left text, center status, right numeric]
 * [SECTION 12: MOBILE — PROPORTIONAL — Horizontal scroll with right-edge fade hint]
 * ============================================================================ */

interface RecentVerificationsProps {
  entries: RecentVerificationEntry[];
  onSelectEntry: (entry: RecentVerificationEntry) => void;
  onClearHistory: () => void;
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

function formatTimestamp(ts: number): string {
  try {
    const d = new Date(ts);
    return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return String(ts);
  }
}

export const RecentVerifications: React.FC<RecentVerificationsProps> = ({
  entries,
  onSelectEntry,
  onClearHistory
}) => {
  return (
    <section
      aria-labelledby="recent-verifications-heading"
      className="border-t border-[#E5E1D8] pt-[32px] mt-[32px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-[16px] mb-[12px]">
        <h2 id="recent-verifications-heading" className="spec-header !mb-0">
          Recent verifications (stored locally in this browser only)
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="btn-ghost text-[12px] font-medium cursor-pointer whitespace-nowrap shrink-0"
          >
            Clear history
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="type-secondary py-[8px]">
          No local verification history recorded in this browser yet. Verified proofs (up to 10)
          appear here for one-click inspection.
        </p>
      ) : (
        <div className="mobile-table-scroll-wrap">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E5E1D8]">
                  <th className="table-header-cell py-[12px] pr-[16px]">Mesh ID</th>
                  <th className="table-header-cell py-[12px] px-[16px] text-center">Verdict</th>
                  <th className="table-header-cell py-[12px] px-[16px] text-right">
                    Participants
                  </th>
                  <th className="table-header-cell py-[12px] pl-[16px] text-right">
                    Verified (UTC)
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const dotColor = getVerdictColor(entry.verdict);
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => onSelectEntry(entry)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Reload verification for mesh ${entry.mesh_id} with verdict ${entry.verdict}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectEntry(entry);
                        }
                      }}
                      className="border-b border-[#E5E1D8] last:border-b-0 hover:bg-[#F1EDE4] transition-colors duration-75 cursor-pointer font-mono text-[12.5px] tabular-nums"
                    >
                      <td className="py-[12px] pr-[16px] text-[#1A1815] font-medium whitespace-nowrap">
                        {entry.mesh_id}
                      </td>
                      <td className="py-[12px] px-[16px] text-center whitespace-nowrap">
                        <span
                          className="inline-flex items-center justify-center gap-[8px] font-medium"
                          style={{ color: dotColor }}
                        >
                          <span
                            aria-hidden="true"
                            className="inline-block h-[8px] w-[8px] rounded-full shrink-0"
                            style={{ backgroundColor: dotColor }}
                          />
                          {entry.verdict}
                        </span>
                      </td>
                      <td className="py-[12px] px-[16px] text-right text-[#5A5449] whitespace-nowrap">
                        {entry.participant_count}
                      </td>
                      <td className="py-[12px] pl-[16px] text-right text-[#9C968A] whitespace-nowrap">
                        {formatTimestamp(entry.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
