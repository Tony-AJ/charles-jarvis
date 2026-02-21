import asyncio
from llm_client import LLMClient

async def test():
    client = LLMClient()
    print(f"Testing connectivity to {client.url} with model {client.model}...")
    response = await client.chat_completion([{"role": "user", "content": "Say hello"}])
    print("Response received:")
    print(response)

if __name__ == "__main__":
    asyncio.run(test())
