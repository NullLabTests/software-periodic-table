# Security Policy

## Reporting a Vulnerability

Please report security issues privately rather than opening a public issue.

Use GitHub's [private vulnerability reporting](https://github.com/NullLabTests/software-periodic-table/security/advisories/new)
on this repository. If that is unavailable, open an issue that contains only a
pointer to a private contact and no technical detail.

Include: affected version, the file or symbol, a description of the impact, and a
reproduction if you have one. Expect an acknowledgement within 7 days.

## Scope

This project is a data artifact and a TypeScript library. There is no server, no
authentication, and no user data handling. In scope:

- `ontology/periodic-table.json` and its schema — a consumer that trusts the
  ontology without validating it could be misled by malformed or malicious
  metadata. `npm run validate` is the intended defence.
- `atoms/**` and `composer/**` — reference implementations and prompt
  construction. These are consumed by other code, so a defect here propagates.
- `src/jsonschema.ts` — a hand-written validator. Reporting a case where it
  accepts invalid input, or rejects valid input, is a genuine finding.

Out of scope: issues in the reference implementations that require an attacker to
already control the ontology file, and dependency CVEs in the development-only
toolchain.

## Notes for consumers

The reference implementations are demonstration code showing what an atom does.
They are not hardened for untrusted input: they read fields from `unknown`
records and coerce with `String(...)` rather than validating. Treat their output
as untrusted if the input records are.
