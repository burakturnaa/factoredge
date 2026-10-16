import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(["admin", "viewer"]),
});
