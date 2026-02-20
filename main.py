from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import uvicorn
import os
from dotenv import load_dotenv
from llm_client import LLMClient
from n8n_client import N8NClient
from tools import get_tools
import json
import subprocess

load_dotenv()

app = FastAPI()

# Directory setup
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

llm = LLMClient()
n8n = N8NClient()

class ChatRequest(BaseModel):
    message: str
    history: list = []

# ==============================
# FRONTEND ROUTE
# ==============================

@app.get("/", response_class=HTMLResponse)
async def read_item(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# ==============================
# CHAT ENDPOINT
# ==============================

@app.post("/chat")
async def chat(request: ChatRequest):
    messages = request.history + [{"role": "user", "content": request.message}]
    
    # Inject system prompt only once
    if not any(msg["role"] == "system" for msg in messages):
        messages.insert(0, {
            "role": "system",
            "content": (
                "You are Jarvis, an advanced AI assistant. "
                "You can help with automation tasks by calling tools. "
                "Be concise, professional, and slightly witty like the Jarvis from Iron Man. "
                "If automation is required, use the provided tools."
            )
        })

    tools = get_tools()
    response = await llm.chat_completion(messages, tools=tools)

    if "error" in response:
        return {"response": f"I'm sorry, I encountered an error: {response['error']}"}

    choice = response["choices"][0]
    message = choice["message"]

    # ==============================
    # TOOL CALL HANDLING
    # ==============================

    if message.get("tool_calls"):
        tool_results = []

        for tool_call in message["tool_calls"]:
            function_name = tool_call["function"]["name"]
            arguments = json.loads(tool_call["function"]["arguments"])

            # Trigger n8n automation
            if function_name == "trigger_automation":
                result = await n8n.trigger_webhook(arguments)

                tool_results.append({
                    "tool_call_id": tool_call["id"],
                    "role": "tool",
                    "name": function_name,
                    "content": json.dumps(result)
                })

        # Send tool result back to LLM for final response
        messages.append(message)
        messages.extend(tool_results)

        final_response = await llm.chat_completion(messages)

        if "error" in final_response:
            return {
                "response": "Automation triggered, but I couldn't generate a final response."
            }

        return {
            "response": final_response["choices"][0]["message"]["content"],
            "history": messages
        }

    # ==============================
    # NORMAL CHAT RESPONSE
    # ==============================

    return {
        "response": message["content"],
        "history": messages + [message]
    }

# ==============================
# COMMAND EXECUTION ENDPOINT
# (Called by n8n)
# ==============================

@app.post("/run-command")
async def run_command(data: dict):
    workflow = data.get("workflow")

    try:
        if workflow == "start_server":
            subprocess.Popen(["npm", "run", "dev"])
            return {"status": "Development server started successfully."}

        elif workflow == "stop_server":
            subprocess.Popen(["pkill", "node"])
            return {"status": "Development server stopped successfully."}

        else:
            return {"status": f"Unknown workflow: {workflow}"}

    except Exception as e:
        return {"status": f"Execution failed: {str(e)}"}


# ==============================
# RUN SERVER
# ==============================

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000))
    )