# PDF Viewer Project

## Overview
This project is a simple PDF viewer that allows users to select a PDF file from their device and view the first page of the PDF in a web browser. It utilizes the PDF.js library to render the PDF content onto a canvas element.

## Project Structure
```
pdf-viewer-project
├── src
│   ├── index.html        # HTML structure for the PDF viewer interface
│   ├── styles
│   │   └── styles.css    # CSS styles for the PDF viewer
│   └── scripts
│       └── app.js        # JavaScript code for handling PDF rendering
├── package.json          # npm configuration file
└── README.md             # Documentation for the project
```

## Getting Started

### Prerequisites
- Node.js and npm installed on your machine.

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd pdf-viewer-project
   ```
3. Install the dependencies:
   ```
   npm install
   ```

### Usage
1. Open `src/index.html` in a web browser.
2. Use the file input to select a PDF file from your device.
3. The first page of the selected PDF will be rendered on the canvas.

### License
This project is licensed under the MIT License.