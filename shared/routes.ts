import { z } from "zod";
import {
  insertRestaurantSchema,
  insertMenuItemSchema,
  restaurants,
  menuItems,
  users,
} from "./schema.js";

// === ERROR SCHEMAS ===
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// === API CONTRACT ===
export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/auth?action=login",
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth?action=logout",
      responses: {
        200: z.void(),
      },
    },
    user: {
      method: "GET" as const,
      path: "/api/auth?action=me",
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },

  // === AI CHAT ===
  aiChat: {
    method: "POST" as const,
    path: "/api/ai-chat",
    input: z.object({
      system: z.string(),
      messages: z.array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        }),
      ),
      max_tokens: z.number().optional(),
    }),
    responses: {
      200: z.object({ text: z.string() }),
      500: errorSchemas.internal,
    },
  },

  restaurants: {
    listAll: {
      method: "GET" as const,
      path: "/api/restaurants",
      responses: {
        200: z.array(z.custom<typeof restaurants.$inferSelect>()),
      },
    },
    getBySlug: {
      method: "GET" as const,
      path: "/api/restaurants?slug=:slug",
      responses: {
        200: z.custom<
          typeof restaurants.$inferSelect & {
            menuItems: (typeof menuItems.$inferSelect)[];
          }
        >(),
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/admin/restaurants?action=list",
      responses: {
        200: z.array(z.custom<typeof restaurants.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/admin/restaurants?action=get&id=:id",
      responses: {
        200: z.custom<
          typeof restaurants.$inferSelect & {
            menuItems: (typeof menuItems.$inferSelect)[];
          }
        >(),
        404: errorSchemas.notFound,
        403: errorSchemas.unauthorized,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/admin/restaurants?action=update&id=:id",
      input: insertRestaurantSchema.partial(),
      responses: {
        200: z.custom<typeof restaurants.$inferSelect>(),
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/admin/restaurants?action=create",
      input: insertRestaurantSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof restaurants.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/admin/restaurants?action=delete&id=:id",
      responses: {
        200: z.void(),
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },

  menuItems: {
    create: {
      method: "POST" as const,
      path: "/api/admin/menu?action=create",
      input: insertMenuItemSchema,
      responses: {
        201: z.custom<typeof menuItems.$inferSelect>(),
        403: errorSchemas.unauthorized,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/admin/menu?action=update&id=:id",
      input: insertMenuItemSchema.partial(),
      responses: {
        200: z.custom<typeof menuItems.$inferSelect>(),
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/admin/menu?action=delete&id=:id",
      responses: {
        204: z.void(),
        403: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    reorder: {
      method: "POST" as const,
      path: "/api/admin/menu?action=reorder",
      input: z.object({
        items: z.array(
          z.object({
            id: z.number(),
            sortOrder: z.number(),
          }),
        ),
      }),
      responses: {
        200: z.object({ ok: z.boolean() }),
        403: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// === TYPE HELPERS ===
export type LoginInput = z.infer<typeof api.auth.login.input>;
export type RestaurantWithMenu = z.infer<
  (typeof api.restaurants.getBySlug.responses)[200]
>;
