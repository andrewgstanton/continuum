#!/bin/bash
docker run -p 5000:5000 \
  -v "$(pwd)/data":/app/data \
  -v "$(pwd)/docs":/app/docs \
  mycontinuum-dashboard