export function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 15_000): Promise<Response> {
 const timeout = AbortSignal.timeout(timeoutMs);
 const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
 return fetch(input, { ...init, signal });
}
