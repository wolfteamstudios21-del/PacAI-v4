import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { Link, useSearch } from "wouter";

export default function BillingSuccess() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");

  const { data, isLoading, isError } = useQuery<{ success: boolean; tier: string }>({
    queryKey: ["/api/billing/success", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/billing/success?session_id=${sessionId}`);
      return response.json();
    },
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (data?.success && data?.tier) {
      localStorage.setItem("userTier", data.tier);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Payment Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              We couldn't verify your payment. Please contact support if you were charged.
            </p>
            <Link href="/pricing">
              <Button data-testid="button-back-pricing">Back to Pricing</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle data-testid="text-success-title">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-2">
            Welcome to PacAI{" "}
            <span className="font-semibold text-foreground">
              {data.tier.charAt(0).toUpperCase() + data.tier.slice(1)}
            </span>
            !
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Your account has been upgraded. Enjoy unlimited access to all features.
          </p>
          <Link href="/dashboard">
            <Button className="w-full" data-testid="button-go-dashboard">
              Go to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
