#!/bin/sh
# Permission model follows symlinks out of the granted directory (documented limitation).
# Run inside the container: sh /ex/permission-symlink.sh
mkdir -p /g && ln -sf /etc/passwd /g/link
node --version
node --permission --allow-fs-read=/g -e '
const fs = require("node:fs");
for (const p of ["/etc/passwd", "/g/link"]) {
  try { console.log(p.padEnd(12), "OK", fs.readFileSync(p, "utf8").split("\n")[0]); }
  catch (e) { console.log(p.padEnd(12), "DENIED", e.code); }
}'
