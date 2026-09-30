// Carga de /search: N peticiones con C en paralelo; imprime p50/p95/p99.
//   ETG_URL=… ETG_USER=… ETG_PASSWORD=… node tests/etg/load.mjs [total=2000] [concurrency=20]
const URL = (process.env.ETG_URL ?? 'http://localhost:3100/etg-api') + '/search';
const AUTH = 'Basic ' + Buffer.from(`${process.env.ETG_USER}:${process.env.ETG_PASSWORD}`).toString('base64');
const TOTAL = Number(process.argv[2] ?? 2000);
const CONC = Number(process.argv[3] ?? 20);

// Rutas variadas (las 4 combinaciones) para no medir siempre la misma.
const points = [
  { type: 'iata', iata: 'PUJ' },
  { type: 'iata', iata: 'SDQ' },
  { type: 'coordinates', coordinates: { lat: 18.6892, lon: -68.4486 }, address: 'Bávaro hotel' },
  { type: 'coordinates', coordinates: { lat: 19.3117, lon: -69.5428 }, address: 'Las Terrenas hotel' },
];
const body = (i) =>
  JSON.stringify({
    passengers: 1 + (i % 6),
    children_seat_0: 0,
    children_seat_1: i % 3 === 0 ? 1 : 0,
    children_seat_2: 0,
    children_seat_3: 0,
    start_date_time: new Date(Date.now() + (2 + (i % 300)) * 86400_000).toISOString().slice(0, 19) + 'Z',
    start_point: points[i % 4],
    end_point: points[(i + 1 + (i % 3)) % 4],
  });

const times = [];
let errors = 0;
let next = 0;
const started = Date.now();
async function worker() {
  while (next < TOTAL) {
    const i = next++;
    const t = performance.now();
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: AUTH }, body: body(i) });
      await r.text();
      if (r.status !== 200) errors++;
    } catch {
      errors++;
    }
    times.push(performance.now() - t);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
times.sort((a, b) => a - b);
const pct = (p) => times[Math.min(times.length - 1, Math.floor((p / 100) * times.length))].toFixed(1);
const secs = (Date.now() - started) / 1000;
console.log(`peticiones ${TOTAL}, concurrencia ${CONC}, errores ${errors}`);
console.log(`${(TOTAL / secs).toFixed(0)} req/s · p50 ${pct(50)} ms · p95 ${pct(95)} ms · p99 ${pct(99)} ms · máx ${times.at(-1).toFixed(1)} ms`);
