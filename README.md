# TradingCardPro

Multi-Channel Trading Card Inventory Management SaaS

## Development Setup

1. Copy `.env.example` to `.env` in the root directory.
2. Run `docker-compose up -d` to start Postgres and Redis.
3. CD into `backend/`, create a virtual environment, and install `requirements.txt`.
4. Run Django migrations: `python manage.py migrate`.
5. Run Django dev server: `python manage.py runserver`.
6. Start Celery worker: `celery -A config worker -l info`.
7. Start Celery beat: `celery -A config beat -l info`.
8. CD into `frontend/`, install dependencies with `npm install`, and start the dev server: `npm run dev`.
