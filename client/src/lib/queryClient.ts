import { QueryClient, QueryFunction } from "@tanstack/react-query";

const TOKEN_KEY = "auth_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = getToken();
  const headers: HeadersInit = data
    ? { "Content-Type": "application/json" }
    : {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getToken();
    const headers: HeadersInit = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
      gcTime: 5 * 60 * 1000,
    },
  },
});

export const queryKeys = {
  restaurants: {
    all: ["/api/restaurants"] as const,
    bySlug: (slug: string) => ["/api/restaurants", slug] as const,
  },
  menuItems: {
    byRestaurant: (restaurantId: number) =>
      ["/api/restaurants", restaurantId, "menu"] as const,
  },
} as const;

// Export token management functions for use in auth hook
export { getToken, TOKEN_KEY };
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}
