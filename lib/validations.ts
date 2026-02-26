import { z } from "zod";

const habitTypeSchema = z.enum(["boolean", "numeric", "timer"]);

const frequencyDaySchema = z
  .coerce.number()
  .int("Invalid day value.")
  .min(0, "Day must be between 0 and 6.")
  .max(6, "Day must be between 0 and 6.");

export const loginFormSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const signupFormSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const createHabitFormSchema = z.object({
  name: z.string().trim().min(1, "Habit name is required.").max(100, "Habit name is too long."),
  type: habitTypeSchema.default("boolean"),
  goal_value: z
    .coerce.number()
    .positive("Goal value must be greater than 0.")
    .max(100000, "Goal value is too large."),
  unit: z.string().trim().max(20, "Unit must be 20 characters or less.").optional().default(""),
  frequency_days: z
    .array(frequencyDaySchema, "Choose at least one day.")
    .min(1, "Choose at least one day.")
    .max(7, "You can select up to 7 days.")
    .transform((days) => Array.from(new Set(days)).sort((a, b) => a - b)),
  priority: z.coerce.number().int().min(1, "Priority must be between 1 and 5.").max(5, "Priority must be between 1 and 5."),
});

export type LoginFormInput = z.infer<typeof loginFormSchema>;
export type SignupFormInput = z.infer<typeof signupFormSchema>;
export type CreateHabitFormInput = z.infer<typeof createHabitFormSchema>;

