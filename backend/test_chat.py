import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post('http://localhost:8000/ai/chat', json={'document_context':'test', 'message':'hello'})
            print(r.status_code)
            print(r.text)
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(test())
