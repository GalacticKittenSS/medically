import os
import shutil
import subprocess
import sys
from pathlib import Path


OLLAMA_INSTALL_SCRIPT = "https://ollama.com/install.ps1"
MODEL_NAME = "qwen3:1.7b"


def find_ollama():
    executable = shutil.which("ollama")
    if executable:
        return Path(executable)

    local_app_data = Path(
        os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local")
    )
    install_locations = (
        local_app_data / "Programs" / "Ollama" / "ollama.exe",
        Path(os.environ.get("ProgramFiles", "C:\\Program Files"))
        / "Ollama"
        / "ollama.exe",
    )
    return next((path for path in install_locations if path.is_file()), None)


def install_ollama():
    if sys.platform != "win32":
        raise SystemExit("This Ollama setup script currently supports Windows only.")

    if find_ollama() is not None:
        print("Ollama is already installed.")
        return

    print("Installing Ollama using its official Windows installer...")
    subprocess.run(
        [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            f"$ErrorActionPreference = 'Stop'; irm {OLLAMA_INSTALL_SCRIPT} | iex",
        ],
        check=True,
    )

    if find_ollama() is None:
        raise RuntimeError(
            "Ollama's installer finished, but the ollama executable was not found. "
            "Restart the terminal and run this script again."
        )


def pull_model(model_name = MODEL_NAME):
    ollama = find_ollama()
    if ollama is None:
        raise RuntimeError("Ollama is not installed.")

    print(f"Downloading Ollama model {model_name}...")
    result = subprocess.run([str(ollama), "pull", model_name], check=False)
    if result.returncode != 0:
        raise SystemExit(
            f"Could not pull {model_name} (ollama exited with "
            f"code {result.returncode}). Ensure the Ollama app is running and try again."
        )

    print(f"Model {model_name} is ready.")


def pull_and_install_ollama():
    try:
        install_ollama()
        pull_model("qwen3:1.7b")
        pull_model("d3:latest")
        print(
            "Ollama runs in the background on Windows. "
            "Its local API is available at http://localhost:11434."
        )
    except subprocess.CalledProcessError as error:
        raise SystemExit(
            f"Ollama installation failed with exit code {error.returncode}."
        ) from error
    except OSError as error:
        raise SystemExit(f"Ollama setup failed: {error}") from error
    except RuntimeError as error:
        raise SystemExit(f"Ollama setup failed: {error}") from error


if __name__ == "__main__":
    pull_and_install_ollama()
