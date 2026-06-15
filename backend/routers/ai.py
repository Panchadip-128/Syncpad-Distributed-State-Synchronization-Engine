from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
import os
import asyncio
from openai import AsyncOpenAI

from database import get_db
from models import User
from dependencies import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

# Initialize OpenAI client
# In production, ensure OPENAI_API_KEY is set in the environment
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", "dummy-key"))
HAS_OPENAI = bool(os.getenv("OPENAI_API_KEY"))

class AIRequest(BaseModel):
    text: str
    action: str
    # Accept both camelCase (from JS frontend) and snake_case
    documentId: Optional[str] = None
    document_id: Optional[str] = None

    class Config:
        populate_by_name = True

def get_system_prompt(action: str) -> str:
    if action == "rewrite":
        return "You are a writing assistant. Rewrite the following text to be clearer, more concise, and more professional. Preserve the original meaning. Return only the rewritten text, no explanation."
    elif action == "summarize":
        return "Summarize the following text in 2-3 sentences. Return only the summary."
    elif action == "continue":
        return "Continue writing naturally from where this text ends. Match the tone and style. Write 2-3 more sentences."
    elif action == "fix_grammar":
        return "Fix all grammar, spelling, and punctuation errors in the following text. Return only the corrected text."
    else:
        return "You are a helpful writing assistant."

DEMO_RESPONSES = {
    "rewrite": "This text has been rewritten with improved clarity and professional tone. The core meaning is preserved while enhancing readability and flow.",
    "summarize": "The selected text discusses collaborative document editing powered by CRDTs. It highlights how real-time sync works across multiple clients simultaneously.",
    "continue": " Furthermore, the CRDT algorithm ensures that all concurrent edits converge to the same state regardless of network latency or ordering — a fundamental property known as eventual consistency.",
    "fix_grammar": "Grammar and punctuation have been corrected throughout the selected text. All sentences now follow proper structure.",
}

@router.post("/assist")
async def ai_assist(req: AIRequest, current_user: User = Depends(get_current_user)):
    valid_actions = ["rewrite", "summarize", "continue", "fix_grammar"]
    if req.action not in valid_actions:
        raise HTTPException(status_code=400, detail="Invalid action")

    system_prompt = get_system_prompt(req.action)

    async def generate():
        # If no real OpenAI key, return a demo streamed response
        if not HAS_OPENAI:
            demo = DEMO_RESPONSES.get(req.action, "AI response (configure OPENAI_API_KEY for real results).")
            for word in demo.split(" "):
                yield f"data: {word} \n\n"
                await asyncio.sleep(0.05)
            yield "data: [DONE]\n\n"
            return

        try:
            stream = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": req.text}
                ],
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    # Format as SSE
                    yield f"data: {chunk.choices[0].delta.content}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
