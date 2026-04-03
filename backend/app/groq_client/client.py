from groq import Groq
from dotenv import load_dotenv
import os, json, re

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are a retail workflow automation engine.
Your job is to parse a natural language automation request from a retail store owner
and return ONLY a valid JSON object — no explanation, no markdown, no extra text.

The user may speak or type in English or Hindi (or Hinglish). 
Regardless of the input language, you MUST always output the exact JSON structure defined below.

The JSON must follow this exact schema:
{
  "name": "short workflow name (5 words max, in English)",
  "description": "one sentence describing what this workflow does (in English)",
  "trigger": one of ["inventory_update", "cron_21_00", "cron_09_00", "scheduled_check", "sales_update", "order_created"],
  "condition": null OR { "field": string, "op": one of ["<",">","==",">=","<="], "value": number or string },
  "actions": array of one or more of ["notify_manager", "email_supplier", "send_sms", "send_email", "generate_pdf", "generate_coupon", "fetch_sales_data", "send_alert", "generate_sales_insight"]
}

Examples:
- "Notify me when stock < 10" -> status: ok
- "Agar stock 10 se kam ho jaye toh mujhe alert karo" -> status: ok (Same as above)
- "Kal subah 9 baje sales report bhejo" -> trigger: "cron_09_00", actions: ["fetch_sales_data", "generate_pdf", "send_email"]

Rules:
- If the user mentions stock/inventory going below a number → trigger: "inventory_update"
- If the user mentions daily/nightly report → trigger: "cron_21_00" or "cron_09_00"
- If the user mentions inactive customers → trigger: "scheduled_check"
- If the user mentions sales spike or demand → trigger: "sales_update"
- If the user mentions order delays → trigger: "order_created"
- Return ONLY the raw JSON."""



def parse_nl_to_workflow(user_input: str) -> dict:
    """Send NL command to Groq and get back structured workflow JSON."""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_input}
        ],
        temperature=0.1,
        max_tokens=512
    )
    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if model adds them anyway
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise ValueError(f"Groq returned invalid JSON: {raw}")


def ask_groq(prompt: str, system: str = "You are a helpful retail AI assistant.") -> str:
    """General purpose Groq call."""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        max_tokens=1024
    )
    return response.choices[0].message.content


def test_groq_connection() -> dict:
    try:
        reply = ask_groq("Say 'Groq connected successfully' and nothing else.")
        return {"status": "ok", "message": reply}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """Send audio bytes to Groq Whisper for transcription."""
    transcription = client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model="whisper-large-v3",
        response_format="text"
    )
    return transcription