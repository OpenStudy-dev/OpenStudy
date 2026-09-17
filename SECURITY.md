# Security Policy

## Supported Versions

| Version | Status |
|---------|--------|
| 0.7.x   | ✅ Supported — security fixes |
| < 0.7   | ❌ Unsupported — please upgrade |

## Reporting a Vulnerability

If you discover a security issue, please **do not** open a public GitHub
issue. Instead, email:

**security@openstudy.dev** (forwarded to the maintainer)

You can also report via GitHub's private vulnerability disclosure:
**[Report a vulnerability](https://github.com/openstudy-dev/OpenStudy/security/advisories/new)**

### What to include

- A description of the vulnerability and its potential impact.
- Steps to reproduce (PoC if possible — without harming other users).
- Affected version(s).
- Your preferred contact info if you want credit / coordination.

### What to expect

- Acknowledgement within **72 hours**.
- An initial assessment within **7 days**.
- A fix or disclosure timeline within **30 days** for high-severity issues.
- Public disclosure happens **after** a fix ships, or **90 days** after
  the initial report — whichever comes first.

## Scope

OpenStudy is multi-tenant. The following are in scope for security
reports:

- **Cross-user data exposure** — one user reading/writing another user's
  data via any API surface (REST, MCP, file storage).
- **Authentication / session bypass** — login, signup, password reset,
  email verification, TOTP, OAuth consent.
- **Privilege escalation** — non-operator user gaining operator
  capabilities.
- **Credential leakage** — Telegram tokens, encrypted secrets, session
  cookies.
- **Stored XSS / SQL injection** — anywhere user input flows into a
  query or rendered HTML.

Out of scope:
- Bugs in third-party services (Hetzner, Cloudflare, Telegram).
- Denial-of-service via expected rate limits.
- Self-XSS / social engineering of the operator.
- Issues in self-hosted setups due to operator misconfiguration
  (weak passwords, exposed env files, etc.).

### OAuth client registration is intentionally open

`POST /oauth/register` is an unauthenticated RFC 7591 Dynamic Client
Registration endpoint. This is **by design**: the MCP authorization spec
requires open DCR so MCP clients (Claude.ai, Claude Code, any future
client) can self-register without an operator in the loop. Reports that
the endpoint "allows unauthenticated registration" are therefore not
vulnerabilities on their own.

What *is* in scope is anything that turns open DCR into account access
without an informed user click. The guard-rails, all of which are fair
game for reports:

- **Rate limit** — per-IP cap on registration attempts, valid or not
  (`REGISTER_MAX` / `REGISTER_WINDOW_MIN`).
- **redirect_uri validation** — `https` only (plain `http` accepted for
  loopback hosts only), no fragments, no wildcards, absolute URIs with a
  host. One bad URI rejects the whole registration.
- **Metadata caps** — at most 10 redirect URIs, `client_name` ≤ 100
  printable characters.
- **Informed consent** — the consent screen shows the exact redirect URI
  the authorization code will be sent to and states that the client name
  is self-asserted, not verified by OpenStudy.
- **Bounded token lifetime** — `OAUTH_TOKEN_TTL_DAYS` (default 30).
- **Stale-client pruning** — clients that never complete a flow within
  7 days are deleted.

A consent-phishing bypass (getting a code to an attacker without the
user seeing the destination), a validator bypass, or a way around the
rate limit would all be valid reports.

## Acknowledgements

We credit researchers who report responsibly, with their permission and
in the form they prefer (name, handle, link, or anonymous).

- **2026-09** — Anonymous researcher: reported that the open DCR endpoint
  could be used to stage a consent-phishing flow with an
  attacker-controlled redirect URI. Led to the guard-rails documented
  above (rate limiting, redirect URI validation, informed consent screen,
  shorter token lifetime).
