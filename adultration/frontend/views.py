from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
import json

# Create your views here.

def index(request):
    """Main frontend page"""
    return render(request, 'frontend/index.html')

@method_decorator(csrf_exempt, name='dispatch')
class FrontendBarcodeView(View):
    """Frontend wrapper for barcode API"""
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            barcode = data.get('Barcode')
            
            if not barcode:
                return JsonResponse({'error': 'Barcode is required'}, status=400)
            
            # Here you would typically call your existing API logic
            # For now, we'll return a success response
            return JsonResponse({
                'message': 'Barcode processed successfully',
                'barcode': barcode,
                'status': 'success'
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class FrontendImageView(View):
    """Frontend wrapper for image API"""
    
    def post(self, request):
        try:
            if 'image' not in request.FILES:
                return JsonResponse({'error': 'No image file provided'}, status=400)
            
            image = request.FILES['image']
            
            if not image.content_type.startswith('image/'):
                return JsonResponse({'error': 'Only image files are allowed'}, status=400)
            
            # Here you would typically call your existing API logic
            # For now, we'll return a success response
            return JsonResponse({
                'message': 'Image processed successfully',
                'filename': image.name,
                'size': image.size,
                'status': 'success'
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
