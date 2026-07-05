import fs from "node:fs";
import { assertInsideVault } from "./paths";

/**
 * Advisory, cooperative, per-file lease lock for the WorkOS vault.
 *
 * The dashboard wraps every write in `withVaultLock`; an LLM agent editing the
 * same files honors the same lock per the WorkOS standard in the vault `CLAUDE.md`.
 * The lock file name (`.workos.lock`) is part of that standard so any consumer
 * coordinates through it. The lease self-expires (TTL) so
 * a crashed holder never deadlocks — the next writer steals a stale lock.
 *
 * The lock file lives next to its target inside the vault so a *local* agent can
 * see it. It is created and removed within ~milliseconds, so even on a
 * Drive-synced vault it behaves as effectively local (sync never catches it).
 */

interface Lease {
  owner: string;
  pid: number;
  acquiredAtMs: number;
  ttlSeconds: number;
  note?: string;
}

const DEFAULT_TTL_SECONDS = 120;

function lockPathFor(absPath: string): string {
  return assertInsideVault(absPath) + ".workos.lock";
}

function readLease(lockFile: string): Lease | null {
  try {
    return JSON.parse(fs.readFileSync(lockFile, "utf8")) as Lease;
  } catch {
    return null;
  }
}

function isStale(lease: Lease, nowMs: number): boolean {
  return nowMs > lease.acquiredAtMs + lease.ttlSeconds * 1000;
}

/** Try once to acquire (create-if-absent, or steal if the existing lease is stale). */
function tryAcquire(lockFile: string, owner: string, ttlSeconds: number, note?: string): boolean {
  const lease: Lease = { owner, pid: process.pid, acquiredAtMs: Date.now(), ttlSeconds, note };
  const payload = JSON.stringify(lease);
  try {
    fs.writeFileSync(lockFile, payload, { encoding: "utf8", flag: "wx" }); // atomic create-if-absent
    return true;
  } catch {
    const cur = readLease(lockFile);
    if (cur && isStale(cur, Date.now())) {
      try {
        fs.writeFileSync(lockFile, payload, "utf8"); // steal the expired lease
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class VaultBusyError extends Error {
  constructor(readonly absPath: string) {
    super(`Vault file is busy (locked by another writer): ${absPath}`);
    this.name = "VaultBusyError";
  }
}

/**
 * Acquire the lease (with jittered backoff + stale-steal), run `fn`, and ALWAYS
 * release the lock — even if `fn` throws. Keep `fn` tiny (read → edit → write);
 * never hold the lock across a network or LLM round-trip.
 */
export async function withVaultLock<T>(
  absPath: string,
  owner: string,
  fn: () => Promise<T> | T,
  opts: { ttlSeconds?: number; retries?: number; note?: string } = {},
): Promise<T> {
  const lockFile = lockPathFor(absPath);
  const ttl = opts.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const retries = opts.retries ?? 12;

  let acquired = false;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (tryAcquire(lockFile, owner, ttl, opts.note)) {
      acquired = true;
      break;
    }
    // jittered backoff, growing with attempt (50ms .. ~600ms)
    await sleep(50 + Math.floor(Math.random() * 200) * Math.min(attempt + 1, 3));
  }
  if (!acquired) throw new VaultBusyError(absPath);

  try {
    return await fn();
  } finally {
    try {
      fs.rmSync(lockFile, { force: true });
    } catch {
      /* TTL will expire it if removal fails */
    }
  }
}
