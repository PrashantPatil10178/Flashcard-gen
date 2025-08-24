import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";

interface Flashcard {
  front: string;
  back: string;
}

interface RequestBody {
  flashcards: Flashcard[];
  metadata: {
    title: string;
    totalCount: number;
    generatedDate: string;
    username: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { flashcards, metadata }: RequestBody = await request.json();

    if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      return NextResponse.json(
        { error: "No flashcards provided" },
        { status: 400 }
      );
    }

    const pptx = new PptxGenJS();

    pptx.defineLayout({
      name: "FLASHCARD_LAYOUT",
      width: 2.8,
      height: 6.0,
    });
    pptx.layout = "FLASHCARD_LAYOUT";

    pptx.title = `Flashcards: ${metadata.title}`;
    pptx.author = metadata.username;
    pptx.company = "Flashcard Generator";
    pptx.subject = "Educational Flashcards";

    const titleSlide = pptx.addSlide();
    titleSlide.background = { fill: "F8F9FA" };

    titleSlide.addText(metadata.title, {
      x: 0.2,
      y: 1.5,
      w: 2.4,
      h: 1.0,
      fontSize: 24,
      bold: true,
      color: "1E40AF",
      align: "center",
      valign: "middle",
    });

    titleSlide.addText(`${metadata.totalCount} Flashcards`, {
      x: 0.2,
      y: 2.8,
      w: 2.4,
      h: 0.6,
      fontSize: 16,
      color: "6B7280",
      align: "center",
      valign: "middle",
    });

    flashcards.forEach((flashcard, index) => {
      const frontSlide = pptx.addSlide();
      frontSlide.background = { fill: "FFFFFF" };

      frontSlide.addShape("rect", {
        x: 0.1,
        y: 0.1,
        w: 2.6,
        h: 5.8,
        fill: { color: "FFFFFF" },
        line: { color: "2563EB", width: 3 },
      });

      frontSlide.addText("FRONT", {
        x: 0.2,
        y: 0.3,
        w: 2.4,
        h: 0.4,
        fontSize: 12,
        bold: true,
        color: "2563EB",
        align: "center",
      });

      frontSlide.addText(`Card ${index + 1} of ${flashcards.length}`, {
        x: 0.2,
        y: 0.7,
        w: 2.4,
        h: 0.3,
        fontSize: 10,
        color: "6B7280",
        align: "center",
      });

      const frontTextLines = flashcard.front.match(/.{1,35}(\s|$)/g) || [
        flashcard.front,
      ];
      const frontText = frontTextLines.join("\n");

      frontSlide.addText(frontText, {
        x: 0.3,
        y: 1.5,
        w: 2.2,
        h: 3.5,
        fontSize: frontText.length > 100 ? 14 : 16,
        color: "1F2937",
        align: "center",
        valign: "middle",
        wrap: true,
      });

      const backSlide = pptx.addSlide();
      backSlide.background = { fill: "FFFFFF" };

      backSlide.addShape("rect", {
        x: 0.1,
        y: 0.1,
        w: 2.6,
        h: 5.8,
        fill: { color: "FFFFFF" },
        line: { color: "2563EB", width: 3 },
      });

      backSlide.addText("BACK", {
        x: 0.2,
        y: 0.3,
        w: 2.4,
        h: 0.4,
        fontSize: 12,
        bold: true,
        color: "2563EB",
        align: "center",
      });

      backSlide.addText(`Card ${index + 1} of ${flashcards.length}`, {
        x: 0.2,
        y: 0.7,
        w: 2.4,
        h: 0.3,
        fontSize: 10,
        color: "6B7280",
        align: "center",
      });

      const backTextLines = flashcard.back.match(/.{1,35}(\s|$)/g) || [
        flashcard.back,
      ];
      const backText = backTextLines.join("\n");

      backSlide.addText(backText, {
        x: 0.3,
        y: 1.5,
        w: 2.2,
        h: 3.5,
        fontSize: backText.length > 100 ? 14 : 16,
        color: "1F2937",
        align: "center",
        valign: "middle",
        wrap: true,
      });
    });

    const pptxBuffer = await pptx.write({ outputType: "arraybuffer" });

    const response = new NextResponse(
      new Uint8Array(pptxBuffer as ArrayBuffer),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="Flashcards_${metadata.title.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          )}_${metadata.totalCount}Cards.pptx"`,
        },
      }
    );

    return response;
  } catch (error) {
    console.error("Error generating flashcard PPT:", error);
    return NextResponse.json(
      { error: "Failed to generate PowerPoint presentation" },
      { status: 500 }
    );
  }
}
