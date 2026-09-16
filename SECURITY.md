# 🛡️ HackJudge Participant Portal — Security Policy

## Security Scope

The portal handles repository URLs, deployment links, evaluation requests, scores, event configuration, and organizer operations. Security and evaluation integrity are core requirements.

## Reporting a Vulnerability

**Do not disclose suspected vulnerabilities through public GitHub issues.** Report them privately through the maintainer’s GitHub profile contact method.

Include, where possible:

- Vulnerability summary and affected component.
- Reproduction steps or proof of concept.
- Required permissions and attack prerequisites.
- Potential confidentiality, integrity, or availability impact.
- Suggested mitigation.

Do not include live credentials, personal information, or private participant code unless essential.

## High-Priority Findings

Please prioritize reports involving:

- Credential or token exposure.
- Authentication or authorization bypass.
- Unauthorized submission, score, or configuration modification.
- Database access or participant-data disclosure.
- SSRF or unsafe external URL fetching.
- Arbitrary code execution.
- Denial of service against submission or polling endpoints.
- Manipulation of evaluation or leaderboard integrity.

## Secret Exposure Response

If a secret is committed or exposed:

1. Rotate or revoke it immediately.
2. Review logs, deployments, forks, and repository history.
3. Remove it from active configuration.
4. Replace it with encrypted environment configuration.
5. Assess whether history rewriting is necessary.
6. Investigate possible unauthorized use.

Removing a secret from the latest commit does not invalidate copies in Git history, forks, caches, or logs.

## Secure Development Requirements

- Never commit `.env` files, passwords, tokens, or production connection strings.
- Remove insecure default administrator credentials before deployment.
- Use strong authentication and authorization for privileged actions.
- Treat repository content and external URLs as untrusted input.
- Validate inputs server-side, not only in the browser.
- Add rate limiting and abuse protection to public endpoints.
- Configure Supabase Row Level Security appropriately.
- Keep secrets out of logs, client bundles, and error responses.
- Review dependencies and security advisories regularly.
- Treat localStorage submission limits as client-side UX controls, not security enforcement.
- Preserve a human review path for disputed results.

## Response Process

Maintainers will triage credible reports, assess severity, contain active exposure, validate a fix, and communicate relevant remediation. Timelines depend on severity, reproducibility, and maintainer availability.

Reporters may receive credit only with explicit permission.
