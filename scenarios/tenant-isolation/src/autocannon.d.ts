declare module 'autocannon' {
  const autocannon: (opts: Record<string, unknown>) => Promise<{
    requests: { average: number }; latency: { p50: number; p99: number }; non2xx: number; errors: number;
  }>;
  export default autocannon;
}
