"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { AuthResponse } from "@/types/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post<AuthResponse>("/auth/login/", data);
      login(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid credentials");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-zinc-900 border border-zinc-800 p-8 shadow-xl">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="rounded-md bg-red-900/50 border border-red-800 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-sm font-medium text-zinc-400" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                {...register("username")}
                className="mt-1 relative block w-full appearance-none rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                placeholder="Username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-400" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register("password")}
                className="mt-1 relative block w-full appearance-none rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                placeholder="Password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
          <div className="text-center text-sm">
            <span className="text-zinc-400">Don't have an account? </span>
            <Link href="/register" className="font-medium text-indigo-400 hover:text-indigo-300">
              Register here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
