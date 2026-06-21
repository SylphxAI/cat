# Agent Instructions

This repository consumes the Sylphx engineering doctrine from [SylphxAI/doctrine](https://github.com/SylphxAI/doctrine).

Before changing files here:

- Read [PROJECT.md](./PROJECT.md) and [`.doctrine/project.json`](./.doctrine/project.json) for this repository's goal, lifecycle, boundary, public surfaces, and adoption gaps.
- Read `SylphxAI/doctrine` `AGENTS.md`, `PRINCIPLES.md`, and `ADR.md`, then load any triggered standards.
- Keep Cat package behavior generic to logging and observability; consuming services own their local log policy and telemetry backends.

Do not add application-specific logging behavior here. This repository owns the Cat package ecosystem only.
