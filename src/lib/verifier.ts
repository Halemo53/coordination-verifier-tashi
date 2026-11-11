import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import LZString from "lz-string";
import {
  BatchVerificationItem,
  ComparisonDifference,
  ParseResult,
  ProofOfCoordination,
  SignatureVerificationResult,
  VerificationCheck,
  VerificationReport,
  VerdictType
} from "../types/proof";

// Configure synchronous SHA-512 for @noble/ed25519
ed.hashes.sha512 = sha512;

const REQUIRED_TOP_FIELDS = [
  "version",
  "mesh_id",
  "outcome_hash",
  "timestamp_start",
  "timestamp_end",
  "participants",
  "events",
  "supermajority_threshold",
  "signatures"
] as const;

function isHex(value: string): boolean {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length % 2 === 0 &&
    /^[0-9a-fA-F]+$/.test(value)
  );
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    const normalized = b64.trim().replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const binString = atob(padded);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function decodeKeyOrSignature(raw: string, expectedByteLength: number): Uint8Array | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (isHex(trimmed) && trimmed.length === expectedByteLength * 2) {
    return hexToBytes(trimmed);
  }
  const b64Bytes = base64ToBytes(trimmed);
  if (b64Bytes && b64Bytes.length === expectedByteLength) {
    return b64Bytes;
  }
  return null;
}

function looksLikeBase64(input: string): boolean {
  const compact = input.replace(/\s+/g, "");
  if (compact.length < 16) return false;
  if (compact.startsWith("{") || compact.startsWith("[")) return false;
  return /^[A-Za-z0-9+/_-]+={0,2}$/.test(compact);
}

export function parseProofInput(rawInput: string): ParseResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      ok: false,
      errorTitle: "Empty input",
      errorMessage: "Paste a Proof of Coordination record in JSON or base64 format before verifying."
    };
  }

  let jsonString = trimmed;
  let encoding: "json" | "base64" = "json";

  // Check if input is base64-encoded
  if (looksLikeBase64(trimmed)) {
    const decodedBytes = base64ToBytes(trimmed.replace(/\s+/g, ""));
    if (!decodedBytes) {
      return {
        ok: false,
        errorTitle: "Parse error",
        errorMessage: "This doesn't look like JSON. Check for a missing bracket or a stray character."
      };
    }
    try {
      jsonString = new TextDecoder("utf-8", { fatal: true }).decode(decodedBytes);
      encoding = "base64";
    } catch {
      return {
        ok: false,
        errorTitle: "Base64 decode error",
        errorMessage: "Base64 decoded, but the result isn't valid JSON."
      };
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    if (encoding === "base64") {
      return {
        ok: false,
        errorTitle: "Invalid JSON inside Base64 payload",
        errorMessage: "Base64 decoded, but the result isn't valid JSON.",
        errorHint: err instanceof Error ? err.message : undefined
      };
    }
    return {
      ok: false,
      errorTitle: "JSON syntax error",
      errorMessage: "This doesn't look like JSON. Check for a missing bracket or a stray character.",
      errorHint: err instanceof Error ? err.message : undefined
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    if (encoding === "base64") {
      return {
        ok: false,
        errorTitle: "Invalid JSON root",
        errorMessage: "Base64 decoded, but the result isn't valid JSON."
      };
    }
    return {
      ok: false,
      errorTitle: "Invalid JSON structure",
      errorMessage: "This doesn't look like JSON. Check for a missing bracket or a stray character."
    };
  }

  const record = parsed as Record<string, unknown>;
  const missingFields = REQUIRED_TOP_FIELDS.filter(
    (field) => !(field in record) || record[field] === undefined || record[field] === null
  );

  if (missingFields.length > 0) {
    return {
      ok: false,
      errorTitle: "Missing required fields",
      errorMessage: `JSON parsed, but required fields are missing: ${missingFields.join(", ")}.`
    };
  }

  return {
    ok: true,
    proof: record as unknown as ProofOfCoordination,
    encoding
  };
}

export function verifyProof(
  proof: ProofOfCoordination,
  encodingSource: "json" | "base64" = "json"
): VerificationReport {
  const checks: VerificationCheck[] = [];

  // 1. Schema validity — all required fields present, correct types
  const schemaErrors: string[] = [];
  if (typeof proof.version !== "string" || !proof.version.trim()) {
    schemaErrors.push("Field 'version' must be a non-empty string.");
  }
  if (typeof proof.mesh_id !== "string" || !proof.mesh_id.trim()) {
    schemaErrors.push("Field 'mesh_id' must be a non-empty string.");
  }
  if (typeof proof.outcome_hash !== "string" || !isHex(proof.outcome_hash)) {
    schemaErrors.push("Field 'outcome_hash' must be a valid hexadecimal digest string.");
  }
  if (typeof proof.timestamp_start !== "number" || !Number.isFinite(proof.timestamp_start)) {
    schemaErrors.push("Field 'timestamp_start' must be a finite Unix timestamp in milliseconds.");
  }
  if (typeof proof.timestamp_end !== "number" || !Number.isFinite(proof.timestamp_end)) {
    schemaErrors.push("Field 'timestamp_end' must be a finite Unix timestamp in milliseconds.");
  }
  if (
    typeof proof.supermajority_threshold !== "number" ||
    !Number.isFinite(proof.supermajority_threshold) ||
    proof.supermajority_threshold <= 0 ||
    proof.supermajority_threshold > 1
  ) {
    schemaErrors.push("Field 'supermajority_threshold' must be a number in the range (0, 1].");
  }
  if (!Array.isArray(proof.participants) || proof.participants.length === 0) {
    schemaErrors.push("Field 'participants' must be a non-empty array.");
  } else {
    proof.participants.forEach((p, idx) => {
      if (typeof p !== "object" || p === null) {
        schemaErrors.push(`participants[${idx}] is not an object.`);
        return;
      }
      if (typeof p.id !== "string" || !p.id.trim()) {
        schemaErrors.push(`participants[${idx}].id must be a non-empty string.`);
      }
      if (typeof p.public_key !== "string" || !p.public_key.trim()) {
        schemaErrors.push(`participants[${idx}].public_key must be a non-empty string.`);
      }
      if (p.role !== "resource" && p.role !== "orchestration") {
        schemaErrors.push(
          `participants[${idx}].role must be "resource" or "orchestration" (got "${String(p.role)}").`
        );
      }
      if (typeof p.reputation !== "number" || !Number.isFinite(p.reputation)) {
        schemaErrors.push(`participants[${idx}].reputation must be a finite number.`);
      }
      if (typeof p.authorized !== "boolean") {
        schemaErrors.push(`participants[${idx}].authorized must be a boolean.`);
      }
    });
  }

  if (!Array.isArray(proof.events) || proof.events.length === 0) {
    schemaErrors.push("Field 'events' must be a non-empty array.");
  } else {
    proof.events.forEach((ev, idx) => {
      if (typeof ev !== "object" || ev === null) {
        schemaErrors.push(`events[${idx}] is not an object.`);
        return;
      }
      if (typeof ev.index !== "number" || !Number.isInteger(ev.index)) {
        schemaErrors.push(`events[${idx}].index must be an integer.`);
      }
      if (typeof ev.event_hash !== "string" || !ev.event_hash.trim()) {
        schemaErrors.push(`events[${idx}].event_hash must be a non-empty string.`);
      }
      if (typeof ev.sender_id !== "string" || !ev.sender_id.trim()) {
        schemaErrors.push(`events[${idx}].sender_id must be a non-empty string.`);
      }
      if (!Array.isArray(ev.references)) {
        schemaErrors.push(`events[${idx}].references must be an array of event hashes.`);
      }
      if (typeof ev.timestamp !== "number" || !Number.isFinite(ev.timestamp)) {
        schemaErrors.push(`events[${idx}].timestamp must be a finite number.`);
      }
    });
  }

  if (!Array.isArray(proof.signatures)) {
    schemaErrors.push("Field 'signatures' must be an array.");
  } else {
    proof.signatures.forEach((sig, idx) => {
      if (typeof sig !== "object" || sig === null) {
        schemaErrors.push(`signatures[${idx}] is not an object.`);
        return;
      }
      if (typeof sig.participant_id !== "string" || !sig.participant_id.trim()) {
        schemaErrors.push(`signatures[${idx}].participant_id must be a non-empty string.`);
      }
      if (typeof sig.signature !== "string" || !sig.signature.trim()) {
        schemaErrors.push(`signatures[${idx}].signature must be a non-empty string.`);
      }
    });
  }

  checks.push({
    id: "schema_validity",
    label: "Schema validity",
    status: schemaErrors.length === 0 ? "pass" : "fail",
    details:
      schemaErrors.length === 0
        ? `All required fields present with valid types (version ${proof.version}, ${Array.isArray(proof.participants) ? proof.participants.length : 0} participants, ${Array.isArray(proof.events) ? proof.events.length : 0} events).`
        : `${schemaErrors.length} schema constraint violation${schemaErrors.length === 1 ? "" : "s"} detected.`,
    rawOutput:
      schemaErrors.length === 0
        ? [
            `version: "${proof.version}" (string)`,
            `mesh_id: "${proof.mesh_id}" (string)`,
            `outcome_hash: ${proof.outcome_hash.length / 2} bytes hex digest`,
            `participants: ${proof.participants.length} records validated`,
            `events: ${proof.events.length} records validated`,
            `signatures: ${proof.signatures.length} records validated`
          ]
        : schemaErrors
  });

  // 2. Timestamp sanity — timestamp_end > timestamp_start; time window <= 10 minutes (warn if larger)
  const startMs = typeof proof.timestamp_start === "number" ? proof.timestamp_start : NaN;
  const endMs = typeof proof.timestamp_end === "number" ? proof.timestamp_end : NaN;
  const windowMs = Number.isFinite(startMs) && Number.isFinite(endMs) ? endMs - startMs : NaN;
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    checks.push({
      id: "timestamp_sanity",
      label: "Timestamp sanity",
      status: "fail",
      details: `Invalid finality window: timestamp_end (${endMs}) must be strictly greater than timestamp_start (${startMs}).`,
      rawOutput: [
        `timestamp_start: ${startMs}`,
        `timestamp_end:   ${endMs}`,
        `delta_ms:        ${windowMs} ms (must be > 0 ms)`
      ]
    });
  } else if (windowMs > TEN_MINUTES_MS) {
    checks.push({
      id: "timestamp_sanity",
      label: "Timestamp sanity",
      status: "warn",
      details: `Finality window is ${windowMs.toLocaleString()} ms (${(windowMs / 60000).toFixed(2)} min), exceeding the 10-minute nominal bound.`,
      rawOutput: [
        `timestamp_start: ${startMs} (${new Date(startMs).toISOString()})`,
        `timestamp_end:   ${endMs} (${new Date(endMs).toISOString()})`,
        `window_ms:       ${windowMs} ms (nominal upper bound: ${TEN_MINUTES_MS} ms)`
      ]
    });
  } else {
    checks.push({
      id: "timestamp_sanity",
      label: "Timestamp sanity",
      status: "pass",
      details: `Finality window of ${windowMs.toLocaleString()} ms is positive and within the 10-minute threshold.`,
      rawOutput: [
        `timestamp_start: ${startMs} (${new Date(startMs).toISOString()})`,
        `timestamp_end:   ${endMs} (${new Date(endMs).toISOString()})`,
        `window_ms:       ${windowMs} ms (<= ${TEN_MINUTES_MS} ms threshold)`
      ]
    });
  }

  // 3. Participant authorization — every participant must have authorized: true
  const participants = Array.isArray(proof.participants) ? proof.participants : [];
  const unauthorizedParticipants = participants.filter((p) => p && p.authorized !== true);

  checks.push({
    id: "participant_authorization",
    label: "Participant authorization",
    status:
      participants.length > 0 && unauthorizedParticipants.length === 0 ? "pass" : "fail",
    details:
      participants.length === 0
        ? "No participants present in proof."
        : unauthorizedParticipants.length === 0
          ? `All ${participants.length} participants carry active mesh authorization.`
          : `${unauthorizedParticipants.length} of ${participants.length} participant${unauthorizedParticipants.length === 1 ? " is" : "s are"} not authorized: ${unauthorizedParticipants.map((p) => p.id).join(", ")}.`,
    rawOutput:
      participants.length === 0
        ? ["participants[]: empty"]
        : participants.map(
            (p) =>
              `${p.id} [role=${p.role}] -> authorized=${String(p.authorized)}${p.authorized ? " (OK)" : " (UNAUTHORIZED)"}`
          )
  });

  // 4. Signature presence — every participant must have exactly one signature in signatures[]
  const signatures = Array.isArray(proof.signatures) ? proof.signatures : [];
  const sigCountByParticipant = new Map<string, number>();
  const participantIds = new Set(participants.map((p) => p.id));
  const unknownSigners: string[] = [];

  for (const sig of signatures) {
    if (!sig || typeof sig.participant_id !== "string") continue;
    sigCountByParticipant.set(
      sig.participant_id,
      (sigCountByParticipant.get(sig.participant_id) ?? 0) + 1
    );
    if (!participantIds.has(sig.participant_id)) {
      unknownSigners.push(sig.participant_id);
    }
  }

  const missingSigners: string[] = [];
  const duplicateSigners: string[] = [];
  for (const p of participants) {
    const count = sigCountByParticipant.get(p.id) ?? 0;
    if (count === 0) missingSigners.push(p.id);
    if (count > 1) duplicateSigners.push(`${p.id} (${count}x)`);
  }

  const presencePass =
    participants.length > 0 &&
    missingSigners.length === 0 &&
    duplicateSigners.length === 0 &&
    unknownSigners.length === 0;

  const presenceIssues: string[] = [];
  if (missingSigners.length > 0) {
    presenceIssues.push(`missing signature for: ${missingSigners.join(", ")}`);
  }
  if (duplicateSigners.length > 0) {
    presenceIssues.push(`duplicate signatures for: ${duplicateSigners.join(", ")}`);
  }
  if (unknownSigners.length > 0) {
    presenceIssues.push(`unknown signer IDs: ${unknownSigners.join(", ")}`);
  }

  checks.push({
    id: "signature_presence",
    label: "Signature presence",
    status: presencePass ? "pass" : "fail",
    details: presencePass
      ? `Each of the ${participants.length} participants has exactly 1 signature entry.`
      : `Signature cardinality mismatch (${presenceIssues.join("; ")}).`,
    rawOutput: participants.map((p) => {
      const c = sigCountByParticipant.get(p.id) ?? 0;
      return `${p.id}: ${c} signature record${c === 1 ? "" : "s"} ${c === 1 ? "(OK)" : "(FAIL)"}`;
    }).concat(
      unknownSigners.map((u) => `${u}: signer not listed in participants[] (FAIL)`)
    )
  });

  // 5. Signature validity — verify ed25519 signature of outcome_hash against each participant's public_key
  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const signatureResults: SignatureVerificationResult[] = [];
  const outcomeHexValid = typeof proof.outcome_hash === "string" && isHex(proof.outcome_hash);
  const outcomeMsgBytes = outcomeHexValid
    ? hexToBytes(proof.outcome_hash)
    : new TextEncoder().encode(String(proof.outcome_hash ?? ""));
  const outcomeAsciiBytes = new TextEncoder().encode(String(proof.outcome_hash ?? ""));

  for (const sigEntry of signatures) {
    const participant = participantMap.get(sigEntry.participant_id);
    const sigPreview =
      typeof sigEntry.signature === "string" && sigEntry.signature.length > 20
        ? `${sigEntry.signature.slice(0, 10)}…${sigEntry.signature.slice(-8)}`
        : String(sigEntry.signature ?? "");

    if (!participant) {
      signatureResults.push({
        participant_id: sigEntry.participant_id,
        signature_preview: sigPreview,
        public_key_preview: "—",
        authorized: false,
        valid: false,
        reason: "Participant ID not found in participants[]"
      });
      continue;
    }

    const pubPreview =
      typeof participant.public_key === "string" && participant.public_key.length > 16
        ? `${participant.public_key.slice(0, 8)}…${participant.public_key.slice(-6)}`
        : String(participant.public_key ?? "");

    const pubBytes = decodeKeyOrSignature(participant.public_key, 32);
    const sigBytes = decodeKeyOrSignature(sigEntry.signature, 64);

    if (!pubBytes) {
      signatureResults.push({
        participant_id: sigEntry.participant_id,
        signature_preview: sigPreview,
        public_key_preview: pubPreview,
        authorized: participant.authorized === true,
        valid: false,
        reason: "Public key is not a valid 32-byte Ed25519 key (hex or base64)"
      });
      continue;
    }

    if (!sigBytes) {
      signatureResults.push({
        participant_id: sigEntry.participant_id,
        signature_preview: sigPreview,
        public_key_preview: pubPreview,
        authorized: participant.authorized === true,
        valid: false,
        reason: "Signature is not a valid 64-byte Ed25519 signature (hex or base64)"
      });
      continue;
    }

    let verified = false;
    let verifyReason = "Ed25519 verification failed against outcome_hash";
    try {
      verified = ed.verify(sigBytes, outcomeMsgBytes, pubBytes);
      if (!verified && outcomeHexValid) {
        // Also check ASCII bytes in case signer signed the hex string representation
        verified = ed.verify(sigBytes, outcomeAsciiBytes, pubBytes);
      }
      if (verified) {
        verifyReason = "Valid Ed25519 signature over outcome_hash";
      }
    } catch (err) {
      verified = false;
      verifyReason =
        err instanceof Error ? `Cryptographic error: ${err.message}` : "Invalid curve point or signature";
    }

    signatureResults.push({
      participant_id: sigEntry.participant_id,
      signature_preview: sigPreview,
      public_key_preview: pubPreview,
      authorized: participant.authorized === true,
      valid: verified,
      reason: verifyReason
    });
  }

  const failedSigs = signatureResults.filter((r) => !r.valid);
  const passedSigs = signatureResults.filter((r) => r.valid);

  checks.push({
    id: "signature_validity",
    label: "Signature validity",
    status:
      signatureResults.length > 0 && failedSigs.length === 0 ? "pass" : "fail",
    details:
      signatureResults.length === 0
        ? "No signatures present to verify."
        : failedSigs.length === 0
          ? `All ${passedSigs.length} Ed25519 signatures verified against outcome_hash (${proof.outcome_hash.slice(0, 12)}…).`
          : `${failedSigs.length} of ${signatureResults.length} Ed25519 signature${failedSigs.length === 1 ? " failed" : "s failed"} verification (${failedSigs.map((f) => f.participant_id).join(", ")}).`,
    rawOutput: signatureResults.map(
      (r) =>
        `${r.participant_id} [pub=${r.public_key_preview}, sig=${r.signature_preview}] -> ${r.valid ? "PASS" : "FAIL"} (${r.reason})`
    )
  });

  // 6. Supermajority — count valid signatures ÷ authorized participants >= supermajority_threshold
  const authorizedParticipants = participants.filter((p) => p && p.authorized === true);
  const authorizedIds = new Set(authorizedParticipants.map((p) => p.id));

  // Count unique authorized participants with a valid signature
  const validAuthorizedSigners = new Set<string>();
  for (const r of signatureResults) {
    if (r.valid && authorizedIds.has(r.participant_id)) {
      validAuthorizedSigners.add(r.participant_id);
    }
  }

  const validSignatureCount = validAuthorizedSigners.size;
  const authorizedParticipantCount = authorizedParticipants.length;
  const threshold =
    typeof proof.supermajority_threshold === "number" ? proof.supermajority_threshold : 0.667;
  const supermajorityRatio =
    authorizedParticipantCount > 0 ? validSignatureCount / authorizedParticipantCount : 0;
  const supermajorityPass =
    authorizedParticipantCount > 0 && supermajorityRatio >= threshold;

  checks.push({
    id: "supermajority",
    label: "Supermajority threshold",
    status: supermajorityPass ? "pass" : "fail",
    details:
      authorizedParticipantCount === 0
        ? "Cannot compute supermajority: 0 authorized participants."
        : `${validSignatureCount} of ${authorizedParticipantCount} authorized participants signed validly (${(supermajorityRatio * 100).toFixed(1)}% vs ${(threshold * 100).toFixed(1)}% required threshold).`,
    rawOutput: [
      `valid_authorized_signatures: ${validSignatureCount}`,
      `authorized_participants:     ${authorizedParticipantCount}`,
      `computed_ratio:              ${supermajorityRatio.toFixed(4)} (${(supermajorityRatio * 100).toFixed(2)}%)`,
      `supermajority_threshold:     ${threshold} (${(threshold * 100).toFixed(2)}%)`,
      `verdict:                     ${supermajorityPass ? "RATIO >= THRESHOLD (PASS)" : "RATIO < THRESHOLD (FAIL)"}`
    ]
  });

  // 7. DAG integrity — every event in events[] references only earlier events (by index); no forward references; no cycles
  const events = Array.isArray(proof.events) ? proof.events : [];
  const dagErrors: string[] = [];
  const dagTrace: string[] = [];
  const eventByHash = new Map<string, { index: number; arrayPos: number }>();

  events.forEach((ev, arrayPos) => {
    if (!ev || typeof ev.event_hash !== "string") return;
    if (eventByHash.has(ev.event_hash)) {
      dagErrors.push(
        `Duplicate event_hash "${ev.event_hash.slice(0, 12)}…" at index ${ev.index}.`
      );
    } else {
      eventByHash.set(ev.event_hash, { index: ev.index, arrayPos });
    }
    if (ev.index !== arrayPos) {
      dagErrors.push(
        `Event at position ${arrayPos} has non-sequential index ${ev.index} (expected ${arrayPos}).`
      );
    }
  });

  events.forEach((ev) => {
    if (!ev || !Array.isArray(ev.references)) return;
    if (ev.index === 0 && ev.references.length > 0) {
      dagErrors.push(`Genesis event (index 0) must have 0 references, found ${ev.references.length}.`);
    }
    const refIndices: number[] = [];
    for (const refHash of ev.references) {
      const target = eventByHash.get(refHash);
      if (!target) {
        dagErrors.push(
          `Event #${ev.index} (${ev.event_hash.slice(0, 10)}…) references unknown event hash "${String(refHash).slice(0, 14)}…".`
        );
      } else if (target.index >= ev.index) {
        dagErrors.push(
          `Event #${ev.index} (${ev.event_hash.slice(0, 10)}…) has forward or self reference to event #${target.index}.`
        );
      } else {
        refIndices.push(target.index);
      }
    }
    dagTrace.push(
      `event[${ev.index}] ${ev.event_hash.slice(0, 10)}… by ${ev.sender_id} -> refs: [${refIndices.length > 0 ? refIndices.map((i) => `#${i}`).join(", ") : "genesis"}]`
    );
  });

  checks.push({
    id: "dag_integrity",
    label: "DAG integrity",
    status: events.length > 0 && dagErrors.length === 0 ? "pass" : "fail",
    details:
      events.length === 0
        ? "No events present in proof."
        : dagErrors.length === 0
          ? `All ${events.length} events form a valid acyclic graph with strictly causal parent references.`
          : `${dagErrors.length} DAG integrity violation${dagErrors.length === 1 ? "" : "s"} found.`,
    rawOutput: dagErrors.length === 0 ? dagTrace : [...dagErrors, "---", ...dagTrace]
  });

  // 8. Reputation eligibility — flag any participant with reputation < 1.0 as warning
  const outOfRangeRep = participants.filter(
    (p) => typeof p.reputation !== "number" || p.reputation < 0 || p.reputation > 2.0
  );
  const lowRepParticipants = participants.filter(
    (p) => typeof p.reputation === "number" && p.reputation >= 0 && p.reputation < 1.0
  );
  const majorityBelowNeutralReputation =
    participants.length > 0 && lowRepParticipants.length > participants.length / 2;

  let repStatus: "pass" | "warn" | "fail" = "pass";
  let repDetails = "";
  if (participants.length === 0 || outOfRangeRep.length > 0) {
    repStatus = "fail";
    repDetails =
      participants.length === 0
        ? "No participants to evaluate reputation."
        : `${outOfRangeRep.length} participant(s) have reputation outside the valid 0.0–2.0 scale.`;
  } else if (lowRepParticipants.length > 0) {
    repStatus = "warn";
    const majorityPrefix = majorityBelowNeutralReputation
      ? "Majority of participants are below neutral reputation. "
      : "";
    repDetails = `${majorityPrefix}${lowRepParticipants.length} participant${lowRepParticipants.length === 1 ? " has" : "s have"} reputation below 1.0 (${lowRepParticipants.map((p) => `${p.id}: ${p.reputation.toFixed(2)}`).join(", ")}); subject to progressive slashing.`;
  } else {
    repStatus = "pass";
    const minRep = Math.min(...participants.map((p) => p.reputation));
    const maxRep = Math.max(...participants.map((p) => p.reputation));
    repDetails = `All ${participants.length} participants meet reputation eligibility (>= 1.00; range ${minRep.toFixed(2)}–${maxRep.toFixed(2)}).`;
  }

  checks.push({
    id: "reputation_eligibility",
    label: "Reputation eligibility",
    status: repStatus,
    details: repDetails,
    rawOutput: participants.map(
      (p) =>
        `${p.id} [role=${p.role}] -> reputation=${typeof p.reputation === "number" ? p.reputation.toFixed(2) : String(p.reputation)} ${
          p.reputation < 0 || p.reputation > 2
            ? "(OUT OF RANGE 0.0–2.0)"
            : p.reputation < 1.0
              ? "(WARNING: < 1.00 slashing threshold)"
              : "(ELIGIBLE >= 1.00)"
        }`
    )
  });

  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");

  let verdict: VerdictType = "VERIFIED";
  let verdictSentence = "This proof verifies.";
  if (hasFail) {
    verdict = "FAILED";
    verdictSentence = "This proof does not verify.";
  } else if (hasWarn) {
    verdict = "VERIFIED WITH WARNINGS";
    verdictSentence = "This proof verifies, with warnings.";
  }

  return {
    verdict,
    verdictSentence,
    proof,
    windowMs: Number.isFinite(windowMs) ? windowMs : 0,
    checks,
    signatureResults,
    validSignatureCount,
    authorizedParticipantCount,
    supermajorityRatio,
    verifiedAt: Date.now(),
    encodingSource,
    majorityBelowNeutralReputation
  };
}

export function encodeProofToHashPayload(proof: ProofOfCoordination): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(proof));
}

export function decodeProofFromHashPayload(compressed: string): ProofOfCoordination | null {
  try {
    if (!compressed || !compressed.trim()) return null;
    const jsonStr = LZString.decompressFromEncodedURIComponent(compressed.trim());
    if (!jsonStr) return null;
    const res = parseProofInput(jsonStr);
    if (!res.ok || !res.proof) return null;
    return res.proof;
  } catch {
    return null;
  }
}

export interface SharedBatchEntry {
  f: string;
  p: ProofOfCoordination;
}

export function encodeBatchToHashPayload(items: BatchVerificationItem[]): string {
  const compact: SharedBatchEntry[] = items
    .filter((item) => item.report?.proof)
    .map((item) => ({
      f: item.filename,
      p: item.report!.proof
    }));
  return LZString.compressToEncodedURIComponent(JSON.stringify(compact));
}

export function decodeBatchFromHashPayload(compressed: string): BatchVerificationItem[] | null {
  try {
    if (!compressed || !compressed.trim()) return null;
    const jsonStr = LZString.decompressFromEncodedURIComponent(compressed.trim());
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const results: BatchVerificationItem[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry.f !== "string" || typeof entry.p !== "object" || !entry.p) {
        return null;
      }
      const rawText = JSON.stringify(entry.p, null, 2);
      const parseRes = parseProofInput(rawText);
      if (!parseRes.ok || !parseRes.proof) {
        return null;
      }
      const report = verifyProof(parseRes.proof, "json");
      report.loadedFromSharedLink = true;
      results.push({
        filename: entry.f,
        parseOk: true,
        report,
        rawText
      });
    }
    return results;
  } catch {
    return null;
  }
}

export function buildShareableProofUrl(proof: ProofOfCoordination): string {
  const payload = encodeProofToHashPayload(proof);
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "https://tashi.network";
  return `${base}#proof=${payload}`;
}

export function buildShareableBatchUrl(items: BatchVerificationItem[]): string {
  const payload = encodeBatchToHashPayload(items);
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "https://tashi.network";
  return `${base}#batch=${payload}`;
}

export function formatPlainTextReport(report: VerificationReport): string {
  const { proof, verdict, verdictSentence, windowMs, checks, signatureResults } = report;
  const shareUrl = buildShareableProofUrl(proof);

  const lines: string[] = [
    "COORDINATION VERIFIER — VERIFICATION REPORT",
    "================================================================================",
    `Timestamp of verification: ${new Date(report.verifiedAt).toISOString()}`,
    "",
    "PROOF SUMMARY",
    "--------------------------------------------------------------------------------",
    `Mesh ID:                   ${proof.mesh_id}`,
    `Proof Version:             ${proof.version}`,
    `Outcome Hash:              ${proof.outcome_hash}`,
    `Finality Window:           ${windowMs} ms (${proof.timestamp_start} -> ${proof.timestamp_end})`,
    `Participant Count:         ${proof.participants.length} (${report.authorizedParticipantCount} authorized)`,
    `Event Count (DAG):         ${proof.events.length}`,
    `Supermajority:             ${report.validSignatureCount}/${report.authorizedParticipantCount} (${(report.supermajorityRatio * 100).toFixed(1)}%, threshold ${(proof.supermajority_threshold * 100).toFixed(1)}%)`,
    "",
    "VERDICT",
    "--------------------------------------------------------------------------------",
    `${verdict} — ${verdictSentence}`,
    ...(report.majorityBelowNeutralReputation
      ? ["Warning: Majority of participants are below neutral reputation."]
      : []),
    "",
    "VERIFICATION CHECKS (8 OF 8)",
    "--------------------------------------------------------------------------------"
  ];

  checks.forEach((check, idx) => {
    const tag = check.status.toUpperCase().padEnd(4, " ");
    lines.push(`${idx + 1}. [${tag}] ${check.label}`);
    lines.push(`   ${check.details}`);
    for (const rawLine of check.rawOutput) {
      lines.push(`     · ${rawLine}`);
    }
    lines.push("");
  });

  lines.push("PARTICIPANTS TABLE");
  lines.push("--------------------------------------------------------------------------------");
  lines.push(
    `${"ID".padEnd(20, " ")} | ${"ROLE".padEnd(15, " ")} | ${"REPUTATION".padEnd(12, " ")} | ${"AUTHORIZED".padEnd(10, " ")}`
  );
  lines.push(
    `${"-".repeat(20)}-+-${"-".repeat(15)}-+-${"-".repeat(12)}-+-${"-".repeat(10)}`
  );
  for (const p of proof.participants) {
    const repStr =
      typeof p.reputation === "number"
        ? `${p.reputation.toFixed(2)}${p.reputation < 1.0 ? " (risk)" : ""}`
        : String(p.reputation);
    lines.push(
      `${p.id.padEnd(20, " ")} | ${p.role.padEnd(15, " ")} | ${repStr.padEnd(12, " ")} | ${(p.authorized ? "yes" : "no").padEnd(10, " ")}`
    );
  }

  lines.push("");
  lines.push("SIGNATURES TABLE");
  lines.push("--------------------------------------------------------------------------------");
  lines.push(
    `${"PARTICIPANT ID".padEnd(20, " ")} | ${"VALID".padEnd(7, " ")} | ${"SIGNATURE PREVIEW".padEnd(22, " ")} | DETAILS`
  );
  lines.push(
    `${"-".repeat(20)}-+-${"-".repeat(7)}-+-${"-".repeat(22)}-+--------------------`
  );
  for (const s of signatureResults) {
    lines.push(
      `${s.participant_id.padEnd(20, " ")} | ${(s.valid ? "yes" : "no").padEnd(7, " ")} | ${s.signature_preview.padEnd(22, " ")} | ${s.reason}`
    );
  }

  lines.push("");
  lines.push("================================================================================");
  lines.push(
    `Generated by Coordination Verifier — an independent community tool for Tashi Network. Verify at: ${shareUrl}`
  );
  return lines.join("\n");
}

export function computeProofDifferences(
  firstReport: VerificationReport,
  secondReport: VerificationReport
): ComparisonDifference[] {
  const p1 = firstReport.proof;
  const p2 = secondReport.proof;
  const diffs: ComparisonDifference[] = [];

  if (firstReport.verdict !== secondReport.verdict) {
    diffs.push({
      field: "verdict",
      firstValue: firstReport.verdict,
      secondValue: secondReport.verdict
    });
  }

  if (p1.version !== p2.version) {
    diffs.push({
      field: "version",
      firstValue: String(p1.version),
      secondValue: String(p2.version)
    });
  }

  if (p1.mesh_id !== p2.mesh_id) {
    diffs.push({
      field: "mesh_id",
      firstValue: String(p1.mesh_id),
      secondValue: String(p2.mesh_id)
    });
  }

  if (p1.outcome_hash !== p2.outcome_hash) {
    diffs.push({
      field: "outcome_hash",
      firstValue: String(p1.outcome_hash),
      secondValue: String(p2.outcome_hash)
    });
  }

  if (p1.participants.length !== p2.participants.length) {
    diffs.push({
      field: "participant_count",
      firstValue: `${p1.participants.length} participants`,
      secondValue: `${p2.participants.length} participants`
    });
  }

  if (firstReport.authorizedParticipantCount !== secondReport.authorizedParticipantCount) {
    diffs.push({
      field: "authorized_participants",
      firstValue: `${firstReport.authorizedParticipantCount} authorized`,
      secondValue: `${secondReport.authorizedParticipantCount} authorized`
    });
  }

  if (p1.events.length !== p2.events.length) {
    diffs.push({
      field: "event_count",
      firstValue: `${p1.events.length} events`,
      secondValue: `${p2.events.length} events`
    });
  }

  if (p1.timestamp_start !== p2.timestamp_start) {
    diffs.push({
      field: "timestamp_start",
      firstValue: `${p1.timestamp_start} ms`,
      secondValue: `${p2.timestamp_start} ms`
    });
  }

  if (p1.timestamp_end !== p2.timestamp_end) {
    diffs.push({
      field: "timestamp_end",
      firstValue: `${p1.timestamp_end} ms`,
      secondValue: `${p2.timestamp_end} ms`
    });
  }

  if (firstReport.windowMs !== secondReport.windowMs) {
    diffs.push({
      field: "timestamp_window",
      firstValue: `${firstReport.windowMs} ms`,
      secondValue: `${secondReport.windowMs} ms`
    });
  }

  if (p1.supermajority_threshold !== p2.supermajority_threshold) {
    diffs.push({
      field: "supermajority_threshold",
      firstValue: String(p1.supermajority_threshold),
      secondValue: String(p2.supermajority_threshold)
    });
  }

  if (firstReport.validSignatureCount !== secondReport.validSignatureCount) {
    diffs.push({
      field: "valid_signature_count",
      firstValue: `${firstReport.validSignatureCount} valid`,
      secondValue: `${secondReport.validSignatureCount} valid`
    });
  }

  // Compare individual participant records
  const maxP = Math.max(p1.participants.length, p2.participants.length);
  for (let i = 0; i < maxP; i++) {
    const a = p1.participants[i];
    const b = p2.participants[i];
    if (!a || !b) {
      diffs.push({
        field: `participants[${i}]`,
        firstValue: a ? `${a.id} (${a.role})` : "missing",
        secondValue: b ? `${b.id} (${b.role})` : "missing"
      });
      continue;
    }
    const aSummary = `${a.id} | role=${a.role} | rep=${a.reputation.toFixed(2)} | auth=${a.authorized}`;
    const bSummary = `${b.id} | role=${b.role} | rep=${b.reputation.toFixed(2)} | auth=${b.authorized}`;
    if (aSummary !== bSummary || a.public_key !== b.public_key) {
      diffs.push({
        field: `participant (${a.id === b.id ? a.id : `#${i}`})`,
        firstValue: aSummary,
        secondValue: bSummary
      });
    }
  }

  // Compare individual signatures
  const maxS = Math.max(p1.signatures.length, p2.signatures.length);
  for (let i = 0; i < maxS; i++) {
    const s1 = p1.signatures[i];
    const s2 = p2.signatures[i];
    if (!s1 || !s2 || s1.participant_id !== s2.participant_id || s1.signature !== s2.signature) {
      diffs.push({
        field: `signature[${i}] (${s1?.participant_id || s2?.participant_id || i})`,
        firstValue: s1 ? `${s1.signature.slice(0, 14)}…` : "missing",
        secondValue: s2 ? `${s2.signature.slice(0, 14)}…` : "missing"
      });
    }
  }

  return diffs;
}

function escapeCsvCell(val: string | number): string {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatBatchCsvReport(items: BatchVerificationItem[]): string {
  const header = [
    "filename",
    "verdict",
    "mesh_id",
    "participant_count",
    "event_count",
    "outcome_hash",
    "failed_checks"
  ].join(",");

  const rows = items.map((item) => {
    if (!item.parseOk || !item.report) {
      return [
        escapeCsvCell(item.filename),
        escapeCsvCell("PARSE_ERROR"),
        escapeCsvCell("—"),
        escapeCsvCell(0),
        escapeCsvCell(0),
        escapeCsvCell("—"),
        escapeCsvCell(item.parseError || "Invalid JSON")
      ].join(",");
    }

    const { proof, verdict, checks } = item.report;
    const failedChecks = checks
      .filter((c) => c.status === "fail" || c.status === "warn")
      .map((c) => `${c.id}:${c.status}`)
      .join("; ");

    return [
      escapeCsvCell(item.filename),
      escapeCsvCell(verdict),
      escapeCsvCell(proof.mesh_id),
      escapeCsvCell(proof.participants.length),
      escapeCsvCell(proof.events.length),
      escapeCsvCell(proof.outcome_hash),
      escapeCsvCell(failedChecks || "none")
    ].join(",");
  });

  return [header, ...rows].join("\n");
}

