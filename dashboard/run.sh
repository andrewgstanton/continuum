#!/bin/bash
docker run -p 5000:5000 \
  -v "$(pwd)/data":/app/data \
  -v "$(pwd)/templates":/app/templates \
  -v "$(pwd)/static":/app/static \
  mycontinuum-dashboard