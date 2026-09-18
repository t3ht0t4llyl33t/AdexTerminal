# aDEX Terminal — Production Load Testing Suite

This directory contains structural automation test scripts for validating the aDEX Terminal under highload conditions.

## Test Frameworks

### k6 — `stress-test-multi-chain-v1.js`

Simulates 1,000 concurrent user sessions hitting the Radar, Whales, and Scanner API endpoints. Validates that system response latency remains under 50ms at the 95th percentile.

```bash
# Install k6
brew install k6  # macOS
# or: https://k6.io/docs/getting-started/installation/

# Run the stress test
k6 run tests/stress-test-multi-chain-v1.js

# Run against a deployed instance
BASE_URL=https://your-adex-terminal.com k6 run tests/stress-test-multi-chain-v1.js
```

**Thresholds enforced:**
- p(95) latency < 50ms
- p(99) latency < 100ms
- Error rate < 1%

### Artillery — `artillery-stress-test.yml`

Models highload parameters simulating 1,000 concurrent users across 5 phases (warmup, ramp, peak, sustained, cooldown).

```bash
# Install Artillery
npm install -g artillery

# Run the stress test
artillery run tests/artillery-stress-test.yml

# Generate HTML report
artillery run tests/artillery-stress-test.yml --output tests/report.json
artillery report tests/report.json
```

## Rate Limiting

Both test suites respect the Edge Middleware rate limiter (5 requests/second per IP). Tests accept both HTTP 200 and HTTP 429 responses as valid — the 429 validates that the DDoS shield is functioning correctly under load.

## Endpoints Tested

| Endpoint | Description |
|---|---|
| `GET /api/radar` | Token volume spike radar data |
| `GET /api/whales` | Whale movement tracking data |
| `GET /api/scanner` | Security vault scan results |
