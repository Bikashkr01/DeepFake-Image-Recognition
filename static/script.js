document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileInput = document.getElementById('imageUpload');
    const detectBtn = document.getElementById('detectBtn');
    const dragDropArea = document.getElementById('dragDropArea');
    const imagePreview = document.getElementById('imagePreview');
    const predictionResult = document.getElementById('predictionResult');
    const confidenceLevel = document.getElementById('confidenceLevel');
    const confidenceText = document.getElementById('confidenceText');
    const processingTime = document.getElementById('processingTime');
    let count =0;

    // Event Listeners
    if (dragDropArea) {
        dragDropArea.addEventListener('click', () => fileInput.click());
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
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                displayImagePreview(this.files[0]);
            }
        });
    }

    if (detectBtn) {
        detectBtn.addEventListener('click', function() {
            if (!fileInput.files.length) {
                showError('Please upload an image first');
                return;
            }
            detectFakeImage(fileInput.files[0]);
        });
    }

    // Functions
    function displayImagePreview(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <div class="image-meta">${file.name} (${(file.size/1024).toFixed(1)}KB)</div>
            `;
            resetResults();
        };
        reader.readAsDataURL(file);
    }

    async function detectFakeImage(file) {
        // Show loading state
        predictionResult.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing image...';
        confidenceLevel.style.width = '0%';
        
        const formData = new FormData();
        formData.append('image', file);

        try {
            const startTime = performance.now();
            
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            const endTime = performance.now();
            
            displayResults(data, (endTime - startTime).toFixed(0));
            count++;
            if (count==3){
                
            }
        } catch (error) {
            showError(error.message);
            console.error('Detection error:', error);
        }
    }

    function displayResults(data, timeMs) {
        const isFake = data.result === 'Fake';
        const confidence = data.confidence;
        
        // Update prediction
        predictionResult.innerHTML = `
            <i class="fas ${isFake ? 'fa-times-circle' : 'fa-check-circle'}"></i>
            ${isFake ? 'Fake Image Detected' : 'Real Image'}
        `;
        predictionResult.className = isFake ? 'fake' : 'real';
        
        // Update confidence meter
        confidenceLevel.className = isFake ? 'confidence-level fake' : 'confidence-level real';
        confidenceLevel.style.width = `${confidence}%`;
        
        // Update text
        confidenceText.innerHTML = `Confidence: ${confidence}%`;
        processingTime.innerHTML = `Processed in ${timeMs}ms`;
    }

    function resetResults() {
        predictionResult.innerHTML = '';
        predictionResult.className = '';
        confidenceLevel.style.width = '0%';
        confidenceLevel.className = 'confidence-level';
        confidenceText.innerHTML = '';
        processingTime.innerHTML = '';
    }

    function showError(message) {
        predictionResult.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        predictionResult.className = 'error';
    }
});
// document.addEventListener('DOMContentLoaded', function() {
//     const fileInput = document.getElementById('imageUpload');
//     const resultDiv = document.getElementById('result');
//     const imagePreviewDiv = document.getElementById('imagePreview');
//     const dragDropArea = document.getElementById("dragDropArea");
//     const uploadBtn = document.getElementById("uploadBtn");
//     const userQuery = document.getElementById("userQuery");

//     function displayImagePreview(file) {
//         const reader = new FileReader();
//         reader.onload = function(e) {
//             imagePreviewDiv.innerHTML = `
//                 <img src="${e.target.result}" 
//                      alt="Preview" 
//                      style="max-width:300px;max-height:300px;border-radius:8px;">
//             `;
//         };
//         reader.readAsDataURL(file);
//     }

//     async function analyzeImage(file) {
//         resultDiv.innerHTML = `
//             <div class="loading">
//                 <i class="fas fa-spinner fa-spin"></i> Analyzing image...
//             </div>
//         `;
        
//         const formData = new FormData();
//         formData.append('image', file);
//         formData.append('query', userQuery.value);

//         try {
//             const response = await fetch('http://localhost:5000/api/analyze', {
//                 method: 'POST',
//                 body: formData
//             });

//             const data = await response.json();
            
//             if (data.status === "error") {
//                 throw new Error(data.message);
//             }

//             resultDiv.innerHTML = `
//                 <div class="result-box">
//                     <h3><i class="fas fa-check-circle"></i> Analysis Result</h3>
//                     <div class="response">${data.reply}</div>
//                     ${data.objects ? `<div class="objects">Detected: ${data.objects}</div>` : ''}
//                 </div>
//             `;
//         } catch (error) {
//             console.error('Error:', error);
//             resultDiv.innerHTML = `
//                 <div class="error-box">
//                     <h3><i class="fas fa-exclamation-circle"></i> Error</h3>
//                     <p>${error.message || 'Failed to analyze image'}</p>
//                 </div>
//             `;
//         }
//     }

//     // Event listeners
//     uploadBtn.addEventListener('click', function(e) {
//         e.preventDefault();
//         if (!fileInput.files.length) {
//             resultDiv.innerHTML = '<div class="error">Please upload an image first</div>';
//             return;
//         }
//         analyzeImage(fileInput.files[0]);
//     });

//     fileInput.addEventListener('change', function() {
//         if (fileInput.files.length) {
//             displayImagePreview(fileInput.files[0]);
//         }
//     });

//     // Drag and drop handlers
//     dragDropArea.addEventListener("dragover", (e) => {
//         e.preventDefault();
//         dragDropArea.classList.add("dragover");
//     });

//     dragDropArea.addEventListener("dragleave", () => {
//         dragDropArea.classList.remove("dragover");
//     });

//     dragDropArea.addEventListener("drop", (e) => {
//         e.preventDefault();
//         dragDropArea.classList.remove("dragover");
        
//         if (e.dataTransfer.files.length) {
//             fileInput.files = e.dataTransfer.files;
//             displayImagePreview(e.dataTransfer.files[0]);
//         }
//     });

//     dragDropArea.addEventListener("click", () => fileInput.click());
// });