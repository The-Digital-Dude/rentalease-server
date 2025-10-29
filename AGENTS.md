# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds runtime code: `server/` bootstraps Express, `routes/` wires feature endpoints, `controllers/` enforce use-case logic, `models/` define Mongoose schemas, `services/` integrate with Stripe, Twilio, Resend, etc., and `utils/` centralizes helpers.
- `src/scripts/` contains one-off maintenance scripts (e.g. `fixAgencyPropertyCounts.js`).
- `tests/` groups Jest suites; `tests/setup.js` configures shared fixtures.
- `docs/` and the root `*_DOCUMENTATION.md` files provide API references; `assets/` stores static templates; `uploads/` is ignored at deploy time but used locally for generated files.

## Build, Test, and Development Commands
- `pnpm install` resolves dependencies; lockfiles are managed with pnpm—avoid npm/yarn.
- `pnpm dev` launches Nodemon with hot reload against `index.js`; expect the API at `http://localhost:PORT`.
- `pnpm start` runs the compiled server once, used for staging/production parity.
- `pnpm test` executes all Jest suites; append `--watch` when iterating locally.
- `pnpm run fix-property-counts` executes the corrective maintenance script; run only after confirming data backups.

## Coding Style & Naming Conventions
- Prefer modern ES modules with `import`/`export`, 2-space indentation, and double-quoted strings (see `src/server/app.js`).
- Name files using kebab- or dot-separated feature scopes (`propertyManager.routes.js`, `email.service.js`); mirror route/controller names for traceability.
- Keep controllers lean, push shared logic into `services/` or `utils/`, and handle errors with Express next handlers so the global middleware can respond consistently.

## Testing Guidelines
- Write new suites beside existing ones in `tests/`, naming files `<feature>.test.js`.
- Use Jest + Supertest for HTTP flows; leverage `tests/setup.js` when seeding databases or mocks.
- Target meaningful coverage on newly added endpoints; configure extra matchers via Jest rather than custom harnesses for consistency.

## Commit & Pull Request Guidelines
- Follow the repo’s short, sentence-case commit messages (`Removed stripe payment from agency`, `PDF report edited`); start with an imperative verb when possible.
- Reference relevant tickets or documentation in the PR description, note breaking changes, and attach screenshots or sample payloads for API/UI-impacting work.
- Ensure tests pass before requesting review and mention any manual steps (migrations, scripts) in the PR checklist.

## Security & Configuration Tips
- Copy `.env` from `.env.save` when onboarding; never commit secrets. Keep third-party keys scoped to non-production when testing.
- Sanitize uploads before persisting; sensitive exports should remain within `uploads/` and be pruned before committing.
