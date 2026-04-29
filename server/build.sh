#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. Install dependencies
pip install -r requirements.txt

# 2. Collect static files (needed for the Django admin panel CSS)
python manage.py collectstatic --no-input

# 3. Run migrations automatically
python manage.py migrate

# 4. Automatically create a superuser if environment variables are set
if [[ "$CREATE_SUPERUSER" == "true" ]]; then
  echo "Creating Superuser..."
  python manage.py createsuperuser --no-input || true
fi