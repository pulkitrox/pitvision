"""Backend tests for PitVision AI /api/predict endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://pitvision-ai.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Health endpoint ---
class TestHealth:
    def test_health_ok(self, session):
        r = session.get(f"{BASE_URL}/api/predict/health", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["model"] == "StackingClassifier"
        assert data["n_features"] == 30
        assert isinstance(data["drivers"], list) and len(data["drivers"]) == 25
        assert isinstance(data["races"], list) and len(data["races"]) == 27
        assert isinstance(data["compounds"], list) and len(data["compounds"]) == 5


# --- Predict endpoint ---
class TestPredict:
    VALID_PAYLOAD = {
        "driver": "VER", "race": "Italian Grand Prix", "compound": "MEDIUM",
        "lapNumber": 22, "position": 6, "stint": 1, "tyreLife": 18,
        "lapTime": 89.341, "lapDelta": 0.412, "cumDeg": 2.85,
        "raceProgress": 42, "posChange": -1,
    }

    def test_valid_prediction_stay_out(self, session):
        r = session.post(f"{BASE_URL}/api/predict", json=self.VALID_PAYLOAD, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["prediction"] in ("Pit Next Lap", "Stay Out")
        assert isinstance(data["probability"], (int, float))
        assert 0.0 <= data["probability"] <= 1.0
        assert isinstance(data["confidence"], (int, float))
        assert 0.0 <= data["confidence"] <= 100.0
        # Clean early lap should be Stay Out, ~0.08
        assert data["prediction"] == "Stay Out"
        assert data["probability"] < 0.5

    def test_unknown_driver_fallback(self, session):
        payload = {**self.VALID_PAYLOAD, "driver": "ANT"}
        r = session.post(f"{BASE_URL}/api/predict", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["prediction"] in ("Pit Next Lap", "Stay Out")
        assert 0.0 <= data["probability"] <= 1.0

    def test_race_alias_resolution(self, session):
        payload = {**self.VALID_PAYLOAD, "race": "Italian GP (Monza)"}
        r = session.post(f"{BASE_URL}/api/predict", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["prediction"] in ("Pit Next Lap", "Stay Out")
        assert 0.0 <= data["probability"] <= 1.0

    def test_invalid_payload_returns_422(self, session):
        bad = {"driver": "VER"}  # missing required fields
        r = session.post(f"{BASE_URL}/api/predict", json=bad, timeout=30)
        assert r.status_code in (400, 422)


# --- Static page regression ---
class TestStaticPages:
    @pytest.mark.parametrize("path", ["/", "/predictor.html", "/model.html", "/about.html"])
    def test_pages_load(self, session, path):
        r = session.get(f"{BASE_URL}{path}", timeout=30)
        assert r.status_code == 200
        assert len(r.text) > 100
