"""
Meta App Review — Permission Trigger Script (v25.0)
====================================================
Triggers API activity flags for 4 permissions required by Meta App Review:
  - pages_read_engagement  →  GET  /me/accounts
  - ads_read               →  GET  /act_51743032
  - business_management    →  GET  /me/businesses
  - ads_management         →  POST /act_51743032  (write action — REQUIRED for green light)

Token is read from server/.env (META_DEMO_TOKEN).
"""

import json
import os
import requests

# ──────────────────────────────────────────────
# Load ACCESS_TOKEN from server/.env
# ──────────────────────────────────────────────
def _load_env_token() -> str:
    env_path = os.path.join(os.path.dirname(__file__), "server", ".env")
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("META_DEMO_TOKEN="):
                    return line.split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    return ""

ACCESS_TOKEN  = _load_env_token()
AD_ACCOUNT_ID = "act_376514553157972"
API_VERSION   = "v25.0"
BASE_URL      = f"https://graph.facebook.com/{API_VERSION}"


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _print_result(method: str, url: str, label: str, response: requests.Response) -> dict:
    data   = response.json()
    status = response.status_code
    print(f"\n{'─' * 60}")
    print(f"[{label}]")
    print(f"  {method} {url}")
    if status == 200:
        print(f"  Status: 200 OK")
    else:
        print(f"  Status: {status} ✗ ERROR")
        error = data.get("error", {})
        print(f"  Error code    : {error.get('code')}")
        print(f"  Error type    : {error.get('type')}")
        print(f"  Error message : {error.get('message')}")
        print(f"  FB trace id   : {error.get('fbtrace_id')}")
        return data

    pretty = json.dumps(data, indent=2)
    lines  = pretty.splitlines()
    if len(lines) > 30:
        print("  Response (truncated to 30 lines):")
        print("\n".join("  " + l for l in lines[:30]))
        print(f"  ... ({len(lines) - 30} more lines)")
    else:
        print("  Response:")
        print("\n".join("  " + l for l in lines))
    return data


def make_get(endpoint: str, params: dict, label: str) -> dict:
    url = f"{BASE_URL}{endpoint}"
    params["access_token"] = ACCESS_TOKEN
    response = requests.get(url, params=params)
    return _print_result("GET", url, label, response)


def make_post(endpoint: str, data: dict, label: str) -> dict:
    url = f"{BASE_URL}{endpoint}"
    data["access_token"] = ACCESS_TOKEN
    response = requests.post(url, data=data)
    return _print_result("POST", url, label, response)


# ──────────────────────────────────────────────
# Permission tests
# ──────────────────────────────────────────────

def test_pages_read_engagement() -> dict:
    """pages_read_engagement — GET /me/accounts"""
    return make_get(
        endpoint="/me/accounts",
        params={"fields": "id,name,engagement,fan_count,category"},
        label="pages_read_engagement  →  GET /me/accounts",
    )


def test_ads_read() -> dict:
    """ads_read — GET /act_51743032"""
    return make_get(
        endpoint=f"/{AD_ACCOUNT_ID}",
        params={"fields": "id,name,account_status,currency,spend_cap"},
        label=f"ads_read  →  GET /{AD_ACCOUNT_ID}",
    )


def test_business_management() -> dict:
    """business_management — GET /me/businesses"""
    return make_get(
        endpoint="/me/businesses",
        params={"fields": "id,name,verification_status"},
        label="business_management  →  GET /me/businesses",
    )


def test_ads_management() -> dict:
    """
    ads_management — POST /act_51743032
    Updates the ad account name. A write POST is mandatory to trigger
    the ads_management green light in Meta App Review.
    """
    return make_post(
        endpoint=f"/{AD_ACCOUNT_ID}",
        data={"name": "AI Ad Manager Test"},
        label=f"ads_management  →  POST /{AD_ACCOUNT_ID} (update name)",
    )


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

def main():
    if not ACCESS_TOKEN:
        print("ERROR: META_DEMO_TOKEN not found in server/.env")
        return

    print("=" * 60)
    print(f"Meta App Review — Permission Trigger Script ({API_VERSION})")
    print("=" * 60)
    print(f"Ad Account : {AD_ACCOUNT_ID}")
    print(f"Token      : {ACCESS_TOKEN[:12]}...{ACCESS_TOKEN[-6:]}")
    print()

    # 1. pages_read_engagement
    test_pages_read_engagement()

    # 2. ads_read
    test_ads_read()

    # 3. business_management
    test_business_management()

    # 4. ads_management — POST (write action)
    test_ads_management()

    print("\n" + "=" * 60)
    print("All 4 permission calls completed.")
    print("Wait 5–10 minutes, then check your Meta App Review dashboard.")
    print("=" * 60)


if __name__ == "__main__":
    main()
