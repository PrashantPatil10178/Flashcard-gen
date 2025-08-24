import { NextRequest, NextResponse } from "next/server";
import * as PPTX from "pptxgenjs";
import path from "path";
import { marked } from "marked";

// 'pptxgenjs' does not export Slide type, so we use 'any' here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addWatermark = (slide: any) => {
  slide.addText("EasyLearning", {
    x: 0.5,
    y: 3,
    w: 1.92,
    h: 0.5,
    fontSize: 22,
    color: "F1F5F9",
    align: "center",
    valign: "middle",
    fontFace: "Calibri",
    bold: true,
    rotate: -50,
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addLogo = (slide: any) => {
  slide.addImage({
    path: path.join(process.cwd(), "public/icon.png"),
    x: 2.1,
    y: 0.15,
    w: 0.8,
    h: 0.8,
  });
};

// 🔹 Utility: convert Markdown tokens → pptxgenjs text fragments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdToPptxText = (tokens: any[], highlightKeywords: string[]) => {
  // pptxgenjs does not export TextPropsOptions type, so we use 'any' here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fragments: { text: string; options: any }[] = [];

  tokens.forEach((token) => {
    if (token.type === "paragraph" || token.type === "text") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (token as any).text || "";
      const isHighlighted = highlightKeywords.some((kw) =>
        text.toLowerCase().includes(kw.toLowerCase())
      );

      fragments.push({
        text: text + "\n",
        options: {
          bold: /\*\*[^*]+\*\*/.test(text) || isHighlighted,
          italic: /\*[^*]+\*/.test(text),
          color: isHighlighted ? "E53E3E" : "2D3748",
          fontFace: "Calibri",
          fontSize: 18,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
      });
    }

      if (token.type === "list") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (token as any).items.forEach((item: any) => {
          const text = item.text || "";
          const isHighlighted = highlightKeywords.some((kw) =>
            text.toLowerCase().includes(kw.toLowerCase())
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fragments.push({
            text: `• ${text}\n`,
            options: {
              bold: isHighlighted,
              color: isHighlighted ? "E53E3E" : "2D3748",
              fontFace: "Calibri",
              fontSize: 18,
            } as any,
          });
        });
      }

      if (token.type === "codespan") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fragments.push({
          text: (token as any).text,
          options: {
            fontFace: "Courier New",
            fontSize: 18,
            color: "1A202C",
            bold: true,
            italic: false,
          } as any,
        });
      }

      if (token.type === "blockquote") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fragments.push({
          text: `"${(token as any).text}"\n`,
          options: {
            italic: true,
            color: "4A5568",
            fontFace: "Calibri",
            fontSize: 18,
          } as any,
        });
      }
    });

    return fragments;
  };

export async function POST(request: NextRequest) {
  try {
    const { jsonData, title } = await request.json();

    if (!jsonData) {
      return NextResponse.json(
        { error: "No JSON data provided" },
        { status: 400 }
      );
    }

    const parsed = JSON.parse(jsonData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let validFlashcards: any[] = [];
    let highlightKeywords: string[] = [];

    // Parse flashcards and keywords exactly like PPTProcessor
    if (Array.isArray(parsed)) {
      validFlashcards = parsed.filter(
        (item) =>
          typeof item === "object" &&
          typeof item.front === "string" &&
          typeof item.back === "string"
      );
    } else if (typeof parsed === "object" && parsed !== null) {
      if (Array.isArray(parsed.flashcards)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validFlashcards = parsed.flashcards.filter(
          (item: any) =>
            typeof item === "object" &&
            typeof item.front === "string" &&
            typeof item.back === "string"
        );
      }
      if (Array.isArray(parsed.highlightKeywords)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        highlightKeywords = parsed.highlightKeywords.map((kw: any) =>
          String(kw)
        );
      }
    }

    if (validFlashcards.length === 0) {
      return NextResponse.json(
        { error: "No valid flashcards found" },
        { status: 400 }
      );
    }

    // Create presentation exactly like PPTProcessor
    const pptx = new PPTX.default();
    pptx.defineLayout({ name: "FLASHCARD", width: 2.92, height: 6.25 });
    pptx.layout = "FLASHCARD";

    // 🔹 Title slide - exactly like PPTProcessor
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: "F8F9FA" };
    titleSlide.addShape("rect", {
      x: 0.1,
      y: 0.1,
      w: 2.72,
      h: 6.05,
      fill: { color: "FFFFFF" },
    });
    addWatermark(titleSlide);
    addLogo(titleSlide);
    titleSlide.addText(title || "Flashcard Set", {
      x: 0.2,
      y: 1.5,
      w: 2.52,
      h: 1.5,
      fontSize: 28,
      bold: true,
      color: "2D3748",
      align: "center",
      fontFace: "Calibri",
    });
    titleSlide.addText(`${validFlashcards.length} Cards`, {
      x: 0.2,
      y: 3.2,
      w: 2.52,
      h: 0.8,
      fontSize: 18,
      color: "718096",
      align: "center",
      fontFace: "Calibri",
    });

    // 🔹 Flashcards - exactly like PPTProcessor
    validFlashcards.forEach((card, index) => {
      // Front slide
      const frontSlide = pptx.addSlide();
      frontSlide.background = { color: "F8F9FA" };
      frontSlide.addShape("rect", {
        x: 0.1,
        y: 0.1,
        w: 2.72,
        h: 6.05,
        fill: { color: "FFFFFF" },
      });
      addWatermark(frontSlide);
      addLogo(frontSlide);
      frontSlide.addText(card.front, {
        x: 0.2,
        y: 1.5,
        w: 2.52,
        h: 3,
        fontSize: 22,
        color: "2D3748",
        valign: "middle",
        align: "center",
        wrap: true,
        fontFace: "Calibri",
      });
      frontSlide.addShape("rect", {
        x: 0.7,
        y: 5,
        w: 1.52,
        h: 0.6,
        fill: { color: "FFFFFF" },
        line: { color: "4A90E2", width: 2 },
      });
      frontSlide.addText("Solution", {
        x: 0.7,
        y: 5,
        w: 1.52,
        h: 0.6,
        fontSize: 16,
        color: "4A90E2",
        align: "center",
        valign: "middle",
        fontFace: "Calibri",
      });

      // Back slide
      const backSlide = pptx.addSlide();
      backSlide.background = { color: "F8F9FA" };
      backSlide.addShape("rect", {
        x: 0.1,
        y: 0.1,
        w: 2.72,
        h: 6.05,
        fill: { color: "FFFFFF" },
      });
      addWatermark(backSlide);
      addLogo(backSlide);

      // Process markdown exactly like PPTProcessor
      const mdTokens = marked.lexer(
        typeof card.back === "string" ? card.back : ""
      );
      const fragments = mdToPptxText(mdTokens, highlightKeywords);

      backSlide.addText(fragments, {
        x: 0.2,
        y: 1.5,
        w: 2.52,
        h: 5,
        wrap: true,
        valign: "top",
      });
    });

    const buffer = await pptx.write({ outputType: "nodebuffer" });

    return new Response(buffer as ArrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${
          title?.replace(/[^a-zA-Z0-9]/g, "_") || "flashcards"
        }.pptx"`,
      },
    });
  } catch (error) {
    console.error("PowerPoint generation error:", error);
    return NextResponse.json(
      { error: `Failed to generate PowerPoint: ${error}` },
      { status: 500 }
    );
  }
}
