// batchProcessor.js
const fs = require('fs').promises;
const path = require('path');
const { CourseTransformer, validateTransformedData } = require('./data_transformer');

class BatchProcessor {
  constructor(inputDir, outputDir) {
    this.inputDir = inputDir;
    this.outputDir = outputDir;
    this.results = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
  }

  async validateFile(filePath) {
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Check file size
      const stats = await fs.stat(filePath);
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (stats.size > maxSize) {
        throw new Error(`File size exceeds maximum limit of 50MB`);
      }

      // Validate JSON content
      const content = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(content);

      // Validate required fields
      const requiredFields = ['course', 'units', 'activities', 'competencies'];
      const missingFields = requiredFields.filter(field => !jsonData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      return jsonData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON format: ${error.message}`);
      }
      throw error;
    }
  }

  async processDirectory() {
    this.results.startTime = new Date();
    console.log(`Starting batch processing at ${this.results.startTime}`);
    
    try {
      // Ensure directories exist
      await Promise.all([
        fs.mkdir(this.inputDir, { recursive: true }),
        fs.mkdir(this.outputDir, { recursive: true })
      ]);

      const files = await fs.readdir(this.inputDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      if (jsonFiles.length === 0) {
        console.log('No JSON files found in input directory');
        return this.results;
      }

      console.log(`Found ${jsonFiles.length} JSON files to process`);
      
      // Process files concurrently with a limit
      const batchSize = 3; // Process 3 files at a time
      for (let i = 0; i < jsonFiles.length; i += batchSize) {
        const batch = jsonFiles.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(jsonFiles.length/batchSize)}`);
        
        const batchResults = await Promise.allSettled(
          batch.map(file => this.processFile(file))
        );

        // Handle batch results
        batchResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Batch processing error for file ${batch[index]}:`, result.reason);
            this.results.errors.push({
              file: batch[index],
              error: result.reason.message
            });
          }
        });
      }
      
    } catch (error) {
      console.error('Fatal batch processing error:', error);
      this.results.errors.push({
        type: 'fatal',
        error: error.message
      });
      throw error;
    } finally {
      this.results.endTime = new Date();
      const duration = (this.results.endTime - this.results.startTime) / 1000;
      console.log(`Batch processing completed in ${duration} seconds`);
      console.log(`Successful: ${this.results.successful.length}, Failed: ${this.results.failed.length}`);
    }
    
    return this.results;
  }

  async processFile(filename) {
    console.log(`Processing file: ${filename}`);
    const filePath = path.join(this.inputDir, filename);
    
    try {
      // Validate file
      const jsonData = await this.validateFile(filePath);
      
      // Create output path
      const outputPath = path.join(
        this.outputDir, 
        filename.replace('.json', '_output.json')
      );

      // Transform data
      console.log(`Transforming data for ${filename}`);
      const transformer = new CourseTransformer(jsonData, outputPath);
      const transformedData = await transformer.transform();
      
      // Validate transformed data
      console.log(`Validating transformed data for ${filename}`);
      validateTransformedData(transformedData);
      
      this.results.successful.push({
        filename,
        outputPath,
        metadata: transformedData.metadata,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Successfully processed ${filename}`);
      
    } catch (error) {
      console.error(`Error processing ${filename}:`, error);
      this.results.failed.push({
        filename,
        error: error.message,
        timestamp: new Date().toISOString(),
        details: error.stack
      });
    } finally {
      this.results.totalProcessed++;
    }
  }
}

module.exports = BatchProcessor;
