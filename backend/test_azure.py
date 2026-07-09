"""Quick connectivity test — run from backend/ with .venv active."""
import asyncio
from openai import AsyncAzureOpenAI
from app.core.config import get_settings

async def main():
    s = get_settings()
    print(f"Endpoint : {s.azure_openai_endpoint}")
    print(f"Deployment: {s.azure_openai_deployment}")
    print(f"API version: {s.azure_openai_api_version}")
    print(f"Key (first 8 chars): {s.azure_openai_api_key[:8]}...")
    print()

    client = AsyncAzureOpenAI(
        azure_endpoint=s.azure_openai_endpoint,
        api_key=s.azure_openai_api_key,
        api_version=s.azure_openai_api_version,
    )
    try:
        resp = await client.chat.completions.create(
            model=s.azure_openai_deployment,
            messages=[{"role": "user", "content": "Say hello in one word."}],
            max_tokens=10,
        )
        print("SUCCESS:", resp.choices[0].message.content)
    except Exception as e:
        print("FAILED:", e)

asyncio.run(main())
