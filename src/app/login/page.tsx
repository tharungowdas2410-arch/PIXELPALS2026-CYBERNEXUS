"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Hexagon } from "lucide-react";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import Link from "next/link";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ciso@northbridge.example");
  const [password, setPassword] = useState("ChangeMe_demo1!");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError("Enter a valid email and password (8+ characters).");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await login(parsed.data.email, parsed.data.password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#070b14] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-lg border border-white/10 bg-[#0c1322] p-8"
      >
        <div className="flex items-center gap-2">
          <Hexagon className="h-5 w-5 text-cyan-300" />
          <p className="text-xs tracking-[0.18em] text-cyan-300">CYBERNEXUS</p>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-slate-400">Enterprise cyber-risk intelligence for SIH 26105.</p>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-amber-200">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-xs text-slate-500">
          Demo seed: ciso@northbridge.example · Need an org?{" "}
          <Link href="/register" className="text-cyan-300 hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
