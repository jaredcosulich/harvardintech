// Pure, framework-free helpers for the /admin dashboard's client-side gate.
// Kept out of the `.astro` component (mirrors src/lib/adminDashboard.ts) so the
// passcode-check and storage-key logic can be unit-tested under vitest. No DOM,
// no Astro imports — string in, boolean out.
//
// DETERRENT, NOT SECURITY. This gate runs entirely in the browser on a static
// GitHub Pages site: the expected passcode is injected at build time and ships
// inside the public HTML, so anyone who reads source can see it. Its only job is
// to keep the dashboard from being stumbled into by casual visitors. The real
// write-access boundary is the Cloudflare Worker in cms-auth-worker/, which
// holds the GitHub token server-side and is the thing that actually gates
// commits. Treat unlocking here as "don't show this to a stranger," nothing more.

/** sessionStorage key set to '1' once a visitor has entered the correct passcode. */
export const ADMIN_GATE_STORAGE_KEY = 'admin-unlocked';

/**
 * Whether `input` matches the `expected` passcode. Both sides are trimmed so a
 * stray leading/trailing space doesn't lock out an otherwise-correct entry. An
 * empty expected passcode never matches — an unset/blank build value must not
 * silently unlock the dashboard for everyone. The inline gate script in
 * AdminGate.astro mirrors this exact comparison (it can't import a bundled
 * module), so keep the two in sync.
 */
export function isPasscodeCorrect(input: string, expected: string): boolean {
  const want = expected.trim();
  if (want.length === 0) return false;
  return input.trim() === want;
}
