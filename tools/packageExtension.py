"""Arma la task de Azure DevOps y genera el .vsix."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "extension"
TOOL_SOURCES = ("perfGate.py", "config.py", "metrics.py", "readers.py", "reports.py")


def stage(destination: Path) -> None:
    if destination.exists():
        shutil.rmtree(destination)
    task = destination / "task"
    tools = task / "tools"
    tools.mkdir(parents=True)
    shutil.copy(SOURCE / "vss-extension.json", destination / "vss-extension.json")
    shutil.copytree(SOURCE / "images", destination / "images")
    for name in ("task.json", "index.js"):
        shutil.copy(SOURCE / "task" / name, task / name)
    for name in TOOL_SOURCES:
        shutil.copy(ROOT / "tools" / name, tools / name)
    shutil.copy(ROOT / "perf-gate.json", task / "perf-gate.json")


def create_vsix(stage_dir: Path, output: Path) -> Path:
    output.mkdir(parents=True, exist_ok=True)
    command = [
        "npx",
        "--yes",
        "tfx-cli@0.21.1",
        "extension",
        "create",
        "--manifest-globs",
        "vss-extension.json",
        "--output-path",
        str(output),
    ]
    result = subprocess.run(command, cwd=stage_dir, check=False)
    if result.returncode != 0:
        raise SystemExit(result.returncode)
    packages = sorted(set(stage_dir.rglob("*.vsix")) | set(output.glob("*.vsix")))
    if not packages:
        raise SystemExit(f"tfx no dejó un .vsix en {output}.")
    package = packages[-1]
    target = output / package.name
    if package.resolve() != target.resolve():
        shutil.copy2(package, target)
    shutil.rmtree(stage_dir)
    return target


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Empaqueta la task Performance Quality Gate.")
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    parser.add_argument(
        "--stage-only",
        action="store_true",
        help="Solo copia la task a --output, sin generar el .vsix.",
    )
    args = parser.parse_args(argv)
    if args.stage_only:
        stage(args.output)
        print(args.output)
        return 0

    staging = args.output / "staging"
    stage(staging)
    package = create_vsix(staging, args.output)
    print(package)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
