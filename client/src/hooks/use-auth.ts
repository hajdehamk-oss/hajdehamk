import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { setToken, removeToken, getToken } from "@/lib/queryClient";

export type LoginInput = {
  username: string;
  password: string;
};

const ME_KEY = "/api/auth?action=me";

export function useUser() {
  return useQuery({
    queryKey: [ME_KEY],
    queryFn: async () => {
      const token = getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(ME_KEY, {
        headers,
        credentials: "include",
      });

      if (res.status === 401 || !res.ok) {
        removeToken();
        return null;
      }

      const data = await res.json();
      return data.user ?? data;
    },
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const res = await fetch("/api/auth?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Login failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      const user = data.user ?? data;
      if (data.token) {
        setToken(data.token);
      }
      queryClient.setQueryData([ME_KEY], user);
      setLocation("/admin/dashboard");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async () => {
      await fetch("/api/auth?action=logout", {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      removeToken();
      queryClient.setQueryData([ME_KEY], null);
      setLocation("/");
    },
  });
}
