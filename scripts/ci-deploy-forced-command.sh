#!/usr/bin/env bash
# SSH forced command for the GitHub Actions deploy key.
#
# Installed OUTSIDE the git checkout (so `git reset --hard` can never swap
# it) as root:root 0755:
#
#   install -o root -g root -m 0755 scripts/ci-deploy-forced-command.sh \
#       /usr/local/sbin/openstudy-ci-deploy
#
# and bound to the key in /root/.ssh/authorized_keys:
#
#   restrict,command="/usr/local/sbin/openstudy-ci-deploy" ssh-ed25519 AAAA… github-actions-deploy
#
# Whatever the workflow sends is ignored except its `REF="…"` line
# (.github/workflows/deploy.yml). A leaked CI key can therefore only
# deploy a commit that already exists on GitHub — never run a shell.
set -euo pipefail

log() { logger -t openstudy-ci-deploy -- "$*"; echo "$*"; }

ref=$(printf '%s\n' "${SSH_ORIGINAL_COMMAND:-}" \
    | sed -nE 's/^[[:space:]]*REF="([^"]*)"[[:space:]]*$/\1/p' | head -1)
ref=${ref:-origin/main}

# Tags (v1.2.3), branches, origin/<branch> or a SHA. No spaces, quotes,
# shell metacharacters, leading dash or `..`.
if [[ ! "$ref" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$ || "$ref" == *..* ]]; then
    log "rejected ref: ${ref:0:120}"
    exit 2
fi
if [[ "$ref" != origin/* && "$ref" != v* && ! "$ref" =~ ^[0-9a-f]{7,40}$ ]]; then
    ref="origin/$ref"
fi

cd /opt/openstudy
git fetch --all --tags --quiet
if ! commit=$(git rev-parse --verify --quiet "${ref}^{commit}"); then
    log "unknown ref: $ref"
    exit 2
fi

log "deploying $ref ($commit) for CI"
git reset --hard "$commit"
exec ./deploy.sh
