from django.urls import path
from .views import Barcodeone
from .views import ImageApi

urlpatterns=[
    path('barcode/',Barcodeone.as_view()),
    path('image/',ImageApi.as_view()),
]