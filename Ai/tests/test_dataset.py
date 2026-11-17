import json
from pathlib import Path


DATASET = Path(__file__).parents[1] / "dataset.jsonl"


def test_dataset_lines_are_valid_and_complete():
    duplicates = []
    seen = set()

    with DATASET.open("r", encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            assert line.strip(), f"Line {line_number} is empty"
            record = json.loads(line)
            assert set(record) == {"messages"}, f"Line {line_number}: unexpected fields"

            messages = record["messages"]
            assert isinstance(messages, list) and messages, (
                f"Line {line_number}: messages must be a non-empty list"
            )

            normalized = []
            for message_index, message in enumerate(messages):
                assert isinstance(message, dict), (
                    f"Line {line_number}, message {message_index}: expected object"
                )
                assert set(message) == {"role", "content"}, (
                    f"Line {line_number}, message {message_index}: expected role and content"
                )
                assert message["role"] in {"system", "user", "assistant"}, (
                    f"Line {line_number}: unknown role"
                )
                assert isinstance(message["content"], str)
                assert message["content"].strip(), (
                    f"Line {line_number}: empty message content"
                )
                normalized.append((message["role"], message["content"].strip()))

            signature = tuple(normalized)
            if signature in seen:
                duplicates.append(line_number)
            seen.add(signature)

    if duplicates:
        print(f"Duplicate dataset records found on lines: {duplicates}")
    assert not duplicates, f"Duplicate dataset records found on lines: {duplicates}"
