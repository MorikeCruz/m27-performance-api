import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:3000/api';

export const options = {
  stages: [
    { duration: '10s', target: 2 },
    { duration: '20s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export function setup() {
  const login = http.post(
    `${BASE_URL}/login`,
    JSON.stringify({
      username: 'admin',
      password: 'admin',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const loginOk = check(login, {
    'login retorna HTTP 201': (r) => r.status === 201,
    'login retorna token': (r) => {
      try {
        return Boolean(JSON.parse(r.body).accessToken);
      } catch (_) {
        return false;
      }
    },
  });

  if (!loginOk) {
    throw new Error(`Falha no login. HTTP ${login.status}`);
  }

  return { token: JSON.parse(login.body).accessToken };
}

export default function (data) {
  const headers = {
    headers: {
      Authorization: `Bearer ${data.token}`,
    },
  };

  const produtos = http.get(`${BASE_URL}/products`, headers);

  check(produtos, {
    'GET produtos retorna HTTP 200': (r) => r.status === 200,
  });

  const clientes = http.get(`${BASE_URL}/customers`, headers);

  check(clientes, {
    'GET clientes retorna HTTP 200': (r) => r.status === 200,
  });

  sleep(1);
}
