#!/usr/bin/env python3
"""
Demo script for FoodGuard - Food Adulteration Detection System
This script demonstrates how to test the API endpoints
"""

import requests
import json
import os

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_barcode_api():
    """Test the barcode scanning API"""
    print("Testing Barcode API...")
    
    # Test data
    test_barcode = "3017620422003"  # Example Nutella barcode
    
    try:
        response = requests.post(
            f"{API_BASE}/barcode/",
            json={"Barcode": test_barcode},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure Django server is running.")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_image_api():
    """Test the image analysis API"""
    print("\nTesting Image API...")
    
    # Create a simple test image (1x1 pixel PNG)
    test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
    
    try:
        files = {'image': ('test.png', test_image_data, 'image/png')}
        response = requests.post(f"{API_BASE}/image/", files=files)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure Django server is running.")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_frontend():
    """Test if frontend is accessible"""
    print("\nTesting Frontend...")
    
    try:
        response = requests.get(BASE_URL)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("✅ Frontend is accessible!")
        else:
            print("❌ Frontend returned an error")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure Django server is running.")
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    """Run all tests"""
    print("🛡️  FoodGuard API Testing Script")
    print("=" * 40)
    
    test_frontend()
    test_barcode_api()
    test_image_api()
    
    print("\n" + "=" * 40)
    print("✅ Testing complete!")
    print(f"🌐 Frontend URL: {BASE_URL}")
    print(f"🔗 API Base URL: {API_BASE}")

if __name__ == "__main__":
    main()
