# GitHub Workflow & Branching Strategy

This document outlines the version control, branching, and pull request policies for the Job Finder Agent repository.

---

## 1. Branch Strategy

We follow a structured branching model to maintain a stable `main` branch while allowing rapid feature integration.

- **`main`**: Represents the stable, production-ready release state. No direct commits allowed.
- **`develop`**: The primary integration branch where all feature branches are merged.
- **Feature Branches**: Formed off `develop` for active development.
  - Pattern: `feature/auth-web`
  - Pattern: `feature/auth-mobile`
  - Pattern: `feature/supabase-schema`
  - Pattern: `feature/docs-foundation`

---

## 2. Pull Request (PR) Policy

- All modifications must go through a pull request targeting `develop`.
- PR reviews should check that CI checks (linter, build scripts) pass.
- Each PR must use the `PULL_REQUEST_TEMPLATE.md` describing:
  - **Summary**: What changes were made and why.
  - **Screenshots**: Visual changes (if UI was modified).
  - **Test Steps**: Manual verification steps.
  - **Known Limitations**: Constraints or pending tasks.

---

## 3. Commit Message Style

We use a semantic commit style to make the history clean and readable:

- `feat: ...` for new features (e.g., `feat: add web auth pages`).
- `fix: ...` for bug fixes (e.g., `fix: handle auth callback error`).
- `docs: ...` for documentation changes (e.g., `docs: add auth flow documentation`).
- `chore: ...` for builds, config changes, and dependencies (e.g., `chore: add supabase schema docs`).
- `test: ...` for adding tests (e.g., `test: add auth validation tests`).

---

## 4. Versioning & Release Roadmap

We use Semantic Versioning (SemVer) tags (e.g., `vX.Y.Z`).

- **`v0.1.0-auth-foundation`**: The first milestone containing project structure and basic authentication UI/database triggers.
- **`v0.2.0-resume-builder`**: Resume builder module placeholder update.
- **`v0.3.0-job-tracker`**: Job tracking board framework.
- **`v0.4.0-calendar-scheduler`**: Scheduler integration.
- **`v0.5.0-interview-coach`**: AI simulation workspace.
- **`v1.0.0-public-mvp`**: First public release.
