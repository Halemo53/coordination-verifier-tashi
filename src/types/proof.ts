export interface ProofOfCoordination {
  version: string;                    // e.g. "1.0"
  mesh_id: string;                    // identifier of the mesh that produced this proof
  outcome_hash: string;               // hex hash of the finalized outcome
  timestamp_start: number;            // unix ms
  timestamp_end: number;              // unix ms
  participants: Participant[];        // list of participants
  events: EventRecord[];              // ordered events that led to finality
  supermajority_threshold: number;    // e.g. 0.667
  signatures: Signature[];            // multi-signatures over outcome_hash
  metadata?: Record<string, unknown>; // optional free-form
}

export interface Participant {
  id: string;
  public_key: string;                 // hex or base64 ed25519 public key
  role: "resource" | "orchestration";
  reputation: number;                 // 0.0 – 2.0 scale (per Tashi docs)
  authorized: boolean;                // whether participant was authorized for this mesh
}

export interface EventRecord {
  index: number;
  event_hash: string;
  sender_id: string;
  references: string[];               // hashes of referenced events (DAG structure)
  timestamp: number;
}

export interface Signature {
  participant_id: string;
  signature: string;                  // hex or base64
}

export type CheckStatus = "pass" | "fail" | "warn";

export interface VerificationCheck {
  id: string;
  label: string;
  status: CheckStatus;
  details: string;
  rawOutput: string[];
}

export type VerdictType = "VERIFIED" | "FAILED" | "VERIFIED WITH WARNINGS";

export interface SignatureVerificationResult {
  participant_id: string;
  signature_preview: string;
  public_key_preview: string;
  authorized: boolean;
  valid: boolean;
  reason: string;
}

export interface VerificationReport {
  verdict: VerdictType;
  verdictSentence: string;
  proof: ProofOfCoordination;
  windowMs: number;
  checks: VerificationCheck[];
  signatureResults: SignatureVerificationResult[];
  validSignatureCount: number;
  authorizedParticipantCount: number;
  supermajorityRatio: number;
  verifiedAt: number;
  encodingSource: "json" | "base64";
  majorityBelowNeutralReputation?: boolean;
  loadedFromSharedLink?: boolean;
}

export interface ParseResult {
  ok: boolean;
  proof?: ProofOfCoordination;
  encoding?: "json" | "base64";
  errorTitle?: string;
  errorMessage?: string;
  errorHint?: string;
}

export interface RecentVerificationEntry {
  id: string;
  timestamp: number;
  mesh_id: string;
  verdict: VerdictType;
  participant_count: number;
  event_count: number;
  window_ms: number;
  raw_proof: string;
}

export interface ComparisonDifference {
  field: string;
  firstValue: string;
  secondValue: string;
}

export interface BatchVerificationItem {
  filename: string;
  parseOk: boolean;
  parseError?: string;
  report?: VerificationReport;
  rawText: string;
}

export type AppRoute =
  | "input"
  | "result"
  | "compare"
  | "compare-result"
  | "batch"
  | "batch-result";

