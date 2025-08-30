from rest_framework import serializers

class BarcodeSerializer(serializers.Serializer):
    Barcode=serializers.CharField(max_length=20)
class ImageSerializer(serializers.Serializer):
    image=serializers.ImageField()