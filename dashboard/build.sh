#!/bin/bash
cp templates/*.html docs/

docker build --no-cache -t mycontinuum-dashboard .
