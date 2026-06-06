import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";

export default function ProtectedRoute({
  component: Component,
  ...rest
}: {
  component: React.ComponentType<any>;
  [key: string]: any;
}) {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth/login" />;
  }

  return <Component {...rest} />;
}
