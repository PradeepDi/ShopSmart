import os
import io
import base64
import logging
import numpy as np
import tensorflow as tf
from keras.models import Sequential
from keras.layers import InputLayer, TFSMLayer
from flask import Flask, request, jsonify
from PIL import Image
import re
import time

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image-api")

app = Flask(__name__)

# Define class labels
class_labels = [
    "Comfort_fabric_conditioner",
    "Prima_noodles",
    "Raigam_soya_meat",
    "Safe_guard_soap",
    "Signal_toothbrush",
    "Vim_dishwash_bar"
]

# Path to the directory containing saved_model.pb + variables/
saved_model_dir = os.path.join(os.path.dirname(__file__), "model")

# Try to load the model
try:
    logger.info(f"Loading model from: {saved_model_dir}")
    model = Sequential([
        InputLayer(input_shape=(224, 224, 3), name="input_image"),
        TFSMLayer(saved_model_dir, call_endpoint="serving_default")
    ])
    logger.info("Model loaded successfully!")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    raise e  # Stop app if model loading fails


@app.route("/predict", methods=["POST"])
def predict():
    try:
        logger.info("Received image for prediction")
        data = request.get_json()


        # Get and decode base64 image
        image_data = data.get("image_data")
        if not image_data:
            raise ValueError("Missing image_data")

        # Remove base64 prefix if present
        image_data_clean = re.sub("^data:image/.+;base64,", "", image_data)
        img_bytes = base64.b64decode(image_data_clean)

        img = Image.open(io.BytesIO(img_bytes)).convert("RGB").resize((224, 224))
       
        x = np.array(img, dtype=np.float32) / 255.0
        x = np.expand_dims(x, 0)

        preds = model.predict(x)
        logger.info(f"Raw prediction result: {preds}")
        # Log the keys from the output dict
        logger.info(f"Output keys from model: {list(preds.keys())}")
        
        # Handle TFSMLayer dict output
        if isinstance(preds, dict):
            preds_array = preds.get("output_0")
            if preds_array is None:
                logger.error("Key 'output_0' not found in prediction output")
                return jsonify({"error": "Missing 'output_0' in prediction"}), 500
        else:
            preds_array = preds

        if not isinstance(preds_array, np.ndarray):
            logger.error("Prediction output is not a numpy array")
            return jsonify({"error": "Invalid prediction output"}), 500

        preds_list = preds_array[0].tolist()

        # Map predictions to class labels and probabilities
        results = [
            {"class": class_labels[i], "probability": float(prob)}
            for i, prob in enumerate(preds_list)
        ]

        # sort by confidence 
        results.sort(key=lambda x: x["probability"], reverse=True)

        return jsonify({"predictions": results})

    except Exception as e:
        logger.exception("Prediction failed")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    logger.info("Starting API server...")
    app.run(host="0.0.0.0", port=5000, debug=True)
