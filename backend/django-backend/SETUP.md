# Setup Guide

## Prerequisites

- Python 3.14 or newer
- Git (optional)
- Windows PowerShell recommended for this repository

## Clone the repository

If you have not already cloned the project, run:

```powershell
git clone <repository-url>
cd VisionGlobalEmpowerment
```

Replace `<repository-url>` with your repository URL.

## Create and activate virtual environment

```powershell
cd C:\Users\Happy Reddy\Desktop\AIML\VisionGlobalEmpowerment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If `.venv` already exists, only activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

## Install dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Run migrations

```powershell
python manage.py migrate
```

### Using AWS RDS Postgres

To use an AWS RDS Postgres instance, set the `DATABASE_URL` environment variable before running migrations. Example `DATABASE_URL`:

```
postgres://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>
```

You can place the URL in a `.env` file at the project root (see `.env.example`) for local development. The project is configured for Postgres only and does not use SQLite.

After setting `DATABASE_URL`, run:

```powershell
python -m pip install -r requirements.txt
python manage.py migrate
```

Note: If `psycopg2-binary` fails to install on your Python version, install a Postgres driver compatible
with your interpreter manually. For example:

```powershell
# Example (may vary by Python version):
python -m pip install psycopg2-binary
# or for psycopg (psycopg3):
python -m pip install psycopg[binary]
```

## Create a superuser (optional)

```powershell
python manage.py createsuperuser
```
```

## Run the development server

If the virtual environment is active:
```powershell
python manage.py runserver
```

If you are not able to activate the venv or still see module import errors, run directly with the venv Python:
```powershell
.\.venv\Scripts\python.exe manage.py runserver
```

## Automatic setup script

This repository includes `setup.ps1` to run the setup steps automatically.

Run it from the project root in PowerShell:

```powershell
cd C:\Users\Happy Reddy\Desktop\AIML\VisionGlobalEmpowerment
.\setup.ps1
```

To create the venv, install dependencies, run migrations, and then start the server in one step:

```powershell
.\setup.ps1 -RunServer
```

## Swagger API documentation

After the development server is running, open one of these URLs in your browser:

- `http://127.0.0.1:8000/swagger/` — interactive Swagger UI
- `http://127.0.0.1:8000/swagger.json` — raw OpenAPI JSON
- `http://127.0.0.1:8000/swagger.yaml` — raw OpenAPI YAML
- `http://127.0.0.1:8000/redoc/` — ReDoc documentation page

If Swagger does not load, verify:

- the server is running (`python manage.py runserver`)
- you are using the `.venv` interpreter
- `drf_yasg` is included in `INSTALLED_APPS` in `vision_global_empowerment/settings.py`

## Common commands

- Install dependencies: `python -m pip install -r requirements.txt`
- Run server: `python manage.py runserver`
- Create superuser: `python manage.py createsuperuser`
- Show URLs: `python manage.py show_urls` (requires `django-extensions` if installed)

## Troubleshooting

- If you get `ModuleNotFoundError: No module named 'rest_framework'`:
  - ensure `.venv` is activated
  - run `python -m pip install -r requirements.txt`

- If Django migrations fail:
  - run `python manage.py makemigrations`
  - run `python manage.py migrate`
