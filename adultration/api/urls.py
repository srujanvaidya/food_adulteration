from django.urls import path
from .views import Barcodeone

urlpatterns=[
    path('',Barcodeone.as_view())
]