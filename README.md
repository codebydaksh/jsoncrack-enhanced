<!-- PROJECT LOGO -->
<p align="center">
  <a href="https://github.com/codebydaksh/jsoncrack-enhanced">
   <img src="./public/assets/192.png" height="50" alt="Logo">
  </a>

  <h1 align="center">JSON Crack Enhanced</h1>

  <p align="center">
    The Enhanced Open-Source JSON Editor with Professional Features.
    <br />
    <strong>Fork of <a href="https://github.com/AykutSarac/jsoncrack.com">original JSON Crack</a> with 14 new pro-level features</strong>
    <br />
    <br />
    <a href="https://github.com/codebydaksh/jsoncrack-enhanced">GitHub Repository</a>
    ·
    <a href="https://github.com/codebydaksh/jsoncrack-enhanced/issues">Issues</a>
    ·
    <a href="https://github.com/codebydaksh/jsoncrack-enhanced/releases">Releases</a>
  </p>
</p>

<!-- ABOUT THE PROJECT -->

## About JSON Crack Enhanced

<img width="100%" alt="json-crack-enhanced" src="./public/assets/editor.webp">

## Professional JSON Editor with Advanced Features

**JSON Crack Enhanced** is a powerful fork of the original JSON Crack with **14 additional professional-grade features** that transform it into a comprehensive data analysis and development tool. While maintaining all the original functionality, we've added enterprise-level capabilities for advanced users and development teams.

### **Enhanced Features (New in this Fork)**

- **Advanced Search & Filter**: Powerful search with regex, JSONPath, and multi-field filtering
- **Data Comparison Tool**: Side-by-side diff viewer for comparing JSON structures
- **Performance Analytics**: Real-time metrics, parsing time, and memory usage monitoring
- **Smart Auto-Complete**: Intelligent suggestions based on JSON structure and patterns
- **Data Generation Tools**: Generate realistic test data, mock APIs, and sample datasets
- **Advanced Export Templates**: Custom reports, transformations, and multiple output formats
- **Memory Usage Monitor**: Real-time JSON size and performance tracking
- **Mini-map Navigation**: Interactive minimap for large graph visualization
- **Enhanced Sharing**: URL-based data sharing without external servers
- **Custom Themes**: User-defined color schemes and theme management
- **API Generator**: Convert JSON to cURL, JavaScript, Python, Postman formats
- **Smart Validation**: Visual validation feedback with error highlighting
- **Undo/Redo System**: Comprehensive history management for all operations
- **Export Enhancements**: PDF, HTML, and advanced export options

### **Original Core Features**

- **Visualizer**: Convert JSON, YAML, CSV, XML, TOML into interactive graphs or trees
- **Convert**: Transform data formats seamlessly (JSON to CSV, XML to JSON, etc.)
- **Format & Validate**: Beautify and validate JSON, YAML, and CSV
- **Code Generation**: Generate TypeScript interfaces, Golang structs, and JSON Schema
- **JSON Schema**: Create schemas, mock data, and validate formats
- **Advanced Tools**: JWT decoding, data randomization, jq/JSON path queries
- **Export Images**: Download visualizations as PNG, JPEG, or SVG
- **Privacy**: All processing is local - no data sent to servers

### **What Makes This Enhanced?**

This fork transforms JSON Crack from a simple JSON visualizer into a **professional-grade data analysis platform**:

- **Enterprise-ready productivity tools** (search, comparison, analytics)
- **Advanced data generation** for testing and development
- **Intelligent auto-completion** and validation systems
- **Professional export capabilities** with custom templates
- **Performance monitoring** and optimization insights
- **Enhanced user experience** with modern UI patterns

All features are fully integrated, production-ready, and maintain the privacy-first approach of the original.

### Built With

**Core Technologies:**

- [Next.js 14.2.28](https://nextjs.org) - React framework for production
- [React.js 18.3.1](https://reactjs.org) - UI library
- [TypeScript 5.8.2](https://www.typescriptlang.org) - Type safety
- [Reaflow 5.4.1](https://reaflow.dev) - Graph visualization
- [Monaco Editor](https://github.com/suren-atoyan/monaco-react) - Code editing

**Enhanced Features Stack:**

- [Zustand 4.5.7](https://github.com/pmndrs/zustand) - State management
- [Mantine 7.17.7](https://mantine.dev) - UI components
- [PNPM 9.1.4](https://pnpm.io) - Package management

**Professional Tools:**

- Advanced search with regex and JSONPath support
- Real-time performance analytics and monitoring
- Intelligent data generation and transformation pipelines
- Template-based export system with custom formats

## Stay Up-to-Date

**JSON Crack Enhanced** is actively developed with new professional features being added regularly. This enhanced fork builds upon the solid foundation of the original JSON Crack (launched February 17, 2022) and adds enterprise-grade functionality.

**Star this repository** to stay notified of new features and updates:

<a href="https://github.com/codebydaksh/jsoncrack-enhanced"><img src="https://img.shields.io/github/stars/codebydaksh/jsoncrack-enhanced?style=social" alt="Star JSON Crack Enhanced" /></a>

**Original Project:** The foundational JSON Crack project by [AykutSarac](https://github.com/AykutSarac) can be found at [jsoncrack.com](https://github.com/AykutSarac/jsoncrack.com)

<!-- GETTING STARTED -->

## Getting Started

To get a local copy of **JSON Crack Enhanced** up and running, please follow these simple steps.

### Prerequisites

Here is what you need to be able to run JSON Crack Enhanced.

- Node.js (Version: >=18.x)
- PNPM _(recommended)_

## Development

### Setup

1. Clone the enhanced repository:

   ```sh
   git clone https://github.com/codebydaksh/jsoncrack-enhanced.git
   ```

2. Go to the project folder:

   ```sh
   cd jsoncrack-enhanced
   ```

3. Install packages:

   ```sh
   pnpm install
   ```

4. Run the project:

   ```sh
   pnpm dev

   # Running on http://localhost:3001/
   ```

   > **Note**: The development server runs on port 3001 by default to avoid conflicts.

### **Accessing Enhanced Features**

Once running, you can access all the new professional features through:

- **Toolbar Controls**: Look for new icons in the editor toolbar
- **Keyboard Shortcuts**:
  - `Ctrl+Shift+S` - Advanced Search
  - `Ctrl+Shift+C` - Data Comparison
  - `Ctrl+Shift+P` - Performance Analytics
  - `Ctrl+Shift+A` - Auto-Complete Settings
  - `Ctrl+Shift+D` - Data Generation
  - `Ctrl+Shift+E` - Export Templates
- **Right-click menus** and enhanced modal interfaces

### Original Setup (for comparison)

If you want to run the original JSON Crack:

```sh
git clone https://github.com/AykutSarac/jsoncrack.com.git
cd jsoncrack.com
pnpm install
pnpm dev
# Running on http://localhost:3000/
```

### Docker

A [`Dockerfile`](Dockerfile) is provided in the root of the repository.
To run JSON Crack Enhanced locally with Docker:

```console
# Build a Docker image with:
docker compose build

# Run locally with `docker-compose`
docker compose up

# Go to http://localhost:8888
```

> **Enhanced Features**: All 14 professional features are available in the Docker version.

## Configuration

The supported node limit can be changed by editing the `NEXT_PUBLIC_NODE_LIMIT` value in the `.env` file at the project root.

## **Enhanced Features Documentation**

### Professional Tools Overview

| Feature               | Description                         | Keyboard Shortcut         |
| --------------------- | ----------------------------------- | ------------------------- |
| Advanced Search       | Regex, JSONPath, multi-field search | `Ctrl+Shift+S`            |
| Data Comparison       | Side-by-side diff viewer            | `Ctrl+Shift+C`            |
| Performance Analytics | Real-time metrics and monitoring    | `Ctrl+Shift+P`            |
| Smart Auto-Complete   | Structure-aware suggestions         | `Ctrl+Shift+A`            |
| Data Generation       | Mock data and test datasets         | `Ctrl+Shift+D`            |
| Export Templates      | Custom reports and transformations  | `Ctrl+Shift+E`            |
| Memory Monitor        | Real-time size and performance      | Always visible            |
| Mini-map Navigation   | Large graph navigation              | Auto-enabled              |
| Enhanced Sharing      | URL-based data sharing              | Integrated                |
| Custom Themes         | User-defined color schemes          | Theme panel               |
| API Generator         | Convert to cURL, Python, etc.       | Export menu               |
| Smart Validation      | Visual error highlighting           | Auto-enabled              |
| Undo/Redo             | Comprehensive history               | `Ctrl+Z` / `Ctrl+Shift+Z` |
| Advanced Export       | PDF, HTML, multiple formats         | Download menu             |

### **Performance & Analytics**

The enhanced version includes comprehensive performance monitoring:

- **Real-time memory usage** tracking
- **Parse time analytics** for optimization insights
- **JSON complexity scoring** (1-10 scale)
- **Performance recommendations** and alerts
- **Trend analysis** over time

### **Data Generation Capabilities**

Create realistic test data with built-in templates:

- **User profiles** with realistic personal information
- **E-commerce products** with pricing and categories
- **API responses** with pagination and metadata
- **Custom templates** with pattern recognition
- **Multiple export formats** (JSON, CSV, SQL, TypeScript)

## **Contributing**

We welcome contributions to JSON Crack Enhanced! Please feel free to:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

## **Acknowledgments**

- **Original JSON Crack** by [Aykut Saraç](https://github.com/AykutSarac) - The foundation that made this enhanced version possible
- **Open Source Community** - For the amazing libraries and tools
- **Contributors** - Everyone who helps improve this project

**Original Repository**: [https://github.com/AykutSarac/jsoncrack.com](https://github.com/AykutSarac/jsoncrack.com)

<!-- LICENSE -->

## License

See [`LICENSE`](/LICENSE.md) for more information.
