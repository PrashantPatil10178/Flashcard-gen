"use client";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, Toaster } from "sonner";
import { motion } from "framer-motion";
import { Save, Upload, LogOut, Presentation, CheckCircle } from "lucide-react";
import {
  databases,
  storage,
  DATABASE_ID,
  FLASHCARD_SETS_COLLECTION_ID,
  STORAGE_BUCKET_ID,
  ID,
} from "@/lib/appwrite";
import { useAuth } from "./AuthProvider";
import { logout } from "@/lib/auth";
import PPTProcessor from "./PPTUploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExtractedSlide {
  slideNumber: number;
  imageId: string;
  type: "title" | "front" | "back";
}

const standards = [
  { value: "9th", label: "9th (SSC)" },
  { value: "10th", label: "10th (SSC)" },
  { value: "11th-sci", label: "11th Science (HSC)" },
  { value: "12th-sci", label: "12th Science (HSC)" },
];

const sscSubjects = [
  { value: "english", label: "English" },
  { value: "marathi", label: "Marathi" },
  { value: "hindi", label: "Hindi" },
  { value: "maths-1", label: "Mathematics 1 (Algebra)" },
  { value: "maths-2", label: "Mathematics 2 (Geometry)" },
  { value: "science-1", label: "Science 1" },
  { value: "science-2", label: "Science 2" },
  { value: "history-civics", label: "History & Civics" },
  { value: "geography", label: "Geography" },
];

const hscSubjects = [
  { value: "english", label: "English" },
  { value: "marathi", label: "Marathi" },
  { value: "hindi", label: "Hindi" },
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
  { value: "biology", label: "Biology" },
  { value: "maths-1", label: "Mathematics 1" },
  { value: "maths-2", label: "Mathematics 2" },
];

export default function FlashcardCreator() {
  const { user, refreshUser } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [extractedSlides, setExtractedSlides] = useState<ExtractedSlide[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [standard, setStandard] = useState("");
  const [subject, setSubject] = useState("");

  const handleSlidesExtracted = useCallback((slides: ExtractedSlide[]) => {
    setExtractedSlides(slides);
  }, []);

  const handleThumbnailUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.type.startsWith("image/")) {
          setThumbnail(file);
          const reader = new FileReader();
          reader.onload = (e) => {
            setThumbnailPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          toast.error("Please upload an image file");
        }
      }
    },
    []
  );

  const createFlashcardsFromSlides = (slides: ExtractedSlide[]) => {
    const titleSlide = slides.find((s) => s.type === "title");
    const frontSlides = slides.filter((s) => s.type === "front");
    const backSlides = slides.filter((s) => s.type === "back");
    const flashcards = frontSlides.map((frontSlide, index) => {
      const backSlide = backSlides[index];
      return {
        id: `card-${index + 1}`,
        frontImageId: frontSlide.imageId,
        backImageId: backSlide?.imageId || "",
        cardNumber: index + 1,
      };
    });
    return {
      titleImageId: titleSlide?.imageId || "",
      flashcards,
    };
  };

  const saveFlashcardSet = useCallback(
    async (publish: boolean = false) => {
      if (!title.trim()) {
        toast.error("Please enter a title");
        return;
      }
      if (!standard) {
        toast.error("Please select a standard");
        return;
      }
      if (!subject) {
        toast.error("Please select a subject");
        return;
      }
      if (extractedSlides.length === 0) {
        toast.error("Please upload and process a presentation file");
        return;
      }
      setIsSaving(true);
      try {
        let thumbnailId = null;
        if (thumbnail) {
          const uploadedFile = await storage.createFile(
            STORAGE_BUCKET_ID,
            ID.unique(),
            thumbnail
          );
          thumbnailId = uploadedFile.$id;
        }
        const flashcardData = createFlashcardsFromSlides(extractedSlides);
        const flashcardSetData = {
          title: title.trim(),
          description: description.trim(),
          flashcardsData: JSON.stringify(flashcardData),
          thumbnailId,
          standard,
          subject,
          createdBy: user?.$id,
          createdByName: user?.name,
          createdAt: "2025-08-20 08:52:17",
          published: publish,
          flashcardCount: flashcardData.flashcards.length,
        };
        await databases.createDocument(
          DATABASE_ID,
          FLASHCARD_SETS_COLLECTION_ID,
          ID.unique(),
          flashcardSetData
        );
        toast.success(
          publish
            ? "Flashcard set published successfully!"
            : "Flashcard set saved as draft!"
        );
        if (publish) {
          setTitle("");
          setDescription("");
          setThumbnail(null);
          setThumbnailPreview("");
          setExtractedSlides([]);
          setStandard("");
          setSubject("");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        toast.error("Failed to save flashcard set: " + message);
      } finally {
        setIsSaving(false);
      }
    },
    [title, description, extractedSlides, thumbnail, user, standard, subject]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      await refreshUser();
      toast.success("Logged out successfully");
    } catch {
      toast.error("Failed to logout");
    }
  }, [refreshUser]);

  const getSubjectOptions = () => {
    if (standard === "9th" || standard === "10th") return sscSubjects;
    if (standard === "11th-sci" || standard === "12th-sci") return hscSubjects;
    return [];
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Create Flashcard Set
            </h1>
            <p className="text-muted-foreground">
              Upload presentation to extract flashcard images
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, PrashantPatil0707
            </span>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </motion.div>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Set Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter flashcard set title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail">Thumbnail</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="thumbnail"
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="flex-1"
                      />
                      {thumbnailPreview && (
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-12 h-12 object-cover rounded border"
                        />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="standard">Standard</Label>
                    <Select
                      value={standard}
                      onValueChange={(val) => {
                        setStandard(val);
                        setSubject("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select standard" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1 text-xs text-gray-500">
                          SSC
                        </div>
                        {standards
                          .filter(
                            (s) => s.value === "9th" || s.value === "10th"
                          )
                          .map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        <div className="px-2 py-1 text-xs text-gray-500">
                          HSC Science
                        </div>
                        {standards
                          .filter(
                            (s) =>
                              s.value === "11th-sci" || s.value === "12th-sci"
                          )
                          .map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select
                      value={subject}
                      onValueChange={setSubject}
                      disabled={!standard}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSubjectOptions().length === 0 && (
                          <div className="px-2 py-1 text-xs text-gray-500">
                            Please select a standard first
                          </div>
                        )}
                        {getSubjectOptions().map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your flashcard set"
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Presentation className="h-5 w-5" />
                  Presentation Processing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PPTProcessor
                  onSlidesExtracted={handleSlidesExtracted}
                  flashcardSetTitle={title}
                />
                {extractedSlides.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Extracted {extractedSlides.length} slides as flashcard
                        images
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => saveFlashcardSet(false)}
                  disabled={
                    isSaving ||
                    extractedSlides.length === 0 ||
                    !standard ||
                    !subject
                  }
                  variant="outline"
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
                <Button
                  onClick={() => saveFlashcardSet(true)}
                  disabled={
                    isSaving ||
                    extractedSlides.length === 0 ||
                    !standard ||
                    !subject
                  }
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isSaving ? "Publishing..." : "Publish"}
                </Button>
              </CardContent>
            </Card>
            <Card className="sticky top-48">
              <CardHeader>
                <CardTitle>Preview Dimensions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div
                    className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg flex items-center justify-center shadow-lg"
                    style={{ width: "280px", height: "600px" }}
                  >
                    <div className="text-center text-gray-600">
                      <Presentation className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">280px × 600px</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Flashcard Preview Size
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
