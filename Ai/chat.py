import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

base_model_id = "Qwen/Qwen2.5-0.5B-Instruct"
adapter_dir = "./final-karini-model"

print("--> Loading base model and Karini adapter...")
tokenizer = AutoTokenizer.from_pretrained(adapter_dir)
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_id,
    dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    device_map="auto",
)
model = PeftModel.from_pretrained(base_model, adapter_dir)
model.eval()

print("\n🤖 Karini AI is ready! Type 'exit' to quit.\n" + "=" * 50)

while True:
    user_input = input("\nYou: ").strip()
    if not user_input or user_input.lower() in ["exit", "quit", "q"]:
        break

    prompt = (
        f"<|im_start|>system\nYou are Karini, a friendly AI assistant for the Karini e-learning platform. "
        f"Answer concisely and helpfully.<|im_end|>\n"
        f"<|im_start|>user\n{user_input}<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=256,
            temperature=0.7,
            top_p=0.9,
            repetition_penalty=1.1,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    response = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True).strip()
    print(f"\nKarini: {response}")
