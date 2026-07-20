#!/bin/bash
# tools/mission-driver.sh - Mission driver launcher
#
# Usage:
#   ./tools/mission-driver.sh run <mission>              Run full mission-driver flow
#   ./tools/mission-driver.sh run <mission> --step <S>   Run a single step only
#   ./tools/mission-driver.sh draft <description>        Generate a new mission.json
#   ./tools/mission-driver.sh list [missions|steps]      List missions (default) or steps
#   ./tools/mission-driver.sh help [command]             Show help (top-level or per-command)
#
# <mission> is the name in missions/<mission>.json (e.g. "e2e-upgrade").
# The mission-driver engine lives in the AGE template; this launcher only points
# to it. Override the location with MISSION_DRIVER_HOME if needed.
#
# Path assumptions:
#   This script lives at <repo>/tools/mission-driver.sh
#   The engine is expected at <parent-of-repos>/attractor-guided-engineering-template/tools/mission-driver
#   All project repos (nop-chaos-next, nop-entropy, nop-app-erp, etc.) are siblings
#   under the same parent directory. If your layout differs, create symlinks or
#   set MISSION_DRIVER_HOME.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Resolve MISSION_DRIVER_HOME to a real (non-symlink) path. The engine's main.js
# checks process.argv[1] against import.meta.url; import.meta.url uses the
# resolved real path. If we pass a symlink path the guard fails and
# program.parse() is never called (no output, exit 0).
_AGE_TEMPLATE="$(cd "$SCRIPT_DIR/../../attractor-guided-engineering-template" && pwd -P)"
MISSION_DRIVER_HOME="${MISSION_DRIVER_HOME:-$_AGE_TEMPLATE/tools/mission-driver}"

exec node "$MISSION_DRIVER_HOME/src/main.js" \
  --dir "$PROJECT_ROOT" \
  --missions-dir "missions" \
  "$@"
