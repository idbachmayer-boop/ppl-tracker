# Phase 4: Draft Goes Device-Local - Discussion Log

**Date:** 2026-09-22 · Areas: all 4 selected

| Area | Question | Choice |
|---|---|---|
| Cross-device handoff | Start on one device, continue on another? | Never, phone only |
| Cross-device handoff | Other device shows? | Nothing |
| Cutover | Cloud-only draft on first boot | Ignore cloud draft |
| Cutover | Stale cloud field | Strip on next merged write |
| Backups | JSON backup includes draft? | Exclude |
| Backups | Snapshots include draft? | Exclude, like wx |
| Backups | Erase / Import→Replace | Erase clears, Import keeps |
| Saves | Draft edit save type | Local-only save |

All recommended options were chosen. Claude's discretion: storage shape, normalizeDraft placement, migration need.
