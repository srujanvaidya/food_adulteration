import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

class LLM:
    def analyze_food_image(self, image_file):
        """Analyze a food image and return text analysis using Gemini.

        The input is a Django InMemoryUploadedFile or TemporaryUploadedFile.
        We pass the binary bytes to Gemini as an image part and request a
        concise adulteration-focused analysis.
        """
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return (
                "AI analysis unavailable: GEMINI_API_KEY is not configured. "
                "Set GEMINI_API_KEY and retry. Meanwhile, rely on visual inspection "
                "and home tests for basic checks."
            )

        try:
            genai.configure(api_key=api_key)

            # Read image bytes
            image_bytes = image_file.read()
            image_file.seek(0)

            model = genai.GenerativeModel("gemini-2.5-flash")
            prompt = (
                "You are an expert in food adulteration and food safety. "
                "Analyze the provided food image and return a CLEAN, USER-FRIENDLY report. "
                "First, TRY to produce STRICT JSON with this schema (keys exactly as written):\n" \
                "{\n"
                "  \"summary\": string,\n"
                "  \"riskLevel\": \"Low\"|\"Medium\"|\"High\",\n"
                "  \"keyFindings\": string[],\n"
                "  \"indicators\": string[],\n"
                "  \"recommendations\": string[],\n"
                "  \"homeTests\": string[]\n"
                "}\n" \
                "If you cannot produce JSON confidently, then output PLAIN TEXT in this exact sectioned format:\n" \
                "Summary:\n<2-4 sentences>\n" \
                "Risk Level: <Low|Medium|High>\n" \
                "Key Findings:\n- <bullet>\n- <bullet>\n" \
                "Adulteration Indicators:\n- <bullet>\n- <bullet>\n" \
                "Recommendations:\n- <bullet>\n- <bullet>\n" \
                "Home Tests:\n- <bullet>\n- <bullet>\n" \
                "Always keep it concise, factual, and safe."
            )

            response = model.generate_content([
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": image_file.content_type or "image/jpeg",
                        "data": image_bytes,
                    }
                },
            ])

            # Extract text from response
            if hasattr(response, "text") and response.text:
                response_text = response.text
            else:
                try:
                    response_text = response.candidates[0].content.parts[0].text  # type: ignore[attr-defined]
                except Exception:
                    response_text = ""

            if not response_text:
                return "Unable to extract analysis text from the AI response."

            # Try to parse strict JSON first
            cleaned = response_text.strip()
            if cleaned.startswith("```)" ):
                # Very defensive: handle unusual codefence mishaps
                cleaned = cleaned.strip('`')
            if cleaned.startswith("``"):
                # Remove markdown fences if present
                try:
                    fence = cleaned.split("\n", 1)[0]
                    cleaned = cleaned[len(fence):].strip()
                    if cleaned.endswith("```"):
                        cleaned = cleaned[: -3].strip()
                except Exception:
                    pass

            try:
                data = json.loads(cleaned)
                # Build standardized sectioned text the frontend can parse into cards
                summary = data.get("summary") or ""
                risk = data.get("riskLevel") or ""
                key_findings = data.get("keyFindings") or []
                indicators = data.get("indicators") or []
                recs = data.get("recommendations") or []
                tests = data.get("homeTests") or []

                sectioned = []
                if summary:
                    sectioned.append(f"Summary:\n{summary}")
                if risk:
                    sectioned.append(f"Risk Level: {risk}")
                if key_findings:
                    sectioned.append("Key Findings:\n" + "\n".join(f"- {it}" for it in key_findings))
                if indicators:
                    sectioned.append("Adulteration Indicators:\n" + "\n".join(f"- {it}" for it in indicators))
                if recs:
                    sectioned.append("Recommendations:\n" + "\n".join(f"- {it}" for it in recs))
                if tests:
                    sectioned.append("Home Tests:\n" + "\n".join(f"- {it}" for it in tests))

                formatted = "\n\n".join(sectioned).strip()
                return formatted or response_text
            except Exception:
                # If not JSON, return text (already instructed to be sectioned)
                return response_text
        except Exception as e:
            return (
                "AI analysis failed due to a connection or configuration issue. "
                f"Details: {str(e)}. Please try again later."
            )

    def Gemini(self,image):
        load_dotenv()
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(f"tell me about food adultration of this image{image}")
        print(response.text)