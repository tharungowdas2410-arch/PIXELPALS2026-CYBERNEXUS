import Link from "next/link";
import { AlertOctagon, ArrowLeft, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center p-4">
      <Card className="max-w-md border-border/60 text-center shadow-lg">
        <CardHeader className="space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">404 — Resource Not Found</CardTitle>
          <CardDescription className="text-sm">
            The page, asset, or intelligence report you requested could not be located or has been relocated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            If you are navigating cross-tenant resources, access is automatically restricted to your authorized enterprise scope.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/security-posture">
                Security Posture
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
