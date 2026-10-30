#!/usr/bin/env bash
# Runs Check.java against aws/event-ruler 2.2.0 in a throwaway Maven/JDK container.
# No AWS account, no cloud resources. Removes the image afterwards unless KEEP_IMAGE=1.
set -euo pipefail
cd "$(dirname "$0")"
IMAGE=maven:3.9-eclipse-temurin-21
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/work -w /work "$IMAGE" bash -c '
  mvn -q -Dmaven.repo.local=/tmp/m2 dependency:copy-dependencies -DoutputDirectory=target/deps &&
  javac -d target/classes -cp "target/deps/*" Check.java &&
  java -cp "target/classes:target/deps/*" Check
'
rm -rf target
if [ "${KEEP_IMAGE:-0}" != "1" ]; then docker rmi "$IMAGE" >/dev/null; fi
