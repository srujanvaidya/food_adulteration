# Food Adulteration Detection App - Docker Deployment

This Django application detects food adulteration using AI and is now configured for Docker deployment.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git (to clone the repository)

### 1. Clone and Setup
```bash
git clone <your-repository-url>
cd "food adultration"
```

### 2. Configure Environment
```bash
# Copy the environment template
cp env.example .env

# Edit .env with your actual values
nano .env
```

**Required Environment Variables:**
- `SECRET_KEY`: Django secret key (generate a new one for production)
- `GEMINI_API_KEY`: Your Google Gemini API key
- `DEBUG`: Set to `False` for production
- `ALLOWED_HOSTS`: Add your domain name

### 3. Deploy
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

Or manually:
```bash
# Build and start services
docker-compose up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser (optional)
docker-compose exec web python manage.py createsuperuser
```

## 📁 Project Structure

```
food adultration/
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Multi-container setup
├── .dockerignore             # Files to exclude from Docker build
├── requirements.txt          # Python dependencies
├── env.example               # Environment variables template
├── deploy.sh                 # Deployment script
├── adultration/              # Django project
│   ├── adultration_main/     # Main Django app
│   │   ├── settings.py       # Development settings
│   │   └── production_settings.py  # Production settings
│   ├── api/                  # API app
│   ├── frontend/             # Frontend app
│   └── manage.py
└── README.md
```

## 🐳 Docker Services

### Web Service
- **Image**: Custom Django app
- **Port**: 8000
- **Dependencies**: PostgreSQL database
- **Features**: 
  - Gunicorn WSGI server
  - Static file serving with WhiteNoise
  - PostgreSQL database support

### Database Service
- **Image**: PostgreSQL 15
- **Port**: 5432
- **Data**: Persistent volume storage

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | Required |
| `DEBUG` | Debug mode | `False` |
| `ALLOWED_HOSTS` | Allowed hostnames | `localhost,127.0.0.1` |
| `DB_NAME` | Database name | `adultration_db` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_HOST` | Database host | `db` |
| `DB_PORT` | Database port | `5432` |
| `GEMINI_API_KEY` | Gemini API key | Required |

### Production Settings
The app uses `production_settings.py` for production deployment with:
- PostgreSQL database
- Static file optimization
- Security headers
- Logging configuration
- Environment-based configuration

## 📊 Management Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Access Django shell
docker-compose exec web python manage.py shell

# Run Django commands
docker-compose exec web python manage.py <command>

# Access container shell
docker-compose exec web bash
```

## 🌐 Access Points

- **Application**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **API**: http://localhost:8000/api/

## 🔒 Security Considerations

1. **Change Default Secrets**: Update `SECRET_KEY` and database passwords
2. **Environment Variables**: Never commit `.env` file to version control
3. **HTTPS**: Configure SSL certificates for production
4. **Firewall**: Restrict database port access
5. **Updates**: Keep Docker images updated

## 🚀 Production Deployment

For production deployment:

1. **Use a reverse proxy** (Nginx) for static files and SSL termination
2. **Configure HTTPS** by uncommenting security settings in `production_settings.py`
3. **Use external database** for better performance and backup
4. **Set up monitoring** and logging
5. **Configure domain** in `ALLOWED_HOSTS`

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**: Change ports in `docker-compose.yml`
2. **Database connection failed**: Check database service is running
3. **Static files not loading**: Run `collectstatic` command
4. **Permission denied**: Check file permissions and Docker access

### Debug Commands
```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs web

# Check database connection
docker-compose exec web python manage.py dbshell
```

## 📝 Notes

- The app uses SQLite for development and PostgreSQL for production
- Static files are served by WhiteNoise middleware
- Media files are stored in persistent volumes
- Logs are stored in `/app/logs/` directory
