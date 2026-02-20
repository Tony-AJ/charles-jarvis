import httpx
import os
from dotenv import load_dotenv
import json

load_dotenv()

MISTRAL_API_URL = os.getenv("MISTRAL_API_URL")
MODEL_NAME = os.getenv("MODEL_NAME")

class LLMClient:
    def __init__(self):
        self.url = MISTRAL_API_URL
        self.model = MODEL_NAME

    async def chat_completion(self, messages, tools=None):
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(f"{self.url}/chat/completions", json=payload)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"Error in chat_completion: {e}")
                return {"error": str(e)}

    async def get_models(self):
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.url}/models")
                response.raise_for_status()
                return response.json()
            except Exception as e:
                return {"error": str(e)}
