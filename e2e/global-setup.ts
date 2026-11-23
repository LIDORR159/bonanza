import { execFileSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * The suite registers and signs in far more often than a real visitor, all
 * from one address, so it would trip the backend's rate limits by itself.
 * The counters are cleared once before the run; the limits stay switched on
 * and are tested on purpose in tests/rate-limit.spec.ts.
 */
export default function globalSetup() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..")
  try {
    execFileSync(
      "docker",
      [
        "compose", "exec", "-T", "redis", "sh", "-c",
        "redis-cli --scan --pattern 'rl:*' | xargs -r redis-cli del >/dev/null",
      ],
      { cwd: root, stdio: "ignore" }
    )
  } catch {
    // No local Redis container (for example in CI with service containers):
    // a fresh environment has no counters to clear.
  }
}
