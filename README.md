# FoodGuard - Food Adulteration Detection System

A modern web application for detecting food adulteration using barcode scanning and AI-powered image analysis.

## Features

- **Barcode Scanning**: Scan product barcodes to get detailed information from OpenFoodFacts API
- **Image Analysis**: Upload food images for AI-powered adulteration detection using Google Gemini
- **Modern UI**: Beautiful, responsive design with smooth animations
- **Real-time Results**: Instant feedback and analysis results

## Setup Instructions

### Prerequisites
- Python 3.8+
- pipenv (or pip)

### Installation

1. **Install dependencies**:
   ```bash
   cd adultration
   pipenv install
   # or
   pip install -r requirements.txt
   ```

2. **Set up environment variables**:
   Create a `.env` file in the `adultration` directory with:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

4. **Start the development server**:
   ```bash
   python manage.py runserver
   ```

5. **Access the application**:
   Open your browser and go to `http://127.0.0.1:8000`

## Usage

### Barcode Scanning
1. Click "Scan Barcode" button
2. Enter the barcode number from your food product
3. Click "Scan" to analyze the product
4. View results in the modal

### Image Analysis
1. Click "Upload Image" button
2. Drag and drop an image or click to browse
3. Click "Analyze Image" to process the image
4. View AI analysis results

## API Endpoints

- `POST /api/v1/barcode/` - Barcode scanning endpoint
- `POST /api/v1/image/` - Image analysis endpoint
- `GET /` - Main frontend page

## Technology Stack

- **Backend**: Django 5.2, Django REST Framework
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI**: Google Gemini API
- **External API**: OpenFoodFacts API
- **Styling**: Custom CSS with modern design principles

## Project Structure

```
adultration/
├── adultration_main/     # Django project settings
├── api/                  # API endpoints and logic
├── frontend/             # Frontend templates and static files
│   ├── templates/        # HTML templates
│   └── static/          # CSS, JS, and images
└── manage.py            # Django management script
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
