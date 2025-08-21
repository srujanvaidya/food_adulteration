from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import BarcodeSerializer
import requests
from django.http import JsonResponse, HttpResponse


class Barcodeone(APIView):
    def post(self,request):
        serializer=BarcodeSerializer(data=request.data)
        if serializer.is_valid():
            request=request.data
            print(request)
            barcode=request['Barcode']
            print(barcode)
            b=Barcodeone()
            b.OpenFoodFact(barcode)
            return Response(serializer.data,status=status.HTTP_200_OK)
        return Response(serializer.data,status=status.HTTP_400_BAD_REQUEST)

    def OpenFoodFact(self,barcode):
        url=f"https://world.openfoodfacts.net/api/v2/product/{barcode}?fields=product_name,nutriscore_data"
        response=requests.get(url)

        if response.status_code==200:
            ans=response.json()
            print(ans)
            return HttpResponse("check your console")
        return HttpResponse("failed attempt")










