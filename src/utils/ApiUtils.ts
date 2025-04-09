import { Alert } from 'react-native';

// Define the base URL for the backend API
const API_BASE_URL = 'http://10.194.46.111:5000';

// Define the interface for prediction results
export interface PredictionResult {
  className: string;
  probability: number;
}

/**
 * Check if the backend API is healthy and available
 * @returns Promise<boolean> - True if the API is healthy, false otherwise
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    // Try to connect to the API's predict endpoint with a simple request
    // since the root endpoint doesn't exist in the backend
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'HEAD',  // Use HEAD request for health check to avoid sending data
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // If get any response, consider the API available
    // don't need to check content type for HEAD requests
    return response.status < 500; 
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

/**
 * Send an image to the backend for recognition
 * @param base64Image - The base64-encoded image data
 * @returns Promise<PredictionResult[]> - Array of prediction results
 */
export const recognizeImage = async (base64Image: string): Promise<PredictionResult[]> => {
  try {
    // If the image is a URL (starts with http), need to fetch it and convert to base64
    let imageData = base64Image;
    
    if (base64Image.startsWith('http')) {
      // This is a URL, not base64 data
      console.log('Image is a URL, fetching and converting to base64...');
      try {
        const response = await fetch(base64Image);
        const blob = await response.blob();
        
        // Convert blob to base64
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            // Remove the data URL prefix if present
            const base64Content = base64data.split(',')[1] || base64data;
            // Now call the function again with the base64 data
            recognizeImage(base64Content)
              .then(resolve)
              .catch(reject);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error fetching image from URL:', error);
        throw new Error('Failed to fetch image from URL');
      }
    }
    
    // Ensure the base64 string is properly formatted for the API
    if (!imageData.startsWith('data:image')) {
      imageData = `data:image/jpeg;base64,${imageData}`;
    }
    
    // Send the image to the backend API
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_data: imageData
      }),
    });
    
    if (!response.ok) {
      // Check content type before trying to parse JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze image');
      } else {
        // Handle non-JSON error responses
        const text = await response.text();
        console.error('Received non-JSON error response:', text.substring(0, 100));
        throw new Error(`Server error (${response.status}): Non-JSON response received`);
      }
    }
    
    // Check content type before trying to parse JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but received:', contentType, text.substring(0, 100));
      throw new Error('Invalid response format: Expected JSON but received different content type');
    }
    
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Failed to parse JSON response from server');
    }
    
    if (!result.predictions || !Array.isArray(result.predictions)) {
      throw new Error('Invalid response format from API');
    }
    
    // Transform the API response to match PredictionResult interface
    return result.predictions.map((pred: any) => ({
      className: pred.class,
      probability: pred.probability
    }));
  } catch (error) {
    console.error('Error in recognizeImage:', error);
    throw error;
  }
};