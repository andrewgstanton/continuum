#!/bin/bash

# Ensure SQLite file exists on host
if [ ! -f mycontinuum.db ]; then
  touch mycontinuum.db
fi

# If passed --shell, run an interactive shell
if [[ "$1" == "--shell" ]]; then
  docker rm -f mycontinuum-dashboard-container 2>/dev/null
  docker run -it --rm \
    -v "$(pwd)/app.py":/app/app.py \
    -v "$(pwd)/data":/app/data \
    -v "$(pwd)/templates":/app/templates \
    -v "$(pwd)/static":/app/static \
    -v "$(pwd)/utils":/app/utils \
    -v "$(pwd)/scripts":/app/scripts \
    -v "$(pwd)/mycontinuum.db":/app/mycontinuum.db \
    mycontinuum-dashboard /bin/bash
  exit 0
fi

# Default behavior: run the app normally
# and migrate any current data from the json files to db
docker rm -f mycontinuum-dashboard-container 2>/dev/null

docker run -p 5000:5000 \
  --name mycontinuum-dashboard-container \
  -v "$(pwd)/app.py":/app/app.py \
  -v "$(pwd)/data":/app/data \
  -v "$(pwd)/templates":/app/templates \
  -v "$(pwd)/static":/app/static \
  -v "$(pwd)/utils":/app/utils \
  -v "$(pwd)/scripts":/app/scripts \
  -v "$(pwd)/mycontinuum.db":/app/mycontinuum.db \
  mycontinuum-dashboard \
  bash -c "python -u /app/scripts/fetch_nostr_data.py  && python -u /app/scripts/migrate_json_to_sqlite.py && python -u /app/app.py"
