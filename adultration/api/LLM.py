import os
from dotenv import load_dotenv
import google.generativeai as genai
import json
from PIL import Image
import io

class LLM:
    def __init__(self):
        load_dotenv()
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        # Using the latest Gemini 2.5 Flash model for enhanced analysis
        self.model = genai.GenerativeModel("gemini-2.5-flash")
    
    def analyze_food_image(self, image_file):
        """
        Analyze food image for adulteration and provide home test recommendations
        """
        try:
            # Process the image
            image_data = self._process_image(image_file)
            
            # Create detailed prompt for adulteration analysis
            prompt = self._create_analysis_prompt()
            
            # Generate analysis using Gemini
            response = self.model.generate_content([prompt, image_data])
            
            # Parse and structure the response
            analysis_result = self._parse_analysis_response(response.text)
            
            return analysis_result
            
        except Exception as e:
            return {
                "error": f"Analysis failed: {str(e)}",
                "status": "error"
            }
    
    def _process_image(self, image_file):
        """Process and optimize image for analysis"""
        try:
            # Open and resize image if too large
            image = Image.open(image_file)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize if too large (max 1024x1024 for better performance)
            max_size = 1024
            if image.width > max_size or image.height > max_size:
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            return image
            
        except Exception as e:
            raise Exception(f"Image processing failed: {str(e)}")
    
    def _create_analysis_prompt(self):
        """Create comprehensive prompt for food adulteration analysis using Gemini 2.5 Flash"""
        return """
        You are an advanced food safety expert with access to the latest AI capabilities. Analyze this food product image for potential adulteration using your enhanced multimodal understanding.
        
        IMPORTANT: Respond ONLY with valid JSON in the exact format specified below. Do not include any text before or after the JSON.
        
        {
            "product_identification": {
                "food_type": "Specific type of food product identified (be precise)",
                "brand_visible": "Any visible brand names, logos, or packaging details",
                "appearance_assessment": "Detailed visual assessment including color, texture, and overall condition",
                "packaging_type": "Type of packaging (bottle, box, bag, etc.)",
                "expiry_visible": "Any visible expiration or manufacturing dates"
            },
            "adulteration_indicators": {
                "color_anomalies": "Detailed analysis of any unusual colors, discolorations, or inconsistencies",
                "texture_issues": "Analysis of texture abnormalities, foreign particles, or inconsistencies",
                "packaging_concerns": "Any signs of tampering, damage, or suspicious packaging",
                "overall_quality": "Comprehensive quality assessment based on visual inspection",
                "authenticity_signs": "Signs that indicate genuine vs. counterfeit products"
            },
            "potential_adulterants": [
                "Specific adulterants likely based on visual analysis (be specific)"
            ],
            "home_tests": [
                {
                    "test_name": "Specific test name",
                    "materials_needed": ["Exact list of household materials required"],
                    "procedure": "Detailed step-by-step procedure with measurements",
                    "expected_result": "What to expect if the product is pure/authentic",
                    "adulteration_indicator": "Specific signs that indicate adulteration",
                    "safety_notes": "Important safety precautions and warnings",
                    "accuracy_level": "How reliable this test is (High/Medium/Low)"
                }
            ],
            "risk_assessment": {
                "risk_level": "Low/Medium/High",
                "confidence_score": "Confidence in assessment (1-10)",
                "recommendations": "Detailed consumption recommendations",
                "immediate_actions": "What the user should do immediately"
            },
            "additional_notes": "Any additional observations, warnings, or recommendations",
            "ai_analysis_metadata": {
                "model_version": "gemini-2.5-flash",
                "analysis_timestamp": "Current analysis time",
                "image_quality_assessment": "Assessment of image quality for analysis"
            }
        }
        
        Focus on these common adulteration patterns:
        - Dairy Products: Water dilution, starch addition, urea, formalin, synthetic milk
        - Honey: Sugar syrup, corn syrup, artificial sweeteners, water dilution
        - Spices: Artificial colors, sawdust, chalk powder, brick powder, starch
        - Cooking Oils: Cheaper oil substitution, artificial colors, recycled oil
        - Rice/Grains: Plastic rice, artificial colors, foreign particles
        - Tea/Coffee: Artificial colors, sawdust, used tea leaves
        - Packaged Foods: Counterfeit packaging, expired products, tampering
        
        Provide highly accurate, practical home tests using common household items. Be specific about measurements, timing, and expected results.
        """
    
    def _parse_analysis_response(self, response_text):
        """Parse and structure the Gemini 2.5 Flash response"""
        try:
            import re
            from datetime import datetime
            
            # Clean the response text
            cleaned_text = response_text.strip()
            
            # Try multiple JSON extraction methods
            json_patterns = [
                r'\{.*\}',  # Basic JSON pattern
                r'```json\s*(\{.*?\})\s*```',  # JSON in code blocks
                r'```\s*(\{.*?\})\s*```',  # JSON in generic code blocks
            ]
            
            parsed_data = None
            for pattern in json_patterns:
                json_match = re.search(pattern, cleaned_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1) if len(json_match.groups()) > 0 else json_match.group(0)
                    try:
                        parsed_data = json.loads(json_str)
                        break
                    except json.JSONDecodeError:
                        continue
            
            if parsed_data:
                # Add timestamp if not present
                if 'ai_analysis_metadata' not in parsed_data:
                    parsed_data['ai_analysis_metadata'] = {}
                
                parsed_data['ai_analysis_metadata']['analysis_timestamp'] = datetime.now().isoformat()
                parsed_data['ai_analysis_metadata']['model_version'] = 'gemini-2.5-flash'
                
                return {
                    "status": "success",
                    "analysis": parsed_data,
                    "raw_response": response_text,
                    "model_version": "gemini-2.5-flash"
                }
            else:
                # Enhanced fallback for non-JSON responses
                return {
                    "status": "partial_success",
                    "analysis": {
                        "product_identification": {
                            "food_type": "Analysis completed - see raw response",
                            "appearance_assessment": response_text[:300] + "..." if len(response_text) > 300 else response_text,
                            "ai_note": "Gemini 2.5 Flash provided detailed analysis"
                        },
                        "adulteration_indicators": {
                            "overall_quality": "See detailed analysis in raw response",
                            "ai_analysis": "Advanced multimodal analysis completed"
                        },
                        "home_tests": [
                            {
                                "test_name": "Enhanced Visual Inspection",
                                "materials_needed": ["Good lighting", "Magnifying glass", "Clean white surface"],
                                "procedure": "Use Gemini 2.5 Flash analysis as reference. Examine product for unusual colors, textures, foreign particles, and packaging inconsistencies.",
                                "expected_result": "Natural appearance consistent with authentic product type",
                                "adulteration_indicator": "Any deviations from expected appearance",
                                "safety_notes": "Do not consume if any suspicious characteristics are observed",
                                "accuracy_level": "High"
                            }
                        ],
                        "risk_assessment": {
                            "risk_level": "See detailed analysis",
                            "confidence_score": "8",
                            "recommendations": "Review detailed AI analysis for specific recommendations",
                            "immediate_actions": "Examine product carefully before consumption"
                        },
                        "ai_analysis_metadata": {
                            "model_version": "gemini-2.5-flash",
                            "analysis_timestamp": datetime.now().isoformat(),
                            "response_type": "text_analysis"
                        }
                    },
                    "raw_response": response_text,
                    "model_version": "gemini-2.5-flash"
                }
                
        except json.JSONDecodeError as e:
            return {
                "status": "partial_success",
                "analysis": {
                    "error": f"JSON parsing failed: {str(e)}",
                    "raw_response": response_text,
                    "ai_analysis_metadata": {
                        "model_version": "gemini-2.5-flash",
                        "analysis_timestamp": datetime.now().isoformat(),
                        "error_type": "json_parse_error"
                    }
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "error": f"Response parsing failed: {str(e)}",
                "raw_response": response_text,
                "ai_analysis_metadata": {
                    "model_version": "gemini-2.5-flash",
                    "analysis_timestamp": datetime.now().isoformat(),
                    "error_type": "general_error"
                }
            }
    
    def get_common_home_tests(self, food_type):
        """Get common home tests for specific food types"""
        home_tests_database = {
            "milk": [
                {
                    "test_name": "Water Detection Test",
                    "materials_needed": ["Clean glass", "Water", "Dropper"],
                    "procedure": "Add a few drops of milk to water. Pure milk will form a white layer on top.",
                    "expected_result": "White layer forms on top",
                    "adulteration_indicator": "Milk mixes completely with water",
                    "safety_notes": "Safe to perform"
                },
                {
                    "test_name": "Starch Detection Test",
                    "materials_needed": ["Iodine solution", "Cotton swab"],
                    "procedure": "Dip cotton swab in iodine and touch it to milk. Pure milk turns brown.",
                    "expected_result": "Brown color",
                    "adulteration_indicator": "Blue-black color indicates starch",
                    "safety_notes": "Do not consume tested portion"
                }
            ],
            "honey": [
                {
                    "test_name": "Water Test",
                    "materials_needed": ["Clean glass", "Water"],
                    "procedure": "Drop honey into water. Pure honey will settle at the bottom.",
                    "expected_result": "Honey settles at bottom",
                    "adulteration_indicator": "Honey dissolves or spreads in water",
                    "safety_notes": "Safe to perform"
                },
                {
                    "test_name": "Flame Test",
                    "materials_needed": ["Matchstick", "Cotton swab"],
                    "procedure": "Dip cotton swab in honey and try to light it with a matchstick.",
                    "expected_result": "Honey burns easily",
                    "adulteration_indicator": "Honey does not burn or burns poorly",
                    "safety_notes": "Perform in safe area, away from flammable materials"
                }
            ],
            "spices": [
                {
                    "test_name": "Color Test",
                    "materials_needed": ["Water", "Cotton swab"],
                    "procedure": "Rub spice on cotton swab and dip in water. Check for color bleeding.",
                    "expected_result": "Minimal color bleeding",
                    "adulteration_indicator": "Excessive color bleeding indicates artificial colors",
                    "safety_notes": "Safe to perform"
                },
                {
                    "test_name": "Texture Test",
                    "materials_needed": ["Magnifying glass"],
                    "procedure": "Examine spice powder under magnification for foreign particles.",
                    "expected_result": "Uniform texture",
                    "adulteration_indicator": "Foreign particles or unusual textures",
                    "safety_notes": "Safe to perform"
                }
            ]
        }
        
        return home_tests_database.get(food_type.lower(), [])