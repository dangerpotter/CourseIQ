// batchProcessor.js
const path = require('path');
const fs = require('fs').promises;
const { CourseTransformer } = require('./data_transformer');

class BatchProcessor {
  constructor(inputDir, outputDir) {
    this.inputDir = inputDir;
    this.outputDir = outputDir;
    this.results = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      startTime: null,
      endTime: null
    };
  }

  async processDirectory() {
    this.results.startTime = new Date();
    
    try {
      const files = await fs.readdir(this.inputDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      // Process files concurrently with a limit
      const batchSize = 3; // Process 3 files at a time
      for (let i = 0; i < jsonFiles.length; i += batchSize) {
        const batch = jsonFiles.slice(i, i + batchSize);
        await Promise.all(batch.map(file => this.processFile(file)));
      }
      
    } catch (error) {
      console.error('Batch processing error:', error);
      throw error;
    } finally {
      this.results.endTime = new Date();
    }
    
    return this.results;
  }

  async processFile(filename) {
    try {
      const filePath = path.join(this.inputDir, filename);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);
      
      const outputPath = path.join(
        this.outputDir, 
        filename.replace('.json', '_output.json')
      );

      const transformer = new CourseTransformer(jsonData, outputPath);
      const transformedData = await transformer.transform();
      
      this.results.successful.push({
        filename,
        outputPath,
        metadata: transformedData.metadata
      });
      
    } catch (error) {
      this.results.failed.push({
        filename,
        error: error.message
      });
    } finally {
      this.results.totalProcessed++;
    }
  }
}

module.exports = BatchProcessor;