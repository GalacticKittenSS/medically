import subprocess
import sys

from db_setup import install_mariadb
from python_setup import install_python_packages 
from ai_setup import pull_and_install_ollama

#print("\nUpdating submodules...")
#subprocess.call(["git", "submodule", "update", "--init", "--recursive"])

if sys.platform.startswith("linux"):
    install_mariadb()

install_python_packages(["requests", "mariadb", "python-dotenv"])
if sys.platform == "win32":
    install_mariadb()
pull_and_install_ollama()