import { error } from "console";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const images = [];

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const zipData = await zip.loadAsync(arrayBuffer);

    const mediaFiles = Object.keys(zipData.files)
      .filter(
        (fileName) =>
          fileName.startsWith("ppt/media/") &&
          (fileName.includes("image") ||
            fileName.endsWith(".png") ||
            fileName.endsWith(".jpg") ||
            fileName.endsWith(".jpeg") ||
            fileName.endsWith(".gif") ||
            fileName.endsWith(".bmp"))
      )
      .sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)?.[0] || "0");
        const bNum = parseInt(b.match(/\d+/)?.[0] || "0");
        return aNum - bNum;
      });

    if (mediaFiles.length > 0) {
      for (let i = 0; i < mediaFiles.length; i++) {
        const mediaFile = zipData.files[mediaFiles[i]];
        const imageData = await mediaFile.async("base64");
        const extension =
          mediaFiles[i].split(".").pop()?.toLowerCase() || "png";

        let mimeType = "image/png";
        if (extension === "jpg" || extension === "jpeg")
          mimeType = "image/jpeg";
        else if (extension === "gif") mimeType = "image/gif";
        else if (extension === "bmp") mimeType = "image/bmp";

        const dataUrl = `data:${mimeType};base64,${imageData}`;

        images.push({
          slideNumber: i,
          dataUrl: dataUrl,
          type: i === 0 ? "title" : i % 2 === 1 ? "front" : "back",
        });
      }
    } else {
      const slideFiles = Object.keys(zipData.files)
        .filter(
          (fileName) =>
            fileName.startsWith("ppt/slides/slide") && fileName.endsWith(".xml")
        )
        .sort();

      for (let i = 0; i < Math.min(slideFiles.length, 5); i++) {
        const svg = `<svg width="280" height="600" xmlns="http://www.w3.org/2000/svg">
          <rect width="280" height="600" fill="#ffffff" stroke="#cccccc" stroke-width="1"/>
          <text x="140" y="300" text-anchor="middle" font-family="Arial" font-size="16" fill="#333333">
            Slide ${i + 1}
          </text>
        </svg>`;

        const base64 = Buffer.from(svg).toString("base64");
        const dataUrl = `data:image/svg+xml;base64,${base64}`;

        images.push({
          slideNumber: i,
          dataUrl: dataUrl,
          type: i === 0 ? "title" : i % 2 === 1 ? "front" : "back",
        });
      }
    }

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json(
      { error: `Failed to extract PPT ${error}` },
      { status: 500 }
    );
  }
}
