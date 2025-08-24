"use client";
import { useAuth } from "@/components/AuthProvider";
import FlashcardCreator from "@/components/FlashcardCreator";
import LoginForm from "@/components/LoginForm";

export default function CreateFlashcardsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <FlashcardCreator />;
}
