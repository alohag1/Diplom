"""Fix mojibake in HTML/CSS/JS files using ftfy."""
from __future__ import annotations

import sys
from pathlib import Path

import ftfy

sys.stdout.reconfigure(encoding="utf-8")


def _is_mojibake(text: str) -> bool:
    markers = ("Р°", "СЂ", "Рµ", "РЅ", "С‚", "Сѓ", "СЊ", "Р±", "РІ", "Рі", "Рѕ", "Рё", "СЃ", "Рє")
    return any(m in text for m in markers)


def fix_file(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    if not _is_mojibake(raw):
        return False
    fixed = ftfy.fix_text(raw)
    if fixed == raw:
        return False
    path.write_text(fixed, encoding="utf-8")
    print(f"  FIXED: {path}")
    return True


def main() -> None:
    root = Path(__file__).parent
    targets: list[Path] = []
    for ext in ("*.html", "*.css", "*.js", "*.py", "*.md"):
        targets += list(root.rglob(ext))
    skip_dirs = {"venv", "__pycache__", "vectorstore", "vectorstore_dataset", "uploads", "data"}
    fixed_count = 0
    for p in targets:
        if any(part in skip_dirs for part in p.parts):
            continue
        if p.name == Path(__file__).name:
            continue
        try:
            if fix_file(p):
                fixed_count += 1
        except UnicodeDecodeError:
            print(f"  SKIP (non-utf8 file): {p}")
    print(f"\nTotal fixed: {fixed_count}")


if __name__ == "__main__":
    main()
