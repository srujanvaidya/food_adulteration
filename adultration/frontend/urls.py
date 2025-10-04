from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='frontend_index'),
    path('barcode/', views.FrontendBarcodeView.as_view(), name='frontend_barcode'),
    path('image/', views.FrontendImageView.as_view(), name='frontend_image'),
]
