"use client";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, Download, Image } from "lucide-react";
import { storage, STORAGE_BUCKET_ID, ID } from "@/lib/appwrite";

interface ExtractedSlide {
  slideNumber: number;
  imageId: string;
  type: "title" | "front" | "back";
}

interface PPTProcessorProps {
  onSlidesExtracted: (slides: ExtractedSlide[]) => void;
  flashcardSetTitle: string;
}

export default function PPTProcessor({
  onSlidesExtracted,
  flashcardSetTitle,
}: PPTProcessorProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedSlides, setExtractedSlides] = useState<ExtractedSlide[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePPTFromJSON = useCallback(async () => {
    if (!jsonText.trim()) {
      toast.error("Please paste JSON data");
      return;
    }
    try {
      setIsGenerating(true);
      setProgress(0);
      setProgressText("Generating PowerPoint...");
      const response = await fetch("/api/generate-ppt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonData: jsonText,
          title: flashcardSetTitle || "Flashcard Set",
        }),
      });
      setProgress(50);
      if (!response.ok) {
        throw new Error("Failed to generate PowerPoint");
      }
      const blob = await response.blob();
      setProgress(100);
      setProgressText("Download ready!");
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${flashcardSetTitle || "flashcards"}.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PowerPoint generated and downloaded successfully!");
    } catch (error) {
      toast.error("Failed to generate PowerPoint");
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setProgressText("");
    }
  }, [jsonText, flashcardSetTitle]);

  const extractFromFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    // Only use PDF endpoint since we're only supporting PDF files
    const endpoint = "/api/extract-pdf";

    try {
      setProgressText("Converting PDF to images...");
      setProgress(20);
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      setProgress(50);
      if (!response.ok) throw new Error("Failed to extract PDF");
      const result = await response.json();
      setProgress(70);
      return result.images || [];
    } catch {
      throw new Error("PDF extraction failed");
    }
  };

  interface UploadedImage {
    dataUrl: string;
    type: string;
    slideNumber: number;
  }

  const uploadImagesToStorage = async (images: UploadedImage[]) => {
    const slides: ExtractedSlide[] = [];
    const total = images.length;
    setProgressText("Uploading images to storage...");
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const response = await fetch(image.dataUrl);
      const blob = await response.blob();
      const imageFile = new File([blob], `slide-${i}.png`, {
        type: "image/png",
      });
      const uploadedFile = await storage.createFile(
        STORAGE_BUCKET_ID,
        ID.unique(),
        imageFile
      );
      slides.push({
        slideNumber: i,
        imageId: uploadedFile.$id,
        type: image.type as "title" | "front" | "back",
      });
      const uploadProgress = 70 + ((i + 1) / total) * 30;
      setProgress(uploadProgress);
      setProgressText(`Uploading images... ${i + 1}/${total}`);
    }
    return slides;
  };

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Only accept PDF files
      const validTypes = [".pdf"];
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf("."));

      if (!validTypes.includes(fileExtension)) {
        toast.error("Please upload a PDF file only");
        return;
      }

      setUploadedFile(file);
      setIsProcessing(true);
      setProgress(0);
      try {
        const extractedImages = await extractFromFile(file);
        if (extractedImages.length === 0) {
          throw new Error("No images found in PDF");
        }
        const slides = await uploadImagesToStorage(extractedImages);
        setExtractedSlides(slides);
        onSlidesExtracted(slides);
        setProgress(100);
        setProgressText("Complete!");
        toast.success(`Extracted ${slides.length} slides as images`);
      } catch {
        toast.error("Failed to process PDF");
        setProgress(0);
        setProgressText("");
      } finally {
        setIsProcessing(false);
      }
    },
    [onSlidesExtracted]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Generate PowerPoint from JSON</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Paste Flashcard JSON</Label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='[{"front": "What is a triad? Who made them?", "back": "Group of **three elements** having similar chemical properties\n- Dobereiner"}]'
              className="w-full h-32 p-3 border rounded-md font-mono text-sm"
            />
          </div>
          <Button
            onClick={generatePPTFromJSON}
            className="w-full"
            disabled={isGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate PowerPoint Template"}
          </Button>
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{progressText}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Upload & Extract Images from PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <div>
              <Input
                type="file"
                accept=".pdf" // Only accept PDF files
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={isProcessing}
              />
              <Label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium"
              >
                <FileText className="h-4 w-4" />
                Choose PDF File
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {uploadedFile
                ? `Selected: ${uploadedFile.name}`
                : "Upload a PDF to extract slide images"}
            </p>
          </div>
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{progressText}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
          {extractedSlides.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Image className="h-5 w-5" />
                <span className="font-medium">
                  Extracted {extractedSlides.length} slide images
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {extractedSlides.slice(0, 12).map((slide) => (
                  <div key={slide.slideNumber} className="relative">
                    <img
                      src={storage
                        .getFileView(STORAGE_BUCKET_ID, slide.imageId)
                        .toString()}
                      alt={`Slide ${slide.slideNumber}`}
                      className="w-full h-16 object-cover rounded"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center rounded-b">
                      {slide.type === "title"
                        ? "Title"
                        : slide.type === "front"
                        ? "F"
                        : "B"}
                    </div>
                  </div>
                ))}
                {extractedSlides.length > 12 && (
                  <div className="flex items-center justify-center text-xs text-muted-foreground">
                    +{extractedSlides.length - 12} more
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
