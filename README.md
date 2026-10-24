# Medically API setup

## Ubuntu and Debian

The Linux setup installs MariaDB and its Python connector build dependencies
through `apt`, installs Ollama with Ollama's official Linux installer, and
creates a project-local Python virtual environment.

Install Python 3 and the venv module first:

```sh
sudo apt-get update
sudo apt-get install -y python3 python3-venv
```

Then run the setup script from the repository:

```sh
bash Scripts/setup.sh
```

The setup prompts before installing MariaDB. Configure the database values in
the root `.env` file before running setup; the Python setup script uses those
values to create the application database and tables. The `ollama` command
downloads the configured models, so ensure the machine has enough disk space.

## Windows

Run `Scripts/setup.bat` from the `Scripts` directory to use the existing
Windows setup flow.

## Shared deployment for multiple devices

This project is designed so the AI model runs in one shared backend, not on every
user's laptop. The backend reads the model endpoint from `OLLAMA_HOST`.

1. Copy `.env.example` to `.env`.
2. Set the model host to your shared machine, for example:

   ```env
   DEV_MODE=false
   PORT=3000
   OLLAMA_HOST=http://10.0.0.12:11434
   ```

3. Install and run Ollama on the shared server, then pull the models:

   ```sh
   ollama pull d3:latest
   ollama pull qwen3:1.7b
   ```

4. Start the API on that server:

   ```sh
   node api/server.js
   ```

5. Everyone else should open the app through that server URL, for example:

   ```text
   http://10.0.0.12:3000/imaging-desk
   ```

This means one AI service handles all referrals, so no one has to install Ollama on their own device.