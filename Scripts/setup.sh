#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_DIR/.venv"

if ! command -v python3 >/dev/null 2>&1; then
		echo "Python 3 is required. Install python3 and try again." >&2
		exit 1
fi

cd "$PROJECT_DIR"
if ! python3 -m venv "$VENV_DIR"; then
		echo "Could not create the Python environment. Install python3-venv and try again." >&2
		exit 1
fi

"$VENV_DIR/bin/python" "$SCRIPT_DIR/installer.py"
"$VENV_DIR/bin/python" "$SCRIPT_DIR/setup.py"
