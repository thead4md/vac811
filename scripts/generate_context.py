#!/usr/bin/env python3
"""
Auto-generates CONTEXT.md for any project.

Preserves manually-curated content outside <!-- AUTO:START/END --> markers.
Idempotent: running twice produces identical output.

Usage:
    python generate_context.py [--root <path>] [--output <path>]
"""

import argparse
import ast
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #

EXCLUDED_DIRS = {
    ".git", ".venv", "venv", "env", ".env", "node_modules", "dist", "build",
    "__pycache__", ".tox", ".mypy_cache", ".pytest_cache", ".ruff_cache",
    "coverage", ".coverage", ".eggs", "*.egg-info", ".idea", ".vscode",
    ".DS_Store", "vendor",
}

EXCLUDED_FILE_PREFIXES = ("._",)

MAX_TREE_DEPTH = 4
MAX_TREE_FILES = 120
MAX_CONTEXT_SIZE_BYTES = 50 * 1024  # 50 KB soft warning threshold

REQUIRED_SECTIONS = [
    "project_overview",
    "tech_stack",
    "directory_tree",
    "env_vars",
    "open_todos",
    "recent_commits",
]

SECRET_PATTERNS = [
    r"sk-[A-Za-z0-9]{20,}",
    r"ghp_[A-Za-z0-9]{36}",
    r"AIza[A-Za-z0-9\-_]{35}",
    r"AKIA[A-Z0-9]{16}",
    r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
]


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _is_excluded(path: Path, root: Path) -> bool:
    for part in path.relative_to(root).parts:
        if part in EXCLUDED_DIRS or part.startswith(".") and part not in {".github", ".claude"}:
            return True
        if any(part.startswith(pfx) for pfx in EXCLUDED_FILE_PREFIXES):
            return True
    return False


def _run(cmd: list[str], cwd: Path, timeout: int = 30) -> str:
    try:
        result = subprocess.run(
            cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout
        )
        return result.stdout.strip()
    except Exception:
        return ""


def _replace_section(content: str, name: str, new_body: str) -> str:
    start_tag = f"<!-- AUTO:START:{name} -->"
    end_tag = f"<!-- AUTO:END:{name} -->"
    replacement = f"{start_tag}\n{new_body.strip()}\n{end_tag}"
    pattern = re.compile(
        rf"{re.escape(start_tag)}.*?{re.escape(end_tag)}", re.DOTALL
    )
    if pattern.search(content):
        return pattern.sub(replacement, content)
    # Append if section doesn't exist yet
    return content.rstrip() + f"\n\n{replacement}\n"


def _update_timestamp(content: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    pattern = re.compile(r"(Last updated:\s*)\d{4}-\d{2}-\d{2}")
    if pattern.search(content):
        return pattern.sub(rf"\g<1>{today}", content)
    return content


# --------------------------------------------------------------------------- #
# Language / stack detection
# --------------------------------------------------------------------------- #

def detect_stack(root: Path) -> dict:
    stack = {}

    if (root / "pyproject.toml").exists():
        stack["language"] = "Python"
        content = (root / "pyproject.toml").read_text(errors="replace")
        m = re.search(r'name\s*=\s*"([^"]+)"', content)
        if m:
            stack["name"] = m.group(1)
        m = re.search(r'version\s*=\s*"([^"]+)"', content)
        if m:
            stack["version"] = m.group(1)
        m = re.search(r'python\s*=\s*"([^"]+)"', content)
        if m:
            stack["python_requires"] = m.group(1)
        stack["config_file"] = "pyproject.toml"

    elif (root / "setup.py").exists() or (root / "setup.cfg").exists():
        stack["language"] = "Python"
        stack["config_file"] = "setup.py / setup.cfg"

    elif (root / "package.json").exists():
        try:
            pkg = json.loads((root / "package.json").read_text())
            stack["language"] = "Node.js"
            stack["name"] = pkg.get("name", "")
            stack["version"] = pkg.get("version", "")
            stack["config_file"] = "package.json"
            if "typescript" in pkg.get("devDependencies", {}):
                stack["language"] = "TypeScript / Node.js"
        except Exception:
            stack["language"] = "Node.js"
            stack["config_file"] = "package.json"

    elif (root / "go.mod").exists():
        stack["language"] = "Go"
        first_line = (root / "go.mod").read_text().split("\n")[0]
        m = re.search(r"module\s+(\S+)", first_line)
        if m:
            stack["name"] = m.group(1)
        stack["config_file"] = "go.mod"

    elif (root / "Cargo.toml").exists():
        stack["language"] = "Rust"
        stack["config_file"] = "Cargo.toml"

    elif (root / "pom.xml").exists():
        stack["language"] = "Java (Maven)"
        stack["config_file"] = "pom.xml"

    else:
        stack["language"] = "Unknown"
        stack["config_file"] = "N/A"

    # Extra detections
    extras = []
    if (root / "Dockerfile").exists():
        extras.append("Docker")
    if (root / "docker-compose.yml").exists() or (root / "docker-compose.yaml").exists():
        extras.append("Docker Compose")
    if (root / "fly.toml").exists():
        extras.append("Fly.io")
    if (root / ".github" / "workflows").exists():
        extras.append("GitHub Actions")
    if (root / "requirements.txt").exists():
        extras.append("pip")
    if extras:
        stack["extras"] = ", ".join(extras)

    return stack


# --------------------------------------------------------------------------- #
# Section generators
# --------------------------------------------------------------------------- #

def gen_project_overview(root: Path, stack: dict) -> str:
    lines = []

    # Try README first
    readme = root / "README.md"
    if readme.exists():
        text = readme.read_text(errors="replace")
        excerpt = "\n".join(text.split("\n")[:30]).strip()
        lines.append("### From README\n")
        lines.append(excerpt)
        lines.append("")

    lines.append("### Stack")
    lines.append(f"| Key | Value |")
    lines.append(f"|-----|-------|")
    for k, v in stack.items():
        lines.append(f"| {k} | {v} |")

    return "\n".join(lines)


def gen_directory_tree(root: Path) -> str:
    lines = ["```"]
    file_count = 0

    def walk(path: Path, prefix: str = "", depth: int = 0):
        nonlocal file_count
        if depth > MAX_TREE_DEPTH or file_count > MAX_TREE_FILES:
            return

        try:
            entries = sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
        except PermissionError:
            return

        visible = [e for e in entries if not _is_excluded(e, root)]

        for i, entry in enumerate(visible):
            if file_count > MAX_TREE_FILES:
                lines.append(f"{prefix}└── ... (truncated)")
                return
            connector = "└── " if i == len(visible) - 1 else "├── "
            lines.append(f"{prefix}{connector}{entry.name}")
            file_count += 1
            if entry.is_dir():
                extension = "    " if i == len(visible) - 1 else "│   "
                walk(entry, prefix + extension, depth + 1)

    lines.append(root.name + "/")
    walk(root)
    lines.append("```")
    return "\n".join(lines)


def gen_tech_stack(root: Path, stack: dict) -> str:
    rows = [
        "| Technology | Version / Detail |",
        "|------------|-----------------|",
    ]

    lang = stack.get("language", "Unknown")
    rows.append(f"| Language | {lang} |")

    py_req = stack.get("python_requires", "")
    if py_req:
        rows.append(f"| Python requires | {py_req} |")

    # Key dependencies
    if (root / "pyproject.toml").exists():
        text = (root / "pyproject.toml").read_text(errors="replace")
        deps = re.findall(r'"([a-zA-Z][a-zA-Z0-9_\-]+)\s*[>=<!\^~]', text)
        deps = [d for d in deps if d not in {"python"}][:12]
        if deps:
            rows.append(f"| Key dependencies | {', '.join(deps)} |")

    elif (root / "package.json").exists():
        try:
            pkg = json.loads((root / "package.json").read_text())
            all_deps = list(pkg.get("dependencies", {}).keys())[:8]
            if all_deps:
                rows.append(f"| Key dependencies | {', '.join(all_deps)} |")
        except Exception:
            pass

    extras = stack.get("extras", "")
    if extras:
        rows.append(f"| Infrastructure | {extras} |")

    return "\n".join(rows)


def gen_env_vars(root: Path, stack: dict) -> str:
    lang = stack.get("language", "")
    found: dict[str, str] = {}

    if "Python" in lang:
        pattern = re.compile(r'os\.environ\.get\(\s*["\']([A-Z_][A-Z0-9_]+)["\'](?:\s*,\s*["\']([^"\']*)["\'])?\s*\)')
        for py_file in root.rglob("*.py"):
            if _is_excluded(py_file, root):
                continue
            try:
                text = py_file.read_text(errors="replace")
                for m in pattern.finditer(text):
                    var, default = m.group(1), m.group(2) or ""
                    found.setdefault(var, default)
            except Exception:
                continue

    elif "Node" in lang or "TypeScript" in lang:
        pattern = re.compile(r'process\.env\.([A-Z_][A-Z0-9_]+)')
        for ext in ("*.js", "*.ts", "*.mjs"):
            for f in root.rglob(ext):
                if _is_excluded(f, root):
                    continue
                try:
                    text = f.read_text(errors="replace")
                    for m in pattern.finditer(text):
                        found.setdefault(m.group(1), "")
                except Exception:
                    continue

    elif "Go" in lang:
        pattern = re.compile(r'os\.Getenv\(\s*"([A-Z_][A-Z0-9_]+)"\s*\)')
        for f in root.rglob("*.go"):
            if _is_excluded(f, root):
                continue
            try:
                text = f.read_text(errors="replace")
                for m in pattern.finditer(text):
                    found.setdefault(m.group(1), "")
            except Exception:
                continue

    # Also check .env.example
    env_example = root / ".env.example"
    if env_example.exists():
        for line in env_example.read_text(errors="replace").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                found.setdefault(k.strip(), v.strip())

    if not found:
        return "_No environment variables detected._"

    rows = ["| Variable | Default | Source |", "|----------|---------|--------|"]
    for var, default in sorted(found.items()):
        src = ".env.example" if (root / ".env.example").exists() else "source code"
        rows.append(f"| `{var}` | `{default or '—'}` | {src} |")
    return "\n".join(rows)


def gen_open_todos(root: Path) -> str:
    results = []
    todo_pattern = re.compile(r"#\s*TODO[:\s](.+)|//\s*TODO[:\s](.+)", re.IGNORECASE)

    exts = {".py", ".js", ".ts", ".go", ".rs", ".java", ".rb", ".sh"}
    for f in sorted(root.rglob("*")):
        if _is_excluded(f, root) or f.suffix not in exts or not f.is_file():
            continue
        try:
            for lineno, line in enumerate(f.read_text(errors="replace").splitlines(), 1):
                m = todo_pattern.search(line)
                if m:
                    note = (m.group(1) or m.group(2) or "").strip()
                    rel = f.relative_to(root)
                    results.append(f"- `{rel}:{lineno}` — {note}")
                    if len(results) >= 40:
                        break
        except Exception:
            continue
        if len(results) >= 40:
            break

    if not results:
        return "_No open TODOs found._"
    return "\n".join(results)


def gen_test_count(root: Path, stack: dict) -> str:
    lang = stack.get("language", "")
    count = "(unknown)"

    if "Python" in lang:
        # Detect test directory
        test_dirs = [d for d in ["tests", "test", "mailmind/tests"] if (root / d).is_dir()]
        test_arg = test_dirs[0] if test_dirs else "."
        out = _run(["python", "-m", "pytest", test_arg, "--collect-only", "-q"], root, timeout=60)
        if out:
            m = re.search(r"(\d+)\s+(?:test|item)s?\s+(?:selected|collected)", out)
            if m:
                count = m.group(1)

    elif "Node" in lang or "TypeScript" in lang:
        # jest --listTests
        out = _run(["npx", "jest", "--listTests"], root, timeout=30)
        if out:
            count = str(len(out.strip().splitlines()))

    elif "Go" in lang:
        out = _run(["go", "test", "./...", "-list", ".*"], root, timeout=30)
        if out:
            count = str(len([l for l in out.splitlines() if l.startswith("Test")]))

    return f"**{count}** tests detected."


def gen_recent_commits(root: Path) -> str:
    out = _run(
        ["git", "log", "--oneline", "--no-decorate", "-10"],
        root,
    )
    if not out:
        return "_No git history found._"
    return "```\n" + out + "\n```"


def gen_module_map(root: Path, stack: dict) -> str:
    lang = stack.get("language", "")
    if "Python" not in lang:
        return "_Module map available for Python projects only._"

    rows = ["| Module | Purpose | Key Symbols |", "|--------|---------|-------------|"]
    src_dirs = [d for d in ["src", root.name, "."] if (root / d).is_dir()]

    for src_str in src_dirs:
        src = root / src_str
        for py_file in sorted(src.rglob("*.py")):
            if _is_excluded(py_file, root):
                continue
            if "test" in py_file.name.lower():
                continue
            try:
                source = py_file.read_text(errors="replace")
                tree = ast.parse(source)
            except Exception:
                continue

            docstring = ast.get_docstring(tree) or ""
            purpose = docstring.split("\n")[0][:80] if docstring else ""

            symbols = []
            for node in ast.walk(tree):
                if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                    if not node.name.startswith("_"):
                        symbols.append(node.name)
                if len(symbols) >= 5:
                    break

            rel = py_file.relative_to(root)
            sym_str = ", ".join(f"`{s}`" for s in symbols[:5])
            rows.append(f"| `{rel}` | {purpose} | {sym_str} |")

    if len(rows) == 2:
        return "_No Python modules found._"
    return "\n".join(rows)


# --------------------------------------------------------------------------- #
# Secret scan
# --------------------------------------------------------------------------- #

def scan_for_secrets(content: str) -> list[str]:
    findings = []
    for pattern in SECRET_PATTERNS:
        if re.search(pattern, content):
            findings.append(f"Potential secret matching pattern: `{pattern}`")
    return findings


# --------------------------------------------------------------------------- #
# CONTEXT.md scaffold
# --------------------------------------------------------------------------- #

CONTEXT_TEMPLATE = """\
# {name} — Project Context

> Auto-generated by [claude-context-sync](https://github.com/thead4md/claude-context-sync).
> Last updated: {today}
> **Do not edit AUTO sections** — they are overwritten on every push.
> Edit content outside the AUTO markers to add permanent notes.

---

## Project Overview

<!-- AUTO:START:project_overview -->
<!-- AUTO:END:project_overview -->

## Tech Stack

<!-- AUTO:START:tech_stack -->
<!-- AUTO:END:tech_stack -->

## Directory Tree

<!-- AUTO:START:directory_tree -->
<!-- AUTO:END:directory_tree -->

## Module Map

<!-- AUTO:START:module_map -->
<!-- AUTO:END:module_map -->

## Environment Variables

<!-- AUTO:START:env_vars -->
<!-- AUTO:END:env_vars -->

## Open TODOs

<!-- AUTO:START:open_todos -->
<!-- AUTO:END:open_todos -->

## Tests

<!-- AUTO:START:test_count -->
<!-- AUTO:END:test_count -->

## Recent Commits

<!-- AUTO:START:recent_commits -->
<!-- AUTO:END:recent_commits -->

---
<!-- AUTO:START:meta -->
<!-- AUTO:END:meta -->
"""


def _scaffold_context(root: Path, stack: dict) -> str:
    name = stack.get("name") or root.name
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return CONTEXT_TEMPLATE.format(name=name, today=today)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def generate(root: Path, output: Path) -> dict:
    t0 = time.monotonic()

    stack = detect_stack(root)

    # Load or scaffold CONTEXT.md
    if output.exists():
        content = output.read_text(errors="replace")
    else:
        content = _scaffold_context(root, stack)

    # Update timestamp
    content = _update_timestamp(content)

    # Generate each section
    sections = {
        "project_overview": gen_project_overview(root, stack),
        "tech_stack": gen_tech_stack(root, stack),
        "directory_tree": gen_directory_tree(root),
        "module_map": gen_module_map(root, stack),
        "env_vars": gen_env_vars(root, stack),
        "open_todos": gen_open_todos(root),
        "test_count": gen_test_count(root, stack),
        "recent_commits": gen_recent_commits(root),
        "meta": (
            f"_Generated in {time.monotonic() - t0:.1f}s. "
            f"Stack: {stack.get('language', 'Unknown')}._"
        ),
    }

    for name, body in sections.items():
        content = _replace_section(content, name, body)

    # Normalize trailing whitespace
    content = re.sub(r"[ \t]+$", "", content, flags=re.MULTILINE)
    if not content.endswith("\n"):
        content += "\n"

    # Secret scan before writing
    secrets = scan_for_secrets(content)
    if secrets:
        print("WARNING: Potential secrets detected in CONTEXT.md — aborting write!", file=sys.stderr)
        for s in secrets:
            print(f"  {s}", file=sys.stderr)
        sys.exit(2)

    output.write_text(content, encoding="utf-8")

    elapsed = time.monotonic() - t0
    return {
        "output": str(output),
        "size_bytes": len(content.encode()),
        "elapsed_seconds": round(elapsed, 2),
        "stack": stack,
        "sections_generated": list(sections.keys()),
    }


def main():
    parser = argparse.ArgumentParser(description="Generate CONTEXT.md for a project.")
    parser.add_argument("--root", default=".", help="Project root directory")
    parser.add_argument("--output", default="CONTEXT.md", help="Output file path")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    output = Path(args.output) if Path(args.output).is_absolute() else root / args.output

    print(f"Generating CONTEXT.md for {root} ...", file=sys.stderr)
    result = generate(root, output)
    print(json.dumps(result, indent=2))
    size_kb = result["size_bytes"] / 1024
    if size_kb > 50:
        print(
            f"WARNING: CONTEXT.md is {size_kb:.1f} KB — consider trimming for AI context efficiency.",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
