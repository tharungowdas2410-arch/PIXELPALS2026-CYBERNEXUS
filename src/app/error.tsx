"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to console in dev mode
    console.error("Application error boundary triggered:", error);
  }, [error]);

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center p-4">
      <Card className="max-w-md border-border/60 text-center shadow-lg">
        <CardHeader className="space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">System Exception Detected</CardTitle>
          <CardDescription className="text-sm">
            An unexpected error occurred while rendering this interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground font-mono">
            {error.digest ? (
              <span>Error Digest: {error.digest}</span>
            ) : (
              <span>Ref: {error.message || "Unspecified application error"}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Zero-trust state preserved. Internal server traces are sanitized for enterprise protection.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => reset()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button asChild size="sm">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Overview
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
