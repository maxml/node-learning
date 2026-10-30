# AWS examples

Experiments behind «перевірено» claims in `Obsidian Vault/Engineering/General/AWS/`.
None of them uses an AWS account or creates cloud resources.

## eventbridge-patterns

EventBridge event-pattern edge cases (28 cases), run against
[aws/event-ruler](https://github.com/aws/event-ruler) 2.2.0, the open-source library that
EventBridge event-bus matching runs on
([What's New, 2024-02-01](https://aws.amazon.com/about-aws/whats-new/2024/02/amazon-eventbridge-event-bus-matching-event-ruler)).
Used by the note `EventBridge.md`, section «Перевірено експериментом».

Why not LocalStack: since LocalStack for AWS 2026.03.0 an auth token is required to start
it ([release notes](https://blog.localstack.cloud/localstack-for-aws-release-2026-03-0/)).
Why not `TestEventPattern`: it needs an AWS account.

Run (needs Docker; pulls `maven:3.9-eclipse-temurin-21`, downloads event-ruler from Maven
Central, removes the image at the end unless `KEEP_IMAGE=1`):

```
bash examples/aws/eventbridge-patterns/run.sh
```

Each case states the result expected from the EventBridge docs; the program prints
`FAIL` and `N UNEXPECTED` on any mismatch.

### Result, 2026-10-30

Docker 29.7.2, event-ruler 2.2.0, `Machine.rulesForJSONEvent`:

```
ok   07 numeric >100 vs string "150"        expected=no match  actual=no match
ok   09 exact [5] vs number 5.0             expected=match     actual=match
ok   13 exists:false vs explicit null       expected=no match  actual=no match
ok   17 anything-but ["a"] vs tags ["a","b"] expected=match    actual=match
ok   19 sku=A and qty>3 in different elements expected=no match actual=no match
...
ALL AS EXPECTED   (28 of 28)
```

Mutation check, same day: changing the expectation of case 07 to `match` made the run
print `FAIL 07 …` and `1 UNEXPECTED`, so the harness does detect a mismatch.

Limits of the evidence:

- This is the library, not the managed service. AWS does not publish which event-ruler
  version EventBridge runs today (1.5.0 was announced in February 2024).
- Case 09 (`[5]` matched `5.0`) contradicts the EventBridge docs, which say `300` and
  `300.0` are not equal. Do not rely on either behaviour in the service.
- Cases 17 and 19 (anything-but over an array; conditions on an array of objects must
  hold in the same element) are library behaviour that the EventBridge docs do not
  describe.

## ecs-exit-codes

Exit codes behind ECS stopped-task diagnostics, reproduced with plain Docker and a Node 24
workload: kernel OOM kill vs V8 heap abort vs `SIGKILL` after a stop timeout, and what
`--init` (ECS `initProcessEnabled`) changes. Used by the note `Діагностика ECS-тасків.md`,
sections «Пам'ять: 137, OOM і купа V8», «Зупинка: SIGTERM, stopTimeout, SIGKILL» and
«Перевірено експериментом».

Run (needs Docker and the `node:24` image, pulled if missing; every container is named
`ecs-exit-<pid>-*` and removed on exit):

```
bash examples/aws/ecs-exit-codes/run.sh
```

Each case states the expected `<exitCode> <OOMKilled>`; a mismatch prints `FAIL` and the
run exits 1 with `N UNEXPECTED`.

### Result, 2026-10-30

Docker 29.7.2, `node:24` = v24.22.2:

```
ok   offheap-512m               expected=137/true   actual exit=137  OOMKilled=true
       [offheap] heap_size_limit=259 MiB
ok   heap-default-512m          expected=139/false  actual exit=139  OOMKilled=false
       FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
ok   heap-default-512m-init     expected=134/false  actual exit=134  OOMKilled=false
       FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
ok   heap-maxold1024-in-256m    expected=137/true   actual exit=137  OOMKilled=true
       [heap] heap_size_limit=1027 MiB
ok   ignore-term-stop-t2        expected=137/false  actual exit=137  OOMKilled=false
       docker stop -t 2 took 3s
ok   graceful-stop-t10          expected=0/false    actual exit=0    OOMKilled=false
ok   no-handler-stop-t10        expected=137/false  actual exit=137  OOMKilled=false
       docker stop -t 10 took 11s
ok   no-handler-init-t10        expected=143/false  actual exit=143  OOMKilled=false
       docker stop -t 10 took 0s
ALL AS EXPECTED   (8 of 8)
```

Every case gave the same exit code in each run that included it (five runs that day while
the script grew, including the mutation run). Mutation check, same day:
removing `--init` from the last case made it print
`FAIL no-handler-init-t10 expected=143/false actual exit=137` and `1 UNEXPECTED`, so the
harness detects a mismatch. `docker ps -a --filter name=ecs-exit-` was empty after every
run.

What it shows:

- Exit code 137 alone does not say "out of memory": a stop timeout gives the same 137
  with `OOMKilled=false`.
- A Node process that hits its own V8 heap limit is not killed by the kernel. It aborts
  with `JavaScript heap out of memory` and exits 134 (139 when Node is PID 1 without an
  init process), with `OOMKilled=false`.
- Node as PID 1 without a `SIGTERM` handler ignores `SIGTERM` and waits for `SIGKILL`
  (137 after the full timeout). Under `--init` the same code exits 143 immediately.

Limits of the evidence:

- This is local Docker on Linux, not Fargate or the ECS agent. How ECS maps these exits
  into `stopCode`, `stoppedReason` and the container `reason` comes from the AWS docs, not
  from this run.
- 139 vs 134 for the heap abort under PID 1 was observed, not explained; do not alert on
  the exact number.
