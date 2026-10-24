import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import urlopen


MARIADB_RELEASE_API = "https://downloads.mariadb.org/rest-api/mariadb/11.8/"
MARIADB_SERVICE_NAME = "MariaDB"
CHUNK_SIZE = 1024 * 1024


def mariadb_service_installed():
    result = subprocess.run(
        ["sc.exe", "query", MARIADB_SERVICE_NAME],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode == 0:
        return True

    output = f"{result.stdout}\n{result.stderr}"
    if "1060" in output:
        return False

    raise RuntimeError(f"Could not check the MariaDB service:\n{output.strip()}")


def get_latest_installer():
    with urlopen(MARIADB_RELEASE_API, timeout=30) as response:
        release_data = json.load(response)

    releases = release_data.get("releases", {})
    if not releases:
        raise RuntimeError("MariaDB returned no releases for the 11.8 LTS series.")

    latest_release = max(
        releases.values(),
        key=lambda release: tuple(
            int(part) for part in release["release_id"].split(".")
        ),
    )
    installers = [
        file
        for file in latest_release.get("files", [])
        if file.get("os") == "Windows"
        and file.get("cpu") == "x86_64"
        and file.get("file_name", "").lower().endswith(".msi")
    ]
    if len(installers) != 1:
        raise RuntimeError("Could not find a unique Windows x64 MariaDB MSI.")

    installer = installers[0]
    download_url = installer.get("file_download_url", "")
    if urlsplit(download_url).hostname != "downloads.mariadb.org":
        raise RuntimeError("MariaDB returned an unexpected installer download URL.")

    expected_hash = installer.get("checksum", {}).get("sha256sum")
    if not expected_hash:
        raise RuntimeError("MariaDB did not provide a SHA-256 checksum.")

    return (
        installer["file_name"],
        download_url.replace("http://", "https://", 1),
        expected_hash,
    )


def download_installer(destination, download_url, expected_hash):
    digest = hashlib.sha256()
    with (
        urlopen(download_url, timeout=60) as response,
        destination.open("wb") as installer_file,
    ):
        while True:
            chunk = response.read(CHUNK_SIZE)
            if not chunk:
                break
            installer_file.write(chunk)
            digest.update(chunk)

    if digest.hexdigest().lower() != expected_hash.lower():
        raise RuntimeError("The MariaDB installer checksum did not match.")


def install_mariadb_linux():
    if shutil.which("apt-get") is None or shutil.which("dpkg-query") is None:
        raise SystemExit(
            "Linux database setup currently requires an Ubuntu/Debian system "
            "with apt-get and dpkg-query."
        )

    result = subprocess.run(
        ["dpkg-query", "-W", "-f=${Status}", "mariadb-server"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode == 0:
        server_installed = result.stdout.strip() == "install ok installed"
    elif "no packages found matching" in result.stderr.lower():
        server_installed = False
    else:
        raise RuntimeError(
                f"Could not check the MariaDB package:\n{result.stderr.strip()}"
        )

    if not server_installed:
        reply = input("MariaDB is not installed. Install it using apt? [Y/N]: ")
        if reply.strip().lower()[:1] != "y":
            return

    if os.geteuid() == 0:
        apt_prefix = []
    else:
        sudo = shutil.which("sudo")
        if sudo is None:
            raise SystemExit("Run this setup as root or install sudo to install MariaDB.")
        apt_prefix = [sudo]
    packages = [
        "mariadb-server",
        "libmariadb-dev",
        "libmariadb-dev-compat",
        "build-essential",
        "python3-dev",
        "pkg-config",
        "curl",
    ]

    if not server_installed:
        subprocess.run(apt_prefix + ["apt-get", "update"], check=True)
    subprocess.run(
        apt_prefix + ["apt-get", "install", "-y"] + packages,
        check=True,
    )
    print("MariaDB and its Python connector build dependencies are ready.")


def install_mariadb():
    if sys.platform.startswith("linux"):
        install_mariadb_linux()
        return
    if sys.platform != "win32":
        raise SystemExit("MariaDB setup currently supports Windows and Ubuntu/Debian Linux.")

    if mariadb_service_installed():
        print("MariaDB is already installed as a Windows service.")
        return

    reply = input("MariaDB is not installed. Download and run the installer? [Y/N]: ")
    if reply.strip().lower()[:1] != "y":
        return

    try:
        file_name, download_url, expected_hash = get_latest_installer()
        with tempfile.TemporaryDirectory() as temporary_directory:
            installer_path = Path(temporary_directory) / file_name
            print(f"Downloading MariaDB installer: {file_name}")
            download_installer(installer_path, download_url, expected_hash)
            print("Checksum verified. Starting the MariaDB installer...")
            result = subprocess.run(["msiexec.exe", "/i", str(installer_path)], check=False)
    except (URLError, TimeoutError, OSError, RuntimeError, KeyError, ValueError) as error:
        raise SystemExit(f"MariaDB setup failed: {error}") from error

    if result.returncode not in (0, 3010, 1641):
        raise SystemExit(f"The MariaDB installer failed with exit code {result.returncode}.")

if __name__ == "__main__":
    install_mariadb()
