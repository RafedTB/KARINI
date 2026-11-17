import json
import os
import urllib.request

import torch
from flask import Flask, jsonify, request
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

PORT = int(os.environ.get("AI_PORT", "5000"))
BASE_MODEL_ID = os.environ.get("AI_BASE_MODEL_ID", "Qwen/Qwen2.5-0.5B-Instruct")
ADAPTER_DIR = os.environ.get(
    "AI_ADAPTER_DIR",
    os.path.join(os.path.dirname(__file__), "final-karini-model"),
)
BACKEND_PRICES_URL = os.environ.get(
    "KARINI_API_URL",
    "http://localhost:3000/api/memberships/prices",
)
ALLOWED_ORIGINS = os.environ.get("AI_ALLOWED_ORIGINS", "*")
API_KEY = os.environ.get("AI_API_KEY", "")
MAX_MESSAGE_LENGTH = int(os.environ.get("AI_MAX_MESSAGE_LENGTH", "4000"))


class AIRuntime:
    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    def load(self):
        if self.model is not None:
            return

        print(f"--> Loading tokenizer and model ({BASE_MODEL_ID}) on {self.device}...")
        self.tokenizer = AutoTokenizer.from_pretrained(
            ADAPTER_DIR if os.path.exists(ADAPTER_DIR) else BASE_MODEL_ID
        )
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        base_model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_ID,
            dtype=self.dtype,
            device_map="auto" if self.device == "cuda" else None,
            low_cpu_mem_usage=True,
        )

        if os.path.exists(ADAPTER_DIR):
            print("--> Found fine-tuned Karini model! Loading enhanced adapter...")
            self.model = PeftModel.from_pretrained(base_model, ADAPTER_DIR)
        else:
            print("--> Running base model with Karini knowledge.")
            self.model = base_model

        self.model.eval()

    def generate(self, prompt):
        self.load()
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=300,
                temperature=0.5,
                top_p=0.85,
                repetition_penalty=1.15,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
            )
        return self.tokenizer.decode(
            outputs[0][inputs.input_ids.shape[1]:],
            skip_special_tokens=True,
        ).strip()


runtime = AIRuntime()


def fetch_live_plans():
    try:
        req = urllib.request.Request(
            BACKEND_PRICES_URL,
            headers={"User-Agent": "Karini-AI/1.0", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=1.5) as response:
            data = json.loads(response.read().decode("utf-8"))
            if isinstance(data, list) and data:
                plans = {}
                for plan in data:
                    name = str(plan.get("membership", "")).lower()
                    plans[name] = {
                        "credits": plan.get("priceCredits", 0),
                        "duration": plan.get("duration", "monthly"),
                    }
                return plans
    except Exception:
        pass

    return {
        "default": {"credits": 0, "duration": "monthly"},
        "standard": {"credits": 0, "duration": "monthly"},
        "silver": {"credits": 100, "duration": "monthly"},
        "gold": {"credits": 250, "duration": "monthly"},
        "platinum": {"credits": 500, "duration": "yearly"},
    }


def get_direct_price_answer(user_msg, plans):
    msg = user_msg.lower().strip()
    price_terms = (
        "prix", "tarif", "combien", "cout", "coût", "bkaddeh",
        "chounia", "forfait", "abonnement", "membership",
    )
    if not any(term in msg for term in price_terms):
        return None

    silver = plans.get("silver", {}).get("credits", 100)
    gold = plans.get("gold", {}).get("credits", 250)
    platinum = plans.get("platinum", {}).get("credits", 500)

    if "gold" in msg and not any(word in msg for word in ("silver", "platinum", "tous", "les")):
        return f"⭐ **Formule Gold : {gold} crédits / mois** (validité 30 jours)."
    if "platinum" in msg and not any(word in msg for word in ("silver", "gold", "tous")):
        return f"💎 **Formule Platinum : {platinum} crédits / an**."
    if "silver" in msg and not any(word in msg for word in ("gold", "platinum", "tous")):
        return f"🥈 **Formule Silver : {silver} crédits / mois** (validité 30 jours)."
    if any(word in msg for word in ("standard", "gratuit", "free")):
        return "📚 **Formule Standard : 0 crédit (Gratuit)**."

    return (
        "Voici les tarifs officiels des formules d'abonnement sur Karini :\n\n"
        f"• 📚 **Standard** : **0 crédit**\n"
        f"• 🥈 **Silver** : **{silver} crédits / mois**\n"
        f"• ⭐ **Gold** : **{gold} crédits / mois**\n"
        f"• 💎 **Platinum** : **{platinum} crédits / an**"
    )


def build_prompt(user_message, history):
    system_prompt = (
        "Tu es Karini, un assistant IA pédagogique et bienveillant pour la plateforme éducative "
        "Karini (système éducatif tunisien de la 7ème Année de Base jusqu'au Baccalauréat)."
    )
    prompt = f"<|im_start|>system\n{system_prompt}<|im_end|>\n"
    if isinstance(history, list):
        for turn in history[-4:]:
            role = turn.get("sender", "user")
            text = turn.get("text", "")
            if role == "user":
                prompt += f"<|im_start|>user\n{text}<|im_end|>\n"
            elif role == "bot":
                prompt += f"<|im_start|>assistant\n{text}<|im_end|>\n"
    prompt += f"<|im_start|>user\n{user_message}<|im_end|>\n<|im_start|>assistant\n"
    return prompt


def create_app(load_model=True):
    app = Flask(__name__)
    app.config["MAX_MESSAGE_LENGTH"] = MAX_MESSAGE_LENGTH

    if load_model:
        runtime.load()

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-API-Key"
        return response

    @app.route("/health")
    def health():
        return jsonify({
            "status": "ready",
            "device": runtime.device,
            "has_adapter": os.path.exists(ADAPTER_DIR),
        })

    @app.route("/chat", methods=["POST", "OPTIONS"])
    def chat():
        if API_KEY and request.headers.get("X-API-Key") != API_KEY:
            return jsonify({"error": "Unauthorized"}), 401
        if request.method == "OPTIONS":
            return "", 200

        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return jsonify({"error": "Request body must be JSON"}), 400

        message = body.get("message")
        if not isinstance(message, str) or not message.strip():
            return jsonify({"error": "Empty message"}), 400
        if len(message) > app.config["MAX_MESSAGE_LENGTH"]:
            return jsonify({"error": "Message is too long"}), 413

        live_plans = fetch_live_plans()
        direct_answer = get_direct_price_answer(message, live_plans)
        if direct_answer:
            return jsonify({"reply": direct_answer})

        try:
            reply = runtime.generate(build_prompt(message, body.get("history", [])))
        except Exception:
            return jsonify({"error": "AI model is temporarily unavailable"}), 500
        return jsonify({"reply": reply})

    return app


app = create_app(load_model=False)


if __name__ == "__main__":
    print(f"--> Initializing Karini Enhanced AI Server on port {PORT}...")
    app = create_app(load_model=True)
    print(f"--> Karini AI Server ready at http://localhost:{PORT}!")
    app.run(host="0.0.0.0", port=PORT)
