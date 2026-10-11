"""Install the reviewed upstream rclone binary, verifying before extraction."""
import hashlib
import io
import os
import platform
import urllib.request
import zipfile

VERSION = "1.75.2"
RELEASES = {
    "aarch64": ("arm64", "7e1e8d69654941b7b7df84ee74c5f7fb09cce7d5496947fb7bf16b55ff427d10"),
    "x86_64": ("amd64", "349ac8fba6ff65d6247043f1750cdcb518ec5d500ef91463a10d37c0ccdf3702"),
}
architecture, checksum = RELEASES[platform.machine()]
name = f"rclone-v{VERSION}-linux-{architecture}"
url = f"https://github.com/rclone/rclone/releases/download/v{VERSION}/{name}.zip"
with urllib.request.urlopen(url, timeout=120) as response:
    payload = response.read(128 * 1024 * 1024 + 1)
if len(payload) > 128 * 1024 * 1024 or hashlib.sha256(payload).hexdigest() != checksum:
    raise RuntimeError("rclone release checksum mismatch")
with zipfile.ZipFile(io.BytesIO(payload)) as archive:
    binary = archive.read(f"{name}/rclone")
destination = "/usr/local/bin/rclone"
with open(destination, "xb") as output:
    output.write(binary)
os.chmod(destination, 0o755)
