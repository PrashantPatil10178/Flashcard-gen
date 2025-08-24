"use client";
import { useAuth } from "@/components/AuthProvider";
import LoginForm from "@/components/LoginForm";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (user) {
    router.push("/");
    return null; // Redirecting, no need to render anything
  }

  return <LoginForm />;
}
