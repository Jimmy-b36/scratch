# Agents

This file initializes project-specific agent guidance.

## Purpose

- Document local agent workflows and conventions for this repository.
- Override or extend global agent behavior when needed.

## Notes

- Add project-specific instructions here as your workflow evolves.

## Project Scope

- Hybrid desktop notes app: React + TypeScript frontend and Tauri + Rust backend.
- Frontend-only changes can use Vite; native behavior must be validated in Tauri runtime.

## Core Commands

- Install deps: `npm ci`
- Frontend dev: `npm run dev`
- Full app dev: `npm run tauri dev`
- Build/typecheck: `npm run build`
- JS tests: `npm test`

## Source Layout

- `src/components/`: UI and interaction components.
- `src/context/`: app orchestration and state containers.
- `src/services/`: typed wrappers around Tauri commands.
- `src/lib/`: pure helpers and shared utility logic.
- `src/types/`: shared type contracts.

## React Preferences

- Prefer data down, events up.
- Make state changes event-driven.
- Avoid `useEffect` for internal React state synchronization.
- Keep app-level transitions in reducers and typed actions.
- Use split context patterns (data vs actions) to reduce rerenders.

## Effects and Async Rules

- Use `useEffect` only for external sync (listeners, timers, DOM/system APIs, Tauri events).
- Always clean up subscriptions/listeners/timers.
- Guard async race conditions with refs/request IDs when responses can arrive out of order.
- Debounce high-frequency work like autosave/search/status refreshes.

## Tauri Contract Rules

- Keep `src/services/*` command names and payloads in sync with Rust `generate_handler!` commands.
- Prefer shared service wrappers for business operations instead of scattered raw `invoke()` calls.
- Preserve backend path and URL validation behavior; do not weaken security checks.

## Rust Best Practices

- Keep Tauri command handlers small; push business logic into focused helper functions/modules.
- Return typed `Result<T, String>` (or project error types) from commands and convert errors with clear, user-safe messages.
- Validate and normalize filesystem paths before access; deny traversal and unsafe path assumptions.
- Preserve URL/scheme allowlists and explicit input validation for all external inputs.
- Avoid `unwrap()`/`expect()` in runtime command paths; handle failures gracefully and propagate context.
- Prefer iterator and `Option`/`Result` combinators for clarity; use early returns for invalid states.
- Keep structs/enums strongly typed and serde-friendly for stable frontend/backend contracts.
- Minimize cloning and unnecessary allocations in hot paths; borrow where practical.
- Add unit tests for pure Rust logic and run `cargo check`/`cargo clippy -- -D warnings` before merge.
- Keep command names, payload shapes, and side effects backward-compatible unless coordinated with frontend updates.

## Don'ts

- Do not use monolithic contexts that mix fast-changing data and actions together.
- Do not mirror internal derived state via `useEffect`; derive in render or reducer paths.
- Do not rely on `npm run dev` to validate native filesystem/window/plugin behavior.
