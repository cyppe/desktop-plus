#!/usr/bin/env bash

set -euo pipefail

repository_root=$(git rev-parse --show-toplevel)
cd "$repository_root"

if ! git remote get-url upstream >/dev/null 2>&1; then
  echo "Missing upstream remote. Expected https://github.com/desktop-plus/desktop-plus.git" >&2
  exit 1
fi

git fetch --prune upstream main

custom_tip=$(git rev-parse custom/main)
upstream_tip=$(git rev-parse upstream/main)
merge_base=$(git merge-base "$custom_tip" "$upstream_tip")
read -r custom_only upstream_only < <(
  git rev-list --left-right --count "$custom_tip...$upstream_tip"
)

echo "custom/main:  $custom_tip"
echo "upstream/main: $upstream_tip"
echo "merge base:    $merge_base"
echo "custom-only commits:   $custom_only"
echo "incoming commits:      $upstream_only"

if merge_result=$(git merge-tree --write-tree "$custom_tip" "$upstream_tip" 2>&1); then
  merge_tree=$(printf '%s\n' "$merge_result" | head -n 1)
  echo "merge audit: clean (tree $merge_tree)"
else
  echo "merge audit: conflicts detected" >&2
  printf '%s\n' "$merge_result" >&2
  exit 2
fi
