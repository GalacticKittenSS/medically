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
Verified referrals submitted through Imaging Desk are stored in the MariaDB
`referrals` table. Each row keeps the referral ID, export timestamp, complete
JSON submission (including patient, referrer, referral, booking, and
consultation details), and submission timestamp.
Rerun the setup script on an existing installation to create the table.
The CRIS worklist loads these rows from `GET /api/referrals`; submitting the
same referral ID again updates its stored data after it is forwarded to the
receiving application.
Imaging Desk loads patient records from the MariaDB `patients` table through
`GET /api/patients`; patients added in the desk are stored through
`POST /api/patients`.
The setup script inserts the six synthetic Imaging Desk demo patients if their
NHS numbers are not already present; rerunning setup does not overwrite
existing patient records.

## Windows

Run `Scripts/setup.bat` from the `Scripts` directory to use the existing
Windows setup flow.