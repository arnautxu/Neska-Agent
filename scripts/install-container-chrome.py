"""Install the official stable Chrome package after verifying its pinned hash.

Hashes are from Google's stable Packages index (2026-10-11), not community
Chromium builds. Ubuntu's signed snapshot supplies all package dependencies.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request

VERSION = "155.0.8059.39-1"
HASHES = {
    "arm64": "3556494580a71ecee15cbeb3b6ce23bf3af360bc053d90d3105241c2247da52b",
    "amd64": "c58aa0f2cd66179c9f050e062c882d27aa9b9f8c2b7c73fee3498560b5ed0b38",
}


def main():
    architecture = subprocess.check_output(["dpkg", "--print-architecture"], text=True).strip()
    if architecture not in HASHES:
        raise RuntimeError("Unsupported Chrome architecture")
    filename = f"google-chrome-stable_{VERSION}_{architecture}.deb"
    url = f"https://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/{filename}"
    with tempfile.TemporaryDirectory(prefix="neska-chrome-") as directory:
        package = Path(directory) / filename
        digest = hashlib.sha256()
        with urllib.request.urlopen(url, timeout=120) as response, package.open("wb") as output:
            size = 0
            while chunk := response.read(1024 * 1024):
                size += len(chunk)
                if size > 200 * 1024 * 1024:
                    raise RuntimeError("Chrome package exceeds reviewed download size")
                digest.update(chunk)
                output.write(chunk)
        if digest.hexdigest() != HASHES[architecture]:
            raise RuntimeError("Chrome package SHA-256 mismatch")
        subprocess.run(["apt-get", "update"], check=True)
        subprocess.run(["apt-get", "install", "-y", "--no-install-recommends", str(package)],
                       check=True, env={**os.environ, "DEBIAN_FRONTEND": "noninteractive"})
    # Chrome's maintainer script adds a moving repository. Remove it so future
    # builds cannot silently bypass the reviewed package and snapshot pins.
    Path("/etc/apt/sources.list.d/google-chrome.list").unlink(missing_ok=True)
    subprocess.run(["rm", "-rf", "/var/lib/apt/lists"], check=True)
    evidence = Path("/usr/local/share/aibrain/chrome-package.json")
    evidence.write_text(json.dumps({"version": VERSION, "architecture": architecture,
                                    "url": url, "sha256": HASHES[architecture]}) + "\n")
    evidence.chmod(0o444)


if __name__ == "__main__":
    main()
