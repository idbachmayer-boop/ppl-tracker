# Phase 7: Content Security Policy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-10-02
**Phase:** 07-content-security-policy
**Areas discussed:** Policy strictness, Stale-hash guard, Rollout & sync check, Firebase pinning

## Policy strictness
| Option | Selected |
|---|---|
| Full lockdown (default-src 'none' + explicit allows) | ✓ |
| Scripts + network only | |

Hardening directives (object-src/base-uri/form-action 'none'): **Yes** ✓ / No

## Stale-hash guard
| Option | Selected |
|---|---|
| npm test fails on stale hash | ✓ |
| Documented command only | |

Regeneration: **npm script that rewrites in place** ✓ / print only

## Rollout & sync check
Proof: **Cross-device round trip** ✓ / Firestore console check
On failure: **Revert CSP commit immediately** ✓ / hotfix forward

## Firebase pinning
| Option | Selected |
|---|---|
| Exact version path + version-match test | ✓ |
| Whole gstatic host | |

## Deferred Ideas
- Inline style removal (drop style-src 'unsafe-inline').
