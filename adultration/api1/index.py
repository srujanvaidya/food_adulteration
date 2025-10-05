import sys
import os

# Add your project path so Python can find settings.py
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'adultration'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'adultration_main.settings')

from django.core.wsgi import get_wsgi_application

app = get_wsgi_application()