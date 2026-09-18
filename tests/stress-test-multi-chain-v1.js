import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const latencyTrend = new Trend('adex_latency_ms', true);
const errorCounter = new Counter('adex_errors');

export const options = {
  scenarios: {
    multi_chain_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 },
        { duration: '20s', target: 500 },
        { duration: '30s', target: 1000 },
        { duration: '20s', target: 1000 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<50', 'p(99)<100'],
    http_req_failed: ['rate<0.01'],
    adex_latency_ms: ['p(50)<30', 'p(95)<50'],
  },
};

export default function () {
  group('Radar endpoint', () => {
    const res = http.get(`${BASE_URL}/api/radar`, {
      headers: { 'X-Telegram-User-ID': `user_${__VU}_${__ITER}` },
    });

    const passed = check(res, {
      'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
      'response has data array': (r) => {
        if (r.status !== 200) return true;
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });

    if (res.status === 200) {
      latencyTrend.add(res.timings.duration);
    }

    if (!passed) {
      errorCounter.add(1);
    }
  });

  sleep(0.1);

  group('Whales endpoint', () => {
    const res = http.get(`${BASE_URL}/api/whales`, {
      headers: { 'X-Telegram-User-ID': `user_${__VU}_${__ITER}` },
    });

    check(res, {
      'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    });

    if (res.status === 200) {
      latencyTrend.add(res.timings.duration);
    }
  });

  sleep(0.1);

  group('Scanner endpoint', () => {
    const res = http.get(`${BASE_URL}/api/scanner`, {
      headers: { 'X-Telegram-User-ID': `user_${__VU}_${__ITER}` },
    });

    check(res, {
      'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    });

    if (res.status === 200) {
      latencyTrend.add(res.timings.duration);
    }
  });

  sleep(0.2);
}

export function handleSummary(data) {
  return {
    'tests/results-summary.json': JSON.stringify(data, null, 2),
    stdout: JSON.stringify({
      checks: data.metrics.checks,
      http_req_duration: data.metrics.http_req_duration,
      http_req_failed: data.metrics.http_req_failed,
      adex_latency_ms: data.metrics.adex_latency_ms,
      vus: data.metrics.vus,
    }, null, 2),
  };
}
