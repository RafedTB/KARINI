import pytest


@pytest.fixture()
def app(monkeypatch):
    import server

    monkeypatch.setattr(server, "API_KEY", "")
    monkeypatch.setattr(server, "fetch_live_plans", lambda: {
        "silver": {"credits": 100},
        "gold": {"credits": 250},
        "platinum": {"credits": 500},
    })
    application = server.create_app(load_model=False)
    application.config["TESTING"] = True
    application.config["MAX_MESSAGE_LENGTH"] = 4000
    return application


@pytest.fixture()
def client(app):
    return app.test_client()


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ready"


def test_valid_chat_request(client, monkeypatch):
    import server

    monkeypatch.setattr(server.runtime, "generate", lambda prompt: "Bonjour, comment puis-je aider?")
    response = client.post("/chat", json={"message": "Hello"})
    assert response.status_code == 200
    assert response.get_json()["reply"] == "Bonjour, comment puis-je aider?"


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"message": ""},
        {"message": "   "},
        {"history": []},
        None,
    ],
)
def test_empty_or_missing_message(client, payload):
    response = client.post("/chat", json=payload)
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_very_long_message(client):
    response = client.post("/chat", json={"message": "x" * 4001})
    assert response.status_code == 413
    assert response.get_json()["error"] == "Message is too long"


def test_model_failure_returns_clean_error(client, monkeypatch):
    import server

    def fail(_prompt):
        raise RuntimeError("sensitive model internals")

    monkeypatch.setattr(server.runtime, "generate", fail)
    response = client.post("/chat", json={"message": "Explain fractions"})
    assert response.status_code == 500
    body = response.get_json()
    assert body == {"error": "AI model is temporarily unavailable"}
    assert "Traceback" not in str(body)
    assert "sensitive" not in str(body)


def test_api_key_is_required_when_configured(client, monkeypatch):
    import server

    monkeypatch.setattr(server, "API_KEY", "test-secret")
    application = server.create_app(load_model=False)
    test_client = application.test_client()

    response = test_client.post("/chat", json={"message": "Hello"})
    assert response.status_code == 401

    response = test_client.post(
        "/chat",
        json={"message": "Hello"},
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code in (200, 500)
