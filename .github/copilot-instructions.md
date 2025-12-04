# Copilot Instructions for AI Coding Agents

## Project Overview
This project is a Playwright-based end-to-end testing suite. The main files are:
- `playwright.config.ts`: Playwright configuration
- `tests/`: Contains test specifications (e.g., `example.spec.ts`)
- `package.json`: Manages dependencies and scripts

## Architecture & Data Flow
- Tests are written in TypeScript and organized under the `tests/` directory.
- Playwright is the primary test runner and automation framework.
- Configuration is centralized in `playwright.config.ts`.

## Developer Workflows
- **Install dependencies:**
  ```pwsh
  npm install
  ```
- **Run tests:**
  ```pwsh
  npx playwright test
  ```
- **Debug tests:**
  ```pwsh
  npx playwright test --debug
  ```
- **Update Playwright browsers:**
  ```pwsh
  npx playwright install
  ```

## Project-Specific Conventions
- All test files should be placed in the `tests/` directory and use the `.spec.ts` suffix.
- Use Playwright's built-in fixtures and expect assertions for test reliability.
- Configuration changes should be made in `playwright.config.ts`.
- Prefer TypeScript for all test code.

## Integration Points & Dependencies
- Playwright is the only major external dependency for browser automation and testing.
- No custom service boundaries or microservices detected; the project is focused on test automation.

## Examples
- See `tests/example.spec.ts` for test structure and usage patterns.
- Refer to `playwright.config.ts` for configuration options and environment setup.

## Additional Notes
- No custom AI agent instructions or rules files were found in the codebase.
- No README.md detected; this file serves as the primary onboarding guide for AI agents.

---

**If any section is unclear or missing important project-specific details, please provide feedback or point to relevant files to improve these instructions.**
