import httpx
import os
from dotenv import load_dotenv

load_dotenv()

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")

class N8NClient:
    def __init__(self):
        self.webhook_url = N8N_WEBHOOK_URL

    async def trigger_webhook(self, data):
        async with httpx.AsyncClient() as client:
            try:
                # Assuming n8n webhook is a POST request
                response = await client.post(self.webhook_url, json=data)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"Error triggering n8n webhook: {e}")
                return {"error": str(e)}
