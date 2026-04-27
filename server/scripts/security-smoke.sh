#!/usr/bin/env bash
# Quick smoke test for the security hardening:
#   1. Cookie session works end-to-end
#   2. HttpOnly flag is set on the cookie
#   3. Dev routes are gated (requires a prod-mode probe — separate)
#   4. Rate limit middleware is wired up
#
# Run against a local server:  node src/index.js, then ./scripts/security-smoke.sh
# Set HOST=https://your-prod.vercel.app to test prod.

set -u
HOST="${HOST:-http://localhost:3001}"
COOKIE=$(mktemp)
trap 'rm -f "$COOKIE"' EXIT

pass() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; FAILED=$((FAILED+1)); }
hdr()  { printf "\n\033[1m%s\033[0m\n" "$1"; }
FAILED=0

# ── 1. Pre-login session check returns 401 ────────────────────────────────
hdr "1. /api/auth/session without cookie → 401"
code=$(curl -s -o /dev/null -w "%{http_code}" "$HOST/api/auth/session")
[ "$code" = "401" ] && pass "got 401" || fail "expected 401, got $code"

# ── 2. demo-session establishes cookie + returns user ──────────────────────
hdr "2. POST /api/auth/demo-session sets HttpOnly cookie"
body=$(curl -s -X POST -c "$COOKIE" "$HOST/api/auth/demo-session")
echo "$body" | grep -q '"authenticated":true' && pass "authenticated:true" || fail "no authenticated:true in response"
grep -q '#HttpOnly' "$COOKIE" && pass "HttpOnly flag present" || fail "cookie not HttpOnly"
grep -q 'aam_session' "$COOKIE" && pass "aam_session cookie set" || fail "aam_session missing"

# ── 3. Cookie-only request to a protected route works ─────────────────────
hdr "3. Cookie-only auth on /api/meta/businesses"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE" "$HOST/api/meta/businesses")
[ "$code" = "200" ] && pass "200 with cookie" || fail "expected 200, got $code"

# ── 4. Rate-limit headers are emitted ─────────────────────────────────────
hdr "4. Rate-limit headers"
hdrs=$(curl -s -D - -o /dev/null -b "$COOKIE" "$HOST/api/meta/businesses")
echo "$hdrs" | grep -qi 'x-ratelimit-limit'      && pass "X-RateLimit-Limit"      || fail "missing X-RateLimit-Limit"
echo "$hdrs" | grep -qi 'x-ratelimit-remaining'  && pass "X-RateLimit-Remaining"  || fail "missing X-RateLimit-Remaining"
echo "$hdrs" | grep -qi 'x-ratelimit-reset'      && pass "X-RateLimit-Reset"      || fail "missing X-RateLimit-Reset"

# ── 5a. Token refresh (silent path) ──────────────────────────────────────
hdr "5a. POST /api/auth/refresh extends FB token"
refresh_body=$(curl -s -X POST -b "$COOKIE" "$HOST/api/auth/refresh")
echo "$refresh_body" | grep -q '"ok":true'         && pass "ok:true"                  || fail "refresh did not return ok"
echo "$refresh_body" | grep -q 'fbTokenExpiresAt'  && pass "fbTokenExpiresAt present" || fail "no fbTokenExpiresAt"

# ── 5b. /session reports needsReauth + fbTokenExpiresAt fields ───────────
hdr "5b. /api/auth/session reports needsReauth"
sbody=$(curl -s -b "$COOKIE" "$HOST/api/auth/session")
echo "$sbody" | grep -q 'needsReauth'        && pass "needsReauth field present"      || fail "no needsReauth"
echo "$sbody" | grep -q 'fbTokenExpiresAt'   && pass "fbTokenExpiresAt field present" || fail "no fbTokenExpiresAt"

# ── 6. Logout clears cookie and invalidates session ──────────────────────
hdr "6. Logout invalidates the session"
curl -s -X POST -b "$COOKIE" "$HOST/api/auth/logout" > /dev/null
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE" "$HOST/api/auth/session")
[ "$code" = "401" ] && pass "post-logout session = 401" || fail "expected 401, got $code"

# ── 7. Auth rate limit (IP-keyed) ─────────────────────────────────────────
# Skipped unless FORCE_RL=1 — it would lock you out for the rest of the
# minute on real environments.
if [ "${FORCE_RL:-0}" = "1" ]; then
  hdr "7. /api/auth/demo-session burst → 429 after 10"
  blocked=0
  for i in $(seq 1 12); do
    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$HOST/api/auth/demo-session")
    [ "$code" = "429" ] && blocked=$((blocked+1))
  done
  [ "$blocked" -ge 1 ] && pass "$blocked of 12 blocked" || fail "no 429s — SQL not run? fail-open?"
else
  hdr "7. (skipped — set FORCE_RL=1 to run the burst test)"
fi

echo
if [ "$FAILED" = "0" ]; then
  printf "\033[32mAll checks passed.\033[0m\n"
else
  printf "\033[31m%d check(s) failed.\033[0m\n" "$FAILED"
  exit 1
fi
