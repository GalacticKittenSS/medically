import subprocess

from db_setup import install_mariadb
from python_setup import install_python_packages 
from ai_setup import pull_and_install_ollama

#print("\nUpdating submodules...")
#subprocess.call(["git", "submodule", "update", "--init", "--recursive"])

install_python_packages(["requests", "mariadb", "python-dotenv"])
install_mariadb()
pull_and_install_ollama()