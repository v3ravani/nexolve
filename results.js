// ============================================
// Results Page JavaScript
// ============================================

// Get Gemini API Key from config
// Set default API key if not already configured
if (typeof CONFIG !== 'undefined' && !CONFIG.isConfigured()) {
    CONFIG.setGeminiApiKey('AIzaSyBLWnaGGBwkrrgWJ3wBW5eAGFLGzFjgn10');
}

// Get the API key from config or use default
const GEMINI_API_KEY = typeof CONFIG !== 'undefined' ? CONFIG.getGeminiApiKey().catch(() => null) : 'AIzaSyBLWnaGGBwkrrgWJ3wBW5eAGFLGzFjgn10';

let assessmentData = null;
let lastAnalysisData = null; // Store the analysis data for hospital search

// ============================================
// DOM Content Loaded
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Load assessment data from localStorage
    loadAssessmentData();
    
    // Display summary
    displaySummary();
    
    // Display blood report data if available
    displayBloodReportData();
    
    // Load last analysis data if available
    try {
        const storedAnalysisData = localStorage.getItem('lastAnalysisData');
        if (storedAnalysisData) {
            lastAnalysisData = JSON.parse(storedAnalysisData);
        }
    } catch (e) {
        console.warn('Could not load last analysis data from localStorage');
    }
    
    // Setup download buttons
    setupDownloadButtons();
    
    // Auto-start all analysis if coming from form submission
    const autoStart = localStorage.getItem('autoStartAllAnalysis');
    if (autoStart === 'true') {
        localStorage.removeItem('autoStartAllAnalysis');
        // Start analysis after a short delay
        setTimeout(() => {
            startAllAnalysis();
        }, 500);
    }
});

// ============================================
// Start All Analysis (Auto-triggered)
// ============================================
async function startAllAnalysis() {
    try {
        // Step 1: Run AI Analysis
        await handleAnalyze(true);
    } catch (error) {
        console.error('Error in auto-analysis flow:', error);
    }
}

// ============================================
// Load Assessment Data
// ============================================
function loadAssessmentData() {
    try {
        const stored = localStorage.getItem('assessmentData');
        if (stored) {
            assessmentData = JSON.parse(stored);
        } else {
            // If no data, redirect to assessment page
            window.location.href = 'assessment.html';
        }
    } catch (error) {
        console.error('Error loading assessment data:', error);
        window.location.href = 'assessment.html';
    }
}

// ============================================
// Display Summary
// ============================================
function displaySummary() {
    const summaryContent = document.getElementById('summaryContent');
    if (!summaryContent || !assessmentData) return;
    
    let summaryHTML = '';
    
    // Personal Details
    if (assessmentData.personal) {
        const pd = assessmentData.personal;
        summaryHTML += '<h3>Personal Details</h3>';
        summaryHTML += '<div class="summary-grid">';
        if (pd.name) summaryHTML += `<div class="summary-item"><strong>Name:</strong> <span>${pd.name}</span></div>`;
        if (pd.age) summaryHTML += `<div class="summary-item"><strong>Age:</strong> <span>${pd.age}</span></div>`;
        if (pd.gender) summaryHTML += `<div class="summary-item"><strong>Gender:</strong> <span>${pd.gender}</span></div>`;
        if (pd.height) summaryHTML += `<div class="summary-item"><strong>Height:</strong> <span>${pd.height} cm</span></div>`;
        if (pd.weight) summaryHTML += `<div class="summary-item"><strong>Weight:</strong> <span>${pd.weight} kg</span></div>`;
        if (pd.city) summaryHTML += `<div class="summary-item"><strong>City:</strong> <span>${pd.city}</span></div>`;
        summaryHTML += '</div>';
    }
    
    // Symptoms
    if (assessmentData.symptoms) {
        const sym = assessmentData.symptoms;
        summaryHTML += '<h3>Symptoms</h3>';
        summaryHTML += '<div class="summary-grid">';
        if (sym.primarySymptom) summaryHTML += `<div class="summary-item"><strong>Primary Symptom:</strong> <span>${sym.primarySymptom}</span></div>`;
        if (sym.duration) summaryHTML += `<div class="summary-item"><strong>Duration:</strong> <span>${sym.duration}</span></div>`;
        if (sym.severity) summaryHTML += `<div class="summary-item"><strong>Severity:</strong> <span>${sym.severity}</span></div>`;
        if (sym.painScale) summaryHTML += `<div class="summary-item"><strong>Pain Scale:</strong> <span>${sym.painScale}/10</span></div>`;
        summaryHTML += '</div>';
    }
    
    // Blood Report
    if (assessmentData.bloodReport && assessmentData.bloodReport.pdfUploaded) {
        summaryHTML += '<h3>Blood Report</h3>';
        summaryHTML += '<div class="summary-grid">';
        summaryHTML += `<div class="summary-item"><strong>PDF File:</strong> <span>${assessmentData.bloodReport.pdfFileName || 'Uploaded'}</span></div>`;
        if (assessmentData.bloodReport.extractedData) {
            const extracted = assessmentData.bloodReport.extractedData;
            let valueCount = 0;
            
            if (extracted.hematology) {
                const hemo = extracted.hematology;
                if (hemo.hemoglobin?.value) valueCount++;
                if (hemo.wbcCount?.value) valueCount++;
                if (hemo.plateletCount?.value) valueCount++;
            }
            
            if (extracted.differentialCount) {
                const diff = extracted.differentialCount;
                if (diff.neutrophils) valueCount++;
                if (diff.lymphocytes) valueCount++;
                if (diff.monocytes) valueCount++;
                if (diff.eosinophils) valueCount++;
                if (diff.basophils) valueCount++;
            }
            
            if (valueCount > 0) {
                summaryHTML += `<div class="summary-item"><strong>Extracted Values:</strong> <span>${valueCount} values found</span></div>`;
            }
        }
        summaryHTML += '</div>';
    }
    
    summaryContent.innerHTML = summaryHTML;
}

// ============================================
// Display Blood Report Data
// ============================================
function displayBloodReportData() {
    const bloodReportSection = document.getElementById('bloodReportSection');
    const bloodReportContent = document.getElementById('bloodReportContent');
    
    if (!bloodReportSection || !bloodReportContent || !assessmentData) return;
    
    if (!assessmentData.bloodReport || !assessmentData.bloodReport.extractedData) {
        bloodReportSection.style.display = 'none';
        return;
    }
    
    const extracted = assessmentData.bloodReport.extractedData;
    let hasData = false;
    let html = '';
    
    // Patient Details Card
    if (extracted.patientDetails) {
        const pd = extracted.patientDetails;
        const patientItems = [];
        if (pd.name) patientItems.push({ label: 'Name', value: pd.name });
        if (pd.age) patientItems.push({ label: 'Age', value: pd.age });
        if (pd.gender) patientItems.push({ label: 'Gender', value: pd.gender });
        if (pd.reportDate) patientItems.push({ label: 'Report Date', value: pd.reportDate });
        if (pd.labName) patientItems.push({ label: 'Lab Name', value: pd.labName });
        
        if (patientItems.length > 0) {
            html += createCard('👤 Patient Details', 'patient-details', patientItems);
            hasData = true;
        }
    }
    
    // Hematology Card
    if (extracted.hematology) {
        const hemo = extracted.hematology;
        const hemoItems = [];
        
        if (hemo.hemoglobin?.value) {
            hemoItems.push({ label: 'Hemoglobin', value: `${hemo.hemoglobin.value} ${hemo.hemoglobin.unit || ''}`.trim() });
        }
        if (hemo.rbcCount?.value) {
            hemoItems.push({ label: 'RBC Count', value: `${hemo.rbcCount.value} ${hemo.rbcCount.unit || ''}`.trim() });
        }
        if (hemo.wbcCount?.value) {
            hemoItems.push({ label: 'WBC Count', value: `${hemo.wbcCount.value} ${hemo.wbcCount.unit || ''}`.trim() });
        }
        if (hemo.plateletCount?.value) {
            hemoItems.push({ label: 'Platelet Count', value: `${hemo.plateletCount.value} ${hemo.plateletCount.unit || ''}`.trim() });
        }
        if (hemo.hematocrit?.value) {
            hemoItems.push({ label: 'Hematocrit (PCV)', value: `${hemo.hematocrit.value} ${hemo.hematocrit.unit || ''}`.trim() });
        }
        if (hemo.mcv?.value) {
            hemoItems.push({ label: 'MCV', value: `${hemo.mcv.value} ${hemo.mcv.unit || ''}`.trim() });
        }
        if (hemo.mch?.value) {
            hemoItems.push({ label: 'MCH', value: `${hemo.mch.value} ${hemo.mch.unit || ''}`.trim() });
        }
        if (hemo.mchc?.value) {
            hemoItems.push({ label: 'MCHC', value: `${hemo.mchc.value} ${hemo.mchc.unit || ''}`.trim() });
        }
        
        if (hemoItems.length > 0) {
            html += createCard('🩸 Hematology', 'hematology', hemoItems);
            hasData = true;
        }
    }
    
    // Differential Count Card
    if (extracted.differentialCount) {
        const diff = extracted.differentialCount;
        const diffItems = [];
        
        if (diff.neutrophils) diffItems.push({ label: 'Neutrophils', value: `${diff.neutrophils}%` });
        if (diff.lymphocytes) diffItems.push({ label: 'Lymphocytes', value: `${diff.lymphocytes}%` });
        if (diff.monocytes) diffItems.push({ label: 'Monocytes', value: `${diff.monocytes}%` });
        if (diff.eosinophils) diffItems.push({ label: 'Eosinophils', value: `${diff.eosinophils}%` });
        if (diff.basophils) diffItems.push({ label: 'Basophils', value: `${diff.basophils}%` });
        
        if (diffItems.length > 0) {
            html += createCard('📊 Differential Count', 'differential-count', diffItems);
            hasData = true;
        }
    }
    
    // Blood Sugar Card
    if (extracted.bloodSugar) {
        const bs = extracted.bloodSugar;
        const bsItems = [];
        
        if (bs.fasting?.value) {
            bsItems.push({ label: 'Fasting Blood Sugar', value: `${bs.fasting.value} ${bs.fasting.unit || ''}`.trim() });
        }
        if (bs.random?.value) {
            bsItems.push({ label: 'Random Blood Sugar', value: `${bs.random.value} ${bs.random.unit || ''}`.trim() });
        }
        if (bs.postPrandial?.value) {
            bsItems.push({ label: 'Post-Prandial Blood Sugar', value: `${bs.postPrandial.value} ${bs.postPrandial.unit || ''}`.trim() });
        }
        
        if (bsItems.length > 0) {
            html += createCard('🍬 Blood Sugar', 'blood-sugar', bsItems);
            hasData = true;
        }
    }
    
    // Lipid Profile Card
    if (extracted.lipidProfile) {
        const lipid = extracted.lipidProfile;
        const lipidItems = [];
        
        if (lipid.totalCholesterol) lipidItems.push({ label: 'Total Cholesterol', value: `${lipid.totalCholesterol} mg/dL` });
        if (lipid.hdl) lipidItems.push({ label: 'HDL', value: `${lipid.hdl} mg/dL` });
        if (lipid.ldl) lipidItems.push({ label: 'LDL', value: `${lipid.ldl} mg/dL` });
        if (lipid.triglycerides) lipidItems.push({ label: 'Triglycerides', value: `${lipid.triglycerides} mg/dL` });
        
        if (lipidItems.length > 0) {
            html += createCard('💊 Lipid Profile', 'lipid-profile', lipidItems);
            hasData = true;
        }
    }
    
    if (hasData) {
        bloodReportContent.innerHTML = `<div class="structured-analysis">${html}</div>`;
        bloodReportSection.style.display = 'block';
    } else {
        bloodReportSection.style.display = 'none';
    }
}

// ============================================
// Handle Analyze
// ============================================
async function handleAnalyze(isAutoStart = false) {
    if (!assessmentData) {
        if (!isAutoStart) {
            alert('No assessment data found. Please complete an assessment first.');
        }
        return;
    }
    
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    if (!loadingSection || !resultsSection || !errorSection) return;
    
    // Check if API key is configured
    let apiKey = null;
    try {
        if (typeof CONFIG !== 'undefined' && CONFIG.isConfigured()) {
            apiKey = CONFIG.getGeminiApiKey();
        } else if (GEMINI_API_KEY && typeof GEMINI_API_KEY === 'string') {
            apiKey = GEMINI_API_KEY;
        }
    } catch (e) {
        console.warn('Could not retrieve API key:', e);
    }

    if (!apiKey) {
        errorMessage.textContent = 'API key not configured. Please configure your Gemini API key first.';
        errorSection.style.display = 'block';
        resultsSection.style.display = 'none';
        return;
    }
    
    // Show loading, hide other sections
    loadingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';
    }
    
    try {
        // System prompt for medical analysis
        const systemPrompt = `You are a medical information assistant. Your role is to analyze health assessment data and provide helpful, non-diagnostic insights.

IMPORTANT RULES:
- Do NOT provide medical diagnoses
- Do NOT prescribe treatments or medications
- Do NOT interpret lab values as normal/abnormal
- Only provide general health information and observations
- Always recommend consulting qualified healthcare professionals
- Focus on patterns, correlations, and general health insights
- Be clear that this is informational only

Analyze the provided health assessment data and give answer strictly in this format only:
{
  "userSummary": {
    "profileSummary": "",
    "ageGroup": "",
    "bmi": null,
    "bmiCategory": "",
    "lifestyleScore": "",
    "dataQualityNotes": ""
  },

  "symptomAnalysis": {
    "primarySymptomCategory": "",
    "secondarySymptomInsights": "",
    "durationClassification": "",
    "severityLevel": "",
    "painScaleInterpretation": "",
    "patternInterpretation": "",
    "progressionInterpretation": "",
    "triggerInsights": "",
    "reliefInsights": "",
    "riskIncreasingFactors": ""
  },

  "concernMapping": {
    "possibleConcernAreas": [],
    "primarySystemInvolved": "",
    "secondarySystems": [],
    "symptomClusterExplanation": "",
    "overlapInsights": ""
  },

  "riskAssessment": {
    "overallRiskLevel": "",
    "emergencyFlag": "",
    "emergencyReasons": "",
    "recommendedActionWindow": "",
    "monitoringNext48Hours": "",
    "situationsForEarlierHelp": "",
    "immediateHelpIndicators": "",
    "safetyNote": ""
  },

  "specialistGuidance": {
    "primarySpecialist": "",
    "secondarySpecialists": [],
    "specialistReasoning": "",
    "recommendedVisitType": "",
    "questionsForDoctor": [],
    "informationToTellDoctor": []
  },

  "hospitalNavigation": {
    "isHospitalVisitNeeded": "",
    "priorityLevel": "",
    "departmentTags": [],
    "searchKeywords": []
  },

  "bloodReportInsights": {
    "summaryOfValues": "",
    "valuesUsedInInterpretation": [],
    "nonDiagnosticObservations": "",
    "valuesToRecheck": [],
    "simpleUserExplanation": "",
    "reportCompleteness": ""
  }
}


Keep the response professional, and informative.`;

        // Prepare the user message with the JSON data
        const userMessage = `Please analyze this health assessment data:\n\n${JSON.stringify(assessmentData, null, 2)}`;

        // Call Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${systemPrompt}\n\n${userMessage}`
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // Extract the generated text
        let analysisText = '';
        if (result.candidates && result.candidates[0] && result.candidates[0].content) {
            analysisText = result.candidates[0].content.parts[0].text;
        } else {
            throw new Error('No response content received from API');
        }

        // Try to parse JSON from the response
        let analysisData = null;
        try {
            // Remove markdown code blocks if present
            let jsonText = analysisText.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            analysisData = JSON.parse(jsonText);
        } catch (parseError) {
            console.warn('Could not parse JSON, displaying as text:', parseError);
            // If JSON parsing fails, display as formatted text
            const analysisContent = document.getElementById('analysisContent');
            if (analysisContent) {
                analysisContent.innerHTML = `<div class="gemini-response-content">${formatGeminiResponse(analysisText)}</div>`;
            }
        }

        // Display the structured JSON in cards if parsed successfully
        if (analysisData) {
            displayStructuredAnalysis(analysisData);
            // Store analysis data for hospital search
            lastAnalysisData = analysisData;
            
            // Fetch lifestyle recommendations
            fetchLifestyleRecommendations(analysisData);
        }
        
        // Save analysis to localStorage
        try {
            localStorage.setItem('lastAnalysis', analysisText);
            if (analysisData) {
                localStorage.setItem('lastAnalysisData', JSON.stringify(analysisData));
            }
        } catch (e) {
            console.warn('Could not save analysis to localStorage');
        }
        
        // Show results, hide loading
        resultsSection.style.display = 'block';
        loadingSection.style.display = 'none';
        errorSection.style.display = 'none';
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Auto-trigger hospital search if this was auto-started
        if (isAutoStart) {
            setTimeout(() => {
                handleFindHospitals(true);
            }, 2000);
        }
        
    } catch (error) {
        console.error('Gemini API Error:', error);
        errorMessage.textContent = `Error: ${error.message || 'Failed to analyze data. Please check your API key and try again.'}`;
        errorSection.style.display = 'block';
        loadingSection.style.display = 'none';
        resultsSection.style.display = 'none';
    } finally {
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze with AI';
        }
    }
}

// ============================================
// Fetch Lifestyle Recommendations
// ============================================
async function fetchLifestyleRecommendations(analysisData) {
    try {
        let apiKey = null;
        try {
            if (typeof CONFIG !== 'undefined' && CONFIG.isConfigured()) {
                apiKey = CONFIG.getGeminiApiKey();
            } else if (GEMINI_API_KEY && typeof GEMINI_API_KEY === 'string') {
                apiKey = GEMINI_API_KEY;
            }
        } catch (e) {
            console.warn('Could not retrieve API key:', e);
        }

        if (!apiKey) {
            console.warn('API key not available for lifestyle recommendations');
            return;
        }

        const systemPrompt = `You are a health and wellness advisor. Your role is to provide personalized lifestyle recommendations based on health assessment data.

IMPORTANT RULES:
- Provide practical, actionable recommendations
- Focus on prevention and wellness
- Do NOT provide medical advice or diagnoses
- Do NOT prescribe medications
- Recommendations should be suitable for general wellness
- Be encouraging and supportive

Based on the health analysis provided, create personalized recommendations in this JSON format ONLY:
{
  "recommendedLifestyle": {
    "sleepHabits": "",
    "stressManagement": "",
    "dailyRoutine": "",
    "generalWellness": "",
    "keyTips": []
  },
  "dietPlan": {
    "overview": "",
    "foodsToEmphasize": [],
    "foodsToAvoid": [],
    "mealSuggestions": [],
    "hydration": "",
    "supplements": ""
  },
  "exercisePlan": {
    "overview": "",
    "recommendedActivities": [],
    "duration": "",
    "frequency": "",
    "precautions": "",
    "progressionTips": []
  }
}`;

        const userMessage = `Based on this health analysis data, provide personalized lifestyle, diet, and exercise recommendations:

${JSON.stringify(analysisData, null, 2)}

User Info:
- Age: ${assessmentData?.personal?.age || 'Not specified'}
- Primary Symptom: ${assessmentData?.symptoms?.primarySymptom || 'Not specified'}
- Severity: ${assessmentData?.symptoms?.severity || 'Not specified'}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${systemPrompt}\n\n${userMessage}`
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn('Failed to fetch lifestyle recommendations:', errorData.error?.message);
            return;
        }

        const result = await response.json();
        let recommendationsText = '';
        if (result.candidates && result.candidates[0] && result.candidates[0].content) {
            recommendationsText = result.candidates[0].content.parts[0].text;
        } else {
            console.warn('No response content for lifestyle recommendations');
            return;
        }

        // Parse JSON
        let recommendationsData = null;
        try {
            let jsonText = recommendationsText.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            recommendationsData = JSON.parse(jsonText);
        } catch (parseError) {
            console.warn('Could not parse lifestyle recommendations JSON:', parseError);
            return;
        }

        // Display recommendations
        if (recommendationsData) {
            displayLifestyleRecommendations(recommendationsData);
            // Save to localStorage
            try {
                localStorage.setItem('lastLifestyleRecommendations', JSON.stringify(recommendationsData));
            } catch (e) {
                console.warn('Could not save lifestyle recommendations to localStorage');
            }
        }

    } catch (error) {
        console.error('Error fetching lifestyle recommendations:', error);
    }
}

// ============================================
// Display Lifestyle Recommendations
// ============================================
function displayLifestyleRecommendations(data) {
    const recommendationsContent = document.getElementById('recommendationsContent');
    const recommendationsSection = document.getElementById('recommendationsSection');
    
    if (!recommendationsContent || !recommendationsSection || !data) return;

    let html = '<div class="structured-analysis">';

    // Recommended Lifestyle Card
    if (data.recommendedLifestyle) {
        const lifestyle = data.recommendedLifestyle;
        const lifestyleItems = [
            { label: 'Sleep Habits', value: lifestyle.sleepHabits },
            { label: 'Stress Management', value: lifestyle.stressManagement },
            { label: 'Daily Routine', value: lifestyle.dailyRoutine },
            { label: 'General Wellness', value: lifestyle.generalWellness }
        ];

        if (lifestyle.keyTips && Array.isArray(lifestyle.keyTips) && lifestyle.keyTips.length > 0) {
            lifestyleItems.push({
                label: 'Key Tips',
                value: createList(lifestyle.keyTips)
            });
        }

        html += createCard('🌟 Recommended Lifestyle', 'recommended-lifestyle', lifestyleItems);
    }

    // Diet Plan Card
    if (data.dietPlan) {
        const diet = data.dietPlan;
        const dietItems = [
            { label: 'Overview', value: diet.overview },
            { label: 'Hydration', value: diet.hydration },
            { label: 'Supplements', value: diet.supplements }
        ];

        if (diet.foodsToEmphasize && Array.isArray(diet.foodsToEmphasize) && diet.foodsToEmphasize.length > 0) {
            dietItems.push({
                label: 'Foods To Emphasize',
                value: createList(diet.foodsToEmphasize)
            });
        }

        if (diet.foodsToAvoid && Array.isArray(diet.foodsToAvoid) && diet.foodsToAvoid.length > 0) {
            dietItems.push({
                label: 'Foods To Avoid',
                value: createList(diet.foodsToAvoid)
            });
        }

        if (diet.mealSuggestions && Array.isArray(diet.mealSuggestions) && diet.mealSuggestions.length > 0) {
            dietItems.push({
                label: 'Meal Suggestions',
                value: createList(diet.mealSuggestions)
            });
        }

        html += createCard('🥗 Diet Plan', 'diet-plan', dietItems);
    }

    // Exercise Plan Card
    if (data.exercisePlan) {
        const exercise = data.exercisePlan;
        const exerciseItems = [
            { label: 'Overview', value: exercise.overview },
            { label: 'Duration', value: exercise.duration },
            { label: 'Frequency', value: exercise.frequency },
            { label: 'Precautions', value: exercise.precautions }
        ];

        if (exercise.recommendedActivities && Array.isArray(exercise.recommendedActivities) && exercise.recommendedActivities.length > 0) {
            exerciseItems.push({
                label: 'Recommended Activities',
                value: createList(exercise.recommendedActivities)
            });
        }

        if (exercise.progressionTips && Array.isArray(exercise.progressionTips) && exercise.progressionTips.length > 0) {
            exerciseItems.push({
                label: 'Progression Tips',
                value: createList(exercise.progressionTips)
            });
        }

        html += createCard('💪 Exercise Plan', 'exercise-plan', exerciseItems);
    }

    html += '</div>';
    
    // Display the recommendations
    recommendationsContent.innerHTML = html;
    recommendationsSection.style.display = 'block';
}


// ============================================
// Display Structured Analysis
// ============================================
function displayStructuredAnalysis(data) {
    const analysisContent = document.getElementById('analysisContent');
    if (!analysisContent) return;
    
    let html = '<div class="structured-analysis">';
    
    // User Summary Card
    if (data.userSummary) {
        html += createCard('👤 User Summary', 'user-summary', [
            { label: 'Profile Summary', value: data.userSummary.profileSummary },
            { label: 'Age Group', value: data.userSummary.ageGroup },
            { label: 'BMI', value: data.userSummary.bmi !== null ? data.userSummary.bmi : 'Not calculated' },
            { label: 'BMI Category', value: data.userSummary.bmiCategory },
            { label: 'Lifestyle Score', value: data.userSummary.lifestyleScore },
            { label: 'Data Quality Notes', value: data.userSummary.dataQualityNotes }
        ]);
    }
    
    // Symptom Analysis Card
    if (data.symptomAnalysis) {
        html += createCard('🩺 Symptom Analysis', 'symptom-analysis', [
            { label: 'Primary Symptom Category', value: data.symptomAnalysis.primarySymptomCategory },
            { label: 'Secondary Symptom Insights', value: data.symptomAnalysis.secondarySymptomInsights },
            { label: 'Duration Classification', value: data.symptomAnalysis.durationClassification },
            { label: 'Severity Level', value: data.symptomAnalysis.severityLevel },
            { label: 'Pain Scale Interpretation', value: data.symptomAnalysis.painScaleInterpretation },
            { label: 'Pattern Interpretation', value: data.symptomAnalysis.patternInterpretation },
            { label: 'Progression Interpretation', value: data.symptomAnalysis.progressionInterpretation },
            { label: 'Trigger Insights', value: data.symptomAnalysis.triggerInsights },
            { label: 'Relief Insights', value: data.symptomAnalysis.reliefInsights },
            { label: 'Risk Increasing Factors', value: data.symptomAnalysis.riskIncreasingFactors }
        ]);
    }
    
    // Concern Mapping Card
    if (data.concernMapping) {
        const concernItems = [
            { label: 'Primary System Involved', value: data.concernMapping.primarySystemInvolved },
            { label: 'Symptom Cluster Explanation', value: data.concernMapping.symptomClusterExplanation },
            { label: 'Overlap Insights', value: data.concernMapping.overlapInsights }
        ];
        
        if (data.concernMapping.possibleConcernAreas && Array.isArray(data.concernMapping.possibleConcernAreas) && data.concernMapping.possibleConcernAreas.length > 0) {
            concernItems.push({ 
                label: 'Possible Concern Areas', 
                value: createList(data.concernMapping.possibleConcernAreas) 
            });
        }
        
        if (data.concernMapping.secondarySystems && Array.isArray(data.concernMapping.secondarySystems) && data.concernMapping.secondarySystems.length > 0) {
            concernItems.push({ 
                label: 'Secondary Systems', 
                value: createList(data.concernMapping.secondarySystems) 
            });
        }
        
        html += createCard('⚠️ Concern Mapping', 'concern-mapping', concernItems);
    }
    
    // Risk Assessment Card (with special styling for risk level)
    if (data.riskAssessment) {
        const riskItems = [
            { 
                label: 'Overall Risk Level', 
                value: data.riskAssessment.overallRiskLevel,
                highlight: true,
                riskLevel: data.riskAssessment.overallRiskLevel?.toLowerCase()
            },
            { label: 'Emergency Flag', value: data.riskAssessment.emergencyFlag },
            { label: 'Emergency Reasons', value: data.riskAssessment.emergencyReasons },
            { label: 'Recommended Action Window', value: data.riskAssessment.recommendedActionWindow },
            { label: 'Monitoring Next 48 Hours', value: data.riskAssessment.monitoringNext48Hours },
            { label: 'Situations For Earlier Help', value: data.riskAssessment.situationsForEarlierHelp },
            { label: 'Immediate Help Indicators', value: data.riskAssessment.immediateHelpIndicators },
            { label: 'Safety Note', value: data.riskAssessment.safetyNote }
        ];
        
        html += createCard('🚨 Risk Assessment', 'risk-assessment', riskItems);
    }
    
    // Specialist Guidance Card
    if (data.specialistGuidance) {
        const specialistItems = [
            { label: 'Primary Specialist', value: data.specialistGuidance.primarySpecialist, highlight: true },
            { label: 'Specialist Reasoning', value: data.specialistGuidance.specialistReasoning },
            { label: 'Recommended Visit Type', value: data.specialistGuidance.recommendedVisitType }
        ];
        
        if (data.specialistGuidance.secondarySpecialists && Array.isArray(data.specialistGuidance.secondarySpecialists) && data.specialistGuidance.secondarySpecialists.length > 0) {
            specialistItems.push({ 
                label: 'Secondary Specialists', 
                value: createList(data.specialistGuidance.secondarySpecialists) 
            });
        }
        
        if (data.specialistGuidance.questionsForDoctor && Array.isArray(data.specialistGuidance.questionsForDoctor) && data.specialistGuidance.questionsForDoctor.length > 0) {
            specialistItems.push({ 
                label: 'Questions For Doctor', 
                value: createList(data.specialistGuidance.questionsForDoctor) 
            });
        }
        
        if (data.specialistGuidance.informationToTellDoctor && Array.isArray(data.specialistGuidance.informationToTellDoctor) && data.specialistGuidance.informationToTellDoctor.length > 0) {
            specialistItems.push({ 
                label: 'Information To Tell Doctor', 
                value: createList(data.specialistGuidance.informationToTellDoctor) 
            });
        }
        
        html += createCard('👨‍⚕️ Specialist Guidance', 'specialist-guidance', specialistItems);
    }
    
    // Hospital Navigation Card
    if (data.hospitalNavigation) {
        const hospitalItems = [
            { label: 'Is Hospital Visit Needed', value: data.hospitalNavigation.isHospitalVisitNeeded },
            { label: 'Priority Level', value: data.hospitalNavigation.priorityLevel, highlight: true }
        ];
        
        if (data.hospitalNavigation.departmentTags && Array.isArray(data.hospitalNavigation.departmentTags) && data.hospitalNavigation.departmentTags.length > 0) {
            hospitalItems.push({ 
                label: 'Department Tags', 
                value: createTagList(data.hospitalNavigation.departmentTags) 
            });
        }
        
        if (data.hospitalNavigation.searchKeywords && Array.isArray(data.hospitalNavigation.searchKeywords) && data.hospitalNavigation.searchKeywords.length > 0) {
            hospitalItems.push({ 
                label: 'Search Keywords', 
                value: createTagList(data.hospitalNavigation.searchKeywords) 
            });
        }
        
        html += createCard('🏥 Hospital Navigation', 'hospital-navigation', hospitalItems);
    }
    
    // Blood Report Insights Card
    if (data.bloodReportInsights) {
        const bloodItems = [
            { label: 'Summary of Values', value: data.bloodReportInsights.summaryOfValues },
            { label: 'Non-Diagnostic Observations', value: data.bloodReportInsights.nonDiagnosticObservations },
            { label: 'Simple User Explanation', value: data.bloodReportInsights.simpleUserExplanation },
            { label: 'Report Completeness', value: data.bloodReportInsights.reportCompleteness }
        ];
        
        if (data.bloodReportInsights.valuesUsedInInterpretation && Array.isArray(data.bloodReportInsights.valuesUsedInInterpretation) && data.bloodReportInsights.valuesUsedInInterpretation.length > 0) {
            bloodItems.push({ 
                label: 'Values Used In Interpretation', 
                value: createList(data.bloodReportInsights.valuesUsedInInterpretation) 
            });
        }
        
        if (data.bloodReportInsights.valuesToRecheck && Array.isArray(data.bloodReportInsights.valuesToRecheck) && data.bloodReportInsights.valuesToRecheck.length > 0) {
            bloodItems.push({ 
                label: 'Values To Recheck', 
                value: createList(data.bloodReportInsights.valuesToRecheck) 
            });
        }
        
        html += createCard('🩸 Blood Report Insights', 'blood-report-insights', bloodItems);
    }
    
    html += '</div>';
    analysisContent.innerHTML = html;
}

// ============================================
// Create Card Helper
// ============================================
function createCard(title, className, items) {
    if (!items || items.length === 0) return '';
    
    let cardHTML = `<div class="analysis-card ${className}">`;
    cardHTML += `<div class="card-header"><h3>${title}</h3></div>`;
    cardHTML += `<div class="card-body">`;
    
    items.forEach(item => {
        if (item.value && item.value !== '' && item.value !== null) {
            const valueClass = item.highlight ? 'highlight-value' : '';
            const riskClass = item.riskLevel ? `risk-${item.riskLevel.replace(/\s+/g, '-')}` : '';
            cardHTML += `
                <div class="card-item ${valueClass} ${riskClass}">
                    <div class="card-item-label">${item.label}</div>
                    <div class="card-item-value">${item.value}</div>
                </div>
            `;
        }
    });
    
    cardHTML += `</div></div>`;
    return cardHTML;
}

// ============================================
// Create List Helper
// ============================================
function createList(items) {
    if (!Array.isArray(items) || items.length === 0) return '';
    return `<ul class="card-list">${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
}

// ============================================
// Create Tag List Helper
// ============================================
function createTagList(items) {
    if (!Array.isArray(items) || items.length === 0) return '';
    return `<div class="tag-list">${items.map(item => `<span class="tag">${item}</span>`).join('')}</div>`;
}

// ============================================
// Handle Find Hospitals
// ============================================
async function handleFindHospitals(isAutoStart = false) {
    if (!assessmentData) {
        if (!isAutoStart) {
            alert('No assessment data found. Please complete an assessment first.');
        }
        return;
    }
    
    if (!lastAnalysisData) {
        if (!isAutoStart) {
            alert('Please run AI analysis first to get hospital recommendations.');
        }
        return;
    }
    
    const loadingSection = document.getElementById('hospitalsLoadingSection');
    const resultsSection = document.getElementById('hospitalsSection');
    const errorSection = document.getElementById('hospitalsErrorSection');
    const errorMessage = document.getElementById('hospitalsErrorMessage');
    const findHospitalsBtn = document.getElementById('findHospitalsBtn');
    
    if (!loadingSection || !resultsSection || !errorSection) return;
    
    // Check if API key is configured
    let apiKey = null;
    try {
        if (typeof CONFIG !== 'undefined' && CONFIG.isConfigured()) {
            apiKey = CONFIG.getGeminiApiKey();
        } else if (GEMINI_API_KEY && typeof GEMINI_API_KEY === 'string') {
            apiKey = GEMINI_API_KEY;
        }
    } catch (e) {
        console.warn('Could not retrieve API key:', e);
    }

    if (!apiKey) {
        errorMessage.textContent = 'API key not configured. Please configure your Gemini API key first.';
        errorSection.style.display = 'block';
        resultsSection.style.display = 'none';
        return;
    }
    
    // Get user location from assessment data
    const userLocation = assessmentData.personal?.city || 'Unknown Location';
    
    // Show loading, hide other sections
    loadingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    findHospitalsBtn.disabled = true;
    findHospitalsBtn.textContent = 'Searching...';
    
    try {
        // System prompt for hospital recommendations
        const systemPrompt = `You are a healthcare navigation assistant. Your role is to suggest appropriate hospitals, clinics, or general dispensaries based on the user's health condition and location.

IMPORTANT RULES:
- Suggest exactly 3 healthcare facilities
- Prioritize facilities that match the user's condition and specialist needs
- Consider the location provided
- Include a mix of hospitals, clinics, and dispensaries as appropriate
- Provide realistic facility names and addresses (you can use generic names if specific ones aren't available)
- Base recommendations on the analysis data provided

Return your answer STRICTLY in this JSON format only:
{
  "recommendations": [
    {
      "name": "",
      "type": "hospital|clinic|dispensary",
      "address": "",
      "specialization": "",
      "reason": "",
      "distance": "",
      "contact": ""
    },
    {
      "name": "",
      "type": "hospital|clinic|dispensary",
      "address": "",
      "specialization": "",
      "reason": "",
      "distance": "",
      "contact": ""
    },
    {
      "name": "",
      "type": "hospital|clinic|dispensary",
      "address": "",
      "specialization": "",
      "reason": "",
      "distance": "",
      "contact": ""
    }
  ],
  "searchCriteria": {
    "location": "",
    "primaryCondition": "",
    "recommendedSpecialist": ""
  }
}

Keep the response professional and helpful.`;

        // Prepare the user message with location and analysis data
        const userMessage = `User Location: ${userLocation}

Health Analysis Data:
${JSON.stringify(lastAnalysisData, null, 2)}

Please suggest 3 appropriate healthcare facilities (hospitals, clinics, or general dispensaries) based on the analysis and location.`;

        // Call Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${systemPrompt}\n\n${userMessage}`
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // Extract the generated text
        let hospitalsText = '';
        if (result.candidates && result.candidates[0] && result.candidates[0].content) {
            hospitalsText = result.candidates[0].content.parts[0].text;
        } else {
            throw new Error('No response content received from API');
        }

        // Try to parse JSON from the response
        let hospitalsData = null;
        try {
            // Remove markdown code blocks if present
            let jsonText = hospitalsText.trim();
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            hospitalsData = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('Could not parse hospitals JSON:', parseError);
            throw new Error('Invalid response format from API. Please try again.');
        }

        // Display the hospital recommendations
        if (hospitalsData && hospitalsData.recommendations) {
            displayHospitalRecommendations(hospitalsData);
        } else {
            throw new Error('Invalid response structure from API');
        }
        
        // Show results, hide loading
        resultsSection.style.display = 'block';
        loadingSection.style.display = 'none';
        errorSection.style.display = 'none';
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('Hospital Search Error:', error);
        errorMessage.textContent = `Error: ${error.message || 'Failed to find hospitals. Please try again.'}`;
        errorSection.style.display = 'block';
        loadingSection.style.display = 'none';
        resultsSection.style.display = 'none';
    } finally {
        if (findHospitalsBtn) {
            findHospitalsBtn.disabled = false;
            findHospitalsBtn.textContent = 'Find Nearby Hospitals';
        }
    }
}

// ============================================
// Display Hospital Recommendations
// ============================================
function displayHospitalRecommendations(data) {
    const hospitalsContent = document.getElementById('hospitalsContent');
    if (!hospitalsContent || !data.recommendations) return;
    
    let html = '';
    
    // Display search criteria if available
    if (data.searchCriteria) {
        html += '<div class="hospital-search-criteria">';
        html += '<h3>Search Criteria</h3>';
        html += '<div class="criteria-grid">';
        if (data.searchCriteria.location) {
            html += `<div class="criteria-item"><strong>Location:</strong> ${data.searchCriteria.location}</div>`;
        }
        if (data.searchCriteria.primaryCondition) {
            html += `<div class="criteria-item"><strong>Primary Condition:</strong> ${data.searchCriteria.primaryCondition}</div>`;
        }
        if (data.searchCriteria.recommendedSpecialist) {
            html += `<div class="criteria-item"><strong>Recommended Specialist:</strong> ${data.searchCriteria.recommendedSpecialist}</div>`;
        }
        html += '</div></div>';
    }
    
    // Display recommendations
    html += '<div class="hospital-recommendations-grid">';
    
    data.recommendations.forEach((hospital, index) => {
        const typeIcon = hospital.type === 'hospital' ? '🏥' : 
                        hospital.type === 'clinic' ? '🏥' : 
                        '💊';
        const typeClass = hospital.type === 'hospital' ? 'hospital' : 
                         hospital.type === 'clinic' ? 'clinic' : 
                         'dispensary';
        
        html += `
            <div class="hospital-card ${typeClass}">
                <div class="hospital-card-header">
                    <span class="hospital-icon">${typeIcon}</span>
                    <div class="hospital-title">
                        <h3>${hospital.name || 'Healthcare Facility'}</h3>
                        <span class="hospital-type">${hospital.type || 'facility'}</span>
                    </div>
                </div>
                <div class="hospital-card-body">
                    ${hospital.specialization ? `<div class="hospital-item"><strong>Specialization:</strong> ${hospital.specialization}</div>` : ''}
                    ${hospital.address ? `<div class="hospital-item"><strong>Address:</strong> ${hospital.address}</div>` : ''}
                    ${hospital.distance ? `<div class="hospital-item"><strong>Distance:</strong> ${hospital.distance}</div>` : ''}
                    ${hospital.contact ? `<div class="hospital-item"><strong>Contact:</strong> ${hospital.contact}</div>` : ''}
                    ${hospital.reason ? `<div class="hospital-reason"><strong>Why this facility:</strong> ${hospital.reason}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    hospitalsContent.innerHTML = html;
}

// ============================================
// Format Gemini Response
// ============================================
function formatGeminiResponse(text) {
    if (!text) return '<p>No response received.</p>';
    
    // Escape HTML first to prevent XSS
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Convert markdown-like formatting to HTML
    formatted = formatted
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Headers
        .replace(/^### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^## (.*$)/gim, '<h3>$1</h3>')
        .replace(/^# (.*$)/gim, '<h2>$1</h2>')
        // Line breaks (preserve double newlines as paragraphs)
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    // Split into paragraphs
    const paragraphs = formatted.split('</p><p>');
    let result = '';
    
    paragraphs.forEach((para, index) => {
        if (index === 0 && !para.startsWith('<p>')) {
            result += '<p>' + para;
        } else if (index === paragraphs.length - 1 && !para.endsWith('</p>')) {
            result += para + '</p>';
        } else {
            result += para;
        }
    });
    
    // Convert numbered/bulleted lists
    result = result.replace(/(\d+)\.\s+(.+?)(?=<br>|$)/g, '<li>$2</li>');
    result = result.replace(/[-*]\s+(.+?)(?=<br>|$)/g, '<li>$1</li>');
    
    // Wrap consecutive list items in ul tags
    result = result.replace(/(<li>.*?<\/li>(?:<br>)?)+/g, (match) => {
        return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
    });
    
    // Ensure proper paragraph wrapping
    if (!result.startsWith('<p>') && !result.startsWith('<h')) {
        result = '<p>' + result;
    }
    if (!result.endsWith('</p>') && !result.endsWith('</h')) {
        result = result + '</p>';
    }
    
    return result;
}

// ============================================
// Setup Download Buttons
// ============================================
function setupDownloadButtons() {
    // Download JSON button
    const downloadJsonBtn = document.getElementById('downloadJsonBtn');
    if (downloadJsonBtn && assessmentData) {
        downloadJsonBtn.addEventListener('click', () => {
            downloadJSON(assessmentData);
        });
    }
    
    // Download Analysis button
    const downloadAnalysisBtn = document.getElementById('downloadAnalysisBtn');
    if (downloadAnalysisBtn) {
        downloadAnalysisBtn.addEventListener('click', () => {
            const analysisText = localStorage.getItem('lastAnalysis');
            if (analysisText) {
                downloadTextFile(analysisText, 'health-analysis.txt');
            } else {
                alert('No analysis available to download.');
            }
        });
    }
}

// ============================================
// Download JSON
// ============================================
function downloadJSON(data) {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `health-assessment-${timestamp}.json`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading JSON:', error);
        alert('Error downloading file. Please try again.');
    }
}

// ============================================
// Download Text File
// ============================================
function downloadTextFile(text, filename) {
    try {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading file:', error);
        alert('Error downloading file. Please try again.');
    }
}

