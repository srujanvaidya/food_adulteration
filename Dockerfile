# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Create media directory
RUN mkdir -p /app/media

# Create logs directory
RUN mkdir -p /app/logs

# Expose port (Railway provides $PORT)
EXPOSE 8000

# Run the application with Gunicorn for production, binding to provided $PORT if set
ENV PORT=8000
CMD ["sh", "-c", "python adultration/manage.py collectstatic --noinput && gunicorn --bind 0.0.0.0:${PORT} --workers 3 adultration_main.wsgi:application"]
