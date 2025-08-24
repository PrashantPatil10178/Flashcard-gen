"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Play,
  Search,
  Clock,
  User,
  Grid,
  List,
  X,
  BookOpen,
  LogOut,
  Home,
} from "lucide-react";
import {
  databases,
  storage,
  DATABASE_ID,
  FLASHCARD_SETS_COLLECTION_ID,
  STORAGE_BUCKET_ID,
} from "@/lib/appwrite";
import { Query } from "appwrite";
import FlashcardViewer from "./FlashcardViewer";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { logout } from "@/lib/auth";

// Constants for standards and subjects
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

interface FlashcardSet {
  $id: string;
  title: string;
  description: string;
  flashcardsData: string;
  thumbnailId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  published: boolean;
  flashcardCount: number;
  standard: string;
  subject: string;
}

export default function FlashcardSetList() {
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<string>("all");

  const { user, refreshUser } = useAuth();

  const loadFlashcardSets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        DATABASE_ID,
        FLASHCARD_SETS_COLLECTION_ID,
        [
          Query.equal("published", true),
          Query.orderDesc("createdAt"),
          Query.limit(100),
        ]
      );
      setFlashcardSets(response.documents as unknown as FlashcardSet[]);
    } catch (error) {
      console.error("Failed to load flashcard sets:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlashcardSets();
  }, [loadFlashcardSets]);

  const getSubjectOptions = (standard: string) => {
    if (standard === "9th" || standard === "10th") return sscSubjects;
    if (standard === "11th-sci" || standard === "12th-sci") return hscSubjects;
    return [];
  };

  const filteredSets = flashcardSets.filter(
    (set) =>
      (set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        set.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        set.createdByName.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedStandard === "all" || set.standard === selectedStandard)
  );

  const getThumbnailUrl = (thumbnailId?: string) => {
    if (!thumbnailId) return "/placeholder-flashcard.png";
    return storage.getFileView(STORAGE_BUCKET_ID, thumbnailId).toString();
  };

  const handleStudySet = (set: FlashcardSet) => {
    setSelectedSet(set);
    setShowViewer(true);
  };

  const handleBackToList = () => {
    setShowViewer(false);
    setSelectedSet(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      await refreshUser();
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  // Group flashcard sets by standard and subject
  const groupedSets = standards.reduce((acc, standard) => {
    const setsForStandard = filteredSets.filter(
      (set) => set.standard === standard.value
    );
    if (setsForStandard.length > 0) {
      const subjects = getSubjectOptions(standard.value);
      const groupedBySubject = subjects.reduce((subjectAcc, subject) => {
        const setsForSubject = setsForStandard.filter(
          (set) => set.subject === subject.value
        );
        if (setsForSubject.length > 0) {
          subjectAcc[subject.value] = {
            label: subject.label,
            sets: setsForSubject,
          };
        }
        return subjectAcc;
      }, {} as Record<string, { label: string; sets: FlashcardSet[] }>);

      if (Object.keys(groupedBySubject).length > 0) {
        acc[standard.value] = {
          label: standard.label,
          subjects: groupedBySubject,
        };
      }
    }
    return acc;
  }, {} as Record<string, { label: string; subjects: Record<string, { label: string; sets: FlashcardSet[] }> }>);

  // Get sets for "All" standard
  const allSets = selectedStandard === "all" ? filteredSets : [];

  if (showViewer && selectedSet) {
    const flashcardData = JSON.parse(selectedSet.flashcardsData);
    return (
      <FlashcardViewer
        flashcardData={flashcardData}
        title={selectedSet.title}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Bar */}
      {/* <nav className="bg-white border-b py-3 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-xl">StudyCards</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>

          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm hidden md:inline">
                Welcome, {user.name}
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </nav> */}

      <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Study Flashcards
          </h1>
          <p className="text-muted-foreground">
            Browse and study flashcard sets
          </p>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search flashcards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {user && (
              <Link href="/create-flashcards">
                <Button size="sm">Create New</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Standard Tabs */}
        <div className="flex overflow-x-auto pb-2 mb-6 gap-2 hide-scrollbar">
          <Button
            variant={selectedStandard === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStandard("all")}
            className="whitespace-nowrap"
          >
            All Standards
          </Button>

          {standards.map((standard) => (
            <Button
              key={standard.value}
              variant={
                selectedStandard === standard.value ? "default" : "outline"
              }
              size="sm"
              onClick={() => setSelectedStandard(standard.value)}
              className="whitespace-nowrap"
            >
              {standard.label}
            </Button>
          ))}
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredSets.length}{" "}
            {filteredSets.length === 1 ? "flashcard set" : "flashcard sets"}{" "}
            found
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-40 bg-muted rounded-t-lg"></div>
                <CardContent className="p-3">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {filteredSets.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <h3 className="text-lg font-semibold mb-2">
                    No flashcard sets found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || selectedStandard !== "all"
                      ? "Try adjusting your search or filters"
                      : "No flashcard sets are available yet"}
                  </p>
                  {user && (
                    <Link href="/create-flashcards">
                      <Button size="sm">Create Your First Set</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Show all sets when "All Standards" is selected */}
                {selectedStandard === "all" && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">
                      All Flashcard Sets
                    </h2>
                    <div
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                          : "space-y-4"
                      }
                    >
                      {allSets.map((set, index) => (
                        <motion.div
                          key={set.$id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
                            <div className="relative h-40 overflow-hidden rounded-t-lg">
                              <img
                                src={getThumbnailUrl(set.thumbnailId)}
                                alt={set.title}
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute top-2 right-2 flex gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  {set.flashcardCount} cards
                                </Badge>
                                <Badge variant="default" className="text-xs">
                                  {
                                    standards
                                      .find((s) => s.value === set.standard)
                                      ?.label.split(" ")[0]
                                  }
                                </Badge>
                              </div>
                            </div>
                            <CardContent className="p-3 flex-1 flex flex-col">
                              <h3 className="font-semibold text-base mb-1 line-clamp-1">
                                {set.title}
                              </h3>
                              <p className="text-muted-foreground text-xs mb-3 line-clamp-2 flex-1">
                                {set.description || "No description available"}
                              </p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span className="truncate max-w-[100px]">
                                    {set.createdByName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(set.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="text-xs">
                                  <Badge variant="outline" className="text-xs">
                                    {
                                      getSubjectOptions(set.standard).find(
                                        (s) => s.value === set.subject
                                      )?.label
                                    }
                                  </Badge>
                                </div>
                                <Button
                                  onClick={() => handleStudySet(set)}
                                  size="sm"
                                  className="h-8 text-xs"
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Study
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show grouped sets when a specific standard is selected */}
                {selectedStandard !== "all" &&
                  Object.entries(groupedSets).map(
                    ([standardValue, standardData]) => (
                      <div key={standardValue}>
                        <h2 className="text-xl font-semibold mb-4">
                          {standardData.label}
                        </h2>

                        <div className="space-y-6">
                          {Object.entries(standardData.subjects).map(
                            ([subjectValue, subjectData]) => (
                              <div key={subjectValue}>
                                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                  {subjectData.label}
                                </h3>

                                <div
                                  className={
                                    viewMode === "grid"
                                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                                      : "space-y-4"
                                  }
                                >
                                  {subjectData.sets.map((set, index) => (
                                    <motion.div
                                      key={set.$id}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                    >
                                      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
                                        <div className="relative h-40 overflow-hidden rounded-t-lg">
                                          <img
                                            src={getThumbnailUrl(
                                              set.thumbnailId
                                            )}
                                            alt={set.title}
                                            className="w-full h-full object-cover"
                                          />
                                          <div className="absolute top-2 right-2">
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {set.flashcardCount} cards
                                            </Badge>
                                          </div>
                                        </div>
                                        <CardContent className="p-3 flex-1 flex flex-col">
                                          <h3 className="font-semibold text-base mb-1 line-clamp-1">
                                            {set.title}
                                          </h3>
                                          <p className="text-muted-foreground text-xs mb-3 line-clamp-2 flex-1">
                                            {set.description ||
                                              "No description available"}
                                          </p>
                                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                            <div className="flex items-center gap-1">
                                              <User className="h-3 w-3" />
                                              <span className="truncate max-w-[100px]">
                                                {set.createdByName}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              {new Date(
                                                set.createdAt
                                              ).toLocaleDateString()}
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-end">
                                            <Button
                                              onClick={() =>
                                                handleStudySet(set)
                                              }
                                              size="sm"
                                              className="h-8 text-xs"
                                            >
                                              <Play className="h-3 w-3 mr-1" />
                                              Study
                                            </Button>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </motion.div>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )
                  )}
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
