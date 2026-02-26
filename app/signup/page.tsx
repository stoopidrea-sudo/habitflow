"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { signupWithPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signupFormSchema } from "@/lib/validations";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setEmailError("");
    setPasswordError("");
    setSuccessMessage("");

    const parsed = signupFormSchema.safeParse({ email, password });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "email") {
          setEmailError(issue.message);
        }
        if (issue.path[0] === "password") {
          setPasswordError(issue.message);
        }
      }

      return;
    }

    setIsLoading(true);

    const result = await signupWithPassword(parsed.data);

    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error ?? "Signup failed.");
      return;
    }

    setSuccessMessage(result.message ?? "Account created. Check your email to confirm your account.");
    setEmail("");
    setPassword("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>
            Sign up with your email to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              {emailError ? (
                <p className="text-sm text-destructive" role="alert">
                  {emailError}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Choose a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
              {passwordError ? (
                <p className="text-sm text-destructive" role="alert">
                  {passwordError}
                </p>
              ) : null}
            </div>

            {errorMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="text-sm text-emerald-600" role="status">
                {successMessage}
              </p>
            ) : null}

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="font-medium text-primary hover:underline" href="/login">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
