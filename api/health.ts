type HealthResponse = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body: string) => void;
};

/** Lightweight liveness check. Game state lives on the socket function, not here. */
export default function handler(_req: unknown, res: HealthResponse) {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
}
