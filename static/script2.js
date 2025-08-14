document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileInput = document.getElementById('imageUpload');
    const resultDiv = document.getElementById('result');
    const imagePreviewDiv = document.getElementById('imagePreview');
    const dragDropArea = document.getElementById('dragDropArea');
    const uploadBtn = document.getElementById('uploadBtn');
    const userQuery = document.getElementById('userQuery');
    const analysisTypeSelect = document.getElementById('analysisType');

    // Check if required elements exist
    if (!fileInput || !resultDiv || !imagePreviewDiv || !dragDropArea || !uploadBtn) {
        console.error('Required elements not found');
        return;
    }

    function displayImagePreview(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreviewDiv.innerHTML = `
                <img src="${e.target.result}" 
                     alt="Preview" 
                     style="max-width:100%;max-height:400px;border-radius:8px;">
                <p>${file.name} (${(file.size/1024).toFixed(1)} KB)</p>
            `;
        };
        reader.onerror = function() {
            console.error('Error reading file');
            resultDiv.innerHTML = `
                <div class="error-box">
                    <h3><i class="fas fa-exclamation-circle"></i> Error</h3>
                    <p>Failed to load image</p>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }

    async function analyzeImage(file) {
        if (!file || !resultDiv) return;
        
        // Show loading state
        resultDiv.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Analyzing image...
            </div>
        `;
        
        const formData = new FormData();
        formData.append('image', file);
        
        // Safely get query value
        const queryValue = userQuery ? userQuery.value : '';
        if (queryValue) {
            formData.append('query', queryValue);
        }

        try {
            const endpoint = analysisTypeSelect && analysisTypeSelect.value === 'deepfake' 
                ? '/api/detect-deepfake' 
                : '/api/analyze';

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || 
                    `Server error: ${response.status} ${response.statusText}`
                );
            }

            const data = await response.json();
            
            // Handle application errors
            if (data.status === "error") {
                throw new Error(data.message);
            }

            // Format the response based on analysis type
            if (endpoint === '/api/detect-deepfake') {
                // Deepfake detection result
                const isFake = data.prediction === 'Fake';
                const iconClass = isFake ? 'fa-exclamation-triangle' : 'fa-check-circle';
                const resultClass = isFake ? 'fake-result' : 'real-result';
                
                resultDiv.innerHTML = `
                    <div class="result-box ${resultClass}">
                        <h3><i class="fas ${iconClass}"></i> Deepfake Detection Result</h3>
                        <div class="confidence-meter">
                            <div class="confidence-bar" style="width: ${data.confidence}%"></div>
                            <span>${data.confidence}% confidence</span>
                        </div>
                        <div class="prediction">Result: ${data.prediction}</div>
                        <div class="explanation">${data.explanation}</div>
                        ${data.image_url ? `<img src="${data.image_url}" class="result-image">` : ''}
                    </div>
                `;
            } else {
                // General image analysis result
                const objectsString = data.objects ? 
                    `<div class="objects">Detected: ${data.objects}</div>` : 
                    '';
                
                resultDiv.innerHTML = `
                    <div class="result-box">
                        <h3><i class="fas fa-check-circle"></i> Analysis Result</h3>
                        <div class="response">${data.reply}</div>
                        ${objectsString}
                        <div class="tech-details" style="margin-top: 15px; font-size: 0.8em; color: #666;">
                            <p>request successful</p> 
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Full error:', error);
            resultDiv.innerHTML = `
                <div class="error-box">
                    <h3><i class="fas fa-exclamation-circle"></i> Imagga API Failed</h3>
                    <p>${error.message}</p>
                    <p>Try uploading a clearer JPEG/PNG image.</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    // Event listeners
    uploadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!fileInput.files.length) {
            resultDiv.innerHTML = '<div class="error">Please upload an image first</div>';
            return;
        }
        analyzeImage(fileInput.files[0]);
    });

    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            displayImagePreview(this.files[0]);
            resultDiv.innerHTML = ''; // Clear previous results
        }
    });

    // Drag and drop handlers
    dragDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropArea.classList.add('dragover');
    });

    dragDropArea.addEventListener('dragleave', () => {
        dragDropArea.classList.remove('dragover');
    });

    dragDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            displayImagePreview(e.dataTransfer.files[0]);
            resultDiv.innerHTML = ''; // Clear previous results
        }
    });

    dragDropArea.addEventListener('click', () => fileInput.click());
});