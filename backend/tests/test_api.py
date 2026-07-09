"""API smoke tests for FrameForge backend."""
import sys
from pathlib import Path

# Ensure backend root is on the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health_returns_200():
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["version"] == "2.0.0"
    assert "services" in data
    assert "metadata" in data


def test_health_reports_environment():
    r = client.get("/api/health")
    data = r.json()
    assert data["environment"] == "development"


def test_history_returns_list():
    r = client.get("/api/history")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_invalid_generation_id_rejected():
    r = client.get("/api/generate/invalid-id/download")
    assert r.status_code == 500
    assert r.json()["error_code"] == "GENERATION_ERROR"


def test_invalid_figma_url_rejected():
    r = client.post("/api/figma/inspect", json={"figma_url": "not-a-url"})
    assert r.status_code == 422


def test_export_invalid_uuid_rejected():
    r = client.get("/api/export/not-a-uuid/zip")
    assert r.status_code == 500
    assert "error_code" in r.json()


def test_health_exempt_from_rate_limit():
    for _ in range(35):  # Over the default 30/min limit
        r = client.get("/api/health")
        assert r.status_code == 200


def test_error_response_format():
    """Error responses include error_code for programmatic handling."""
    r = client.get("/api/generate/bad-id/download")
    data = r.json()
    assert "error" in data
    assert "error_code" in data
    assert "type" in data
