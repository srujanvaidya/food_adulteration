from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import BarcodeSerializer,ImageSerializer
import requests
from django.http import JsonResponse, HttpResponse
from .LLM import LLM
import json


class Barcodeone(APIView):
    def post(self, request):
        serializer = BarcodeSerializer(data=request.data)
        if serializer.is_valid():
            barcode = request.data['Barcode']
            
            try:
                # Get comprehensive product information
                product_analysis = self.analyze_product_by_barcode(barcode)
                
                return Response({
                    "status": "success",
                    "barcode": barcode,
                    "analysis": product_analysis
                }, status=status.HTTP_200_OK)
                
            except Exception as e:
                return Response({
                    "status": "error",
                    "error": f"Analysis failed: {str(e)}",
                    "barcode": barcode
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        return Response({
            "status": "error",
            "error": "Invalid barcode data",
            "details": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def analyze_product_by_barcode(self, barcode):
        """Comprehensive product analysis using OpenFoodFacts API"""
        
        # Fetch detailed product information
        product_data = self.fetch_openfoodfacts_data(barcode)
        
        if not product_data:
            return {
                "status": "not_found",
                "message": "Product not found in OpenFoodFacts database",
                "barcode": barcode,
                "recommendations": "Try scanning the barcode again or enter manually"
            }
        
        # Analyze the product for health and adulteration
        analysis = self.analyze_product_health_and_adulteration(product_data)
        
        return {
            "status": "success",
            "product_info": product_data,
            "health_analysis": analysis["health"],
            "adulteration_analysis": analysis["adulteration"],
            "recommendations": analysis["recommendations"],
            "home_tests": analysis["home_tests"],
            "risk_assessment": analysis["risk_assessment"]
        }

    def fetch_openfoodfacts_data(self, barcode):
        """Fetch comprehensive product data from OpenFoodFacts API"""
        
        # Comprehensive fields to fetch
        fields = [
            "product_name", "brands", "categories", "ingredients_text", 
            "nutrition_grades", "nutriscore_grade", "nutriscore_score",
            "additives_tags", "allergens_tags", "traces_tags",
            "ingredients_analysis_tags", "labels_tags", "packaging_tags",
            "countries_tags", "manufacturing_places_tags", "stores_tags",
            "quantity", "serving_size", "energy_100g", "fat_100g", 
            "saturated_fat_100g", "carbohydrates_100g", "sugars_100g",
            "fiber_100g", "proteins_100g", "salt_100g", "sodium_100g",
            "vitamin_c_100g", "calcium_100g", "iron_100g", "image_url",
            "image_nutrition_url", "image_ingredients_url", "ecoscore_grade",
            "nova_group", "last_modified_t", "created_t"
        ]
        
        url = f"https://world.openfoodfacts.net/api/v2/product/{barcode}"
        params = {
            "fields": ",".join(fields)
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("status") == 1 and data.get("product"):
                    return data["product"]
                else:
                    return None
            else:
                return None
                
        except requests.RequestException as e:
            print(f"Error fetching OpenFoodFacts data: {e}")
            return None

    def analyze_product_health_and_adulteration(self, product_data):
        """Analyze product for health and adulteration risks"""
        
        # Health Analysis
        health_analysis = self.analyze_health_factors(product_data)
        
        # Adulteration Analysis
        adulteration_analysis = self.analyze_adulteration_risks(product_data)
        
        # Risk Assessment
        risk_assessment = self.assess_overall_risk(health_analysis, adulteration_analysis)
        
        # Recommendations
        recommendations = self.generate_recommendations(health_analysis, adulteration_analysis)
        
        # Home Tests
        home_tests = self.generate_home_tests(product_data, adulteration_analysis)
        
        return {
            "health": health_analysis,
            "adulteration": adulteration_analysis,
            "risk_assessment": risk_assessment,
            "recommendations": recommendations,
            "home_tests": home_tests
        }

    def analyze_health_factors(self, product_data):
        """Analyze health factors of the product"""
        
        health_score = 0
        health_issues = []
        health_benefits = []
        
        # Nutri-Score Analysis
        nutriscore = product_data.get("nutriscore_grade", "").upper()
        if nutriscore in ["A", "B"]:
            health_score += 2
            health_benefits.append(f"Good Nutri-Score ({nutriscore})")
        elif nutriscore in ["C"]:
            health_score += 1
            health_issues.append(f"Moderate Nutri-Score ({nutriscore})")
        elif nutriscore in ["D", "E"]:
            health_score -= 2
            health_issues.append(f"Poor Nutri-Score ({nutriscore})")
        
        # NOVA Group Analysis (Food Processing)
        nova_group = product_data.get("nova_group")
        if nova_group == 1:
            health_score += 2
            health_benefits.append("Minimally processed food")
        elif nova_group == 2:
            health_score += 1
            health_benefits.append("Processed culinary ingredients")
        elif nova_group == 3:
            health_score -= 1
            health_issues.append("Processed food")
        elif nova_group == 4:
            health_score -= 2
            health_issues.append("Ultra-processed food")
        
        # Nutritional Analysis
        nutrition_analysis = self.analyze_nutrition(product_data)
        health_score += nutrition_analysis["score"]
        health_issues.extend(nutrition_analysis["issues"])
        health_benefits.extend(nutrition_analysis["benefits"])
        
        # Additives Analysis
        additives = product_data.get("additives_tags", [])
        if additives:
            harmful_additives = [additive for additive in additives if any(harmful in additive.lower() for harmful in ["e621", "e951", "e211", "e250"])]
            if harmful_additives:
                health_score -= 1
                health_issues.append(f"Contains potentially harmful additives: {', '.join(harmful_additives)}")
        
        # Allergens Analysis
        allergens = product_data.get("allergens_tags", [])
        if allergens:
            health_issues.append(f"Contains allergens: {', '.join(allergens)}")
        
        return {
            "overall_score": health_score,
            "nutriscore": nutriscore,
            "nova_group": nova_group,
            "health_issues": health_issues,
            "health_benefits": health_benefits,
            "nutrition_analysis": nutrition_analysis,
            "additives_count": len(additives),
            "allergens": allergens
        }

    def analyze_nutrition(self, product_data):
        """Analyze nutritional content"""
        
        score = 0
        issues = []
        benefits = []
        
        # Sugar Analysis
        sugars = product_data.get("sugars_100g", 0)
        if sugars > 15:
            score -= 2
            issues.append(f"High sugar content ({sugars}g/100g)")
        elif sugars < 5:
            score += 1
            benefits.append(f"Low sugar content ({sugars}g/100g)")
        
        # Salt Analysis
        salt = product_data.get("salt_100g", 0)
        if salt > 1.5:
            score -= 2
            issues.append(f"High salt content ({salt}g/100g)")
        elif salt < 0.3:
            score += 1
            benefits.append(f"Low salt content ({salt}g/100g)")
        
        # Fat Analysis
        fat = product_data.get("fat_100g", 0)
        saturated_fat = product_data.get("saturated_fat_100g", 0)
        
        if saturated_fat > 5:
            score -= 1
            issues.append(f"High saturated fat ({saturated_fat}g/100g)")
        
        # Fiber Analysis
        fiber = product_data.get("fiber_100g", 0)
        if fiber > 3:
            score += 1
            benefits.append(f"Good fiber content ({fiber}g/100g)")
        
        # Protein Analysis
        protein = product_data.get("proteins_100g", 0)
        if protein > 10:
            score += 1
            benefits.append(f"Good protein content ({protein}g/100g)")
        
        return {
            "score": score,
            "issues": issues,
            "benefits": benefits,
            "sugars": sugars,
            "salt": salt,
            "fat": fat,
            "saturated_fat": saturated_fat,
            "fiber": fiber,
            "protein": protein
        }

    def analyze_adulteration_risks(self, product_data):
        """Analyze potential adulteration risks"""
        
        adulteration_risks = []
        risk_level = "Low"
        
        # Check for suspicious ingredients
        ingredients_text = product_data.get("ingredients_text", "").lower()
        suspicious_patterns = [
            "artificial", "synthetic", "imitation", "substitute",
            "modified", "hydrogenated", "trans fat", "high fructose"
        ]
        
        for pattern in suspicious_patterns:
            if pattern in ingredients_text:
                adulteration_risks.append(f"Contains {pattern} ingredients")
        
        # Check for excessive additives
        additives = product_data.get("additives_tags", [])
        if len(additives) > 10:
            adulteration_risks.append(f"High number of additives ({len(additives)})")
            risk_level = "Medium"
        
        # Check for artificial colors
        artificial_colors = [additive for additive in additives if "e1" in additive.lower()]
        if artificial_colors:
            adulteration_risks.append(f"Contains artificial colors: {', '.join(artificial_colors)}")
            risk_level = "Medium"
        
        # Check for preservatives
        preservatives = [additive for additive in additives if any(p in additive.lower() for p in ["e200", "e202", "e211", "e220"])]
        if preservatives:
            adulteration_risks.append(f"Contains preservatives: {', '.join(preservatives)}")
        
        # Check packaging and origin
        packaging = product_data.get("packaging_tags", [])
        if "plastic" in str(packaging).lower():
            adulteration_risks.append("Packaged in plastic (potential chemical leaching)")
        
        # Check manufacturing location
        manufacturing_places = product_data.get("manufacturing_places_tags", [])
        if not manufacturing_places:
            adulteration_risks.append("Manufacturing location not specified")
            risk_level = "Medium"
        
        if len(adulteration_risks) > 3:
            risk_level = "High"
        elif len(adulteration_risks) > 1:
            risk_level = "Medium"
        
        return {
            "risk_level": risk_level,
            "risks": adulteration_risks,
            "additives_count": len(additives),
            "suspicious_ingredients": len([r for r in adulteration_risks if "suspicious" in r]),
            "packaging_concerns": len([r for r in adulteration_risks if "packaging" in r])
        }

    def assess_overall_risk(self, health_analysis, adulteration_analysis):
        """Assess overall consumption risk"""
        
        health_score = health_analysis["overall_score"]
        adulteration_level = adulteration_analysis["risk_level"]
        
        if health_score < -2 or adulteration_level == "High":
            overall_risk = "High"
            confidence = 9
        elif health_score < 0 or adulteration_level == "Medium":
            overall_risk = "Medium"
            confidence = 7
        else:
            overall_risk = "Low"
            confidence = 8
        
        return {
            "overall_risk": overall_risk,
            "confidence_score": confidence,
            "health_score": health_score,
            "adulteration_risk": adulteration_level,
            "consumption_recommendation": self.get_consumption_recommendation(overall_risk)
        }

    def get_consumption_recommendation(self, risk_level):
        """Get consumption recommendation based on risk level"""
        
        recommendations = {
            "Low": "Safe to consume regularly as part of a balanced diet",
            "Medium": "Consume in moderation, consider healthier alternatives",
            "High": "Avoid or consume very rarely, consider alternative products"
        }
        
        return recommendations.get(risk_level, "Consult nutritionist for personalized advice")

    def generate_recommendations(self, health_analysis, adulteration_analysis):
        """Generate comprehensive recommendations"""
        
        recommendations = []
        
        # Health-based recommendations
        if health_analysis["overall_score"] < 0:
            recommendations.append("Consider choosing products with better Nutri-Score (A or B)")
        
        if health_analysis["nutrition_analysis"]["sugars"] > 15:
            recommendations.append("High sugar content - limit consumption")
        
        if health_analysis["nutrition_analysis"]["salt"] > 1.5:
            recommendations.append("High salt content - consume in moderation")
        
        # Adulteration-based recommendations
        if adulteration_analysis["risk_level"] == "High":
            recommendations.append("High adulteration risk - consider alternative products")
        
        if adulteration_analysis["additives_count"] > 10:
            recommendations.append("High additive content - choose products with fewer additives")
        
        # General recommendations
        recommendations.extend([
            "Read ingredient labels carefully",
            "Choose products with minimal processing",
            "Prefer products with clear manufacturing information",
            "Consider organic alternatives when possible"
        ])
        
        return recommendations

    def generate_home_tests(self, product_data, adulteration_analysis):
        """Generate relevant home tests based on product type and risks"""
        
        home_tests = []
        
        # Get product category
        categories = product_data.get("categories", "").lower()
        
        # General tests
        home_tests.append({
            "test_name": "Visual Inspection",
            "materials_needed": ["Good lighting", "Magnifying glass"],
            "procedure": "Examine product for unusual colors, textures, or foreign particles",
            "expected_result": "Natural appearance consistent with product type",
            "adulteration_indicator": "Unusual colors, textures, or foreign materials",
            "safety_notes": "Do not consume if suspicious characteristics are observed",
            "accuracy_level": "Medium"
        })
        
        # Category-specific tests
        if "milk" in categories or "dairy" in categories:
            home_tests.extend([
                {
                    "test_name": "Water Detection Test",
                    "materials_needed": ["Clean glass", "Water", "Dropper"],
                    "procedure": "Add a few drops of milk to water. Pure milk forms a white layer on top.",
                    "expected_result": "White layer forms on top",
                    "adulteration_indicator": "Milk mixes completely with water",
                    "safety_notes": "Safe to perform",
                    "accuracy_level": "High"
                },
                {
                    "test_name": "Starch Detection Test",
                    "materials_needed": ["Iodine solution", "Cotton swab"],
                    "procedure": "Dip cotton swab in iodine and touch it to milk",
                    "expected_result": "Brown color",
                    "adulteration_indicator": "Blue-black color indicates starch",
                    "safety_notes": "Do not consume tested portion",
                    "accuracy_level": "High"
                }
            ])
        
        if "honey" in categories:
            home_tests.extend([
                {
                    "test_name": "Water Test",
                    "materials_needed": ["Clean glass", "Water"],
                    "procedure": "Drop honey into water. Pure honey settles at bottom.",
                    "expected_result": "Honey settles at bottom",
                    "adulteration_indicator": "Honey dissolves or spreads in water",
                    "safety_notes": "Safe to perform",
                    "accuracy_level": "High"
                },
                {
                    "test_name": "Flame Test",
                    "materials_needed": ["Matchstick", "Cotton swab"],
                    "procedure": "Dip cotton swab in honey and try to light it",
                    "expected_result": "Honey burns easily",
                    "adulteration_indicator": "Honey does not burn or burns poorly",
                    "safety_notes": "Perform in safe area, away from flammable materials",
                    "accuracy_level": "Medium"
                }
            ])
        
        if "spice" in categories or "powder" in categories:
            home_tests.append({
                "test_name": "Color Test",
                "materials_needed": ["Water", "Cotton swab"],
                "procedure": "Rub spice on cotton swab and dip in water. Check for color bleeding.",
                "expected_result": "Minimal color bleeding",
                "adulteration_indicator": "Excessive color bleeding indicates artificial colors",
                "safety_notes": "Safe to perform",
                "accuracy_level": "Medium"
            })
        
        return home_tests

class ImageApi(APIView):
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request):
        serializer = ImageSerializer(data=request.data)
        if serializer.is_valid():
            image = serializer.validated_data["image"]
            
            # Validate image file
            if not image.content_type.startswith("image/"):
                return Response({
                    "error": "Only image files are allowed",
                    "status": "error"
                }, status=400)
            
            # Check file size (max 10MB)
            if image.size > 10 * 1024 * 1024:
                return Response({
                    "error": "Image size should be less than 10MB",
                    "status": "error"
                }, status=400)
            
            try:
                # Initialize LLM analyzer
                llm_analyzer = LLM()
                
                # Analyze the image for adulteration
                analysis_result = llm_analyzer.analyze_food_image(image)
                
                # Prepare response data
                response_data = {
                    "status": "success",
                    "filename": image.name,
                    "file_size": image.size,
                    "content_type": image.content_type,
                    "analysis": analysis_result
                }
                
                return Response(response_data, status=200)
                
            except Exception as e:
                return Response({
                    "error": f"Analysis failed: {str(e)}",
                    "status": "error",
                    "filename": image.name
                }, status=500)
                
        return Response({
            "error": "Invalid image data",
            "details": serializer.errors,
            "status": "error"
        }, status=400)










