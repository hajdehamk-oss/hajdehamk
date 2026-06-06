import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertRestaurant } from "@shared/schema";
import { getToken } from "@/lib/queryClient";

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useMyRestaurants() {
  return useQuery({
    queryKey: [api.restaurants.list.path],
    queryFn: async () => {
      const res = await fetch(api.restaurants.list.path, {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch restaurants");
      return api.restaurants.list.responses[200].parse(await res.json());
    },
  });
}

export function useRestaurant(id: number) {
  return useQuery({
    queryKey: [api.restaurants.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.restaurants.get.path, { id });
      const res = await fetch(url, {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch restaurant");
      return api.restaurants.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useRestaurantBySlug(slug: string) {
  return useQuery({
    queryKey: [api.restaurants.getBySlug.path, slug],
    queryFn: async () => {
      const url = buildUrl(api.restaurants.getBySlug.path, { slug });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch menu");
      return api.restaurants.getBySlug.responses[200].parse(await res.json());
    },
    enabled: !!slug,
  });
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertRestaurant>) => {
      const url = buildUrl(api.restaurants.update.path, { id });
      const res = await fetch(url, {
        method: api.restaurants.update.method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to update restaurant");
      }
      return api.restaurants.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.restaurants.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.restaurants.get.path, data.id] });
    },
  });
}
