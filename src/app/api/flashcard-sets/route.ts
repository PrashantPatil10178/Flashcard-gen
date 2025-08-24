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

export async function GET() {
  const publishedSets = flashcardSets
    .filter((set) => set.published)
    .map((set) => ({
      id: set.id,
      title: set.title,
      description: set.description,
      thumbnail: set.thumbnail,
      flashcardCount: set.flashcards.length,
      createdBy: set.createdBy,
      createdAt: set.createdAt,
    }));

  return NextResponse.json(publishedSets);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const flashcardSetData = formData.get("flashcardSet") as string;
    const thumbnail = formData.get("thumbnail") as File | null;

    if (!flashcardSetData) {
      return NextResponse.json(
        { error: "Flashcard set data is required" },
        { status: 400 }
      );
    }

    const flashcardSet = JSON.parse(flashcardSetData);

    let thumbnailUrl = "";
    if (thumbnail) {
      const bytes = await thumbnail.arrayBuffer();
      const buffer = Buffer.from(bytes);
      thumbnailUrl = `data:${thumbnail.type};base64,${buffer.toString(
        "base64"
      )}`;
    }

    const newSet = {
      ...flashcardSet,
      thumbnail: thumbnailUrl,
    };

    flashcardSets.push(newSet);

    return NextResponse.json({
      id: newSet.id,
      message: "Flashcard set saved successfully",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save flashcard set" },
      { status: 500 }
    );
  }
}
