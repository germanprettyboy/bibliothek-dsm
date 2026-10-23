// PreToolUse hook (Edit, Write, NotebookEdit; .claude/settings.json): the main checkout changes only through merges
// (CLAUDE.md "Integrating branches"), so file edits there are refused – work happens in a worktree. Replaces Claude
// Code's guard for background sessions (worktree.bgIsolation "none"), which also refused plain shell commands inside
// worktrees. Override for a deliberate edit in main: DSM_EDIT_MAIN=1.
"use strict";
const fs = require("fs");
const path = require("path");

if (process.env.DSM_EDIT_MAIN === "1") process.exit(0);
let input;
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
const file = input.tool_input && (input.tool_input.file_path || input.tool_input.notebook_path);
if (!file) process.exit(0);

// This file lives in <main checkout>/tools or <main checkout>/.claude/worktrees/<name>/tools
const here = path.resolve(__dirname, "..");
const main = here.split(`${path.sep}.claude${path.sep}worktrees${path.sep}`)[0];
const target = path.resolve(input.cwd || process.cwd(), file);
const inside = (dir, p) => p === dir || p.startsWith(dir + path.sep);

if (inside(main, target) && !inside(path.join(main, ".claude", "worktrees"), target)) {
  process.stderr.write(
    `${path.relative(main, target)} is in the main checkout. Work in a worktree (EnterWorktree, CLAUDE.md "Integrating ` +
      `branches") and edit the file there; main changes only through npm run integrate.\n`,
  );
  process.exit(2);
}
