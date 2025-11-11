import requests, json
import time
import sys

# Will be set dynamically after fetching orgs
API_KEY = None
ORG_ID = None
BASE_URL = "http://localhost:8000"
HEADERS = {"Content-Type": "application/json"}


def wait_for_api(max_retries=30, delay=1):
    """Wait for API to be ready."""
    for i in range(max_retries):
        try:
            response = requests.get(f"{BASE_URL}/healthz", timeout=2)
            if response.status_code == 200:
                return True
        except:
            pass
        time.sleep(delay)
    return False


def run_test(name, func):
    print(f"\n===== {name} =====")
    try:
        func()
    except requests.exceptions.RequestException as e:
        print(f"❌ {name} failed: {e}")
        if hasattr(e, "response") and e.response is not None:
            print(f"Response status: {e.response.status_code}")
            print(f"Response text: {e.response.text[:200]}")
    except Exception as e:
        print(f"❌ {name} failed: {e}")


def list_orgs():
    global API_KEY, ORG_ID, HEADERS
    res = requests.get(f"{BASE_URL}/v1/orgs")
    res.raise_for_status()
    orgs = res.json()
    print(json.dumps(orgs, indent=2))
    
    # Set API key and org_id from first org for subsequent tests
    if orgs and len(orgs) > 0:
        API_KEY = orgs[0].get("api_key")
        ORG_ID = orgs[0].get("id")
        HEADERS["X-API-Key"] = API_KEY
        if API_KEY:
            print(f"\n✅ Using API key: {API_KEY[:16]}... for org: {orgs[0].get('name')}")


def list_consents():
    res = requests.get(f"{BASE_URL}/v1/consents", headers=HEADERS)
    res.raise_for_status()
    print(json.dumps(res.json(), indent=2))


def create_consent():
    payload = {"subject_email": "user@wellnessuae.ae", "purpose": "Marketing", "status": "granted"}
    res = requests.post(f"{BASE_URL}/v1/consents", headers=HEADERS, json=payload)
    res.raise_for_status()
    print(json.dumps(res.json(), indent=2))


def create_dsar():
    payload = {"subject_email": "user@wellnessuae.ae", "request_type": "erase"}
    res = requests.post(f"{BASE_URL}/v1/data-rights", headers=HEADERS, json=payload)
    res.raise_for_status()
    print(json.dumps(res.json(), indent=2))


def list_dsars():
    res = requests.get(f"{BASE_URL}/v1/data-rights", headers=HEADERS)
    res.raise_for_status()
    print(json.dumps(res.json(), indent=2))


def list_audit():
    res = requests.get(f"{BASE_URL}/v1/audit", headers=HEADERS)
    res.raise_for_status()
    print(json.dumps(res.json(), indent=2))


def dashboard_summary():
    res = requests.get(f"{BASE_URL}/v1/dashboard/summary?org_id={ORG_ID}")
    res.raise_for_status()
    print(json.dumps(res.json(), indent=2))


if __name__ == "__main__":
    print("⏳ Waiting for API to be ready...")
    if not wait_for_api():
        print("❌ API did not become ready in time")
        sys.exit(1)
    print("✅ API is ready!")
    
    # First, get orgs to set API_KEY and ORG_ID
    run_test("🏢 Organization Info", list_orgs)
    
    if not API_KEY or not ORG_ID:
        print("❌ No organization with API key found. Cannot continue tests.")
        sys.exit(1)
    
    run_test("📜 List Consents", list_consents)
    run_test("➕ Create Consent", create_consent)
    run_test("⚖️ Create DSAR", create_dsar)
    run_test("📋 List DSARs", list_dsars)
    run_test("🕵️ Audit Logs", list_audit)
    run_test("📊 Dashboard Summary", dashboard_summary)
    print("\n===== ✅ Test Completed Successfully =====")
