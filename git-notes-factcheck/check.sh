#!/usr/bin/env bash
# Fact-check experiments for Vault notes Engineering/General/Git/*.md.
# Usage: bash check.sh [workdir]   (default: a fresh mktemp dir; nothing outside it is touched)
set -u
W="${1:-$(mktemp -d)}"
mkdir -p "$W"; cd "$W" || exit 1
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
export HOME="$W"   # isolate from user's ~/.gitconfig (pull.rebase etc.)
g() { git -c init.defaultBranch=main -c advice.detachedHead=false "$@"; }
echo "git: $(git --version)"; echo "workdir: $W"

section() { echo; echo "=== $1"; }

section "1. diff3 base-marker label (merge, single merge base)"
rm -rf m && g init -q m && cd m
printf 'a\ntimeout=1000\nz\n' > f && g add f && g commit -qm base
g switch -qc feature && sed -i 's/1000/5000/' f && g commit -qam theirs
g switch -q main && sed -i 's/1000/3000/' f && g commit -qam ours
g -c merge.conflictStyle=diff3 merge feature >/dev/null 2>&1
grep -n '^|||||||' f
section "2. restore --merge after git add (resolve-undo)"
g add f; echo "status after add: $(g status --porcelain f)"
g restore --merge f; echo "status after restore --merge: $(g status --porcelain f)"; grep -c '^<<<<<<<' f
g merge --abort; cd ..

section "3. git pull on divergent branches with NO pull.* config"
rm -rf srv a b && g init -q --bare srv && g clone -q srv a 2>/dev/null && cd a
echo 1 > x && g add x && g commit -qm c1 && g push -q origin HEAD:main 2>/dev/null; cd ..
g clone -q srv b 2>/dev/null
(cd a && echo 2 >> x && g commit -qam a2 && g push -q origin main)
(cd b && echo y > y && g add y && g commit -qm b2 && g pull 2>&1 | tail -3; echo "exit=$?"; g log --oneline --merges | wc -l | sed 's/^/merge commits in b: /')

section "4. --force-with-lease (no expected value) after a background fetch"
# Colleague (a) pushes; you (b) only *fetch* (like an IDE auto-fetch), never integrate,
# then force-push your rewritten branch.
lease_case() {  # $1 = extra push flags
  rm -rf L && mkdir L && cd L
  g init -q --bare srv && g clone -q srv a 2>/dev/null
  (cd a && echo 1 > x && g add x && g commit -qm base && g push -q origin HEAD:main)
  g clone -q srv b 2>/dev/null
  (cd a && echo colleague >> x && g commit -qam colleague && g push -q origin main)
  cd b && g fetch -q && g commit -q --allow-empty -m mine
  g push --force-with-lease $1 origin HEAD:main 2>&1 | grep -E 'forced|rejected|stale'
  echo "colleague commit still on server: $(g --git-dir=../srv log --oneline main | grep -c colleague)"
  cd ../..
}
echo "--force-with-lease only:";              lease_case ""
echo "--force-with-lease --force-if-includes:"; lease_case "--force-if-includes"

section "5. switch error messages and -c transactionality"
rm -rf s && g init -q s && cd s
echo v1 > x && g add x && g commit -qm v1 && echo v2 > x && g commit -qam v2
(cd ../b && g switch origin/main 2>&1 | head -1)
g switch --no-guess nosuch 2>&1 | head -1
g switch "$(g rev-parse HEAD)" 2>&1 | head -1
echo local > x; g switch -c newb HEAD~1 2>&1 | head -2
echo "branch newb exists? $(g branch --list newb | wc -l)  (0 = not created)"
g checkout -q -- x; cd ..

section "6. pickaxe -S and merge commits (evil merge)"
rm -rf p && g init -q p && cd p
echo a > f && g add f && g commit -qm c0
g switch -qc side && echo s > s && g add s && g commit -qm side
g switch -q main && echo m > m && g add m && g commit -qm mainc
g merge -q --no-commit side 2>/dev/null; echo SECRET > evil && g add evil && g commit -qm merge
echo "log -S SECRET (default):        $(g log --oneline -S SECRET | wc -l)"
echo "log -S SECRET --first-parent:   $(g log --oneline -S SECRET --first-parent | wc -l)"
echo "log -S SECRET -m:               $(g log --oneline -S SECRET -m | wc -l)"
cd ..

section "7. restore --staged in a repo without commits"
rm -rf e && g init -q e && cd e && echo a > f && g add f
g restore --staged f 2>&1 | head -1; g reset -q f && echo "reset f: ok, status=$(g status --porcelain)"
cd ..

section "8. reflog / gc defaults (unset => built-in default)"
g config --get gc.reflogExpire || echo "gc.reflogExpire unset (doc default 90 days)"
g config --get gc.reflogExpireUnreachable || echo "gc.reflogExpireUnreachable unset (doc default 30 days)"
