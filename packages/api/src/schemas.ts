import { z } from "zod";

/** The API's email check (AuthService.RegisterAsync), so the form and the server agree. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const email = z.string().trim().toLowerCase().regex(EMAIL, "Enter a valid email address.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  email,
  password: z.string().min(8, "Use at least 8 characters."),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
