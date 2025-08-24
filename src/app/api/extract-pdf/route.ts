import { NextRequest, NextResponse } from "next/server";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import sharp from "sharp";
import { error } from "console";

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
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const library = await PDFiumLibrary.init();
    const document = await library.loadDocument(buffer);

    const images = [];
    const maxPages = Math.max(document.getPageCount(), 10);

    for (let i = 0; i < maxPages; i++) {
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
    }

    document.destroy();
    library.destroy();

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json(
      { error: `Failed to extract PDF ${error}` },
      { status: 500 }
    );
  }
}
