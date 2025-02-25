import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileJson,
  Download,
  AlertCircle,
  Moon,
  Sun,
  Activity,
  BarChart,
  Calendar,
  BookOpen,
  RefreshCw,
  LineChart,
  MessageCircle,
  FileText,
  ChevronDown,
  Coins,
  LayersIcon,
  PenTool,
  Layers,
} from "lucide-react";
import Analytics from "./Analytics";

const stripHtmlTags = (html) => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
};

const CourseIQ = () => {
  // State declarations
  const [sourceData, setSourceData] = useState(null);
  const [transformedData, setTransformedData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [transformedFiles, setTransformedFiles] = useState([]);
  const [activityFilter, setActivityFilter] = useState("all");
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [fileFilter, setFileFilter] = useState({
    dateRange: null,
    courseType: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [batchProgress, setBatchProgress] = useState(null);

  // BatchProgress component
  const BatchProgress = ({ progress }) => {
    if (!progress) return null;

    return (
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Processing files:</span>
          <span>
            {progress.processed} / {progress.total}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(progress.processed / progress.total) * 100}%` }}
          />
        </div>
        {progress.successful.length > 0 && (
          <div className="text-sm text-green-500">
            Successfully processed: {progress.successful.length}
          </div>
        )}
        {progress.failed.length > 0 && (
          <div className="text-sm text-red-500">
            Failed: {progress.failed.length}
          </div>
        )}
      </div>
    );
  };

  const toggleActivityDetails = (activityId) => {
    setExpandedActivity(expandedActivity === activityId ? null : activityId);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  // Fetch transformed files
  const fetchTransformedFiles = async () => {
    try {
      const queryParams = new URLSearchParams({
        search: searchTerm,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 20,
        ...(fileFilter.dateRange && {
          dateRange: JSON.stringify(fileFilter.dateRange),
        }),
        ...(fileFilter.courseType && { courseType: fileFilter.courseType }),
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/files?${queryParams}`
      );
      const data = await response.json();

      if (data.success) {
        let files = data.files || [];

        // Sort files based on selected criteria
        files = files.sort((a, b) => {
          const fileA = typeof a === "string" ? a : a.filename;
          const fileB = typeof b === "string" ? b : b.filename;

          switch (sortBy) {
            case "name":
              // Extract course number and sort
              const courseNumA = fileA.match(/([A-Z]+\d+)/)?.[1] || "";
              const courseNumB = fileB.match(/([A-Z]+\d+)/)?.[1] || "";
              return sortOrder === "asc"
                ? courseNumA.localeCompare(courseNumB)
                : courseNumB.localeCompare(courseNumA);

            case "date":
              const dateA = new Date(a.metadata?.lastUpdated || 0);
              const dateB = new Date(b.metadata?.lastUpdated || 0);
              return sortOrder === "asc" ? dateA - dateB : dateB - dateA;

            case "type":
              const typeA = getCourseType(a.metadata?.courseDesignModel || "");
              const typeB = getCourseType(b.metadata?.courseDesignModel || "");
              return sortOrder === "asc"
                ? typeA.localeCompare(typeB)
                : typeB.localeCompare(typeA);

            default:
              return 0;
          }
        });

        setTransformedFiles(files);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      setError("Failed to fetch transformed files");
    }
  };

  // Add this helper function
  const getCourseType = (designModel = "") => {
    if (designModel.includes("GUIDED_PATH")) return "Guided Path";
    if (designModel.includes("FLEX_PATH")) return "Flex Path";
    return "Custom";
  };

  // Initial fetch of transformed files
  useEffect(() => {
    fetchTransformedFiles();
  }, [searchTerm, sortBy, sortOrder, currentPage, fileFilter]);

  // Handle single file upload
  const handleFileUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      // Check if this is an output file
      if (file.name.includes("_output.json")) {
        setError(
          "Please select a source JSON file, not a transformed output file."
        );
        return;
      }

      setIsLoading(true);
      setError(null);
      setSelectedFile(file);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/transform`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log("Setting transformed data:", result.data);
        setTransformedData(result.data);
        await fetchTransformedFiles(); // Refresh file list immediately
      } else {
        setError(result.error || "Transformation failed");
      }
    } catch (err) {
      console.error("Error during transformation:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  // Handle batch file upload
  const handleBatchUpload = async (event) => {
    try {
      const files = Array.from(event.target.files);
      if (files.length === 0) return;

      // Check for output files
      if (files.some((file) => file.name.includes("_output.json"))) {
        setError(
          "Please select only source JSON files, not transformed output files."
        );
        return;
      }

      setIsLoading(true);
      setError(null);
      setBatchProgress({
        total: files.length,
        processed: 0,
        successful: [],
        failed: [],
      });

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/transform/batch`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Handle non-JSON response
        const text = await response.text();
        console.error("Received non-JSON response:", text);
        throw new Error("Server returned non-JSON response");
      }

      if (result.success) {
        setBatchProgress({
          processed: result.results.totalProcessed,
          total: files.length,
          successful: result.results.successful || [],
          failed: result.results.failed || [],
        });

        // Refresh file list immediately after batch processing
        await fetchTransformedFiles();

        if (result.results.failed && result.results.failed.length > 0) {
          setError(
            `${result.results.failed.length} files failed to process. Check console for details.`
          );
          console.error("Failed files:", result.results.failed);
        }
      } else {
        throw new Error(result.error || "Batch processing failed");
      }
    } catch (err) {
      console.error("Error during batch processing:", err);
      setError(`Batch processing error: ${err.message}`);
    } finally {
      setIsLoading(false);
      event.target.value = ""; // Clear the file input
    }
  };

  // Load Transformed File
  const loadTransformedFile = async (filename) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/files/${encodeURIComponent(
          filename
        )}`
      );
      const result = await response.json();

      if (result.success) {
        setTransformedData(result.data);
        setSelectedFile({ name: filename });
      } else {
        setError(result.error || "Failed to load file");
      }
    } catch (err) {
      console.error("Error loading transformed file:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file download
  const downloadTransformedFile = async (filename) => {
    try {
      window.open(
        `${import.meta.env.VITE_API_URL}/api/download/${filename}`,
        "_blank"
      );
    } catch (error) {
      console.error("Error downloading file:", error);
      setError("Error downloading file");
    }
  };

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}
    >
      {/* Header */}
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
              CourseIQ
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="rounded-full"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Main Content Layout */}
        <div className="flex gap-6">
          {/* Sidebar with Transformed Files */}
          <div className="w-80 flex-shrink-0">
            <Card className="bg-white dark:bg-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-blue-500" />
                  Transformed Files
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    placeholder="Search files..."
                    className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="mt-2 space-y-2">
                    <select
                      className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="date">Sort by Date</option>
                      <option value="name">Sort by Name</option>
                      <option value="type">Sort by Type</option>
                    </select>
                    <select
                      className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      value={fileFilter.courseType || ""}
                      onChange={(e) =>
                        setFileFilter({
                          ...fileFilter,
                          courseType: e.target.value || null,
                        })
                      }
                    >
                      <option value="">All Course Types</option>
                      <option value="guided">Guided Path</option>
                      <option value="flex">Flex Path</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transformedFiles.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-4">
                      No transformed files yet
                    </p>
                  ) : (
                    transformedFiles.map((file) => {
                      const filename =
                        typeof file === "string" ? file : file.filename;

                      // Get identifier from filename
                      const identifierMatch =
                        filename.match(/_(\d+)_output\.json$/);
                      const identifier = identifierMatch?.[1] || "";

                      // If we have access to the file data, use that, otherwise use filename parsing
                      let courseNumber = filename;
                      let courseType = "Unknown";

                      if (file.metadata?.courseDesignModel) {
                        courseType = file.metadata.courseDesignModel.includes(
                          "FLEX_PATH"
                        )
                          ? "Flex Path"
                          : "Guided Path";
                      }

                      if (file.courseName) {
                        courseNumber = file.courseNumber || courseNumber;
                      }

                      return (
                        <div
                          key={filename}
                          className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {courseNumber}
                              </span>
                              {identifier && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  #{identifier}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center mt-1">
                              <div className="w-24">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                                  {courseType}
                                </span>
                              </div>
                              {/* Date with consistent alignment */}
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(
                                  file.metadata?.lastUpdated
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadTransformedFile(filename)}
                              className="text-blue-500 hover:text-blue-600"
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadTransformedFile(filename)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {transformedFiles.length > 0 && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <Card className="bg-white dark:bg-gray-800 shadow-lg mb-6">
              <CardHeader>
                <CardTitle>Transform Your Course Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <Button
                      className="bg-blue-500 hover:bg-blue-600 text-white relative overflow-hidden px-6 py-3 h-auto text-lg"
                      disabled={isLoading}
                    >
                      <span className="flex items-center gap-3">
                        {isLoading ? (
                          <RefreshCw className="h-6 w-6 animate-spin" />
                        ) : (
                          <Upload size={24} />
                        )}
                        {isLoading ? "Processing..." : "Select Files"}
                      </span>
                      <input
                        type="file"
                        accept=".json"
                        multiple
                        onChange={handleBatchUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={isLoading}
                      />
                    </Button>

                    {selectedFile && (
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Selected: {selectedFile.name}
                        </span>
                        <span className="text-xs text-blue-500">
                          {selectedFile.name.includes("_output.json")
                            ? "Viewing transformed output"
                            : "Only select source JSON files, not transformed outputs"}
                        </span>
                      </div>
                    )}
                  </div>

                  <BatchProgress progress={batchProgress} />

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabs Section */}
            {transformedData && (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-4"
              >
                <TabsList className="grid grid-cols-4 gap-4 w-full">
                  <TabsTrigger
                    value="overview"
                    className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                  >
                    <BarChart className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="weeks"
                    className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                  >
                    <Calendar className="h-4 w-4" />
                    Weekly Content
                  </TabsTrigger>
                  <TabsTrigger
                    value="activities"
                    className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                  >
                    <BookOpen className="h-4 w-4" />
                    Activities
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                  >
                    <LineChart className="h-4 w-4" />
                    Analytics
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="grid gap-6">
                    {/* Basic Course Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-blue-500" />
                          Course Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Course Name
                            </p>
                            <p className="font-medium text-lg">
                              {transformedData.course.name}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Course Number
                            </p>
                            <p className="font-medium text-lg">
                              {transformedData.course.number}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Credits
                            </p>
                            <p className="font-medium text-lg">
                              {transformedData.course.credits}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Version
                            </p>
                            <p className="font-medium text-lg">
                              {transformedData.course.version}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Course Metadata */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-blue-500" />
                          Course Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Last Updated
                            </p>
                            <p className="font-medium">
                              {new Date(
                                transformedData.metadata.lastUpdated
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Effective Date
                            </p>
                            <p className="font-medium">
                              {transformedData.metadata.effectiveDate
                                ? new Date(
                                    transformedData.metadata.effectiveDate
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })
                                : "Not set"}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              CourseIQ Analysis Date
                            </p>
                            <p className="font-medium">
                              {new Date().toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Course Stats */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart className="h-5 w-5 text-blue-500" />
                          Course Structure
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Total Weeks
                            </p>
                            <p className="text-2xl font-bold text-blue-500">
                              {transformedData.metadata.totalWeeks}
                            </p>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Total Activities
                            </p>
                            <p className="text-2xl font-bold text-blue-500">
                              {transformedData.activityCounts.total}
                            </p>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Total Points
                            </p>
                            <p className="text-2xl font-bold text-blue-500">
                              {transformedData.course.totalPoints}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Competencies */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-blue-500" />
                          Course Competencies
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {transformedData.competencies.map(
                            (competency, index) => (
                              <div
                                key={competency.id}
                                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <h4 className="font-medium mb-2">
                                      Competency {index + 1}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                      {competency.text}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm px-2 py-1 rounded">
                                      {competency.activities.length} Activities
                                    </span>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                      {competency.totalPoints} Points
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Additional Course Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileJson className="h-5 w-5 text-blue-500" />
                          Additional Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Course Design Model
                            </p>
                            <p className="font-medium">
                              {transformedData.metadata.courseDesignModel ||
                                "Standard"}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Course Status
                            </p>
                            <p className="font-medium">
                              {transformedData.metadata.status}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Last Updated By
                            </p>
                            <p className="font-medium">
                              {transformedData.metadata.updatedBy}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Grading Scheme */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart className="h-5 w-5 text-blue-500" />
                          Grading Scheme
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(transformedData.gradingScheme).map(
                            ([grade, criteria]) => (
                              <div
                                key={grade}
                                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center"
                              >
                                <p className="text-2xl font-bold text-blue-500">
                                  {grade}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {criteria.min
                                    ? `≥ ${criteria.min}%`
                                    : `≤ ${criteria.max}%`}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Weekly Content Tab */}
                <TabsContent value="weeks">
                  <div className="grid grid-cols-1 gap-6">
                    {transformedData.weeks.map((week) => (
                      <Card
                        key={week.weekNumber}
                        className="bg-white dark:bg-gray-800 shadow-lg"
                      >
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-xl mb-2">{`Week ${week.weekNumber}: ${week.title}`}</CardTitle>
                              {week.introduction && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                  {stripHtmlTags(week.introduction.text)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm px-3 py-1 rounded-full">
                                {week.activities.length} Activities
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {/* Activity Distribution */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                  Study Activities
                                </h4>
                                <div className="flex justify-between items-center">
                                  <span className="text-2xl font-bold text-blue-500">
                                    {
                                      week.activities.filter(
                                        (a) =>
                                          a.activityType.toLowerCase() ===
                                          "study"
                                      ).length
                                    }
                                  </span>
                                  <BookOpen className="h-5 w-5 text-gray-400" />
                                </div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                  Discussions
                                </h4>
                                <div className="flex justify-between items-center">
                                  <span className="text-2xl font-bold text-green-500">
                                    {
                                      week.activities.filter(
                                        (a) =>
                                          a.activityType.toLowerCase() ===
                                          "discussion"
                                      ).length
                                    }
                                  </span>
                                  <MessageCircle className="h-5 w-5 text-gray-400" />
                                </div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                  Assignments
                                </h4>
                                <div className="flex justify-between items-center">
                                  <span className="text-2xl font-bold text-purple-500">
                                    {
                                      week.activities.filter(
                                        (a) =>
                                          a.activityType.toLowerCase() ===
                                          "assignment"
                                      ).length
                                    }
                                  </span>
                                  <FileText className="h-5 w-5 text-gray-400" />
                                </div>
                              </div>
                            </div>

                            {/* Points and Competencies */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                                  Points Distribution
                                </h4>
                                <div className="space-y-2">
                                  {week.activities
                                    .filter(
                                      (activity) => activity.gradePoints > 0
                                    )
                                    .map((activity) => (
                                      <div
                                        key={activity.id}
                                        className="flex justify-between items-center"
                                      >
                                        <span className="text-sm truncate">
                                          {activity.title}
                                        </span>
                                        <span className="font-medium">
                                          {activity.gradePoints} pts
                                        </span>
                                      </div>
                                    ))}
                                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                                    <div className="flex justify-between items-center font-medium">
                                      <span>Total Points</span>
                                      <span className="text-blue-500">
                                        {week.activities.reduce(
                                          (sum, activity) =>
                                            sum + (activity.gradePoints || 0),
                                          0
                                        )}{" "}
                                        pts
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                                  Competencies Covered
                                </h4>
                                <div className="space-y-2">
                                  {Array.from(
                                    new Set(
                                      week.activities.flatMap(
                                        (activity) =>
                                          activity.competencies || []
                                      )
                                    )
                                  ).map((competencyId) => {
                                    const competency =
                                      transformedData.competencies.find(
                                        (c) => c.id === competencyId
                                      );
                                    return competency ? (
                                      <div
                                        key={competencyId}
                                        className="text-sm"
                                      >
                                        • {competency.text}
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Activity Sequence */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                                Activity Sequence
                              </h4>
                              <div className="space-y-2">
                                {week.activities.map((activity, index) => (
                                  <div
                                    key={activity.id}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                  >
                                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                        <p className="font-medium truncate">
                                          {activity.title}
                                        </p>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                          {activity.code}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                          {activity.activityType}
                                        </span>
                                        {activity.gradePoints > 0 && (
                                          <>
                                            <span className="text-gray-300 dark:text-gray-600">
                                              •
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                              {activity.gradePoints} points
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Resources */}
                            {week.resources && week.resources.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                                  Week Resources
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {week.resources.map((resource) => (
                                    <div
                                      key={resource.id}
                                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                    >
                                      <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                                      <div>
                                        <p className="font-medium text-sm">
                                          {resource.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          Type: {resource.type}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Activities Tab */}
                <TabsContent value="activities">
                  {/* Activity Type Filter */}
                  <div className="mb-6 flex flex-wrap gap-2">
                    <Button
                      variant={activityFilter === "all" ? "default" : "outline"}
                      className="gap-2"
                      onClick={() => setActivityFilter("all")}
                    >
                      <Layers className="h-4 w-4" />
                      All Types
                    </Button>
                    <Button
                      variant={
                        activityFilter === "study" ? "default" : "outline"
                      }
                      className="gap-2"
                      onClick={() => setActivityFilter("study")}
                    >
                      <BookOpen className="h-4 w-4" />
                      Study
                    </Button>
                    <Button
                      variant={
                        activityFilter === "discussion" ? "default" : "outline"
                      }
                      className="gap-2"
                      onClick={() => setActivityFilter("discussion")}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Discussion
                    </Button>
                    <Button
                      variant={
                        activityFilter === "assignment" ? "default" : "outline"
                      }
                      className="gap-2"
                      onClick={() => setActivityFilter("assignment")}
                    >
                      <FileText className="h-4 w-4" />
                      Assignment
                    </Button>
                    <Button
                      variant={
                        activityFilter === "quiz" ? "default" : "outline"
                      }
                      className="gap-2"
                      onClick={() => setActivityFilter("quiz")}
                    >
                      <PenTool className="h-4 w-4" />
                      Quiz
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {transformedData.weeks.map((week) => {
                      // Filter activities based on selected type
                      const filteredActivities = week.activities.filter(
                        (activity) =>
                          activityFilter === "all" ||
                          activity.activityType.toLowerCase() ===
                            activityFilter.toLowerCase()
                      );

                      // Only show weeks that have activities after filtering
                      if (filteredActivities.length === 0) return null;

                      return (
                        <Card
                          key={week.weekNumber}
                          className="bg-white dark:bg-gray-800 shadow-lg"
                        >
                          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-xl">
                                Week {week.weekNumber}: {week.title}
                              </CardTitle>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                  <Layers className="h-4 w-4" />
                                  {filteredActivities.length} Activities
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                  <Coins className="h-4 w-4" />
                                  {filteredActivities.reduce(
                                    (sum, a) => sum + (a.gradePoints || 0),
                                    0
                                  )}{" "}
                                  Points
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="space-y-6">
                              {filteredActivities.map((activity) => (
                                <div
                                  key={activity.id}
                                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                                >
                                  {/* Activity Header */}
                                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 flex justify-between items-start">
                                    <div className="flex items-start gap-4">
                                      <div
                                        className={`
                                        p-2 rounded-lg 
                                        ${
                                          activity.activityType.toLowerCase() ===
                                          "study"
                                            ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                            : ""
                                        }
                                        ${
                                          activity.activityType.toLowerCase() ===
                                          "discussion"
                                            ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                                            : ""
                                        }
                                        ${
                                          activity.activityType.toLowerCase() ===
                                          "assignment"
                                            ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                                            : ""
                                        }
                                        ${
                                          activity.activityType.toLowerCase() ===
                                          "quiz"
                                            ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                                            : ""
                                        }
                                      `}
                                      >
                                        {activity.activityType.toLowerCase() ===
                                          "study" && (
                                          <BookOpen className="h-5 w-5" />
                                        )}
                                        {activity.activityType.toLowerCase() ===
                                          "discussion" && (
                                          <MessageCircle className="h-5 w-5" />
                                        )}
                                        {activity.activityType.toLowerCase() ===
                                          "assignment" && (
                                          <FileText className="h-5 w-5" />
                                        )}
                                        {activity.activityType.toLowerCase() ===
                                          "quiz" && (
                                          <PenTool className="h-5 w-5" />
                                        )}
                                      </div>
                                      <div>
                                        <h3 className="font-medium text-lg">
                                          {activity.title}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1">
                                          <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                                            {activity.code}
                                          </span>
                                          {activity.gradePoints > 0 && (
                                            <span className="text-sm bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                                              {activity.gradePoints} Points
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        toggleActivityDetails(activity.id)
                                      }
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  {/* Activity Details (Expandable) */}
                                  {expandedActivity === activity.id && (
                                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Left Column */}
                                        <div className="space-y-4">
                                          {/* Activity Text */}
                                          {activity.text && (
                                            <div>
                                              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                                Activity Description
                                              </h4>
                                              <div
                                                className="prose dark:prose-invert max-w-none"
                                                dangerouslySetInnerHTML={{
                                                  __html: activity.text,
                                                }}
                                              />
                                            </div>
                                          )}

                                          {/* Competencies */}
                                          {activity.competencies &&
                                            activity.competencies.length >
                                              0 && (
                                              <div>
                                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                                  Competencies Addressed
                                                </h4>
                                                <div className="space-y-2">
                                                  {activity.competencies.map(
                                                    (compId) => {
                                                      const comp =
                                                        transformedData.competencies.find(
                                                          (c) => c.id === compId
                                                        );
                                                      return (
                                                        comp && (
                                                          <div
                                                            key={compId}
                                                            className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded"
                                                          >
                                                            {comp.text}
                                                          </div>
                                                        )
                                                      );
                                                    }
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>

                                        {/* Right Column */}
                                        <div className="space-y-4">
                                          {/* Grading Details */}
                                          {activity.scoringGuide && (
                                            <div>
                                              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                                Scoring Guide
                                              </h4>
                                              <div className="space-y-2">
                                                {activity.scoringGuide.criteria.map(
                                                  (criterion) => (
                                                    <div
                                                      key={criterion.id}
                                                      className="bg-gray-100 dark:bg-gray-800 p-3 rounded"
                                                    >
                                                      <p className="text-sm font-medium mb-1">
                                                        {criterion.text}
                                                      </p>
                                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Points:{" "}
                                                        {criterion.gradePoints}
                                                      </p>
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {/* Resources */}
                                          {activity.resources &&
                                            activity.resources.length > 0 && (
                                              <div>
                                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                                  Activity Resources
                                                </h4>
                                                <div className="space-y-2">
                                                  {activity.resources.map(
                                                    (resource) => (
                                                      <div
                                                        key={resource.id}
                                                        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded"
                                                      >
                                                        <FileText className="h-4 w-4 text-gray-400" />
                                                        <span className="text-sm">
                                                          {resource.name}
                                                        </span>
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="analytics">
                  <Analytics data={transformedData} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseIQ;
