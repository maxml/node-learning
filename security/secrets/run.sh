#!/usr/bin/env bash
# Shows that secrets "removed" are still recoverable. All secrets are FAKE.
# Run from this directory:  bash run.sh
# Cleans up the image, container and temp git repo it creates.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
IMG=secrets-demo:leak
TMP="$(mktemp -d)"
SAVE="$HERE/.imgtar"      # under the repo dir: docker CLI can reach it (unlike a fresh /tmp dir under sandbox)
GITDEMO="$HERE/.gitdemo"  # throwaway repo, also under HERE so cd works under the sandbox
cleanup() {
  docker rm -f secrets-demo >/dev/null 2>&1
  docker rmi "$IMG" >/dev/null 2>&1
  rm -rf "$TMP" "$SAVE" "$GITDEMO" "$HERE/.env"
}
cleanup
trap cleanup EXIT

echo "== docker version =="; docker --version

# the .env that we will COPY then rm inside the build
echo 'SECRET_IN_DOTENV=fake-dotenv-secret-3333' > "$HERE/.env"

echo; echo "===== build image (ARG + ENV + COPY .env && rm) ====="
docker build -t "$IMG" --build-arg API_KEY=fake-ARG-key-1111 "$HERE" >/dev/null && echo build ok
rm -f "$HERE/.env"   # gone from the build context on disk

echo; echo "===== (1) docker history shows the build steps incl. the ARG/ENV/rm ====="
docker history --no-trunc "$IMG" | grep -iE 'password|API_KEY|\.env|rm ' | sed 's/  */ /g' | cut -c1-140

echo; echo "===== (2) docker inspect shows the ENV secret of a running container ====="
docker run -d --name secrets-demo "$IMG" >/dev/null
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' secrets-demo | grep -i password

echo; echo "===== (3) the 'deleted' .env is still in an image layer (via docker save) ====="
mkdir -p "$SAVE/x"
docker save "$IMG" -o "$SAVE/img.tar"
tar -xf "$SAVE/img.tar" -C "$SAVE/x"
echo "grep across extracted layer tars for the dotenv secret:"
find "$SAVE/x" -name '*.tar' | while read -r L; do
  if tar -xOf "$L" 2>/dev/null | grep -aqo 'fake-dotenv-secret-3333'; then
    echo "  FOUND fake-dotenv-secret-3333 inside layer: ${L#$SAVE/x/}"
  fi
done
# newer docker uses blobs/ not *.tar per layer; grep the whole saved image too
if grep -aroq 'fake-dotenv-secret-3333' "$SAVE/x" 2>/dev/null; then
  echo "  FOUND fake-dotenv-secret-3333 in saved image at:"
  grep -arol 'fake-dotenv-secret-3333' "$SAVE/x" | sed "s|$SAVE/x/||" | head
fi

echo; echo "===== (4) /proc/<pid>/environ exposes a process's env to the same user ====="
SECRET_PROC=fake-proc-secret-4444 sleep 30 &
PID=$!
sleep 0.3
echo "tr '\\0' '\\n' < /proc/$PID/environ | grep SECRET_PROC:"
tr '\0' '\n' < "/proc/$PID/environ" | grep SECRET_PROC || echo "  (could not read)"
kill "$PID" 2>/dev/null

echo; echo "===== (5) a commit that 'removes' a secret leaves it in git history ====="
mkdir -p "$GITDEMO" && cd "$GITDEMO"
git init -q repo && cd repo
git config user.email demo@example.com; git config user.name demo
printf 'token=fake-git-secret-5555\n' > config.ini
git add config.ini && git commit -qm "add config (oops, real-looking secret)"
# "fix": remove the secret in a new commit
printf 'token=${TOKEN_FROM_ENV}\n' > config.ini
git add config.ini && git commit -qm "remove hardcoded secret"
echo "HEAD config.ini (clean):"; cat config.ini
echo "git log -p still contains it:"
git log -p -- config.ini | grep -n 'fake-git-secret-5555' | head

echo; echo "== done; cleaning up =="
