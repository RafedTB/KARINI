import os
import json
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

PORT = 5000
BASE_MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
ADAPTER_DIR = os.path.join(os.path.dirname(__file__), "final-karini-model")
BACKEND_PRICES_URL = os.environ.get("KARINI_API_URL", "http://localhost:3000/api/memberships/prices")

print(f"--> Initializing Karini Enhanced AI Server on port {PORT}...")

device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if torch.cuda.is_available() else torch.float32

# Load tokenizer and model
print(f"--> Loading tokenizer and model ({BASE_MODEL_ID}) on {device}...")
tokenizer = AutoTokenizer.from_pretrained(
    ADAPTER_DIR if os.path.exists(ADAPTER_DIR) else BASE_MODEL_ID
)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_ID,
    dtype=dtype,
    device_map="auto" if device == "cuda" else None,
    low_cpu_mem_usage=True,
)

if os.path.exists(ADAPTER_DIR):
    print("--> Found fine-tuned Karini model! Loading enhanced adapter...")
    model = PeftModel.from_pretrained(base_model, ADAPTER_DIR)
else:
    print("--> Running base model with Karini knowledge.")
    model = base_model

model.eval()
print(f"--> Karini AI Server ready at http://localhost:{PORT}!")

def fetch_live_plans():
    """Fetches real-time membership pricing from NestJS / PostgreSQL backend."""
    try:
        req = urllib.request.Request(
            BACKEND_PRICES_URL,
            headers={"User-Agent": "Karini-AI/1.0", "Accept": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if isinstance(data, list) and len(data) > 0:
                plans = {}
                for p in data:
                    name = str(p.get("membership", "")).lower()
                    plans[name] = {
                        "credits": p.get("priceCredits", 0),
                        "duration": p.get("duration", "monthly"),
                    }
                return plans
    except Exception:
        pass

    # Default official database schema
    return {
        "default": {"credits": 0, "duration": "monthly"},
        "standard": {"credits": 0, "duration": "monthly"},
        "silver": {"credits": 100, "duration": "monthly"},
        "gold": {"credits": 250, "duration": "monthly"},
        "platinum": {"credits": 500, "duration": "yearly"},
    }

def get_direct_price_answer(user_msg: str, plans: dict) -> str | None:
    """Answers specific price queries with 100% precision from the database."""
    msg = user_msg.lower().strip()

    is_price_query = any(k in msg for k in [
        "prix", "tarif", "combien", "cout", "coût", "bkaddeh", "chounia",
        "forfait", "abonnement", "membership"
    ])

    if not is_price_query:
        return None

    silver_cr = plans.get("silver", {}).get("credits", 100)
    gold_cr = plans.get("gold", {}).get("credits", 250)
    plat_cr = plans.get("platinum", {}).get("credits", 500)

    # Specific queries for Gold
    if "gold" in msg and not ("silver" in msg or "platinum" in msg or "tous" in msg or "les" in msg):
        return (
            f"⭐ **Formule Gold : {gold_cr} crédits / mois** (validité 30 jours).\n\n"
            f"Ce forfait comprend l'accès complet à tous les cours vidéo, exercices avec corrigés, "
            f"téléchargement illimité des magazines PDF, ainsi que l'exclusivité totale des **Archives Live (replays des cours en direct)**."
        )

    # Specific queries for Platinum
    if "platinum" in msg and not ("silver" in msg or "gold" in msg or "tous" in msg):
        return (
            f"💎 **Formule Platinum : {plat_cr} crédits / an**.\n\n"
            f"Il s'agit d'une souscription annuelle scolaire valable jusqu'au **15 juin** (fin des épreuves du Baccalauréat). "
            f"Elle inclut l'accès direct en temps réel à toutes les **Sessions Live avec les enseignants** (micro ouvert et chat), "
            f"tous les cours vidéo, exercices, magazines PDF et certificats officiels."
        )

    # Specific queries for Silver
    if "silver" in msg and not ("gold" in msg or "platinum" in msg or "tous" in msg):
        return (
            f"🥈 **Formule Silver : {silver_cr} crédits / mois** (validité 30 jours).\n\n"
            f"Elle comprend l'accès complet aux cours vidéo structurés, séries d'exercices d'entraînement avec corrigés détaillés, "
            f"et téléchargement des magazines PDF."
        )

    # Specific queries for Standard
    if any(k in msg for k in ["standard", "gratuit", "free"]):
        return (
            "📚 **Formule Standard : 0 crédit (Gratuit)**.\n\n"
            "Cette formule est activée automatiquement dès votre inscription. "
            "Elle vous donne un accès de base aux cours ouverts, exercices d'entraînement simples, "
            "magazines publics et suivi de progression personnel."
        )

    # General all-prices query
    return (
        "Voici les tarifs officiels des formules d'abonnement sur Karini :\n\n"
        f"• 📚 **Standard** : **0 crédit** (Gratuit, inclus d'office dès l'inscription)\n"
        f"• 🥈 **Silver** : **{silver_cr} crédits / mois** (Cours vidéo, exercices & corrigés, magazines PDF)\n"
        f"• ⭐ **Gold** : **{gold_cr} crédits / mois** (Tout Silver + Archives Live / Replays illimités)\n"
        f"• 💎 **Platinum** : **{plat_cr} crédits / an** (Souscription annuelle jusqu'au 15 juin avec Sessions Live directes avec les professeurs)\n\n"
        "Vous pouvez activer ou renouveler votre formule directement depuis la page **Membership** avec votre solde de crédits."
    )

class KariniAIHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            status = {
                "status": "ready",
                "device": device,
                "has_adapter": os.path.exists(ADAPTER_DIR),
            }
            self.wfile.write(json.dumps(status).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/chat":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)

            try:
                body = json.loads(post_data.decode("utf-8"))
                user_message = body.get("message", "").strip()
                history = body.get("history", [])

                if not user_message:
                    self.send_response(400)
                    self._send_cors_headers()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Empty message"}).encode("utf-8"))
                    return

                # Fetch real-time database prices
                live_plans = fetch_live_plans()

                # Fast direct response for specific price queries
                direct_answer = get_direct_price_answer(user_message, live_plans)
                if direct_answer:
                    self.send_response(200)
                    self._send_cors_headers()
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.end_headers()
                    payload = json.dumps({"reply": direct_answer}, ensure_ascii=False)
                    self.wfile.write(payload.encode("utf-8"))
                    return

                # Otherwise generate with LLM using full context + conversation history
                gold_cr = live_plans.get("gold", {}).get("credits", 250)
                plat_cr = live_plans.get("platinum", {}).get("credits", 500)
                silver_cr = live_plans.get("silver", {}).get("credits", 100)

                system_prompt = (
                    "Tu es Karini, un assistant IA pédagogique et bienveillant pour la plateforme éducative Karini "
                    "(système éducatif tunisien de la 7ème Année de Base jusqu'au Baccalauréat).\n\n"
                    "Faits certifiés de la plateforme :\n"
                    f"- Formule Standard : Gratuite (0 crédit)\n"
                    f"- Formule Silver : {silver_cr} crédits / mois (cours vidéo, exercices avec corrigés, magazines)\n"
                    f"- Formule Gold : {gold_cr} crédits / mois (replays & Archives Live)\n"
                    f"- Formule Platinum : {plat_cr} crédits / an (valable jusqu'au 15 juin pour le Bac, avec direct Live)\n"
                    "- Inscription : mineurs (-18 ans) nécessitent email parent (compte parent créé automatiquement). "
                    "Majeurs (+18 ans) nécessitent leur CIN.\n"
                    "- Filières : 2ème Info, 2ème Sciences, 2ème Éco, 2ème Lettres, Bac Info (Python, BD SQL), "
                    "Bac Math, Bac Sciences, Bac Technique, Bac Éco & Gestion.\n"
                    "- Outils : Video Studio (playlist à gauche + lecteur vidéo à droite), Exercices avec corrigés, "
                    "Magazines PDF téléchargeables, Quizzes avec meilleur score conservé, Devoirs à remettre en ligne.\n\n"
                    "Réponds avec clarté, concision et structure dans la langue de l'élève (Français, Arabe ou Derja)."
                )

                # Construct prompt with optional conversation history (last 3 turns)
                prompt = f"<|im_start|>system\n{system_prompt}<|im_end|>\n"

                if isinstance(history, list) and len(history) > 0:
                    for turn in history[-4:]:
                        role = turn.get("sender", "user")
                        text = turn.get("text", "")
                        if role == "user":
                            prompt += f"<|im_start|>user\n{text}<|im_end|>\n"
                        elif role == "bot":
                            prompt += f"<|im_start|>assistant\n{text}<|im_end|>\n"

                prompt += f"<|im_start|>user\n{user_message}<|im_end|>\n<|im_start|>assistant\n"

                inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

                with torch.no_grad():
                    outputs = model.generate(
                        **inputs,
                        max_new_tokens=300,
                        temperature=0.5,
                        top_p=0.85,
                        repetition_penalty=1.15,
                        do_sample=True,
                        pad_token_id=tokenizer.eos_token_id,
                    )

                response = tokenizer.decode(
                    outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True
                ).strip()

                self.send_response(200)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                payload = json.dumps({"reply": response}, ensure_ascii=False)
                self.wfile.write(payload.encode("utf-8"))

            except Exception as e:
                self.send_response(500)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def run():
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, KariniAIHandler)
    print(f"🚀 Karini Enhanced AI API listening on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run()
