from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
import os
import requests
import tensorflow as tf
import numpy as np
from PIL import Image
import time
import werkzeug
from werkzeug.utils import secure_filename
import logging

app = Flask(__name__, static_folder='static', template_folder='.')
CORS(app)

# ---- API Keys and Model Setup ----
IMAGGA_API_KEY = "acc_941ad377f002129"
IMAGGA_API_SECRET = "e0056a7751870096b0c625159f6d9075"
GEMINI_API_KEY = "AIzaSyDN5Z2K-cgUUSuIbGhd63M0zh-fiS1tNrA"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load deepfake model
model = tf.keras.models.load_model('trained_deepseek_model.h5')
class_names = ['Fake', 'Real']

def prepare_image(image, target_size=(128, 128)):
    if image.mode != "RGB":
        image = image.convert("RGB")
    image = image.resize(target_size)
    image_array = tf.keras.preprocessing.image.img_to_array(image)
    image_array = np.expand_dims(image_array, axis=0)
    return image_array

# ---- Routes ----
@app.route('/')
def home():
    return send_from_directory('.', 'login.html')

@app.route('/index.html')
def index_page():
    return send_from_directory('.', 'index.html')


@app.route('/test.html')
def test_page():
    return send_from_directory('.', 'test.html')

@app.route('/classification.html')
def classification_page():
    return send_from_directory('.', 'classification.html')

@app.route('/fake.html')
def fake_page():
    return send_from_directory('.', 'fake.html')

@app.route('/demo.html')
def demo_page():
    return send_from_directory('.', 'demo.html')

@app.route('/contact.html')
def contact_page():
    return send_from_directory('.', 'contact.html')

@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory('images', filename)
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)
@app.route('/api/analyze', methods=['POST'])
def analyze_image():
    # Validate request
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Validate file type
    filename = secure_filename(file.filename)
    if not ('.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}):
        return jsonify({"error": "Only JPG/PNG images allowed"}), 400

    # Save file
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(image_path)

    try:
        # --- Imagga Processing ---
        with open(image_path, 'rb') as img_file:
            imagga_response = requests.post(
                'https://api.imagga.com/v2/tags',
                auth=(IMAGGA_API_KEY, IMAGGA_API_SECRET),
                files={'image': img_file},
                timeout=10
            )
        
        if imagga_response.status_code != 200:
            error_msg = imagga_response.json().get('message', 'Imagga API failed')
            return jsonify({"error": f"Imagga: {error_msg}"}), 500

        tags = imagga_response.json().get('result', {}).get('tags', [])
        top_tags = [tag['tag']['en'] for tag in tags[:5]]
        object_list = ", ".join(top_tags) if top_tags else "nothing"

        # --- Gemini Processing ---
        prompt = f"The image contains: {object_list}.\nUser question: '{request.form.get('query', '')}'"
        gemini_response = requests.post(
            GEMINI_URL,
            headers={"Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=10
        )
        
        if gemini_response.status_code != 200:
            return jsonify({"error": "Gemini API failed"}), 500

        reply = gemini_response.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "No response.")

        return jsonify({
            "status": "success",
            "reply": reply,
            "objects": object_list,
            "image_url": url_for('static', filename='uploads/' + filename, _external=True)
        })

    except Exception as e:
        app.logger.error(f"API Error: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    finally:
        if os.path.exists(image_path):
            os.remove(image_path)






# ---- Deepfake Detection ----
# @app.route('/predict', methods=['POST'])
# def predict():
#     if 'image' not in request.files:
#         return jsonify({'error': 'No image uploaded'}), 400

#     file = request.files['image']
#     if file.filename == '':
#         return jsonify({'error': 'No file selected'}), 400

#     filename = werkzeug.utils.secure_filename(file.filename)
#     filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
#     file.save(filepath)

#     try:
#         image = Image.open(filepath)
#         input_arr = prepare_image(image)

#         start_time = time.time()
#         prediction = model.predict(input_arr)[0][0]
#         elapsed_time = round(time.time() - start_time, 2)

#         result = class_names[int(prediction > 0.5)]
#         confidence = float(prediction) if prediction > 0.5 else 1 - float(prediction)

#         return jsonify({
#             "result": result,
#             "confidence": round(confidence * 100, 2),
#             "elapsed_time": elapsed_time,
#             "image_url": url_for('static', filename='uploads/' + filename)
#         })

#     except Exception as e:
#         return jsonify({'error': f'Image processing failed: {str(e)}'}), 500
#     finally:
#         # Clean up - remove the uploaded file
#         if os.path.exists(filepath):
#             os.remove(filepath)

# if __name__ == '__main__':
#     app.run(port=5000, debug=True)


@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    filename = werkzeug.utils.secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    try:
        # Prepare the image
        image = Image.open(filepath)
        input_arr = prepare_image(image)

        # Make prediction
        start_time = time.time()
        prediction = model.predict(input_arr)[0][0]
        elapsed_time = round(time.time() - start_time, 2)

        # Corrected logic
        label = 0 if prediction < 0.5 else 1  # 0 = fake, 1 = real
        result = class_names[label]
        confidence = prediction if label == 1 else 1 - prediction

        return jsonify({
            "result": result,
            "confidence": round(confidence * 100, 2),
            "elapsed_time": elapsed_time,
            "image_url": url_for('static', filename='uploads/' + filename)
        })

    except Exception as e:
        return jsonify({'error': f'Image processing failed: {str(e)}'}), 500

    finally:
        # Clean up - remove the uploaded file
        if os.path.exists(filepath):
            os.remove(filepath)

if __name__ == '__main__':
    app.run(port=5000, debug=True)



