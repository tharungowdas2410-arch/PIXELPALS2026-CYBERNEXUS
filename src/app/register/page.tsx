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
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white shadow-lg p-8"
      >
        <div className="flex items-center gap-2">
          <Hexagon className="h-5 w-5 text-blue-600" />
          <p className="text-xs font-bold tracking-[0.18em] text-blue-600">CYBERNEXUS</p>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Create organization</h1>
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
        {error ? <p className="text-sm text-rose-600 font-medium">{error}</p> : null}
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled={pending}>
          {pending ? "Creating…" : "Create and continue"}
        </Button>
        <p className="text-xs text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
