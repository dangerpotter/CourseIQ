// Imports
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path");
const {
  CourseTransformer,
  validateTransformedData,
} = require("./data_transformer");
const BatchProcessor = require("./batchProcessor");
const FileManager = require("./fileManager");

// Initialize Express app
const app = express();

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, "..", "output"),
  uploadsDir: path.join(__dirname, "..", "uploads"),
  createBackup: true,
  validateActivities: true,
  batchProcessing: {
    concurrentLimit: 3,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 50,
  },
  activityValidation: {
    requireText: true,
    validateSequencing: true,
    checkCompetencyMapping: true,
    requireActivityCode: true,
    enforceTypeOrder: true,
  },
  detailedLogging: true,
  caching: {
    enabled: true,
    duration: 5 * 60 * 1000, // 5 minutes
  },
};

// Initialize file manager
const fileManager = new FileManager(CONFIG.outputDir);

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CONFIG.uploadsDir);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, `${Date.now()}-${sanitizedName}`);
  },
});

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: `File size exceeds limit of ${
          CONFIG.batchProcessing.maxFileSize / (1024 * 1024)
        }MB`,
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: `Maximum number of files (${CONFIG.batchProcessing.maxFiles}) exceeded`,
      });
    }
  }
  next(err);
};

app.use(handleUploadError);

// Multer configuration for single file uploads
const singleUpload = multer({
  storage: storage,
  limits: {
    fileSize: CONFIG.batchProcessing.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/json") {
      cb(null, true);
    } else {
      cb(new Error("Only JSON files are allowed"));
    }
  },
}).single("file");

// Multer configuration for batch uploads
const batchUpload = multer({
  storage: storage,
  limits: {
    fileSize: CONFIG.batchProcessing.maxFileSize,
    files: 50, // Increase this number to handle larger batches
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/json") {
      cb(null, true);
    } else {
      cb(new Error("Only JSON files are allowed"));
    }
  },
}).array("files");

// Update the batch processing endpoint to handle errors better
app.post("/api/transform/batch", async (req, res) => {
  batchUpload(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: `File size exceeds limit of ${
              CONFIG.batchProcessing.maxFileSize / (1024 * 1024)
            }MB`,
          });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            success: false,
            error: `Maximum number of files (${CONFIG.batchProcessing.maxFiles}) exceeded`,
          });
        }
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      } else if (err) {
        return res.status(500).json({
          success: false,
          error: err.message,
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const processor = new BatchProcessor(CONFIG.uploadsDir, CONFIG.outputDir);

      const results = await processor.processDirectory();

      // Clean up uploaded files
      await cleanupUploadedFiles(req.files);

      res.json({
        success: true,
        results: {
          successCount: results.successful.length,
          failureCount: results.failed.length,
          totalProcessed: results.totalProcessed,
          processingTime: results.endTime - results.startTime,
          successful: results.successful,
          failed: results.failed,
        },
      });
    } catch (error) {
      // Clean up files even if there's an error
      if (req.files) {
        await cleanupUploadedFiles(req.files);
      }

      console.error("Batch processing error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  });
});

// Cleanup function for uploaded files
async function cleanupUploadedFiles(files) {
  if (!Array.isArray(files)) files = [files];

  for (const file of files) {
    try {
      if (file && file.path) {
        await fs.unlink(file.path);
      }
    } catch (error) {
      console.warn(`Failed to cleanup file ${file.path}:`, error);
    }
  }
}

// Helper function to validate source data
function validateSourceData(data) {
  const requiredKeys = ["course", "units", "activities", "competencies"];
  const missingKeys = requiredKeys.filter((key) => !data[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Source data missing required keys: ${missingKeys.join(", ")}`
    );
  }

  if (!Array.isArray(data.activities)) {
    throw new Error("Source data activities must be an array");
  }

  data.activities.forEach((activity, index) => {
    if (!activity.activity || !activity.activity.id) {
      throw new Error(`Invalid activity object at index ${index}`);
    }
  });
}

// Helper function to validate activity data
function validateActivityData(weeks, competencies) {
  const issues = [];
  const activityTracker = new Map();
  let totalActivities = 0;

  weeks.forEach((week) => {
    if (!week.activities) {
      issues.push(`Week ${week.weekNumber} has no activities array`);
      return;
    }

    const weekTypeOrder = {
      study: [],
      discussion: [],
      assignment: [],
    };

    week.activities.forEach((activity) => {
      totalActivities++;

      if (activityTracker.has(activity.id)) {
        issues.push(
          `Duplicate activity ID ${activity.id} found in week ${week.weekNumber}`
        );
      }
      activityTracker.set(activity.id, true);

      const type = activity.activityType.toLowerCase();
      if (weekTypeOrder[type]) {
        weekTypeOrder[type].push({
          sequence: activity.sequenceNumber,
          title: activity.title,
        });
      }

      if (CONFIG.activityValidation.requireText && !activity.text) {
        issues.push(
          `Activity ${activity.id} (${activity.title}) in Week ${week.weekNumber} is missing text`
        );
      }

      if (
        CONFIG.activityValidation.validateSequencing &&
        (!activity.sequenceNumber || activity.sequenceNumber <= 0)
      ) {
        issues.push(
          `Activity ${activity.id} (${activity.title}) in Week ${week.weekNumber} has invalid sequence number`
        );
      }

      if (CONFIG.activityValidation.requireActivityCode) {
        const expectedCode = `u${week.weekNumber
          .toString()
          .padStart(2, "0")}${type.charAt(0)}${activity.sequenceNumber}`;
        if (activity.code !== expectedCode) {
          issues.push(
            `Activity ${activity.id} has incorrect code. Expected: ${expectedCode}, Got: ${activity.code}`
          );
        }
      }

      if (
        CONFIG.activityValidation.checkCompetencyMapping &&
        type === "assignment"
      ) {
        if (!activity.competencies || activity.competencies.length === 0) {
          issues.push(
            `Assignment ${activity.id} (${activity.title}) in Week ${week.weekNumber} has no competency mappings`
          );
        }
      }
    });

    if (CONFIG.activityValidation.enforceTypeOrder) {
      const lastStudySeq = Math.max(
        ...weekTypeOrder.study.map((a) => a.sequenceNumber),
        0
      );
      const firstDiscussionSeq = Math.min(
        ...weekTypeOrder.discussion.map((a) => a.sequenceNumber),
        Infinity
      );
      const firstAssignmentSeq = Math.min(
        ...weekTypeOrder.assignment.map((a) => a.sequenceNumber),
        Infinity
      );

      if (firstDiscussionSeq < lastStudySeq) {
        issues.push(
          `Week ${week.weekNumber}: Discussion appears before Study activities`
        );
      }
      if (firstAssignmentSeq < firstDiscussionSeq) {
        issues.push(
          `Week ${week.weekNumber}: Assignment appears before Discussion activities`
        );
      }
    }
  });

  return {
    issues,
    totalUniqueActivities: activityTracker.size,
    actualTotal: totalActivities,
  };
}

// Main transformation function
async function transformCourseData(sourceData, inputFilename) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  console.log(`Starting transformation process at ${timestamp}`);

  try {
    console.log("Validating source data...");
    validateSourceData(sourceData);

    const outputFilename = inputFilename.replace(/\.json$/, "_output.json");
    const outputPath = path.join(CONFIG.outputDir, outputFilename);

    console.log("Transforming data...");
    const transformer = new CourseTransformer(sourceData, outputPath);
    const transformedData = await transformer.transform();

    console.log("Validating transformed data...");
    validateTransformedData(transformedData);

    if (CONFIG.validateActivities) {
      console.log("Validating activities...");
      const activityValidation = validateActivityData(
        transformedData.weeks,
        transformedData.competencies
      );

      if (activityValidation.issues.length > 0) {
        console.warn("\nActivity validation issues found:");
        activityValidation.issues.forEach((issue) =>
          console.warn(`- ${issue}`)
        );
      }
    }

    return {
      success: true,
      data: transformedData,
      outputPath,
    };
  } catch (error) {
    console.error("\nError during transformation:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// API Routes

// Single file transformation
app.post("/api/transform", singleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("Processing file:", req.file.originalname);
    const fileContent = await fs.readFile(req.file.path, "utf8");
    const jsonData = JSON.parse(fileContent);
    const result = await transformCourseData(jsonData, req.file.originalname);

    await cleanupUploadedFiles(req.file);

    if (result.success) {
      const transformer = new CourseTransformer(jsonData, result.outputPath);
      const analytics = transformer.generateActivityAnalytics();

      res.json({
        success: true,
        message: "Transformation completed successfully",
        outputPath: result.outputPath,
        data: {
          ...result.data,
          analytics,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    if (req.file) {
      await cleanupUploadedFiles(req.file);
    }
    console.error("Error during transformation:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Batch transformation
app.post("/api/transform/batch", batchUpload, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const processor = new BatchProcessor(CONFIG.uploadsDir, CONFIG.outputDir);
    const results = await processor.processDirectory();

    await cleanupUploadedFiles(req.files);

    res.json({
      success: true,
      results: {
        successCount: results.successful.length,
        failureCount: results.failed.length,
        totalProcessed: results.totalProcessed,
        processingTime: results.endTime - results.startTime,
        successful: results.successful,
        failed: results.failed,
      },
    });
  } catch (error) {
    if (req.files) {
      await cleanupUploadedFiles(req.files);
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// File management routes
app.get("/api/files", async (req, res) => {
  try {
    const options = {
      search: req.query.search,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      filter: {
        dateRange: req.query.dateRange ? JSON.parse(req.query.dateRange) : null,
        courseType: req.query.courseType,
      },
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const result = await fileManager.getFilesList(options);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/files/:filename", async (req, res) => {
  try {
    const filePath = path.join(CONFIG.outputDir, req.params.filename);
    const fileContent = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(fileContent);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error reading file",
    });
  }
});

app.get("/api/files/:filename/metadata", async (req, res) => {
  try {
    const metadata = await fileManager.getFileMetadata(req.params.filename);
    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }
    res.json({
      success: true,
      metadata,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.delete("/api/files/:filename", async (req, res) => {
  try {
    await fileManager.deleteFile(req.params.filename);
    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Download endpoint
app.get("/api/download/:filename", async (req, res) => {
  try {
    const filePath = path.join(CONFIG.outputDir, req.params.filename);
    res.download(filePath);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error downloading file",
    });
  }
});

// Ensure required directories exist
Promise.all([
  fs.mkdir(CONFIG.outputDir, { recursive: true }),
  fs.mkdir(CONFIG.uploadsDir, { recursive: true }),
])
  .then(() => {
    console.log("Required directories created/verified:");
    console.log(`- Output directory: ${CONFIG.outputDir}`);
    console.log(`- Uploads directory: ${CONFIG.uploadsDir}`);
    // Start the server after directories are created
    const port = 3000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Error creating required directories:", error);
    process.exit(1);
  });

// Export for use as a module
module.exports = {
  transformCourseData,
  CONFIG,
};
