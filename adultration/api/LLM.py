import os
from dotenv import load_dotenv
import google.generativeai as genai

class LLM:
    def Gemini(self,image):
        load_dotenv()
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(f"tell me about food adultration of this image{image}")
        print(response.text)