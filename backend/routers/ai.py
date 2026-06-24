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

# Initialize OpenAI client pointed to Groq
client = AsyncOpenAI(
    api_key=os.environ.get("GROQ_API_KEY", ""),
    base_url="https://api.groq.com/openai/v1"
)
HAS_OPENAI = True

class AIRequest(BaseModel):
    text: str
    action: str
    # Accept both camelCase (from JS frontend) and snake_case
    documentId: Optional[str] = None
    document_id: Optional[str] = None

    class Config:
        populate_by_name = True

class AIChatRequest(BaseModel):
    document_context: str
    message: str
    # Accept both camelCase (from JS frontend) and snake_case
    documentId: Optional[str] = None
    document_id: Optional[str] = None

    class Config:
        populate_by_name = True

def get_system_prompt(action: str) -> str:
    base = "You are a strict text-processing AI. CRITICAL: You MUST NOT include any conversational filler, greetings, introductory phrases (e.g., 'Here is the rewritten version:'), explanations, or meta-commentary. Output ONLY the raw final text and absolutely nothing else. Your entire output will be inserted directly into a document.\\n\\n"
    if action in ["rewrite", "improve"]:
        return base + "Task: Elevate the user's text. Enhance the vocabulary, improve the flow, and make it sound highly professional and articulate without changing the underlying meaning. Do not summarize, just rewrite it better.\\n\\nExample Input: The new feature is pretty cool and helps users do things faster.\\nExample Output: The new feature significantly enhances user efficiency and provides a streamlined experience."
    elif action == "summarize":
        return base + "Task: Provide a highly condensed summary. Extract ONLY the absolute core idea. Maximum 15 words.\\n\\nExample Input: Soft lantern light created a peaceful atmosphere, but this moment was temporary before the city's night life fully kicked in. The scene provided a temporary calm amidst the approaching chaos.\\nExample Output: Lantern light provided brief calm before the chaotic city nightlife began."
    elif action == "shorter":
        return base + "Task: Cut the text down to half its original length or less. Be extremely brief, punchy, and direct. Remove all unnecessary words.\\n\\nExample Input: We need to figure out a way to optimize the database queries because right now they are taking way too long and causing the whole application to slow down for users.\\nExample Output: We must optimize database queries to improve application speed."
    elif action == "continue":
        return base + "Task: Continue writing naturally from where the user's text ends. Match the tone and style. Write exactly 1-2 more sentences."
    elif action == "fix_grammar":
        return base + "Task: Fix all grammar, spelling, and punctuation errors in the user's text. Do not rewrite or alter the wording unless absolutely necessary for grammatical correctness."
    else:
        return base + "Task: Process the text."

DEMO_RESPONSES = {
    "rewrite": "This text has been rewritten with improved clarity and professional tone. The core meaning is preserved while enhancing readability and flow.",
    "improve": "This text has been rewritten with improved clarity and professional tone. The core meaning is preserved while enhancing readability and flow.",
    "summarize": "The selected text discusses collaborative document editing powered by CRDTs. It highlights how real-time sync works across multiple clients simultaneously.",
    "shorter": "Real-time sync allows multiple clients to edit documents simultaneously using CRDTs.",
    "continue": " Furthermore, the CRDT algorithm ensures that all concurrent edits converge to the same state regardless of network latency or ordering — a fundamental property known as eventual consistency.",
    "fix_grammar": "Grammar and punctuation have been corrected throughout the selected text. All sentences now follow proper structure.",
}

@router.post("/assist")
async def ai_assist(req: AIRequest):
    valid_actions = ["rewrite", "improve", "summarize", "shorter", "continue", "fix_grammar"]
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
            kwargs = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Here is the text to process:\\n\\n{req.text}"}
                ],
                "stream": True,
            }
            
            if req.action == "summarize":
                kwargs["max_tokens"] = 30
                kwargs["temperature"] = 0.2
            elif req.action == "shorter":
                kwargs["max_tokens"] = 60
                kwargs["temperature"] = 0.2
            elif req.action == "continue":
                kwargs["max_tokens"] = 150
                kwargs["temperature"] = 0.7
            
            stream = await client.chat.completions.create(**kwargs)
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    # Format as SSE with JSON to safely handle newlines
                    import json
                    payload = json.dumps({"content": chunk.choices[0].delta.content})
                    yield f"data: {payload}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@router.post("/chat")
async def ai_chat(req: AIChatRequest):
    system_prompt = "You are a helpful AI Copilot inside a document editor. You have access to the document's content. Answer the user's questions or help them draft content based on the context."
    
    async def generate():
        if not HAS_OPENAI:
            yield "data: {\"content\": \"AI Chat is only available with a real API key.\"}\n\n"
            yield "data: [DONE]\n\n"
            return
            
        try:
            stream = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Document Context:\n\n{req.document_context}\n\n---\n\nUser Message: {req.message}"}
                ],
                stream=True,
                temperature=0.7,
                max_tokens=500
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    import json
                    payload = json.dumps({"content": chunk.choices[0].delta.content})
                    yield f"data: {payload}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

class ExecuteRequest(BaseModel):
    language: str
    code: str

@router.post("/execute")
async def execute_code(req: ExecuteRequest):
    if req.language != "python":
        raise HTTPException(status_code=400, detail="Only python is supported currently")
    
    import sys
    import subprocess
    
    try:
        # Execute code in a subprocess using the current python executable
        result = subprocess.run(
            [sys.executable, "-c", req.code],
            capture_output=True,
            text=True,
            timeout=5.0
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "[Error] Execution timed out after 5.0 seconds.",
            "exit_code": -1
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": f"[Error] Internal execution error: {str(e)}",
            "exit_code": -1
        }
