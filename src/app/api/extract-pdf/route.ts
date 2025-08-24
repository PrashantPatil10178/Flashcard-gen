import { NextRequest, NextResponse } from "next/server";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import sharp from "sharp";

interface RenderOptions {
  data: Uint8Array;
  width: number;
  height: number;
}

async function renderFunction(options: RenderOptions) {
  return await sharp(options.data, {
    raw: {
      width: options.width,
      height: options.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

export async function POST(request: NextRequest) {
  let library: any = null;
  let document: any = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("Initializing PDFium library...");
    library = await PDFiumLibrary.init();

    console.log("Loading PDF document...");
    document = await library.loadDocument(buffer);
    const pageCount = document.getPageCount();
    console.log(`Document loaded with ${pageCount} pages`);

    const images = [];
    const maxPages = Math.min(pageCount, 10); // Fixed: Use min instead of max

    for (let i = 0; i < maxPages; i++) {
      try {
        console.log(`Processing page ${i + 1}/${maxPages}...`);
        const page = document.getPage(i);

        const image = await page.render({
          scale: 7,
          render: renderFunction,
        });

        const base64 = Buffer.from(image.data).toString("base64");
        const dataUrl = `data:image/png;base64,${base64}`;

        images.push({
          slideNumber: i,
          dataUrl,
          type: i === 0 ? "title" : i % 2 === 1 ? "front" : "back",
        });

        console.log(`Page ${i + 1} processed successfully`);
      } catch (pageError) {
        console.error(`Error processing page ${i}:`, pageError);
        // Continue with next page instead of failing entirely
        continue;
      }
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error("PDF processing failed:", error);

    // Extract meaningful error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode = (error as any).code;

    return NextResponse.json(
      {
        error: "Failed to extract PDF",
        details: {
          message: errorMessage,
          stack: errorStack,
          code: errorCode,
        },
      },
      { status: 500 }
    );
  } finally {
    // Ensure resources are always cleaned up
    if (document) {
      try {
        document.destroy();
        console.log("Document destroyed");
      } catch (cleanupError) {
        console.error("Error destroying document:", cleanupError);
      }
    }

    if (library) {
      try {
        library.destroy();
        console.log("Library destroyed");
      } catch (cleanupError) {
        console.error("Error destroying library:", cleanupError);
      }
    }
  }
}
