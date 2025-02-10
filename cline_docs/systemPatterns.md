# System Patterns

## Architecture Overview
The system follows a client-server architecture with clear separation of concerns:

### Frontend Architecture
1. React + Vite Application
   - Modern build tooling with Vite
   - Component-based architecture
   - Tailwind CSS for styling

2. Component Structure
   - Core Components
     * CourseIQ.jsx: Main application container
     * Analytics.jsx: Data visualization and analysis
   - UI Components
     * Reusable UI elements (button, card, alert, tabs)
   - Utility Functions
     * utils.js for shared functionality

### Backend Architecture
1. Node.js Server
   - Modular design with specialized services
   - RESTful API endpoints

2. Data Processing Pipeline
   - batchProcessor.js: Handles bulk data processing
   - data_transformer.js: Data transformation logic
   - fileManager.js: File system operations

## Key Technical Decisions
1. Frontend Framework
   - React for component-based UI development
   - Vite for fast development and optimized builds
   - Tailwind for utility-first styling

2. Backend Technology
   - Node.js for JavaScript ecosystem consistency
   - Modular architecture for maintainability
   - Batch processing for efficient data handling

3. Data Flow
   - JSON data ingestion
   - Server-side transformation
   - Client-side visualization

## Design Patterns
1. Component Patterns
   - Container/Presentational pattern
   - Composition over inheritance
   - Reusable UI components

2. Data Processing Patterns
   - Pipeline pattern for data transformation
   - Service-based architecture
   - Batch processing for performance

3. State Management
   - Component-level state
   - Props for data flow
   - Utility functions for shared logic
