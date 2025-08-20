from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import BarcodeSerializer

class Barcodeone(APIView):
    def post(self,request):
        serializer=BarcodeSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.data,status=status.HTTP_200_OK)
        return Response(serializer.data,status=status.HTTP_400_BAD_REQUEST)









