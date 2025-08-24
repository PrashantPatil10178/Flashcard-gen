"use client";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Settings,
  Shuffle,
  FlipVertical,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Clock,
  Bookmark,
  BookmarkCheck,
  Check,
  X,
  Play,
  Pause,
  RotateCcw as Restart,
} from "lucide-react";
import { storage, STORAGE_BUCKET_ID } from "@/lib/appwrite";
// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";
// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
// Import required modules
import { Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
interface Flashcard {
  id: string;
  frontImageId: string;
  backImageId: string;
  cardNumber: number;
}
interface FlashcardData {
  titleImageId: string;
  flashcards: Flashcard[];
}
interface FlashcardViewerProps {
  flashcardData: FlashcardData;
  title: string;
  onBack: () => void;
}
interface ViewerSettings {
  isVertical: boolean;
  isRandomized: boolean;
  autoPlay: boolean;
  autoPlaySpeed: number; // in seconds
}
interface CardStatus {
  [key: string]: "unknown" | "known" | "difficult";
}
export default function FlashcardViewer({
  flashcardData,
  title,
  onBack,
}: FlashcardViewerProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ViewerSettings>({
    isVertical: true,
    isRandomized: false,
    autoPlay: false,
    autoPlaySpeed: 5,
  });
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [bookmarkedCards, setBookmarkedCards] = useState<Set<string>>(
    new Set()
  );
  const [cardStatus, setCardStatus] = useState<CardStatus>({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [studyTime, setStudyTime] = useState(0); // in seconds
  const [timerActive, setTimerActive] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [dragDirection, setDragDirection] = useState<
    "up" | "down" | "left" | "right" | null
  >(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    setShuffledCards([...flashcardData.flashcards]);
    // Initialize card status
    const initialStatus: CardStatus = {};
    flashcardData.flashcards.forEach((card) => {
      initialStatus[card.id] = "unknown";
    });
    setCardStatus(initialStatus);
  }, [flashcardData.flashcards]);
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive) {
      interval = setInterval(() => {
        setStudyTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive]);
  // Auto-play effect
  useEffect(() => {
    if (settings.autoPlay) {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
      autoPlayTimerRef.current = setTimeout(() => {
        if (swiperRef.current) {
          if (swiperRef.current.isEnd) {
            swiperRef.current.slideTo(0);
          } else {
            swiperRef.current.slideNext();
          }
        }
      }, settings.autoPlaySpeed * 1000);
    }
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [settings.autoPlay, settings.autoPlaySpeed, currentCardIndex, isFlipped]);
  useEffect(() => {
    if (showSummary) {
      setTimerActive(false);
    }
  }, [showSummary]);
  const currentCards = useMemo(() => {
    return settings.isRandomized ? shuffledCards : flashcardData.flashcards;
  }, [settings.isRandomized, shuffledCards, flashcardData.flashcards]);
  const progress = useMemo(
    () => ((currentCardIndex + 1) / currentCards.length) * 100,
    [currentCardIndex, currentCards.length]
  );
  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }, []);
  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if ("vibrate" in navigator) {
      navigator.vibrate(30);
    }
  }, []);
  // Image URL generation
  const getImageUrl = useCallback((imageId: string) => {
    return storage.getFileView(STORAGE_BUCKET_ID, imageId).toString();
  }, []);
  // Preload images
  const preloadImages = useCallback(() => {
    currentCards.forEach((card) => {
      const frontImg = new Image();
      const backImg = new Image();
      frontImg.src = getImageUrl(card.frontImageId);
      backImg.src = getImageUrl(card.backImageId);
    });
  }, [currentCards, getImageUrl]);
  useEffect(() => {
    preloadImages();
  }, [preloadImages]);
  // Handle flip
  const handleFlip = useCallback(() => {
    triggerHaptic();
    setIsFlipped((prev) => !prev);
  }, [triggerHaptic]);
  // Handle slide change
  const handleSlideChange = useCallback(
    (swiper: SwiperType) => {
      const newIndex = swiper.activeIndex;
      if (newIndex !== currentCardIndex) {
        setCurrentCardIndex(newIndex);
        setIsFlipped(false);
        triggerHaptic();
        // Check if we've reached the end
        if (newIndex === currentCards.length - 1) {
          setTimeout(() => {
            setShowSummary(true);
          }, 1000);
        }
      }
    },
    [currentCardIndex, triggerHaptic, currentCards.length]
  );
  // Randomize cards
  const randomizeCards = useCallback(() => {
    const shuffled = [...currentCards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowSummary(false);
    swiperRef.current?.slideTo(0, 0);
    triggerHaptic();
  }, [currentCards, triggerHaptic]);
  // Handle settings change
  const handleSettingsChange = useCallback(
    (key: keyof ViewerSettings, value: any) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      if (key === "isRandomized" && value) {
        randomizeCards();
      } else if (key === "isRandomized" && !value) {
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setShowSummary(false);
        swiperRef.current?.slideTo(0, 0);
      }
      triggerHaptic();
    },
    [randomizeCards, triggerHaptic]
  );
  // Toggle bookmark
  const toggleBookmark = useCallback(() => {
    const currentCard = currentCards[currentCardIndex];
    if (!currentCard) return;
    setBookmarkedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentCard.id)) {
        newSet.delete(currentCard.id);
      } else {
        newSet.add(currentCard.id);
      }
      return newSet;
    });
    triggerHaptic();
  }, [currentCardIndex, currentCards, triggerHaptic]);
  // Update card status
  const updateCardStatus = useCallback(
    (status: "known" | "difficult") => {
      const currentCard = currentCards[currentCardIndex];
      if (!currentCard) return;
      setCardStatus((prev) => ({
        ...prev,
        [currentCard.id]: status,
      }));
      // Auto advance to next card
      setTimeout(() => {
        if (swiperRef.current) {
          if (swiperRef.current.isEnd) {
            setShowSummary(true);
          } else {
            swiperRef.current.slideNext();
          }
        }
      }, 300);
      triggerHaptic();
    },
    [currentCardIndex, currentCards, triggerHaptic]
  );
  // Reset zoom
  const resetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);
  // Increase zoom
  const increaseZoom = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  }, []);
  // Decrease zoom
  const decreaseZoom = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  }, []);
  // Toggle timer
  const toggleTimer = useCallback(() => {
    setTimerActive((prev) => !prev);
  }, []);
  // Handle drag gesture - UPDATED FOR BOTH DIRECTIONS
  const handleDragEnd = useCallback(
    (event: any, info: any) => {
      if (settings.isVertical) {
        // Vertical swiper mode - use horizontal drag for marking
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        if (Math.abs(offset) > 100 || Math.abs(velocity) > 500) {
          if (offset > 0) {
            // Swiped right - mark as difficult
            setDragDirection("right");
            updateCardStatus("difficult");
          } else {
            // Swiped left - mark as known
            setDragDirection("left");
            updateCardStatus("known");
          }
          // Reset drag direction after animation
          setTimeout(() => setDragDirection(null), 300);
        }
      } else {
        // Horizontal swiper mode - use vertical drag for marking
        const offset = info.offset.y;
        const velocity = info.velocity.y;
        if (Math.abs(offset) > 100 || Math.abs(velocity) > 500) {
          if (offset > 0) {
            // Swiped down - mark as difficult
            setDragDirection("down");
            updateCardStatus("difficult");
          } else {
            // Swiped up - mark as known
            setDragDirection("up");
            updateCardStatus("known");
          }
          // Reset drag direction after animation
          setTimeout(() => setDragDirection(null), 300);
        }
      }
    },
    [updateCardStatus, settings.isVertical]
  );
  // Reset study session
  const resetStudySession = useCallback(() => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowSummary(false);
    setZoomLevel(1);
    setStudyTime(0);
    // Reset card status
    const resetStatus: CardStatus = {};
    currentCards.forEach((card) => {
      resetStatus[card.id] = "unknown";
    });
    setCardStatus(resetStatus);
    swiperRef.current?.slideTo(0, 0);
    setTimerActive(true);
    triggerHaptic();
  }, [currentCards, triggerHaptic]);
  // Keyboard navigation - UPDATED FOR BOTH MODES
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSummary) return;
      if (!swiperRef.current) return;
      switch (e.key) {
        case "ArrowLeft":
          if (!settings.isVertical) {
            swiperRef.current.slidePrev();
          }
          break;
        case "ArrowRight":
          if (!settings.isVertical) {
            swiperRef.current.slideNext();
          }
          break;
        case "ArrowUp":
          if (settings.isVertical) {
            swiperRef.current.slidePrev();
          } else {
            // In horizontal mode, up arrow marks as known
            updateCardStatus("known");
          }
          break;
        case "ArrowDown":
          if (settings.isVertical) {
            swiperRef.current.slideNext();
          } else {
            // In horizontal mode, down arrow marks as difficult
            updateCardStatus("difficult");
          }
          break;
        case " ":
          handleFlip();
          break;
        case "b":
          toggleBookmark();
          break;
        case "k":
          updateCardStatus("difficult");
          break;
        case "d":
          updateCardStatus("known");
          break;
        case "r":
          resetZoom();
          break;
        case "+":
          increaseZoom();
          break;
        case "-":
          decreaseZoom();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    handleFlip,
    settings.isVertical,
    toggleBookmark,
    updateCardStatus,
    resetZoom,
    increaseZoom,
    decreaseZoom,
    showSummary,
  ]);
  // Calculate statistics
  const stats = useMemo(() => {
    const total = currentCards.length;
    const known = Object.values(cardStatus).filter(
      (status) => status === "known"
    ).length;
    const difficult = Object.values(cardStatus).filter(
      (status) => status === "difficult"
    ).length;
    const unknown = total - known - difficult;
    const bookmarked = bookmarkedCards.size;
    return { total, known, difficult, unknown, bookmarked };
  }, [currentCards.length, cardStatus, bookmarkedCards]);
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-3 pt-3 pb-1 bg-background/95 backdrop-blur-sm border-b border-border/50 z-10">
        <div className="flex items-center justify-between mb-2">
          <Button onClick={onBack} variant="outline" size="sm" className="h-9">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-lg font-bold text-center flex-1 mx-4 truncate">
            {title}
          </h1>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="flex-shrink-0 h-7 px-2 text-xs"
            >
              {currentCardIndex + 1}/{currentCards.length}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTime(studyTime)}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-1"
                onClick={toggleTimer}
              >
                {timerActive ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
            </div>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Flashcard Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {settings.isVertical ? (
                        <FlipVertical className="h-4 w-4" />
                      ) : (
                        <FlipHorizontal className="h-4 w-4" />
                      )}
                      <Label htmlFor="vertical-mode">Vertical Scrolling</Label>
                    </div>
                    <Switch
                      id="vertical-mode"
                      checked={settings.isVertical}
                      onCheckedChange={(checked) =>
                        handleSettingsChange("isVertical", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shuffle className="h-4 w-4" />
                      <Label htmlFor="randomize">Randomize Cards</Label>
                    </div>
                    <Switch
                      id="randomize"
                      checked={settings.isRandomized}
                      onCheckedChange={(checked) =>
                        handleSettingsChange("isRandomized", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Play className="h-4 w-4" />
                      <Label htmlFor="autoplay">Auto Play</Label>
                    </div>
                    <Switch
                      id="autoplay"
                      checked={settings.autoPlay}
                      onCheckedChange={(checked) =>
                        handleSettingsChange("autoPlay", checked)
                      }
                    />
                  </div>
                  {settings.autoPlay && (
                    <div className="space-y-2">
                      <Label htmlFor="autoplay-speed">
                        Auto Play Speed: {settings.autoPlaySpeed}s
                      </Label>
                      <input
                        id="autoplay-speed"
                        type="range"
                        min="2"
                        max="15"
                        step="1"
                        value={settings.autoPlaySpeed}
                        onChange={(e) =>
                          handleSettingsChange(
                            "autoPlaySpeed",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full"
                      />
                    </div>
                  )}
                  {settings.isRandomized && (
                    <div className="pt-2">
                      <Button
                        onClick={randomizeCards}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Shuffle className="h-4 w-4 mr-2" />
                        Shuffle Again
                      </Button>
                    </div>
                  )}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium mb-2">
                      Study Statistics
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        <span>Known: {stats.known}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <span>Difficult: {stats.difficult}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                        <span>Unknown: {stats.unknown}</span>
                      </div>
                      <div className="flex items-center">
                        <Bookmark className="h-3 w-3 text-blue-500 mr-2" />
                        <span>Bookmarked: {stats.bookmarked}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="mb-1">
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-muted-foreground text-center mt-1">
            Progress: {Math.round(progress)}%
          </p>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {showSummary ? (
          // Summary Screen
          <div className="flex flex-col items-center justify-center h-full p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md bg-card rounded-2xl shadow-lg p-6 border border-border"
            >
              <h2 className="text-2xl font-bold text-center mb-6">
                Study Session Complete!
              </h2>
              <div className="space-y-4 mb-6 text-secondary">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center ">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span className="font-medium">Known</span>
                  </div>
                  <span className="text-lg font-bold">{stats.known}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <X className="h-5 w-5 text-red-500 mr-2" />
                    <span className="font-medium">Needs Practice</span>
                  </div>
                  <span className="text-lg font-bold">{stats.difficult}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-5 h-5 rounded-full bg-gray-300 mr-2"></div>
                    <span className="font-medium">Not Reviewed</span>
                  </div>
                  <span className="text-lg font-bold">{stats.unknown}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <Bookmark className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="font-medium">Bookmarked</span>
                  </div>
                  <span className="text-lg font-bold">{stats.bookmarked}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-purple-500 mr-2" />
                    <span className="font-medium">Study Time</span>
                  </div>
                  <span className="text-lg font-bold">
                    {formatTime(studyTime)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 ">
                <Button
                  onClick={resetStudySession}
                  variant="default"
                  className="flex-1"
                >
                  <Restart className="h-4 w-4 mr-2" />
                  Restart Session
                </Button>
                <Button onClick={onBack} variant="outline" className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sets
                </Button>
              </div>
            </motion.div>
          </div>
        ) : (
          // Swiper Container
          <Swiper
            direction={settings.isVertical ? "vertical" : "horizontal"}
            pagination={{ clickable: true }}
            modules={[Pagination]}
            onSlideChange={handleSlideChange}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            className="w-full h-full"
            spaceBetween={20}
            slidesPerView={1}
            centeredSlides={true}
            touchRatio={1}
            threshold={5}
            speed={300}
            style={{
              height: settings.isVertical ? "100%" : "auto",
            }}
          >
            {currentCards.map((card, index) => {
              const currentImageId =
                isFlipped && index === currentCardIndex
                  ? card.backImageId
                  : card.frontImageId;
              const imageUrl = getImageUrl(currentImageId);
              const isLoading = loadingImages.has(currentImageId);
              const isBookmarked = bookmarkedCards.has(card.id);
              const status = cardStatus[card.id] || "unknown";
              return (
                <SwiperSlide
                  key={card.id}
                  className="flex items-center justify-center px-2"
                  style={{
                    height: settings.isVertical ? "auto" : "100%",
                  }}
                >
                  <motion.div
                    drag={settings.isVertical ? "x" : "y"}
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.2}
                    onDragEnd={handleDragEnd}
                    whileTap={{ scale: 0.98 }}
                    className="relative"
                  >
                    <Card
                      className="overflow-hidden shadow-2xl border-0 bg-white rounded-3xl relative py-0"
                      style={{
                        width: "280px",
                        height: "600px",
                      }}
                    >
                      {/* Swipe indicators - UPDATED FOR BOTH MODES */}
                      {settings.isVertical ? (
                        <>
                          {/* Vertical mode - left/right indicators */}
                          <div className="absolute top-1/2 left-4 transform -translate-y-1/2 z-20 pointer-events-none">
                            <motion.div
                              animate={{
                                opacity: dragDirection === "left" ? 1 : 0.3,
                              }}
                              className="text-green-500"
                            >
                              <Check className="h-12 w-12" />
                            </motion.div>
                          </div>
                          <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-20 pointer-events-none">
                            <motion.div
                              animate={{
                                opacity: dragDirection === "right" ? 1 : 0.3,
                              }}
                              className="text-red-500"
                            >
                              <X className="h-12 w-12" />
                            </motion.div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Horizontal mode - top/bottom indicators */}
                          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
                            <motion.div
                              animate={{
                                opacity: dragDirection === "up" ? 1 : 0.3,
                              }}
                              className="text-green-500"
                            >
                              <Check className="h-12 w-12" />
                            </motion.div>
                          </div>
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
                            <motion.div
                              animate={{
                                opacity: dragDirection === "down" ? 1 : 0.3,
                              }}
                              className="text-red-500"
                            >
                              <X className="h-12 w-12" />
                            </motion.div>
                          </div>
                        </>
                      )}
                      {/* Status indicator */}
                      <div className="absolute top-2 right-2 z-20">
                        {status === "known" && (
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        )}
                        {status === "difficult" && (
                          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-md">
                            <X className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                      {/* Bookmark indicator */}
                      <div className="absolute top-2 left-2 z-20">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0 rounded-full bg-background/80 hover:bg-background shadow-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark();
                          }}
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="h-6 w-6 text-blue-500 fill-blue-500" />
                          ) : (
                            <Bookmark className="h-6 w-6 text-blue-500" />
                          )}
                        </Button>
                      </div>
                      <CardContent className="p-0 h-full relative m-0">
                        <div
                          onClick={handleFlip}
                          className="relative w-full h-full rounded-3xl overflow-hidden cursor-pointer"
                          style={{ padding: 0, margin: 0 }}
                        >
                          {/* Loading State */}
                          {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10 rounded-3xl">
                              <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
                            </div>
                          )}
                          {/* Image with flip animation */}
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                              key={`${card.id}-${
                                index === currentCardIndex ? isFlipped : false
                              }`}
                              initial={{ rotateY: 90, opacity: 0.8 }}
                              animate={{ rotateY: 0, opacity: 1 }}
                              exit={{ rotateY: -90, opacity: 0.8 }}
                              transition={{
                                duration: 0.3,
                                ease: "easeInOut",
                              }}
                              className="absolute inset-0 w-full h-full"
                              style={{
                                padding: 0,
                                margin: 0,
                                transform: `scale(${zoomLevel})`,
                                transformOrigin: "center center",
                              }}
                            >
                              <img
                                src={imageUrl}
                                alt={`Card ${card.cardNumber} ${
                                  isFlipped ? "back" : "front"
                                }`}
                                className="w-full h-full object-cover rounded-3xl"
                                style={{
                                  userSelect: "none",
                                  WebkitUserSelect: "none",
                                  WebkitTouchCallout: "none",
                                  padding: 0,
                                  margin: 0,
                                }}
                                loading="lazy"
                                draggable={false}
                                onLoadStart={() => {
                                  setLoadingImages(
                                    (prev) => new Set(prev.add(currentImageId))
                                  );
                                }}
                                onLoad={() => {
                                  setLoadingImages((prev) => {
                                    const newSet = new Set(prev);
                                    newSet.delete(currentImageId);
                                    return newSet;
                                  });
                                }}
                                onError={() => {
                                  setLoadingImages((prev) => {
                                    const newSet = new Set(prev);
                                    newSet.delete(currentImageId);
                                    return newSet;
                                  });
                                }}
                              />
                            </motion.div>
                          </AnimatePresence>
                          {/* Zoom controls */}
                          {zoomLevel !== 1 && (
                            <div className="absolute bottom-4 right-4 z-20 flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 w-10 p-0 rounded-full bg-background/80 hover:bg-background shadow-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  decreaseZoom();
                                }}
                              >
                                <ZoomOut className="h-5 w-5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 w-10 p-0 rounded-full bg-background/80 hover:bg-background shadow-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resetZoom();
                                }}
                              >
                                <RotateCcw className="h-5 w-5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 w-10 p-0 rounded-full bg-background/80 hover:bg-background shadow-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  increaseZoom();
                                }}
                              >
                                <ZoomIn className="h-5 w-5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}
      </div>
      {/* Footer with instructions - UPDATED FOR BOTH MODES */}
      {/* {!showSummary && (
        <div className="flex-shrink-0 bg-background/98 backdrop-blur-md border-t border-border/40 px-3 py-2">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {settings.isVertical
                ? "Swipe up/down to navigate • Tap card to flip"
                : "Swipe left/right to navigate • Tap card to flip"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {settings.isVertical
                ? "Swipe card right to mark as difficult • Swipe left for known"
                : "Swipe card down to mark as difficult • Swipe up for known"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Keyboard:{" "}
              {settings.isVertical
                ? "Up/Down arrows to navigate, Left/Right for card status"
                : "Left/Right arrows to navigate, Up/Down for card status"}
              , Space to flip, B to bookmark, D for known, K for difficult
            </p>
          </div>
        </div>
      )} */}
      <style jsx global>{`
        .swiper {
          width: 100%;
          height: 100%;
        }
        .swiper-slide {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .swiper-pagination {
          position: absolute !important;
          bottom: 80px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: auto !important;
        }
        .swiper-pagination-bullet {
          background: hsl(var(--primary)) !important;
          opacity: 0.4 !important;
          width: 8px !important;
          height: 8px !important;
          margin: 0 4px !important;
        }
        .swiper-pagination-bullet-active {
          opacity: 1 !important;
        }
        /* Vertical pagination positioning */
        .swiper-vertical .swiper-pagination {
          right: 20px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          left: auto !important;
          width: auto !important;
        }
        .swiper-vertical .swiper-pagination-bullet {
          display: block !important;
          margin: 4px 0 !important;
        }
        /* Remove any default padding/margins from card components */
        .swiper-slide .card-content {
          padding: 0 !important;
          margin: 0 !important;
        }
        /* Mobile-specific styles */
        @media (max-width: 640px) {
          .swiper-pagination {
            bottom: 100px !important;
          }
          .swiper-vertical .swiper-pagination {
            right: 15px !important;
          }
        }
      `}</style>
    </div>
  );
}
