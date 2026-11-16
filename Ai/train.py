import os
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
)
from peft import LoraConfig
from trl import SFTConfig, SFTTrainer

# 1. Device check
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"--> Using device: {device}")
if device == "cuda":
    print(f"--> GPU: {torch.cuda.get_device_name(0)}")
    free_vram = torch.cuda.mem_get_info()[0] / (1024**3)
    total_vram = torch.cuda.mem_get_info()[1] / (1024**3)
    print(f"--> Free VRAM: {free_vram:.2f} GB / {total_vram:.2f} GB")

# 2. Load dataset
dataset_path = os.path.join(os.path.dirname(__file__), "dataset.jsonl")
dataset = load_dataset("json", data_files=dataset_path, split="train")
print(f"--> Loaded {len(dataset)} training examples from dataset.jsonl")

# 3. Format chat using standard ChatML (<|im_start|> / <|im_end|>)
def format_chat(example):
    text = ""
    for msg in example["messages"]:
        role = msg["role"]
        content = msg["content"]
        text += f"<|im_start|>{role}\n{content}<|im_end|>\n"
    return {"text": text}

dataset = dataset.map(format_chat)

# 4. Use Qwen2.5-0.5B-Instruct base model
model_id = "Qwen/Qwen2.5-0.5B-Instruct"
print(f"--> Loading base model: {model_id}...")

tokenizer = AutoTokenizer.from_pretrained(model_id)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

# 5. Load model in float16
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    device_map="auto",
    low_cpu_mem_usage=True,
)

# 6. Enhanced LoRA configuration targeting all linear layers
peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=[
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
    ],
    task_type="CAUSAL_LM",
)

# 7. Enhanced Training Hyperparameters (compatible with TRL 1.18.0)
training_args = SFTConfig(
    output_dir="./training-results",
    dataset_text_field="text",
    max_length=512,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    num_train_epochs=5,
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_steps=10,
    weight_decay=0.01,
    fp16=torch.cuda.is_available(),
    logging_steps=5,
    save_strategy="no",
    report_to="none",
)

# 8. Trainer
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    peft_config=peft_config,
    args=training_args,
)

# 9. Train and save enhanced adapter
print("\n--> Starting enhanced training on Karini dataset (5 epochs)...")
trainer.train()

save_path = "./final-karini-model"
print(f"\n--> Saving enhanced model to {save_path}...")
trainer.model.save_pretrained(save_path)
tokenizer.save_pretrained(save_path)

print("\n🎉 Enhanced training complete! Model saved to ./final-karini-model")
