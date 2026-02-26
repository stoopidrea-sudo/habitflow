"use server";

import { createClient } from "@/lib/supabase/server";
import { loginFormSchema, signupFormSchema, type LoginFormInput, type SignupFormInput } from "@/lib/validations";

type AuthResult = {
  success: boolean;
  error?: string;
  message?: string;
};

function getFirstValidationError(issues: { message: string }[]) {
  return issues[0]?.message ?? "Invalid form data.";
}

export async function loginWithPassword(input: LoginFormInput): Promise<AuthResult> {
  const parsed = loginFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: getFirstValidationError(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

export async function signupWithPassword(input: SignupFormInput): Promise<AuthResult> {
  const parsed = signupFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: getFirstValidationError(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    message: "Account created. Check your email to confirm your account.",
  };
}

