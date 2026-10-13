#!/bin/sh
# Resolve paths from this script, rather than the caller's working directory.
set -eu
ADMIN_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$ADMIN_DIR/update_json.py" "$@"
