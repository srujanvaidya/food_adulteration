// Main JavaScript functionality for FoodGuard

// Global variables
let currentImageFile = null;
let currentStream = null;
let isScanning = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupSmoothScrolling();
    setupImageUpload();
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            scrollToSection(targetId);
            updateActiveNavLink(this);
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Smooth scrolling for navigation
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Update active navigation link
function updateActiveNavLink(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

// Scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Modal Functions
function showScanner() {
    document.getElementById('scannerModal').style.display = 'block';
    document.getElementById('barcodeInput').focus();
}

function showImageUpload() {
    document.getElementById('imageModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    // Reset forms
    if (modalId === 'scannerModal') {
        document.getElementById('barcodeInput').value = '';
        hideElement('barcodeResult');
        stopCamera(); // Stop camera when closing modal
    } else if (modalId === 'imageModal') {
        hideElement('imagePreview');
        hideElement('imageResult');
        currentImageFile = null;
    }
}

// Tab switching functionality
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.scanner-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Stop camera if switching away from camera tab
    if (tabName !== 'camera') {
        stopCamera();
    }
}

// Camera functionality
async function startCamera() {
    try {
        const constraints = {
            video: {
                facingMode: 'environment', // Use back camera on mobile
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };
        
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.createElement('video');
        video.srcObject = currentStream;
        video.autoplay = true;
        video.playsInline = true;
        
        const cameraPreview = document.getElementById('cameraPreview');
        cameraPreview.innerHTML = '';
        cameraPreview.appendChild(video);
        
        // Add scanner overlay
        const overlay = document.createElement('div');
        overlay.className = 'scanner-overlay';
        cameraPreview.appendChild(overlay);
        
        // Update button states
        document.getElementById('startCameraBtn').style.display = 'none';
        document.getElementById('stopCameraBtn').style.display = 'inline-flex';
        
        // Start barcode scanning
        startBarcodeScanning();
        
        showToast('Camera started! Position barcode within the frame.', 'success');
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        showToast('Unable to access camera. Please check permissions.', 'error');
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    // Reset camera preview
    const cameraPreview = document.getElementById('cameraPreview');
    cameraPreview.innerHTML = `
        <div class="camera-placeholder">
            <i class="fas fa-camera"></i>
            <p>Camera will appear here</p>
        </div>
    `;
    
    // Update button states
    document.getElementById('startCameraBtn').style.display = 'inline-flex';
    document.getElementById('stopCameraBtn').style.display = 'none';
    
    // Stop barcode scanning
    stopBarcodeScanning();
}

function startBarcodeScanning() {
    if (typeof Quagga === 'undefined') {
        console.error('Quagga library not loaded');
        return;
    }
    
    isScanning = true;
    
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#cameraPreview'),
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment"
            }
        },
        decoder: {
            readers: [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader",
                "code_39_reader",
                "code_39_vin_reader",
                "codabar_reader",
                "upc_reader",
                "upc_e_reader",
                "i2of5_reader"
            ]
        },
        locate: true,
        locator: {
            patchSize: "medium",
            halfSample: true
        }
    }, function(err) {
        if (err) {
            console.error('Quagga initialization error:', err);
            showToast('Barcode scanner initialization failed', 'error');
            return;
        }
        
        Quagga.start();
        console.log("Barcode scanner started");
    });
    
    Quagga.onDetected(function(data) {
        if (isScanning) {
            const code = data.codeResult.code;
            console.log('Barcode detected:', code);
            
            // Stop scanning to prevent multiple detections
            stopBarcodeScanning();
            
            // Process the detected barcode
            processDetectedBarcode(code);
        }
    });
}

function stopBarcodeScanning() {
    if (isScanning && typeof Quagga !== 'undefined') {
        Quagga.stop();
        isScanning = false;
        console.log("Barcode scanner stopped");
    }
}

function processDetectedBarcode(barcode) {
    showToast(`Barcode detected: ${barcode}`, 'success');
    
    // Show results section
    showElement('barcodeResult');
    showElement('barcodeLoading');
    hideElement('barcodeData');
    
    // Call the API with detected barcode
    fetch('/api/v1/barcode/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            Barcode: barcode
        })
    })
    .then(response => response.json())
    .then(data => {
        hideElement('barcodeLoading');
        showElement('barcodeData');
        
        if (data.error) {
            showToast('Error: ' + data.error, 'error');
            document.getElementById('barcodeData').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to analyze barcode. Please try again.</p>
                </div>
            `;
        } else {
            showToast('Barcode analyzed successfully!', 'success');
            displayBarcodeResults(data, barcode);
        }
    })
    .catch(error => {
        hideElement('barcodeLoading');
        showElement('barcodeData');
        console.error('Error:', error);
        showToast('Network error. Please try again.', 'error');
        document.getElementById('barcodeData').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Network error. Please check your connection and try again.</p>
            </div>
        `;
    });
}

// Barcode Scanning
function scanBarcode() {
    const barcodeInput = document.getElementById('barcodeInput');
    const barcode = barcodeInput.value.trim();
    
    if (!barcode) {
        showToast('Please enter a barcode number', 'error');
        return;
    }
    
    if (!/^\d+$/.test(barcode)) {
        showToast('Please enter a valid numeric barcode', 'error');
        return;
    }
    
    showElement('barcodeResult');
    showElement('barcodeLoading');
    hideElement('barcodeData');
    
    // Call the API
    fetch('/api/v1/barcode/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            Barcode: barcode
        })
    })
    .then(response => response.json())
    .then(data => {
        hideElement('barcodeLoading');
        showElement('barcodeData');
        
        if (data.error) {
            showToast('Error: ' + data.error, 'error');
            document.getElementById('barcodeData').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to analyze barcode. Please try again.</p>
                </div>
            `;
        } else {
            showToast('Barcode analyzed successfully!', 'success');
            displayBarcodeResults(data);
        }
    })
    .catch(error => {
        hideElement('barcodeLoading');
        showElement('barcodeData');
        console.error('Error:', error);
        showToast('Network error. Please try again.', 'error');
        document.getElementById('barcodeData').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Network error. Please check your connection and try again.</p>
            </div>
        `;
    });
}

// Display barcode results
function displayBarcodeResults(data, detectedBarcode = null) {
    const resultContainer = document.getElementById('barcodeData');
    const barcode = detectedBarcode || document.getElementById('barcodeInput').value;
    
    console.log('Barcode Analysis Data:', data);
    
    if (data.analysis && data.analysis.status === 'success') {
        const analysis = data.analysis;
        const productInfo = analysis.product_info;
        const healthAnalysis = analysis.health_analysis;
        const adulterationAnalysis = analysis.adulteration_analysis;
        const riskAssessment = analysis.risk_assessment;
        
        resultContainer.innerHTML = `
            <div class="analysis-container">
                <div class="analysis-header">
                    <i class="fas fa-barcode"></i>
                    <h4>Comprehensive Product Analysis</h4>
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-tag"></i> Product Information</h5>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>Product Name:</strong> ${productInfo.product_name || 'Not available'}
                        </div>
                        <div class="info-item">
                            <strong>Brand:</strong> ${productInfo.brands || 'Not specified'}
                        </div>
                        <div class="info-item">
                            <strong>Category:</strong> ${productInfo.categories || 'Not specified'}
                        </div>
                        <div class="info-item">
                            <strong>Quantity:</strong> ${productInfo.quantity || 'Not specified'}
                        </div>
                        <div class="info-item full-width">
                            <strong>Ingredients:</strong> ${productInfo.ingredients_text || 'Not available'}
                        </div>
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-heart"></i> Health Analysis</h5>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>Nutri-Score:</strong> 
                            <span class="nutriscore-badge ${getNutriScoreClass(healthAnalysis.nutriscore)}">${healthAnalysis.nutriscore || 'Not available'}</span>
                        </div>
                        <div class="info-item">
                            <strong>NOVA Group:</strong> ${healthAnalysis.nova_group || 'Not available'}
                        </div>
                        <div class="info-item">
                            <strong>Health Score:</strong> ${healthAnalysis.overall_score || 0}/10
                        </div>
                        <div class="info-item">
                            <strong>Additives Count:</strong> ${healthAnalysis.additives_count || 0}
                        </div>
                    </div>
                    
                    ${healthAnalysis.health_benefits && healthAnalysis.health_benefits.length > 0 ? `
                        <div class="benefits-section">
                            <strong>Health Benefits:</strong>
                            <ul>
                                ${healthAnalysis.health_benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${healthAnalysis.health_issues && healthAnalysis.health_issues.length > 0 ? `
                        <div class="issues-section">
                            <strong>Health Concerns:</strong>
                            <ul>
                                ${healthAnalysis.health_issues.map(issue => `<li>${issue}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-exclamation-triangle"></i> Adulteration Analysis</h5>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>Risk Level:</strong>
                            <span class="risk-badge ${getRiskClass(adulterationAnalysis.risk_level)}">${adulterationAnalysis.risk_level}</span>
                        </div>
                        <div class="info-item">
                            <strong>Additives Count:</strong> ${adulterationAnalysis.additives_count || 0}
                        </div>
                        <div class="info-item">
                            <strong>Suspicious Ingredients:</strong> ${adulterationAnalysis.suspicious_ingredients || 0}
                        </div>
                        <div class="info-item">
                            <strong>Packaging Concerns:</strong> ${adulterationAnalysis.packaging_concerns || 0}
                        </div>
                    </div>
                    
                    ${adulterationAnalysis.risks && adulterationAnalysis.risks.length > 0 ? `
                        <div class="risks-section">
                            <strong>Identified Risks:</strong>
                            <ul>
                                ${adulterationAnalysis.risks.map(risk => `<li>${risk}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-chart-line"></i> Risk Assessment</h5>
                    <div class="risk-assessment">
                        <div class="risk-level">
                            <strong>Overall Risk:</strong>
                            <span class="risk-badge ${getRiskClass(riskAssessment.overall_risk)}">${riskAssessment.overall_risk}</span>
                            <span class="confidence-score">
                                <strong>Confidence:</strong> ${riskAssessment.confidence_score}/10
                            </span>
                        </div>
                        <div class="recommendations">
                            <strong>Consumption Recommendation:</strong>
                            <p>${riskAssessment.consumption_recommendation}</p>
                        </div>
                    </div>
                </div>
                
                ${analysis.recommendations && analysis.recommendations.length > 0 ? `
                    <div class="analysis-section">
                        <h5><i class="fas fa-lightbulb"></i> Recommendations</h5>
                        <div class="recommendations-list">
                            <ul>
                                ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                ` : ''}
                
                ${analysis.home_tests && analysis.home_tests.length > 0 ? `
                    <div class="analysis-section">
                        <h5><i class="fas fa-home"></i> Home Tests</h5>
                        <div class="home-tests">
                            ${analysis.home_tests.map(test => `
                                <div class="test-card">
                                    <h6><i class="fas fa-flask"></i> ${test.test_name}</h6>
                                    <div class="test-details">
                                        <div class="test-materials">
                                            <strong>Materials Needed:</strong>
                                            <ul>
                                                ${test.materials_needed.map(material => `<li>${material}</li>`).join('')}
                                            </ul>
                                        </div>
                                        <div class="test-procedure">
                                            <strong>Procedure:</strong>
                                            <p>${test.procedure}</p>
                                        </div>
                                        <div class="test-results">
                                            <div class="expected-result">
                                                <strong>Expected Result:</strong>
                                                <p>${test.expected_result}</p>
                                            </div>
                                            <div class="adulteration-indicator">
                                                <strong>Adulteration Indicator:</strong>
                                                <p>${test.adulteration_indicator}</p>
                                            </div>
                                        </div>
                                        <div class="safety-notes">
                                            <strong><i class="fas fa-shield-alt"></i> Safety Notes:</strong>
                                            <p>${test.safety_notes}</p>
                                        </div>
                                        ${test.accuracy_level ? `
                                            <div class="accuracy-level">
                                                <strong><i class="fas fa-chart-line"></i> Accuracy Level:</strong>
                                                <span class="accuracy-badge ${getAccuracyClass(test.accuracy_level)}">${test.accuracy_level}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="scanAnotherBarcode()">
                        <i class="fas fa-plus"></i>
                        Scan Another
                    </button>
                </div>
            </div>
        `;
    } else if (data.analysis && data.analysis.status === 'not_found') {
        resultContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Product Not Found</h4>
                <p><strong>Barcode:</strong> ${barcode}</p>
                <p>This product was not found in the OpenFoodFacts database.</p>
                <div class="info-note">
                    <i class="fas fa-info-circle"></i>
                    <p>Try scanning the barcode again or enter it manually. Some newer products may not be in the database yet.</p>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="scanAnotherBarcode()">
                        <i class="fas fa-redo"></i>
                        Try Again
                    </button>
                </div>
            </div>
        `;
    } else {
        resultContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Analysis Failed</h4>
                <p><strong>Barcode:</strong> ${barcode}</p>
                <p>Unable to analyze the product. Please try again.</p>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="scanAnotherBarcode()">
                        <i class="fas fa-redo"></i>
                        Try Again
                    </button>
                </div>
            </div>
        `;
    }
}

function getNutriScoreClass(nutriscore) {
    switch(nutriscore?.toUpperCase()) {
        case 'A': return 'nutriscore-a';
        case 'B': return 'nutriscore-b';
        case 'C': return 'nutriscore-c';
        case 'D': return 'nutriscore-d';
        case 'E': return 'nutriscore-e';
        default: return 'nutriscore-unknown';
    }
}

function scanAnotherBarcode() {
    // Reset the form
    document.getElementById('barcodeInput').value = '';
    hideElement('barcodeResult');
    
    // Switch to manual tab for easy re-entry
    switchTab('manual');
    document.getElementById('barcodeInput').focus();
}

// Image Upload Setup
function setupImageUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        imageInput.click();
    });
    
    // File input change
    imageInput.addEventListener('change', handleImageSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
        uploadArea.style.backgroundColor = '#edf2f7';
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#cbd5e0';
        uploadArea.style.backgroundColor = '#f7fafc';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#cbd5e0';
        uploadArea.style.backgroundColor = '#f7fafc';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    });
}

// Handle image selection
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleImageFile(file);
    }
}

// Handle image file
function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showToast('Image size should be less than 10MB', 'error');
        return;
    }
    
    currentImageFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('previewImage').src = e.target.result;
        showElement('imagePreview');
    };
    reader.readAsDataURL(file);
}

// Analyze Image
function analyzeImage() {
    if (!currentImageFile) {
        showToast('Please select an image first', 'error');
        return;
    }
    
    showElement('imageResult');
    showElement('imageLoading');
    hideElement('imageData');
    
    const formData = new FormData();
    formData.append('image', currentImageFile);
    
    fetch('/api/v1/image/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()
        },
        body: formData
    })
    .then(response => {
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    })
    .then(data => {
        console.log('API Response received:', data);
        hideElement('imageLoading');
        showElement('imageData');
        
        if (data.error) {
            showToast('Error: ' + data.error, 'error');
            console.error('API Error:', data.error);
        } else {
            showToast('Image analyzed successfully!', 'success');
        }
        
        // Always display results, even if there's an error
        displayImageResults(data);
        
        // Add scroll indicator after a short delay
        setTimeout(() => {
            addScrollIndicator();
        }, 500);
    })
    .catch(error => {
        hideElement('imageLoading');
        showElement('imageData');
        console.error('Fetch Error:', error);
        showToast('Network error. Please try again.', 'error');
        
        // Display error information
        document.getElementById('imageData').innerHTML = `
            <div class="analysis-container">
                <div class="analysis-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Network Error</h4>
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-wifi"></i> Connection Error</h5>
                    <div class="error-details">
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p><strong>Details:</strong> Unable to connect to the analysis server. Please check your internet connection and try again.</p>
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-home"></i> Manual Inspection</h5>
                    <div class="home-tests">
                        <div class="test-card">
                            <h6><i class="fas fa-eye"></i> Visual Inspection</h6>
                            <div class="test-details">
                                <div class="test-materials">
                                    <strong>Materials Needed:</strong>
                                    <ul>
                                        <li>Good lighting</li>
                                        <li>Magnifying glass (optional)</li>
                                    </ul>
                                </div>
                                <div class="test-procedure">
                                    <strong>Procedure:</strong>
                                    <p>Examine the food product carefully for unusual colors, textures, or foreign particles.</p>
                                </div>
                                <div class="safety-notes">
                                    <strong><i class="fas fa-shield-alt"></i> Safety Notes:</strong>
                                    <p>When in doubt, do not consume the product.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="analyzeAnotherImage()">
                        <i class="fas fa-redo"></i>
                        Try Again
                    </button>
                </div>
            </div>
        `;
    });
}

// Display image analysis results
function displayImageResults(data) {
    const resultContainer = document.getElementById('imageData');
    
    // Debug: Log the data structure
    console.log('Full API Response:', data);
    
    // Handle different response structures
    let analysis = null;
    let status = 'error';
    
    if (data.analysis) {
        // If analysis exists, use it
        if (data.analysis.status === 'success' && data.analysis.analysis) {
            analysis = data.analysis.analysis;
            status = 'success';
        } else if (data.analysis.status === 'success') {
            // Sometimes the analysis is directly in data.analysis
            analysis = data.analysis;
            status = 'success';
        }
    } else if (data.status === 'success') {
        // Direct structure
        analysis = data;
        status = 'success';
    }
    
    console.log('Processed Analysis:', analysis);
    console.log('Status:', status);
    
    if (status === 'success' && analysis) {
        
        resultContainer.innerHTML = `
            <div class="analysis-container">
                <div class="analysis-header">
                    <i class="fas fa-microscope"></i>
                    <h4>AI-Powered Food Analysis</h4>
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-tag"></i> Product Identification</h5>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>Food Type:</strong> ${analysis.product_identification?.food_type || 'Not identified'}
                        </div>
                        <div class="info-item">
                            <strong>Brand:</strong> ${analysis.product_identification?.brand_visible || 'Not visible'}
                        </div>
                        <div class="info-item">
                            <strong>Packaging:</strong> ${analysis.product_identification?.packaging_type || 'Not specified'}
                        </div>
                        <div class="info-item">
                            <strong>Expiry Date:</strong> ${analysis.product_identification?.expiry_visible || 'Not visible'}
                        </div>
                        <div class="info-item full-width">
                            <strong>Appearance Assessment:</strong> ${analysis.product_identification?.appearance_assessment || 'Not assessed'}
                        </div>
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-exclamation-triangle"></i> Adulteration Indicators</h5>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>Color Issues:</strong> ${analysis.adulteration_indicators?.color_anomalies || 'None detected'}
                        </div>
                        <div class="info-item">
                            <strong>Texture Issues:</strong> ${analysis.adulteration_indicators?.texture_issues || 'None detected'}
                        </div>
                        <div class="info-item">
                            <strong>Packaging:</strong> ${analysis.adulteration_indicators?.packaging_concerns || 'No concerns'}
                        </div>
                        <div class="info-item">
                            <strong>Authenticity:</strong> ${analysis.adulteration_indicators?.authenticity_signs || 'Not assessed'}
                        </div>
                        <div class="info-item full-width">
                            <strong>Overall Quality:</strong> ${analysis.adulteration_indicators?.overall_quality || 'Not assessed'}
                        </div>
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-vial"></i> Potential Adulterants</h5>
                    <div class="adulterants-list">
                        ${analysis.potential_adulterants ? 
                            analysis.potential_adulterants.map(adulterant => 
                                `<span class="adulterant-tag">${adulterant}</span>`
                            ).join('') : 
                            '<span class="no-adulterants">No specific adulterants detected</span>'
                        }
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-home"></i> Home Tests You Can Perform</h5>
                    <div class="home-tests">
                        ${analysis.home_tests ? 
                            analysis.home_tests.map(test => `
                                <div class="test-card">
                                    <h6><i class="fas fa-flask"></i> ${test.test_name}</h6>
                                    <div class="test-details">
                                        <div class="test-materials">
                                            <strong>Materials Needed:</strong>
                                            <ul>
                                                ${test.materials_needed.map(material => `<li>${material}</li>`).join('')}
                                            </ul>
                                        </div>
                                        <div class="test-procedure">
                                            <strong>Procedure:</strong>
                                            <p>${test.procedure}</p>
                                        </div>
                                        <div class="test-results">
                                            <div class="expected-result">
                                                <strong>Expected Result:</strong>
                                                <p>${test.expected_result}</p>
                                            </div>
                                            <div class="adulteration-indicator">
                                                <strong>Adulteration Indicator:</strong>
                                                <p>${test.adulteration_indicator}</p>
                                            </div>
                                        </div>
                                        <div class="safety-notes">
                                            <strong><i class="fas fa-shield-alt"></i> Safety Notes:</strong>
                                            <p>${test.safety_notes}</p>
                                        </div>
                                        ${test.accuracy_level ? `
                                            <div class="accuracy-level">
                                                <strong><i class="fas fa-chart-line"></i> Accuracy Level:</strong>
                                                <span class="accuracy-badge ${getAccuracyClass(test.accuracy_level)}">${test.accuracy_level}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('') : 
                            '<p>No specific home tests available for this product.</p>'
                        }
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-chart-line"></i> Risk Assessment</h5>
                    <div class="risk-assessment">
                        <div class="risk-level">
                            <strong>Risk Level:</strong>
                            <span class="risk-badge ${getRiskClass(analysis.risk_assessment?.risk_level)}">
                                ${analysis.risk_assessment?.risk_level || 'Unknown'}
                            </span>
                            ${analysis.risk_assessment?.confidence_score ? `
                                <span class="confidence-score">
                                    <strong>Confidence:</strong> ${analysis.risk_assessment.confidence_score}/10
                                </span>
                            ` : ''}
                        </div>
                        <div class="recommendations">
                            <strong>Recommendations:</strong>
                            <p>${analysis.risk_assessment?.recommendations || 'No specific recommendations available.'}</p>
                        </div>
                        ${analysis.risk_assessment?.immediate_actions ? `
                            <div class="immediate-actions">
                                <strong><i class="fas fa-exclamation-circle"></i> Immediate Actions:</strong>
                                <p>${analysis.risk_assessment.immediate_actions}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${analysis.additional_notes ? `
                    <div class="analysis-section">
                        <h5><i class="fas fa-sticky-note"></i> Additional Notes</h5>
                        <p>${analysis.additional_notes}</p>
                    </div>
                ` : ''}
                
                ${analysis.ai_analysis_metadata ? `
                    <div class="analysis-section">
                        <h5><i class="fas fa-robot"></i> AI Analysis Details</h5>
                        <div class="info-grid">
                            <div class="info-item">
                                <strong>Model Version:</strong> ${analysis.ai_analysis_metadata.model_version || 'Unknown'}
                            </div>
                            <div class="info-item">
                                <strong>Analysis Time:</strong> ${analysis.ai_analysis_metadata.analysis_timestamp || 'Unknown'}
                            </div>
                            <div class="info-item">
                                <strong>Image Quality:</strong> ${analysis.ai_analysis_metadata.image_quality_assessment || 'Not assessed'}
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="analyzeAnotherImage()">
                        <i class="fas fa-plus"></i>
                        Analyze Another Image
                    </button>
                </div>
            </div>
        `;
    } else {
        // Fallback for error cases or unexpected data structure
        console.log('Displaying fallback - Analysis failed or unexpected data structure');
        
        // Show raw data for debugging
        const rawDataDisplay = data.raw_response || JSON.stringify(data, null, 2);
        
        resultContainer.innerHTML = `
            <div class="analysis-container">
                <div class="analysis-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Analysis Status</h4>
                </div>
                
                <div class="analysis-section">
                    <h5><i class="fas fa-info-circle"></i> Analysis Information</h5>
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>Status:</strong> ${data.status || 'Unknown'}
                        </div>
                        <div class="info-item">
                            <strong>Filename:</strong> ${data.filename || 'Unknown'}
                        </div>
                        <div class="info-item">
                            <strong>File Size:</strong> ${data.file_size ? (data.file_size / 1024).toFixed(2) + ' KB' : 'Unknown'}
                        </div>
                        <div class="info-item">
                            <strong>Content Type:</strong> ${data.content_type || 'Unknown'}
                        </div>
                    </div>
                </div>
                
                ${data.error ? `
                    <div class="analysis-section">
                        <h5><i class="fas fa-exclamation-triangle"></i> Error Details</h5>
                        <div class="error-details">
                            <p><strong>Error:</strong> ${data.error}</p>
                        </div>
                    </div>
                ` : ''}
                
                ${rawDataDisplay ? `
                    <div class="analysis-section">
                        <h5><i class="fas fa-code"></i> Raw Response</h5>
                        <div class="raw-response">
                            <pre style="background: #f7fafc; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px; max-height: 300px;">${rawDataDisplay}</pre>
                        </div>
                    </div>
                ` : ''}
                
                <div class="analysis-section">
                    <h5><i class="fas fa-home"></i> General Home Tests</h5>
                    <div class="home-tests">
                        <div class="test-card">
                            <h6><i class="fas fa-flask"></i> Visual Inspection Test</h6>
                            <div class="test-details">
                                <div class="test-materials">
                                    <strong>Materials Needed:</strong>
                                    <ul>
                                        <li>Good lighting</li>
                                        <li>Magnifying glass (optional)</li>
                                        <li>Clean white surface</li>
                                    </ul>
                                </div>
                                <div class="test-procedure">
                                    <strong>Procedure:</strong>
                                    <p>Examine the food product carefully for any unusual colors, textures, foreign particles, or inconsistencies. Check for proper packaging and expiration dates.</p>
                                </div>
                                <div class="test-results">
                                    <div class="expected-result">
                                        <strong>Expected Result:</strong>
                                        <p>Natural appearance consistent with the product type, uniform color and texture</p>
                                    </div>
                                    <div class="adulteration-indicator">
                                        <strong>Adulteration Indicator:</strong>
                                        <p>Unusual colors, foreign particles, inconsistent texture, or suspicious packaging</p>
                                    </div>
                                </div>
                                <div class="safety-notes">
                                    <strong><i class="fas fa-shield-alt"></i> Safety Notes:</strong>
                                    <p>Do not consume if you notice any suspicious characteristics. When in doubt, discard the product.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="test-card">
                            <h6><i class="fas fa-flask"></i> Water Solubility Test</h6>
                            <div class="test-details">
                                <div class="test-materials">
                                    <strong>Materials Needed:</strong>
                                    <ul>
                                        <li>Clean glass of water</li>
                                        <li>Small amount of food product</li>
                                    </ul>
                                </div>
                                <div class="test-procedure">
                                    <strong>Procedure:</strong>
                                    <p>Add a small amount of the food product to clean water and observe how it behaves.</p>
                                </div>
                                <div class="test-results">
                                    <div class="expected-result">
                                        <strong>Expected Result:</strong>
                                        <p>Natural behavior based on product type (e.g., milk forms white layer, honey sinks)</p>
                                    </div>
                                    <div class="adulteration-indicator">
                                        <strong>Adulteration Indicator:</strong>
                                        <p>Unusual mixing behavior, excessive color bleeding, or unexpected reactions</p>
                                    </div>
                                </div>
                                <div class="safety-notes">
                                    <strong><i class="fas fa-shield-alt"></i> Safety Notes:</strong>
                                    <p>Do not consume the tested portion. Use this test for observation only.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="analyzeAnotherImage()">
                        <i class="fas fa-redo"></i>
                        Try Another Image
                    </button>
                </div>
            </div>
        `;
    }
}

function getRiskClass(riskLevel) {
    switch(riskLevel?.toLowerCase()) {
        case 'low': return 'risk-low';
        case 'medium': return 'risk-medium';
        case 'high': return 'risk-high';
        default: return 'risk-unknown';
    }
}

function getAccuracyClass(accuracyLevel) {
    switch(accuracyLevel?.toLowerCase()) {
        case 'high': return 'accuracy-high';
        case 'medium': return 'accuracy-medium';
        case 'low': return 'accuracy-low';
        default: return 'accuracy-unknown';
    }
}

function analyzeAnotherImage() {
    // Reset the form
    hideElement('imagePreview');
    hideElement('imageResult');
    currentImageFile = null;
    
    // Reset file input
    document.getElementById('imageInput').value = '';
    
    // Focus on upload area
    document.getElementById('uploadArea').scrollIntoView({ behavior: 'smooth' });
}

// Test API Connection
function testAPI() {
    showToast('Testing API connection...', 'success');
    
    // Test with a simple GET request first
    fetch('/api/v1/image/', {
        method: 'GET',
        headers: {
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => {
        console.log('API Test Response Status:', response.status);
        console.log('API Test Response Headers:', response.headers);
        
        if (response.status === 405) {
            showToast('API endpoint exists (Method Not Allowed is expected for GET)', 'success');
        } else if (response.ok) {
            showToast('API connection successful!', 'success');
        } else {
            showToast(`API responded with status: ${response.status}`, 'error');
        }
        
        return response.text();
    })
    .then(text => {
        console.log('API Test Response:', text);
    })
    .catch(error => {
        console.error('API Test Error:', error);
        showToast('API connection failed: ' + error.message, 'error');
    });
}

// Add scroll indicator
function addScrollIndicator() {
    const modalBody = document.querySelector('.modal-body');
    const analysisContainer = document.querySelector('.analysis-container');
    
    if (modalBody && analysisContainer) {
        // Check if content is scrollable
        if (modalBody.scrollHeight > modalBody.clientHeight) {
            // Add scroll indicator
            const scrollIndicator = document.createElement('div');
            scrollIndicator.className = 'scroll-indicator';
            scrollIndicator.innerHTML = `
                <div style="text-align: center; padding: 10px; background: rgba(102, 126, 234, 0.1); border-radius: 8px; margin: 10px 0; color: #667eea; font-size: 14px;">
                    <i class="fas fa-chevron-down"></i> Scroll down to see more results
                </div>
            `;
            
            // Insert at the top of analysis container
            analysisContainer.insertBefore(scrollIndicator, analysisContainer.firstChild);
            
            // Remove indicator after scrolling
            modalBody.addEventListener('scroll', function() {
                if (modalBody.scrollTop > 50) {
                    scrollIndicator.style.display = 'none';
                }
            });
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                scrollIndicator.style.display = 'none';
            }, 3000);
        }
    }
}

// Utility Functions
function showElement(elementId) {
    const element = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (element) {
        element.style.display = 'block';
    }
}

function hideElement(elementId) {
    const element = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (element) {
        element.style.display = 'none';
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
}

// Add some additional CSS for dynamic elements
const additionalStyles = `
<style>
.error-message, .success-message {
    padding: 20px;
    border-radius: 8px;
    text-align: center;
}

.error-message {
    background: #fed7d7;
    color: #c53030;
    border-left: 4px solid #f56565;
}

.success-message {
    background: #c6f6d5;
    color: #2f855a;
    border-left: 4px solid #48bb78;
}

.error-message i, .success-message i {
    font-size: 2rem;
    margin-bottom: 1rem;
}

.error-message h4, .success-message h4 {
    margin-bottom: 1rem;
    font-weight: 600;
}

.info-note {
    background: #e6fffa;
    padding: 12px 16px;
    border-radius: 6px;
    margin-top: 1rem;
    border-left: 3px solid #38b2ac;
}

.info-note p {
    margin: 0;
    color: #2c7a7b;
    font-size: 0.9rem;
}

.info-note i {
    margin-right: 8px;
    color: #38b2ac;
}
</style>
`;

// Inject additional styles
document.head.insertAdjacentHTML('beforeend', additionalStyles);
