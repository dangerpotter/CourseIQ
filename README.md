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
- 📦 Batch processing capabilities
- 🏷️ Intelligent file organization by course type
- 💾 Automatic file cleanup and management

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)

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

  - Handles file organization and search
  - Caches file metadata for performance
  - Provides filtering and sorting capabilities

- `batchProcessor.js`: Batch processing functionality

  - Handles concurrent file processing
  - Manages processing queues
  - Provides progress tracking
  - Implements error handling

- `index.js`: Express server setup
  - API endpoints for file operations
  - File upload handling
  - Data transformation routing
  - Batch processing coordination

### Client-side

- `CourseIQ.jsx`: Main application component

  - File upload interface
  - Navigation and layout
  - Data visualization coordination
  - Batch processing interface
  - File management UI

- `Analytics.jsx`: Analytics visualization component
  - Interactive charts and graphs
  - Course statistics
  - Activity distribution analysis

## API Endpoints

- `POST /api/transform`: Transform single course JSON
- `POST /api/transform/batch`: Transform multiple course JSONs
- `GET /api/files`: List transformed files with search and filter options
- `GET /api/files/:filename`: Get specific transformed file
- `GET /api/files/:filename/metadata`: Get file metadata
- `GET /api/download/:filename`: Download transformed file
- `DELETE /api/files/:filename`: Delete transformed file

## Technology Stack

- **Frontend**:

  - React
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
