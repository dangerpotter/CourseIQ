const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path");
const {
  CourseTransformer,
  validateTransformedData,
} = require("./data_transformer");

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, "..", "..", "output"),
  createBackup: true,
  validateActivities: true,
  activityValidation: {
    requireText: true,
    validateSequencing: true,
    checkCompetencyMapping: true,
    requireActivityCode: true,
    enforceTypeOrder: true,
  },
  detailedLogging: true,
};

// Helper function to create timestamp
const getTimestamp = () => {
  return new Date().toISOString().replace(/[:.]/g, "-");
};

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

// Main transformation function
async function transformCourseData(sourceData, inputFilename) {
  const timestamp = getTimestamp();
  console.log(`Starting transformation process at ${timestamp}`);

  try {
    // Validate source data
    console.log("Validating source data...");
    validateSourceData(sourceData);

    // Create output filename based on input filename
    const outputFilename = inputFilename.replace(/\.json$/, "_output.json");
    const outputPath = path.join(CONFIG.outputDir, outputFilename);

    // Transform the data
    console.log("Transforming data...");
    const transformer = new CourseTransformer(sourceData, outputPath);
    const transformedData = await transformer.transform();
    const analytics = transformer.generateActivityAnalytics();

    // Validate transformed data
    console.log("Validating transformed data...");
    validateTransformedData(transformedData);

    // Validate activities if enabled
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

      if (
        activityValidation.totalUniqueActivities !==
        transformedData.activityCounts.total
      ) {
        console.warn(
          `\nActivity count mismatch: unique=${activityValidation.totalUniqueActivities}, reported=${transformedData.activityCounts.total}, actual=${activityValidation.actualTotal}`
        );
      }
    }

    // Log success metrics
    if (CONFIG.detailedLogging) {
      console.log("\nTransformation completed successfully!");
      console.log("\nCourse Summary:");
      console.log(
        `- Course: ${transformedData.course.number} - ${transformedData.course.name}`
      );
      console.log(`- Total Weeks: ${transformedData.weeks.length}`);
      console.log(
        `- Total Activities: ${transformedData.activityCounts.total}`
      );

      console.log("\nActivity Distribution:");
      Object.entries(transformedData.activityCounts.byType).forEach(
        ([type, count]) => {
          console.log(`- ${type}: ${count}`);
        }
      );

      console.log("\nWeekly Breakdown:");
      transformedData.weeks.forEach((week) => {
        console.log(`\nWeek ${week.weekNumber}: ${week.title}`);
        console.log(`Total Activities: ${week.activities.length}`);
        week.activities.forEach((activity) => {
          console.log(`- [${activity.code}] ${activity.title}`);
        });
      });
    }

    return {
      success: true,
      data: transformedData,
      outputPath,
    };
  } catch (error) {
    console.error("\nError during transformation process:");
    console.error("-----------------------------------");
    console.error(`Type: ${error.name}`);
    console.error(`Message: ${error.message}`);
    console.error(`Stack: ${error.stack}`);

    return {
      success: false,
      error: error.message,
    };
  }
}

// Set up Express server
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// API endpoint for course transformation
app.post("/api/transform", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("Processing file:", req.file.originalname);
    const jsonData = JSON.parse(req.file.buffer.toString());
    const result = await transformCourseData(jsonData, req.file.originalname);

    if (result.success) {
      console.log("Transformation successful, generating analytics...");
      const transformer = new CourseTransformer(jsonData, result.outputPath);
      const analytics = transformer.generateActivityAnalytics();

      console.log("Analytics generated:", Object.keys(analytics));

      const responseData = {
        success: true,
        message: "Transformation completed successfully",
        outputPath: result.outputPath,
        data: {
          ...result.data,
          analytics,
        },
      };

      console.log(
        "Sending response with data structure:",
        Object.keys(responseData.data)
      );

      res.json(responseData);
    } else {
      console.log("Transformation failed:", result.error);
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error during transformation:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Download endpoint for transformed files
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

// Get list of transformed files
app.get("/api/files", async (req, res) => {
  try {
    const files = await fs.readdir(CONFIG.outputDir);
    res.json({
      success: true,
      files: files.filter((file) => file.endsWith("_output.json")),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error reading files directory",
    });
  }
});

// Start the server
const startServer = (port) => {
  const server = app
    .listen(port)
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.log(`Port ${port} is busy, trying ${port + 1}...`);
        server.close();
        startServer(port + 1);
      } else {
        console.error("Server error:", err);
      }
    })
    .on("listening", () => {
      console.log(`Server running on port ${port}`);
    });
};

// Create output directory if it doesn't exist
fs.mkdir(CONFIG.outputDir, { recursive: true })
  .then(() => {
    console.log(`Output directory created/verified at: ${CONFIG.outputDir}`);
    startServer(3000);
  })
  .catch((error) => {
    console.error("Error creating output directory:", error);
    process.exit(1);
  });

// Export for use as a module
module.exports = {
  transformCourseData,
  CONFIG,
};

// Endpoint to load transformed file content
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
