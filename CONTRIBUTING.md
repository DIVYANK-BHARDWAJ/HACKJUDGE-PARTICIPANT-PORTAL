# 🚀 Contributing to HackJudge Participant Portal

Thank you for helping improve the participant experience, operational reliability, security, and transparency of HackJudge.

## Contribution Principles

Contributions should be:

- **Focused:** solve one clear problem.
- **Reviewable:** keep changes understandable and scoped.
- **Secure:** never expose secrets or participant data.
- **Accessible:** preserve keyboard, responsive, and readable experiences.
- **Evidence-based:** explain assumptions and validate behavior.
- **Fair:** avoid unjustified changes to judging or ranking behavior.

## Before You Start

1. Read `README.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`.
2. Search existing issues and pull requests.
3. Open an issue before substantial architectural changes.
4. Never commit credentials, production configuration, or private participant repositories.
5. Check third-party license compatibility before adding dependencies.

## Development Workflow

```text
Understand → Branch → Implement → Validate → Document → Pull Request
```

Suggested branch names:

- `feat/result-history`
- `fix/submission-validation`
- `security/admin-authentication`
- `docs/api-reference`

## Engineering Standards

- Prefer readable, strongly typed TypeScript.
- Validate all external input at server boundaries.
- Handle network and engine failures explicitly.
- Avoid leaking internal errors or sensitive data.
- Keep API responsibilities and UI responsibilities separated.
- Avoid unnecessary dependencies.
- Preserve responsive behavior and accessibility.
- Update documentation and environment-variable references when behavior changes.

## Submission and Evaluation Logic

Changes to submission limits, deadlines, score persistence, polling, leaderboard behavior, or administrative controls require additional care:

- Explain the behavioral impact.
- Include edge cases and failure scenarios.
- Add regression tests where practical.
- Do not treat browser-only restrictions as authoritative security controls.
- Preserve a human review path for disputed results.
- Avoid exposing participant data in fixtures, screenshots, or logs.

## Validation Checklist

Before opening a pull request:

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Test relevant API flows.
- [ ] Verify loading, error, and timeout states.
- [ ] Check responsive and keyboard behavior.
- [ ] Review security and privacy implications.
- [ ] Update documentation.
- [ ] Confirm no secrets or sensitive files are included.

Report the commands you ran and clearly identify any checks you could not perform.

## Pull Request Template

Include:

1. **Problem:** What is being solved?
2. **Solution:** What changed?
3. **Validation:** Which checks were run?
4. **Impact:** Which UI, API, data, or deployment surfaces changed?
5. **Security:** Does the change affect authentication, external URLs, secrets, or participant data?
6. **Screenshots:** Include them for meaningful UI changes.
7. **Migration notes:** Document required environment or database changes.

## Commit Style

Use clear, imperative messages:

- `feat: add result history`
- `fix: handle engine timeout`
- `security: remove insecure admin fallback`
- `docs: clarify local setup`

## Review Standards

Maintainers may request changes when a contribution is unsafe, insufficiently tested, undocumented, overly broad, or inconsistent with the project’s fairness and privacy goals.

## License

By contributing, you agree that your contributions are provided under the project’s Apache License 2.0, subject to applicable rights and conditions.
