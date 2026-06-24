import asyncio
import json
import httpx

API_URL = "http://127.0.0.1:8000/ai/assist"

TEST_TEXT_1 = "Soft lantern light created a peaceful atmosphere, but this moment was temporary before the city's night life fully kicked in. The scene provided a temporary calm amidst the approaching chaos."
TEST_TEXT_2 = "The quick brown foxes jumps over the lazy dogs, resulting in a grammatical anomaly that must be fixed promptly."

async def test_action(action, text):
    print(f"\\n{'='*50}\\nTesting Action: [{action.upper()}]\\nInput: '{text}'\\nOutput: ", end="", flush=True)
    try:
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", API_URL, json={"text": text, "action": action}, timeout=30.0) as response:
                if response.status_code != 200:
                    print(f"[HTTP ERROR {response.status_code}]")
                    return
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        elif data.startswith("[ERROR]"):
                            print(f"\\n[ERROR from backend] {data}")
                            break
                        else:
                            try:
                                payload = json.loads(data)
                                if "content" in payload:
                                    print(payload["content"], end="", flush=True)
                            except json.JSONDecodeError:
                                pass
    except Exception as e:
        print(f"\\n[EXCEPTION] {str(e)}")
    print("\\n" + "="*50)

async def main():
    print("STARTING API STRESS TEST...")
    # Test summarize and shorter with user's specific text
    await test_action("summarize", TEST_TEXT_1)
    await test_action("shorter", TEST_TEXT_1)
    
    # Test rewrite and fix_grammar
    await test_action("rewrite", TEST_TEXT_1)
    await test_action("fix_grammar", TEST_TEXT_2)

if __name__ == "__main__":
    asyncio.run(main())
