import uvicorn
import sys

if __name__ == "__main__":
    try:
        uvicorn.run("main:app", host="127.0.0.1", port=8000, log_level="debug")
    except Exception as e:
        print(f"FAILED TO START: {e}")
