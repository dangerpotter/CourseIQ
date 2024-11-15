// fileManager.js
const fs = require("fs").promises;
const path = require("path");
const _ = require("lodash");

class FileManager {
  constructor(outputDir) {
    this.outputDir = outputDir;
    this.fileCache = new Map();
    this.lastCacheUpdate = null;
    this.cacheLifetime = 5 * 60 * 1000; // 5 minutes
  }

  async getFilesList(options = {}) {
    const {
      search = "",
      sortBy = "date",
      sortOrder = "desc",
      filter = {},
      page = 1,
      limit = 20,
    } = options;

    await this.updateCache();
    let files = Array.from(this.fileCache.values());

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      files = files.filter(
        (file) =>
          file.courseName.toLowerCase().includes(searchLower) ||
          file.courseNumber.toLowerCase().includes(searchLower) ||
          file.filename.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    if (filter.dateRange) {
      files = files.filter((file) => {
        const fileDate = new Date(file.metadata.lastUpdated);
        return (
          fileDate >= new Date(filter.dateRange.start) &&
          fileDate <= new Date(filter.dateRange.end)
        );
      });
    }

    if (filter.courseType) {
        files = files.filter(file => {
          const designModel = file.metadata?.courseDesignModel || '';
          switch (filter.courseType) {
            case 'guided':
              return designModel.includes('GUIDED_PATH');
            case 'flex':
              return designModel.includes('FLEX_PATH');
            case 'custom':
              return !designModel.includes('GUIDED_PATH') && !designModel.includes('FLEX_PATH');
            default:
              return true;
          }
        });
      }

    // Apply sorting
    files = _.orderBy(files, [sortBy], [sortOrder]);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedFiles = files.slice(startIndex, startIndex + limit);

    return {
      files: paginatedFiles,
      total: files.length,
      page,
      totalPages: Math.ceil(files.length / limit),
    };
  }

  async updateCache() {
    const now = Date.now();
    if (
      this.lastCacheUpdate &&
      now - this.lastCacheUpdate < this.cacheLifetime
    ) {
      return;
    }

    const files = await fs.readdir(this.outputDir);
    const jsonFiles = files.filter((file) => file.endsWith("_output.json"));

    for (const filename of jsonFiles) {
      const filePath = path.join(this.outputDir, filename);
      const stats = await fs.stat(filePath);

      if (
        !this.fileCache.has(filename) ||
        stats.mtime > this.fileCache.get(filename).lastModified
      ) {
        const fileContent = await fs.readFile(filePath, "utf8");
        const data = JSON.parse(fileContent);

        this.fileCache.set(filename, {
          filename,
          filePath,
          lastModified: stats.mtime,
          size: stats.size,
          courseName: data.course.name,
          courseNumber: data.course.number,
          metadata: data.metadata,
          activityCounts: data.activityCounts,
        });
      }
    }

    this.lastCacheUpdate = now;
  }

  async deleteFile(filename) {
    const filePath = path.join(this.outputDir, filename);
    await fs.unlink(filePath);
    this.fileCache.delete(filename);
  }

  async getFileMetadata(filename) {
    await this.updateCache();
    return this.fileCache.get(filename);
  }
}

module.exports = FileManager;
