const MOCK_LATENCY_MS = 240;

export async function mockDelay<T>(value: T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return value;
}
