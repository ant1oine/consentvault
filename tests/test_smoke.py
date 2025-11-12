"""Simple smoke test for ConsentVault Core."""
import requests

API_BASE = "http://localhost:8000"


def test_health():
    """Test health endpoint."""
    response = requests.get(f"{API_BASE}/healthz", timeout=5)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    print("✅ Health check passed")


def test_docs():
    """Test API docs endpoint."""
    response = requests.get(f"{API_BASE}/docs", timeout=5)
    assert response.status_code == 200
    print("✅ API docs accessible")


def test_auth_login_endpoint():
    """Test auth login endpoint exists (doesn't require valid credentials)."""
    response = requests.post(
        f"{API_BASE}/auth/login",
        json={"email": "test@example.com", "password": "wrong"},
        timeout=5
    )
    # Should return 401 (unauthorized), not 404 (not found)
    assert response.status_code in (401, 422)  # 422 for validation error
    print("✅ Auth login endpoint exists")


if __name__ == "__main__":
    print("Running smoke tests...")
    try:
        test_health()
        test_docs()
        test_auth_login_endpoint()
        print("\n✅ All smoke tests passed!")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Is 'make dev' running?")
    except AssertionError as e:
        print(f"❌ Test failed: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")





