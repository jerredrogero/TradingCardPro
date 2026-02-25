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

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  shop_name: z.string().min(2, "Shop name must be at least 2 characters"),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post<AuthResponse>("/auth/register/", data);
      login(res.data);
    } catch (err: any) {
      console.error("Registration error details:", err.response?.data);
      const errData = err.response?.data;
      if (typeof errData === 'object' && errData !== null) {
        const errorMessages = Object.entries(errData).map(([key, value]) => {
          const message = Array.isArray(value) ? value[0] : value;
          return `${key}: ${message}`;
        });
        setError(errorMessages.join(", "));
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-zinc-900 border border-zinc-800 p-8 shadow-xl">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-white">
            Create your account
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
              <label className="text-sm font-medium text-zinc-400" htmlFor="username">Username</label>
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
              <label className="text-sm font-medium text-zinc-400" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="mt-1 relative block w-full appearance-none rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                placeholder="Email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-400" htmlFor="password">Password</label>
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
            <div>
              <label className="text-sm font-medium text-zinc-400" htmlFor="shop_name">Shop Name</label>
              <input
                id="shop_name"
                type="text"
                {...register("shop_name")}
                className="mt-1 relative block w-full appearance-none rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                placeholder="Shop Name"
              />
              {errors.shop_name && (
                <p className="mt-1 text-sm text-red-400">{errors.shop_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </div>
          <div className="text-center text-sm">
            <span className="text-zinc-400">Already have an account? </span>
            <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
