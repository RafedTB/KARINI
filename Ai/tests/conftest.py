import sys
import types


try:
    import torch  # noqa: F401
except ImportError:
    torch = types.ModuleType("torch")
    torch.float16 = "float16"
    torch.float32 = "float32"
    torch.cuda = types.SimpleNamespace(
        is_available=lambda: False,
    )
    torch.no_grad = lambda: _null_context()
    sys.modules["torch"] = torch

try:
    import transformers  # noqa: F401
except ImportError:
    transformers = types.ModuleType("transformers")
    transformers.AutoTokenizer = type("AutoTokenizer", (), {})
    transformers.AutoModelForCausalLM = type("AutoModelForCausalLM", (), {})
    sys.modules["transformers"] = transformers

try:
    import peft  # noqa: F401
except ImportError:
    peft = types.ModuleType("peft")
    peft.PeftModel = type("PeftModel", (), {})
    sys.modules["peft"] = peft


class _null_context:
    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc_value, traceback):
        return False
