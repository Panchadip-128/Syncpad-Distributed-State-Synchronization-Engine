import asyncio
import json
import re
from httpx import AsyncClient, ASGITransport
from openai import AsyncOpenAI

# Import the FastAPI app directly to bypass needing a running server
from main import app

import os
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
client = AsyncOpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

# Datasets
DATASETS = {
    "summarize": [
        "The newly designed electric vehicle utilizes an advanced battery pack that can recharge from zero to eighty percent in under fifteen minutes. Furthermore, its aerodynamic shape reduces drag significantly, leading to an overall range of up to four hundred miles on a single charge.",
        "While exploring the dense jungles of the Amazon, the team discovered a new species of frog that emits a bioluminescent glow during the night, a mechanism believed to deter predators rather than attract mates."
    ],
    "shorter": [
        "I was thinking that it might be a really good idea if we could somehow find a way to optimize the database queries because right now they are taking way too long and causing the whole application to slow down for users.",
        "In the event that you find yourself needing assistance with the software installation process, please do not hesitate to reach out to our dedicated customer support team who are available twenty-four hours a day, seven days a week."
    ],
    "rewrite": [
        "The new feature is pretty cool and helps users do things faster.",
        "Our team worked real hard to make sure the app doesn't crash anymore."
    ],
    "improve": [
        "We need to fix the bugs quickly so that people don't get mad at us.",
        "The report shows that we made a lot of money last quarter."
    ],
    "continue": [
        "The hero stood at the edge of the cliff, looking down into the abyss.",
        "After carefully analyzing the market trends for the past five years, the committee concluded that"
    ],
    "fix_grammar": [
        "Their going to the store to buy there groceries.",
        "He don't know nothing about how to fix the broken computer."
    ]
}

async def call_ai_assist(text: str, action: str) -> str:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/ai/assist", json={"text": text, "action": action}, timeout=60.0)
        
        if response.status_code != 200:
            return f"[HTTP ERROR {response.status_code}]"

        output = ""
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                data = line[6:]
                if data == "[DONE]":
                    break
                if data.startswith("[ERROR]"):
                    return f"[API ERROR] {data}"
                
                try:
                    payload = json.loads(data)
                    if "content" in payload:
                        output += payload["content"]
                except json.JSONDecodeError:
                    pass
        return output

async def llm_judge(prompt: str) -> int:
    """Uses Groq to judge output on a scale of 1-10. Returns the integer score."""
    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=10
        )
        content = response.choices[0].message.content.strip()
        # Extract the first number found
        match = re.search(r'\d+', content)
        if match:
            # handle '10' vs '1'
            nums = re.findall(r'\d+', content)
            if '10' in nums: return 10
            return int(nums[0])
        return 0
    except Exception as e:
        print(f"Judge LLM failed: {e}")
        return 0

async def evaluate_action(action: str, inputs: list) -> float:
    print(f"\n--- Evaluating '{action}' ---")
    scores = []
    
    for text in inputs:
        output = await call_ai_assist(text, action)
        if output.startswith("[") and "ERROR" in output:
            print(f"[{action}] Failed to get valid output. Error: {output}")
            scores.append(0.0)
            continue
            
        print(f"Input : {text}")
        print(f"Output: {output}")
        
        score = 0.0
        
        if action == "summarize":
            word_count = len(output.split())
            print(f"  Word count: {word_count} (Expected <= 15)")
            count_pass = word_count <= 15
            
            judge_prompt = f"Rate on a scale of 1-10 how well Output summarizes Input. Return ONLY a number between 1 and 10.\nInput: {text}\nOutput: {output}"
            quality_score = await llm_judge(judge_prompt)
            print(f"  Quality score: {quality_score}/10")
            
            if count_pass and quality_score >= 7:
                score = 1.0
            elif count_pass or quality_score >= 7:
                score = 0.5
                
        elif action == "shorter":
            input_len = len(text)
            output_len = len(output)
            print(f"  Length: {output_len} (Input: {input_len}, Expected <= {input_len * 0.6})")
            length_pass = output_len <= (input_len * 0.6) # Allow up to 60% for a bit of leniency
            
            judge_prompt = f"Rate on a scale of 1-10 how well Output preserves the core meaning of Input while being shorter. Return ONLY a number between 1 and 10.\nInput: {text}\nOutput: {output}"
            quality_score = await llm_judge(judge_prompt)
            print(f"  Quality score: {quality_score}/10")
            
            if length_pass and quality_score >= 7:
                score = 1.0
            elif length_pass or quality_score >= 7:
                score = 0.5
                
        elif action in ["rewrite", "improve"]:
            judge_prompt = f"Rate on a scale of 1-10 how much more professional and articulate Output is compared to Input, without changing meaning. Return ONLY a number between 1 and 10.\nInput: {text}\nOutput: {output}"
            quality_score = await llm_judge(judge_prompt)
            print(f"  Quality score: {quality_score}/10")
            score = min(1.0, quality_score / 10.0)
            
        elif action == "continue":
            sentences = [s for s in re.split(r'[.!?]+', output.strip()) if s.strip()]
            sentence_count = len(sentences)
            print(f"  Sentence count: {sentence_count} (Expected 1-2)")
            
            judge_prompt = f"Rate on a scale of 1-10 how naturally Output continues Input. Return ONLY a number between 1 and 10.\nInput: {text}\nOutput: {output}"
            quality_score = await llm_judge(judge_prompt)
            print(f"  Quality score: {quality_score}/10")
            
            if (1 <= sentence_count <= 2) and quality_score >= 7:
                score = 1.0
            elif quality_score >= 7:
                score = 0.8
                
        elif action == "fix_grammar":
            judge_prompt = f"Rate on a scale of 1-10. 10 means Output perfectly fixed all grammar/spelling in Input WITHOUT altering the original phrasing more than necessary. Return ONLY a number between 1 and 10.\nInput: {text}\nOutput: {output}"
            quality_score = await llm_judge(judge_prompt)
            print(f"  Quality score: {quality_score}/10")
            score = min(1.0, quality_score / 10.0)

        scores.append(score)
        print(f"  => Score: {score * 100}%")

    avg_score = sum(scores) / len(scores) if scores else 0
    print(f"--- '{action}' Accuracy: {avg_score * 100:.2f}% ---")
    return avg_score

async def main():
    print("STARTING AI FEATURES EVALUATION SUITE\n" + "="*50)
    results = {}
    
    for action, inputs in DATASETS.items():
        accuracy = await evaluate_action(action, inputs)
        results[action] = accuracy
        
    print("\n" + "="*50)
    print("FINAL ACCURACY REPORT")
    print("==================================================")
    for action, acc in results.items():
        print(f"{action.ljust(15)}: {acc * 100:.2f}%")
    print("==================================================")
    overall = sum(results.values()) / len(results)
    print(f"Overall Accuracy: {overall * 100:.2f}%")

if __name__ == "__main__":
    asyncio.run(main())
