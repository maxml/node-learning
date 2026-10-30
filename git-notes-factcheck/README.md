# git-notes-factcheck

Throwaway-repo experiments behind the fact-check of the Vault notes
`Engineering/General/Git/*.md` (2026-10-29).

Run (everything happens inside the given or a fresh temp dir; `HOME` is isolated so
your `~/.gitconfig` does not leak in):

```bash
bash check.sh [workdir]
```

## Result 2026-10-29, git 2.34.1 (Ubuntu 22.04)

| # | Check | Observed | Note affected |
|---|---|---|---|
| 1 | diff3 base marker on a merge with one merge base | `\|\|\|\|\|\|\| <short hash>`, not `merged common ancestor`; rebase/cherry-pick: `parent of <hash> (<subj>)` | Конфлікти злиття (fixed) |
| 2 | `restore --merge` after `git add` | `M ` → `UU`, markers back | Відновлення файлів, Конфлікти злиття (correct) |
| 3 | `git pull` on divergent branches, no `pull.*` config | `fatal: Need to specify how to reconcile divergent branches.`, no merge commit | Гілкування та злиття (added) |
| 4 | `--force-with-lease` after a fetch that saw a colleague's push | lease alone: forced update, colleague commit gone; `+ --force-if-includes`: rejected, commit kept | Гілкування та злиття (caveat added) |
| 5 | `switch origin/x`, `--no-guess`, commit arg, failed `switch -c new <start>` | messages as quoted in the note; branch not created | Перемикання гілок (correct) |
| 6 | `log -S` on an evil merge | default 0 hits, `--first-parent` 1, `-m` 2 | Читання історії (correct) |
| 7 | `restore --staged` in a repo without commits | `fatal: could not resolve HEAD`; `git reset f` works | Відновлення файлів, Скидання гілки (correct) |

Newer-version claims (2.51 not experimental, 2.55 `checkout/switch -m` autostash and
`--max-count-oldest`, 2.44 `checkout -B` + worktrees, 2.43 `--dd`, 2.41, 2.37, 2.36,
2.35, 2.30, 2.27) were checked against `Documentation/RelNotes/*.adoc` in git/git, not
run locally. Latest release on that date: v2.56.0.
