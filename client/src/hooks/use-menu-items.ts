import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertMenuItem } from "@shared/schema";
import { getToken } from "@/lib/queryClient";

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: InsertMenuItem) => {
      const token = getToken();
      const res = await fetch(api.menuItems.create.path, {
        method: api.menuItems.create.method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(item),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create item");
      }
      
      return api.menuItems.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.restaurants.get.path] });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertMenuItem>) => {
      const token = getToken();
      const url = buildUrl(api.menuItems.update.path, { id });
      const res = await fetch(url, {
        method: api.menuItems.update.method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update item");
      return api.menuItems.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.restaurants.get.path] });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const token = getToken();
      const url = buildUrl(api.menuItems.delete.path, { id });
      const res = await fetch(url, {
        method: api.menuItems.delete.method,
        headers: {
          "Authorization": `Bearer ${token}`
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.restaurants.get.path] });
    },
  });
}
