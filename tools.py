# Tool definitions for Jarvis

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "trigger_automation",
            "description": "Trigger an automation flow in n8n for a specific task.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_name": {
                        "type": "string",
                        "description": "The name of the task to automate (e.g., 'send_email', 'update_spreadsheet')."
                    },
                    "details": {
                        "type": "string",
                        "description": "Specific details or parameters for the task."
                    }
                },
                "required": ["task_name", "details"]
            }
        }
    }
]

def get_tools():
    return TOOLS
