"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Hexagon } from "lucide-react";
import { registerAccount } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";

const schema = z.object({
  organization_name: z.string().min(2),
  full_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    organization_name: "",
    full_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError("Complete all fields. Password must be at least 8 characters.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await registerAccount({ ...parsed.data, role: "ciso", country: "IN" });
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to register.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#070b14] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-lg border border-white/10 bg-[#0c1322] p-8"
      >
        <div className="flex items-center gap-2">
          <Hexagon className="h-5 w-5 text-cyan-300" />
          <p className="text-xs tracking-[0.18em] text-cyan-300">CYBERNEXUS</p>
        </div>
        <h1 className="text-2xl font-semibold text-white">Create organization</h1>
        {(
          [
            ["organization_name", "Organization"],
            ["full_name", "Your name"],
            ["email", "Email"],
            ["password", "Password"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              type={key === "password" ? "password" : key === "email" ? "email" : "text"}
              className="mt-1"
              value={form[key]}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
            />
          </div>
        ))}
        {error ? <p className="text-sm text-amber-200">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create and continue"}
        </Button>
        <p className="text-xs text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="text-cyan-300 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
