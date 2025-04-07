# ShopSmart Backend Integration

## Overview

This project now uses a Python backend to handle the TensorFlow model for product recognition. The React Native frontend communicates with the Python backend via a REST API.

## Architecture

- **Frontend**: React Native app that captures/selects images and displays recognition results
- **Backend**: Python Flask server that loads the TensorFlow model and processes images

## Setup Instructions

### 1. Install Backend Dependencies

Navigate to the backend directory and install the required Python packages:

```bash
cd backend
pip install -r requirements.txt
```

### 2. Start the Backend Server

From the backend directory, run:

```bash
python app.py
```

Or simply double-click the `start_server.bat` file in the backend directory.

The server will start on http://localhost:5000

### 3. Run the Frontend App

In the main project directory, run:

```bash
npm start
```

## How It Works

1. The React Native app captures or selects an image
2. The image is sent to the Python backend as a base64-encoded string
3. The backend processes the image using the TensorFlow model
4. Recognition results are returned to the frontend
5. The frontend displays the results and allows the user to search for products

## Troubleshooting

- If the app shows "Service Not Ready" error, make sure the backend server is running
- Check the backend console for any error messages
- Ensure the API_BASE_URL in src/utils/ApiUtils.ts is correctly pointing to your backend server