import { NextRequest, NextResponse } from "next/server";

interface FlashcardSet {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  flashcards: Array<{ front: string; back: string }>;
  published: boolean;
  createdBy: string;
  createdAt: string;
}

const flashcardSets: FlashcardSet[] = [];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const flashcardSet = flashcardSets.find(
    (set) => set.id === id && set.published
  );

  if (!flashcardSet) {
    return NextResponse.json(
      { error: "Flashcard set not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(flashcardSet);
}
