import sys
import os

os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
sys.stdout.reconfigure(encoding='utf-8')

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import io
import logging
import time
import joblib
from infer_labels import infer_data_labels

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Setup logging
logging.basicConfig(level=logging.INFO)

# Load the trained KMeans model from file
model_file_path = './Data/model_04-E/kmeans_model.joblib'  # Path to my model file
kmeans = joblib.load(model_file_path)

cluster_file_path = './Data/model_04-E/cluster_labels.joblib' # Path to my cluster model file
cluster_labels = joblib.load(cluster_file_path)

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        start_time = time.time()

        # Check if the grayscale image data is in the request
        if 'grayScaleData' not in request.json:
            return jsonify({'error': 'No image data provided'}), 400

        # Get the grayscale data from the request
        gray_scale_data = request.json['grayScaleData']

        # Convert the grayscale data into a NumPy array with dtype float32
        image_array = np.array(gray_scale_data, dtype=np.float32)
        np.set_printoptions(linewidth=np.inf)
        logging.info(image_array)

        # Ensure the image array is of shape (28, 28)
        if image_array.shape != (28, 28):
            return jsonify({'error': 'Image data must be in the shape [28, 28]'}), 400

        # Flatten the image array (28x28 to 1D array of 784 features)
        image_array = image_array.reshape(1, -1).astype(np.float64)  # Ensure this is float64

        # Predict the cluster using KMeans
        predicted_cluster = kmeans.predict(image_array)

        # Convert the predicted cluster to a label
        predicted_label = infer_data_labels(predicted_cluster, cluster_labels)

        # Define the mapping list
        operation_mapping = ['+', '-', '*', '/']

        # Check if the predicted label is within the valid range for mapping
        predicted_value = int(predicted_label[0])
        if predicted_value in [10, 11, 12, 13]:
            # Map predicted label to the corresponding operation symbol
            predicted_value = operation_mapping[predicted_value - 10]  # Subtract 10 to get the index

        end_time = time.time()  # End timing
        logging.info(f"Prediction time: {end_time - start_time} seconds")

        # Return the predicted label
        return jsonify({
            'message': 'Prediction successful',
            'predicted_label': predicted_value
        })

    except Exception as e:
        logging.error(f"Error in prediction: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
