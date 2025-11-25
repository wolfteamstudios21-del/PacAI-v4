// server/middleware/v4.ts
// PacAI v4 — Core Middleware
// HSM validation, offline grace period, audit logging

import { type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";

// ===== Global State (mock for now) =====
interface HSMState {
  present: boolean;
  lastSeen: number;
  valid: boolean;
}

interface AuditState {
  entries: Array<{
    id: string;
    timestamp: string;
    hash_chain: string;
  }>;
}

// Mock global state
const hsmState: HSMState = {
  present: true,
  lastSeen: Date.now(),
  valid: true,
};

const auditState: AuditState = {
  entries: [],
};

// ===== Middleware Functions =====

/**
 * Require HSM: Every request dies instantly without YubiHSM2/Nitrokey
 */
export const requireHSM = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // In production: call global.hsm.validate() → YubiHSM2 Ed25519 check
  // For now: mock validation
  if (!hsmState.valid) {
    return res.status(401).json({
      error: "License device missing or invalid",
      hsm_present: hsmState.present,
      recovery: "Insert YubiHSM2 or Nitrokey3, then retry",
    });
  }
  next();
};

/**
 * Require Offline Grace: 30-minute grace period if HSM removed temporarily
 */
export const requireOfflineGrace = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes
  const timeSinceLastSeen = Date.now() - hsmState.lastSeen;

  if (!hsmState.present && timeSinceLastSeen > GRACE_PERIOD_MS) {
    return res.status(410).json({
      error: "Offline grace period expired",
      grace_period_ms: GRACE_PERIOD_MS,
      time_since_last_hsm_ms: timeSinceLastSeen,
      recovery: "Reinsert HSM device or restart service",
    });
  }

  next();
};

/**
 * Log Audit: Every request appends to hash-chained audit log
 */
export const logAudit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const previousHash =
    auditState.entries.length > 0
      ? auditState.entries[auditState.entries.length - 1].hash_chain
      : "0".repeat(64);

  const bodyHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(req.body || {}))
    .digest("hex");

  const auditEntry: any = {
    id: `audit_${crypto.randomBytes(8).toString("hex")}`,
    timestamp: new Date().toISOString(),
    ip: req.ip || "unknown",
    user: (req.headers["x-api-key"] as string) || "tauri",
    path: req.path,
    method: req.method,
    body_hash: bodyHash,
    status_code: 200, // Will be updated on response
  };

  // Hash-chain: sha256(previousHash + thisEntry)
  const chainInput = previousHash + JSON.stringify(auditEntry);
  const thisHash = crypto.createHash("sha256").update(chainInput).digest("hex");

  auditEntry.hash_chain = thisHash;

  // Store in audit log
  auditState.entries.push({
    id: auditEntry.id,
    timestamp: auditEntry.timestamp,
    hash_chain: thisHash,
  });

  // Attach to response locals
  res.locals.auditId = auditEntry.id;
  res.locals.auditHash = thisHash;

  // Update status code when response is sent
  res.on("finish", () => {
    const entry = auditState.entries.find((e) => e.id === auditEntry.id);
    if (entry) {
      // In production: update status in persistent audit log
    }
  });

  next();
};

/**
 * Stream Audit Tail: Live SSE of recent audit events
 */
export const streamAuditTail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const tail = req.query.tail ? parseInt(req.query.tail as string) : 100;
  const events = auditState.entries.slice(-tail);

  events.forEach((evt) => {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  });

  // Keep connection open for 30 seconds
  setTimeout(() => res.end(), 30000);
};

/**
 * Export middleware: Validate export request
 */
export const validateExportRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { scenario_id, engine, version } = req.body;

  if (!scenario_id) {
    return res.status(400).json({ error: "scenario_id required" });
  }

  if (!["ue5", "unity", "godot", "vbs4", "onetess"].includes(engine)) {
    return res.status(400).json({
      error: "Invalid engine",
      valid_engines: ["ue5", "unity", "godot", "vbs4", "onetess"],
    });
  }

  next();
};

/**
 * Mock HSM validation helpers
 */
export const mockHSM = {
  validate: async (): Promise<boolean> => {
    // In production: yubihsm.connect() → Ed25519 signing check
    return hsmState.valid;
  },

  sign: async (data: string): Promise<string> => {
    // In production: yubihsm.asymmetricSign(0x1234, Algorithm.Ed25519, data)
    return crypto.createHash("sha256").update(data).digest("hex");
  },

  verifyLicense: async (): Promise<{
    valid: boolean;
    serial: string;
    expiry: string;
  }> => {
    // In production: verify HSM certificate chain
    return {
      valid: true,
      serial: "YH-000001-02",
      expiry: "2026-04-15",
    };
  },
};

/**
 * Export audit history (all entries)
 */
export const getAuditHistory = () => {
  return auditState.entries;
};

/**
 * Clear audit history (for testing)
 */
export const clearAuditHistory = () => {
  auditState.entries = [];
};

/**
 * Get HSM state
 */
export const getHSMState = () => {
  return { ...hsmState };
};

/**
 * Simulate HSM disconnect
 */
export const simulateHSMDisconnect = () => {
  hsmState.present = false;
  hsmState.valid = false;
};

/**
 * Simulate HSM reconnect
 */
export const simulateHSMReconnect = () => {
  hsmState.present = true;
  hsmState.lastSeen = Date.now();
  hsmState.valid = true;
};
