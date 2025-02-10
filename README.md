# CourseIQ

[![GitHub stars](https://img.shields.io/github/stars/dangerpotter/courseiq.svg)](https://github.com/dangerpotter/courseiq/stargazers)
[![GitHub license](https://img.shields.io/github/license/dangerpotter/courseiq.svg)](https://github.com/dangerpotter/courseiq/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/dangerpotter/courseiq.svg)](https://github.com/dangerpotter/courseiq/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/dangerpotter/courseiq.svg)](https://github.com/dangerpotter/courseiq/pulls)

CourseIQ is a sophisticated course analysis tool that transforms complex course JSON data into structured, analyzable formats. It provides intuitive visualizations and detailed insights into course structure, activity distribution, and learning patterns.

![CourseIQ Screenshot](screenshots/courseiq.png)

## Features

- 📊 Interactive course analytics and visualizations
- 🔄 JSON transformation with detailed validation
- 📱 Responsive modern interface with dark mode support
- 📝 Detailed activity analysis and breakdown
- 📈 Weekly content distribution insights
- 🎯 Competency mapping and tracking
- 🔍 Advanced file search and filtering
- 📦 Batch processing with real-time progress tracking
- 🏷️ Intelligent file organization by course type
- 💾 Efficient file caching and management
- 🔄 Real-time file list updates
- 🎨 Course type-based filtering (Guided Path, Flex Path, Custom)
- 📅 Date-based sorting and filtering
- 🔎 Full-text search across course content
- 📋 Detailed activity breakdowns by type
- 📊 Interactive competency tracking
- 🌓 System-wide dark mode support
- 🔍 Advanced search with multiple criteria
- 📱 Responsive design for all screen sizes

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Docker (optional, for containerized deployment)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/dangerpotter/courseiq.git
cd courseiq
```

2. Install server dependencies:

```bash
cd server
npm install
```

3. Install client dependencies:

```bash
cd ../client
npm install
```

### Running the Application

#### Standard Method

1. Start the server:

```bash
cd server
npm run dev
```

2. In a new terminal, start the client:

```bash
cd client
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

#### Docker Method

1. Build and run using Docker Compose:

```bash
docker-compose up --build
```

2. Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
courseiq/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ui/       # UI components (shadcn/ui)
│   │   │   ├── Analytics.jsx
│   │   │   └── CourseIQ.jsx
│   │   ├── lib/          # Utility functions
│   │   ├── App.jsx       # Main React component
│   │   └── index.jsx     # React entry point
│   ├── public/           # Static files
│   └── index.html        # HTML template
│
├── server/                # Backend Node.js server
│   ├── src/
│   │   ├── data_transformer.js  # Course transformation logic
│   │   ├── fileManager.js       # File management system
│   │   ├── batchProcessor.js    # Batch processing logic
│   │   └── index.js            # Server entry point
│   ├── output/           # Transformed JSON output directory
│   └── uploads/          # Temporary upload directory
│
└── README.md             # Project documentation
```

## Key Components

### Server-side

- `data_transformer.js`: Core transformation logic for course data
  - Handles course structure analysis
  - Validates input data
  - Generates detailed analytics
  - Manages file operations

- `fileManager.js`: Enhanced file management system
  - Smart caching system with invalidation
  - Real-time file list updates
  - Advanced filtering and sorting
  - Metadata caching for performance
  - Course type categorization

- `batchProcessor.js`: Advanced batch processing
  - Concurrent file processing
  - Real-time progress tracking
  - Detailed success/failure reporting
  - Automatic cleanup
  - Error recovery

- `index.js`: Express server setup
  - RESTful API endpoints
  - File upload handling
  - Cache management
  - Error handling
  - Progress reporting

### Client-side

- `CourseIQ.jsx`: Main application component
  - Real-time file list updates
  - Advanced filtering interface
  - Progress tracking
  - Dark mode support
  - Responsive design

- `Analytics.jsx`: Analytics visualization
  - Interactive charts
  - Course statistics
  - Activity distribution
  - Competency tracking

## API Endpoints

- `POST /api/transform`: Transform single course JSON
- `POST /api/transform/batch`: Transform multiple course JSONs with progress tracking
- `GET /api/files`: List transformed files with advanced filtering
- `GET /api/files/:filename`: Get specific transformed file
- `GET /api/files/:filename/metadata`: Get file metadata
- `GET /api/download/:filename`: Download transformed file
- `DELETE /api/files/:filename`: Delete transformed file
- `GET /api/system`: Get system information and status

## Technology Stack

- **Frontend**:
  - React 18
  - Vite
  - TailwindCSS
  - shadcn/ui
  - Recharts
  - Lucide Icons

- **Backend**:
  - Node.js
  - Express
  - Lodash
  - Multer

- **Development & Deployment**:
  - Docker
  - Docker Compose
  - ESLint
  - Prettier

## Features in Detail

### File Management
- Smart caching system for optimal performance
- Real-time file list updates
- Advanced filtering by course type and date
- Full-text search capabilities
- Batch processing with progress tracking

### Course Analysis
- Detailed activity breakdowns
- Competency tracking and mapping
- Weekly content distribution analysis
- Points and grading analysis
- Resource tracking

### User Interface
- Dark mode support
- Responsive design
- Real-time progress tracking
- Advanced filtering interface
- Interactive visualizations

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Austin Potter**
- GitHub: [@dangerpotter](https://github.com/dangerpotter)

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Recharts](https://recharts.org/) for the charting library
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

## Support

If you found this project helpful, please consider giving it a ⭐️ on GitHub!
