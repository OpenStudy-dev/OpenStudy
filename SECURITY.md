# Security Policy

## Supported versions

| Version | Status |
|---------|--------|
| 0.7.x   | Supported, receives security fixes |
| < 0.7   | Unsupported, please upgrade |

## Reporting a vulnerability

Please do not open a public GitHub issue. Report privately by either:

- Email: **security@openstudy.dev**
- GitHub: [Report a vulnerability](https://github.com/openstudy-dev/OpenStudy/security/advisories/new)

Include a description of the issue and its impact, steps to reproduce,
the affected version, and how you would like to be credited (or that you
prefer not to be).

### What to expect

- Acknowledgement within 72 hours.
- Initial assessment within 7 days.
- A fix or a disclosure timeline within 30 days for high-severity issues.
- Public disclosure after the fix ships, or 90 days after the report,
  whichever comes first.

### Safe harbour

Good-faith research that follows this policy, avoids privacy violations,
data destruction and service disruption, and gives us reasonable time to
fix the issue will not be met with legal action.

## Scope

OpenStudy is multi-tenant. In scope:

- Cross-user data exposure through any API surface (REST, MCP, file storage).
- Authentication or session bypass: login, signup, password reset, email
  verification, TOTP, OAuth consent.
- Privilege escalation from a normal user to operator.
- Credential leakage: Telegram tokens, encrypted secrets, session cookies.
- Stored XSS and SQL injection.

Out of scope:

- Bugs in third-party services (Hetzner, Cloudflare, Telegram).
- Denial of service that the existing rate limits are designed to absorb.
- Self-XSS, or social engineering of the operator.
- Misconfigured self-hosted installs (weak passwords, exposed env files).

### Not considered vulnerabilities

- **Unauthenticated OAuth client registration.** `POST /oauth/register`
  is an open RFC 7591 endpoint on purpose: the MCP authorization spec
  requires it so clients such as Claude.ai can register themselves.
  Registration is rate-limited, redirect URIs are validated, and the
  consent screen shows the user exactly where the authorization code will
  be sent. A way around any of those protections is in scope.

## Acknowledgements

We credit researchers who report responsibly, in the form they prefer.

- 2026-09: [Md Rabbi Hossain](https://x.com/csrrabbi). Consent-phishing
  path via open client registration with an attacker-controlled redirect
  URI.
