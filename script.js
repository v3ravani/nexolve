// ============================================
// Global Variables
// ============================================
let formData = {
    personal: {},
    symptoms: {},
    history: {},
    lifestyle: {},
    context: {}
};

// Store extracted blood values from PDF
let extractedBloodValues = {};

// ============================================
// DOM Content Loaded
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize based on current page
    if (document.getElementById('assessmentForm')) {
        initAssessmentForm();
    }
    
    // Mobile menu toggle
    initMobileMenu();
    
    // Smooth scroll for anchor links
    initSmoothScroll();
});

// ============================================
// Mobile Menu
// ============================================
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
}

// ============================================
// Smooth Scroll
// ============================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// ============================================
// Assessment Form Initialization
// ============================================
function initAssessmentForm() {
    const form = document.getElementById('assessmentForm');
    const painScale = document.getElementById('painScale');
    const painValue = document.getElementById('painValue');
    const progressFill = document.getElementById('progressFill');
    
    // Pain scale slider update
    if (painScale && painValue) {
        painScale.addEventListener('input', function() {
            painValue.textContent = this.value;
        });
    }
    
    // Progress bar update
    if (progressFill) {
        updateProgressBar();
        form.addEventListener('input', updateProgressBar);
        form.addEventListener('change', updateProgressBar);
    }
    
    // Conditional field display
    setupConditionalFields();
    
    // PDF upload handler
    setupPdfUpload();
    
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
}

// ============================================
// Progress Bar Update
// ============================================
function updateProgressBar() {
    const form = document.getElementById('assessmentForm');
    const requiredFields = form.querySelectorAll('[required]');
    const filledFields = Array.from(requiredFields).filter(field => {
        if (field.type === 'checkbox') {
            return field.checked;
        }
        return field.value.trim() !== '';
    });
    
    const progress = (filledFields.length / requiredFields.length) * 100;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
}

// ============================================
// Conditional Fields
// ============================================
function setupConditionalFields() {
    // Pre-existing conditions "other"
    const preExistingConditions = document.getElementById('preExistingConditions');
    const otherConditionGroup = document.getElementById('otherConditionGroup');
    
    if (preExistingConditions && otherConditionGroup) {
        preExistingConditions.addEventListener('change', function() {
            if (this.value === 'other') {
                otherConditionGroup.style.display = 'block';
                document.getElementById('otherCondition').required = true;
            } else {
                otherConditionGroup.style.display = 'none';
                document.getElementById('otherCondition').required = false;
                document.getElementById('otherCondition').value = '';
            }
        });
    }
    
    // Allergies "other"
    const allergies = document.getElementById('allergies');
    const allergyDetailsGroup = document.getElementById('allergyDetailsGroup');
    
    if (allergies && allergyDetailsGroup) {
        allergies.addEventListener('change', function() {
            if (this.value === 'other' || (this.value !== 'none' && this.value !== '')) {
                allergyDetailsGroup.style.display = 'block';
                document.getElementById('allergyDetails').required = true;
            } else {
                allergyDetailsGroup.style.display = 'none';
                document.getElementById('allergyDetails').required = false;
                document.getElementById('allergyDetails').value = '';
            }
        });
    }
}

// ============================================
// PDF Upload Setup
// ============================================
function setupPdfUpload() {
    const pdfInput = document.getElementById('bloodReportPdf');
    const pdfStatus = document.getElementById('pdfStatus');
    
    if (!pdfInput || !pdfStatus) return;
    
    pdfInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        
        if (!file) {
            pdfStatus.textContent = 'No file uploaded yet.';
            pdfStatus.className = 'pdf-status';
            extractedBloodValues = {};
            hideExtractedValues();
            return;
        }
        
        // Validate PDF file
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            pdfStatus.textContent = 'Error: Please upload a valid PDF file.';
            pdfStatus.className = 'pdf-status error';
            return;
        }
        
        // Update status
        pdfStatus.textContent = 'Reading and analysing PDF…';
        pdfStatus.className = 'pdf-status processing';
        
        try {
            // Check if PDF.js is loaded
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js library not loaded. Please refresh the page.');
            }
            
            // Read file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Load PDF using pdf.js
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            
            // Extract text from all pages
            let fullText = '';
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + ' ';
            }
            
            // Parse blood report text
            extractedBloodValues = parseBloodReportText(fullText);
            
            // Show extracted values
            showExtractedValues(extractedBloodValues);
            
            // Update status
            pdfStatus.textContent = 'PDF analysed successfully.';
            pdfStatus.className = 'pdf-status success';
            
        } catch (error) {
            console.error('Error processing PDF:', error);
            pdfStatus.textContent = 'Error: Could not read PDF. Please try again or upload a different file.';
            pdfStatus.className = 'pdf-status error';
            extractedBloodValues = {};
            hideExtractedValues();
        }
    });
}

// ============================================
// Parse Blood Report Text
// ============================================
function parseBloodReportText(text) {
    // Initialize result structure
    const result = {
        patientDetails: {
            name: null,
            age: null,
            gender: null,
            reportDate: null,
            labName: null
        },
        hematology: {
            hemoglobin: { value: null, unit: "" },
            rbcCount: { value: null, unit: "" },
            wbcCount: { value: null, unit: "" },
            plateletCount: { value: null, unit: "" },
            hematocrit: { value: null, unit: "" },
            mcv: { value: null, unit: "" },
            mch: { value: null, unit: "" },
            mchc: { value: null, unit: "" }
        },
        differentialCount: {
            neutrophils: null,
            lymphocytes: null,
            monocytes: null,
            eosinophils: null,
            basophils: null
        },
        bloodSugar: {
            fasting: { value: null, unit: "" },
            random: { value: null, unit: "" },
            postPrandial: { value: null, unit: "" }
        },
        lipidProfile: {
            totalCholesterol: null,
            hdl: null,
            ldl: null,
            triglycerides: null
        }
    };
    
    // Clean the text: replace multiple whitespace with single space, preserve line breaks for better matching
    const clean = text.replace(/\s+/g, ' ').trim();
    
    // Helper function to extract value and unit
    const grabValueWithUnit = (labelRegex, unitPattern = '') => {
        // Try multiple patterns to catch different formats
        const patterns = [
            // Pattern 1: Label Value Unit (table format, value before reference range)
            // Example: "Hemoglobin 12.5 11.0 - 15.0 g/dL"
            new RegExp(labelRegex + '\\s+([0-9.]+)\\s+(?:[0-9.]+\\s*[\\-\\s]+[0-9.]+\\s*)?(' + unitPattern + ')', 'i'),
            // Pattern 2: Label : Value Unit (with colon)
            new RegExp(labelRegex + '\\s*[:\\-]?\\s*([0-9.]+)\\s*(' + unitPattern + ')', 'i'),
            // Pattern 3: Label Value Unit (simple format)
            new RegExp(labelRegex + '\\s+([0-9.]+)\\s*(' + unitPattern + ')', 'i'),
            // Pattern 4: Label : Value (unit in next token or same line)
            new RegExp(labelRegex + '\\s*[:\\-]?\\s*([0-9.]+)', 'i')
        ];
        
        for (const pattern of patterns) {
            const match = clean.match(pattern);
            if (match) {
                const value = match[1];
                // Try to find unit after the value, before reference range
                let unit = match[2] || '';
                
                // If no unit found in match, try to find it nearby
                if (!unit && unitPattern) {
                    const afterValue = clean.substring(clean.indexOf(match[0]) + match[0].length);
                    const unitMatch = afterValue.match(new RegExp('\\s*(' + unitPattern + ')', 'i'));
                    if (unitMatch) {
                        unit = unitMatch[1];
                    }
                }
                
                return { value: value, unit: unit.trim() };
            }
        }
        return { value: null, unit: "" };
    };
    
    // Helper function to extract just numeric value (for percentages, ratios)
    // Improved to handle table format: Label Value ReferenceRange
    const grabNumericValue = (labelRegex, ignoreAbsolute = true) => {
        // Pattern 1: Label followed by value, then optional reference range
        // This handles: "Lymphocytes 33.0 20.0 - 40.0 %"
        const pattern1 = new RegExp(labelRegex + '\\s+([0-9.]+)\\s+(?:[0-9.]+\\s*[\\-\\s]+[0-9.]+|Reference|Range)', 'i');
        let match = clean.match(pattern1);
        if (match) {
            return match[1];
        }
        
        // Pattern 2: Label : Value (with colon)
        const pattern2 = new RegExp(labelRegex + '\\s*[:\\-]?\\s*([0-9.]+)', 'i');
        match = clean.match(pattern2);
        if (match) {
            // If we're ignoring absolute counts, skip if "Absolute" appears before the label
            if (ignoreAbsolute) {
                const beforeMatch = clean.substring(0, clean.indexOf(match[0]));
                if (beforeMatch.match(/Absolute/i)) {
                    return null;
                }
            }
            return match[1];
        }
        
        return null;
    };
    
    // Helper function to extract text value (for names, dates)
    const grabTextValue = (labelRegex, maxLength = 50) => {
        const pattern = new RegExp(labelRegex + '\\s*[:\\-]?\\s*([^\\n]{1,' + maxLength + '})', 'i');
        const match = clean.match(pattern);
        return match ? match[1].trim() : null;
    };
    
    // ============================================
    // Extract Patient Details
    // ============================================
    // Patient Name
    result.patientDetails.name = grabTextValue('(Patient Name|Name|Patient|Patient\\s*Name\\s*[:\\-])', 100) ||
                                  grabTextValue('(Name\\s*of\\s*Patient)', 100);
    
    // Age
    const ageMatch = clean.match(/(?:Age|AGE)\s*[:\\-]?\s*(\d+)\s*(?:years|yrs|yr|Y)?/i);
    if (ageMatch) {
        result.patientDetails.age = ageMatch[1];
    }
    
    // Gender
    const genderMatch = clean.match(/(?:Gender|Sex|GENDER|SEX)\s*[:\\-]?\s*(Male|Female|M|F|Male|Female)/i);
    if (genderMatch) {
        const gender = genderMatch[1].toLowerCase();
        result.patientDetails.gender = gender === 'm' || gender === 'male' ? 'Male' : 
                                       gender === 'f' || gender === 'female' ? 'Female' : genderMatch[1];
    }
    
    // Report Date
    const datePatterns = [
        /(?:Report Date|Date|Date of Report|Report\\s*Date)\\s*[:\\-]?\\s*(\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})/i,
        /(?:Report Date|Date|Date of Report)\\s*[:\\-]?\\s*(\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{2,4})/i
    ];
    for (const pattern of datePatterns) {
        const match = clean.match(pattern);
        if (match) {
            result.patientDetails.reportDate = match[1];
            break;
        }
    }
    
    // Lab Name
    result.patientDetails.labName = grabTextValue('(Laboratory|Lab|Laboratory Name|Lab Name|Diagnostic|Diagnostics)', 100);
    
    // ============================================
    // Extract Hematology Values
    // ============================================
    // Hemoglobin
    const hbResult = grabValueWithUnit('(Hemoglobin|Hb|H\\.?b\\.?)', '(g\\/?dL|g\\/dl|gm\\/dl|gm%|g/dL|g/dl)');
    result.hematology.hemoglobin = hbResult;
    
    // RBC Count
    const rbcResult = grabValueWithUnit('(RBC|Red Blood Cell|Red Blood Cell Count|RBC Count|Erythrocyte Count)', '(\\/mm3|\\/μL|\\/cu\\.?mm|per mm3|per μL|million\\/μL|million\\/cmm)');
    result.hematology.rbcCount = rbcResult;
    
    // WBC Count
    const wbcResult = grabValueWithUnit('(WBC|Total WBC|White Blood Cell Count|White Blood Cells|WBC Total Count|Leucocyte Count)', '(\\/mm3|\\/μL|\\/cu\\.?mm|per mm3|per μL|cells\\/μL|cells\\/mm3)');
    result.hematology.wbcCount = wbcResult;
    
    // Platelet Count
    const pltResult = grabValueWithUnit('(Platelet Count|Platelets|PLT|Plt|Thrombocyte Count)', '(\\/mm3|\\/μL|\\/cu\\.?mm|per mm3|per μL|cells\\/μL|cells\\/mm3)');
    result.hematology.plateletCount = pltResult;
    
    // Hematocrit (PCV)
    const hctResult = grabValueWithUnit('(Hematocrit|HCT|Hct|PCV|Packed Cell Volume)', '(%|percent|g\\/?dL|g\\/dl)');
    result.hematology.hematocrit = hctResult;
    
    // MCV
    const mcvResult = grabValueWithUnit('(MCV|Mean Corpuscular Volume)', '(fL|fl|μm3|cubic\\s*microns)');
    result.hematology.mcv = mcvResult;
    
    // MCH
    const mchResult = grabValueWithUnit('(MCH|Mean Corpuscular Hemoglobin)', '(pg|picograms)');
    result.hematology.mch = mchResult;
    
    // MCHC
    const mchcResult = grabValueWithUnit('(MCHC|Mean Corpuscular Hemoglobin Concentration)', '(g\\/?dL|g\\/dl|%|percent)');
    result.hematology.mchc = mchcResult;
    
    // ============================================
    // Extract Differential Count (usually percentages)
    // ============================================
    // Extract percentages only (ignore "Absolute" counts)
    // Format: "Lymphocytes 33.0 20.0 - 40.0 %" or "Lymphocytes: 33.0"
    // We want the first number after the label, before any reference range
    
    // Improved pattern that captures value before reference range
    const extractDifferentialValue = (labelName) => {
        // Pattern to match: Label Value (ReferenceRange or %)
        // Examples: "Lymphocytes 33.0 20.0 - 40.0 %" or "Lymphocytes: 33.0"
        const patterns = [
            // Pattern 1: Label Value ReferenceRange % (table format)
            new RegExp('(?:^|\\s)' + labelName + '\\s+([0-9.]+)\\s+(?:[0-9.]+\\s*[\\-\\s]+[0-9.]+|Reference|Range).*?%', 'i'),
            // Pattern 2: Label Value % (simple format)
            new RegExp('(?:^|\\s)' + labelName + '\\s+([0-9.]+)\\s*%', 'i'),
            // Pattern 3: Label : Value (with colon)
            new RegExp('(?:^|\\s)' + labelName + '\\s*[:\\-]?\\s*([0-9.]+)', 'i')
        ];
        
        for (const pattern of patterns) {
            const match = clean.match(pattern);
            if (match) {
                // Make sure we're not matching "Absolute" versions
                const matchIndex = clean.indexOf(match[0]);
                const beforeText = clean.substring(Math.max(0, matchIndex - 50), matchIndex);
                if (!beforeText.match(/Absolute/i)) {
                    return match[1];
                }
            }
        }
        return null;
    };
    
    result.differentialCount.neutrophils = extractDifferentialValue('(Neutrophils|Neutrophil|Neut|NEUT)');
    result.differentialCount.lymphocytes = extractDifferentialValue('(Lymphocytes|Lymphocyte|Lymph|LYMPH)');
    result.differentialCount.monocytes = extractDifferentialValue('(Monocytes|Monocyte|Mono|MONO)');
    result.differentialCount.eosinophils = extractDifferentialValue('(Eosinophils|Eosinophil|Eos|EOS)');
    result.differentialCount.basophils = extractDifferentialValue('(Basophils|Basophil|Baso|BASO)');
    
    // ============================================
    // Extract Blood Sugar Values
    // ============================================
    // Fasting Blood Sugar
    const fbsResult = grabValueWithUnit('(Fasting Blood Sugar|FBS|Fasting Glucose|Fasting Sugar|FBS|FBG)', '(mg\\/?dL|mg\\/dl|mmol\\/L|mmol\\/l)');
    result.bloodSugar.fasting = fbsResult;
    
    // Random Blood Sugar
    const rbsResult = grabValueWithUnit('(Random Blood Sugar|RBS|Random Glucose|Random Sugar|RBS|RBG)', '(mg\\/?dL|mg\\/dl|mmol\\/L|mmol\\/l)');
    result.bloodSugar.random = rbsResult;
    
    // Post-Prandial Blood Sugar
    const ppbsResult = grabValueWithUnit('(Post\\s*[\\-\\s]?Prandial|PPBS|PP|Post Prandial|Post-Prandial|2\\s*Hour\\s*PP)', '(mg\\/?dL|mg\\/dl|mmol\\/L|mmol\\/l)');
    result.bloodSugar.postPrandial = ppbsResult;
    
    // ============================================
    // Extract Lipid Profile
    // ============================================
    // Total Cholesterol
    const cholResult = grabValueWithUnit('(Total Cholesterol|Cholesterol|Total Chol|CHOL)', '(mg\\/?dL|mg\\/dl|mmol\\/L|mmol\\/l)');
    result.lipidProfile.totalCholesterol = cholResult.value;
    
    // HDL
    const hdlResult = grabValueWithUnit('(HDL|HDL Cholesterol|High Density Lipoprotein)', '(mg\\/?dL|mg\\/dl|mmol\\/L|mmol\\/l)');
    result.lipidProfile.hdl = hdlResult.value;
    
    // LDL
    const ldlResult = grabValueWithUnit('(LDL|LDL Cholesterol|Low Density Lipoprotein)', '(mg\\/?dL|mg\\/dl|mmol\\/L|mmol\\/l)');
    result.lipidProfile.ldl = ldlResult.value;
    
    // Triglycerides
    const trigResult = grabValueWithUnit('(Triglycerides|TG|Trig|TGL)', '(mg\\/?dL|mg\\/dl|mmol\\/L|mmol\\/l)');
    result.lipidProfile.triglycerides = trigResult.value;
    
    return result;
}

// ============================================
// Show Extracted Values
// ============================================
function showExtractedValues(values) {
    const extractedCard = document.getElementById('autoExtractedValues');
    const extractedList = document.getElementById('extractedList');
    
    if (!extractedCard || !extractedList) return;
    
    // Check if any values were found
    const hasValues = checkForExtractedValues(values);
    
    if (!hasValues) {
        hideExtractedValues();
        return;
    }
    
    // Clear existing list
    extractedList.innerHTML = '';
    
    // Helper function to add list item
    const addListItem = (label, value, unit = '') => {
        if (value !== null && value !== '') {
            const li = document.createElement('li');
            const displayValue = unit ? `${value} ${unit}` : value;
            li.innerHTML = `<strong>${label}:</strong> ${displayValue}`;
            extractedList.appendChild(li);
        }
    };
    
    // Display Patient Details
    if (values.patientDetails) {
        const pd = values.patientDetails;
        if (pd.name || pd.age || pd.gender || pd.reportDate) {
            const sectionHeader = document.createElement('li');
            sectionHeader.innerHTML = '<strong style="color: var(--primary-blue); font-size: 1.1em;">Patient Details</strong>';
            sectionHeader.style.marginTop = '0.5rem';
            sectionHeader.style.marginBottom = '0.25rem';
            extractedList.appendChild(sectionHeader);
            
            addListItem('Name', pd.name);
            addListItem('Age', pd.age);
            addListItem('Gender', pd.gender);
            addListItem('Report Date', pd.reportDate);
            addListItem('Lab Name', pd.labName);
        }
    }
    
    // Display Hematology Values
    if (values.hematology) {
        const hemo = values.hematology;
        let hasHemoValues = false;
        
        if (hemo.hemoglobin?.value || hemo.rbcCount?.value || hemo.wbcCount?.value || 
            hemo.plateletCount?.value || hemo.hematocrit?.value || hemo.mcv?.value || 
            hemo.mch?.value || hemo.mchc?.value) {
            hasHemoValues = true;
            const sectionHeader = document.createElement('li');
            sectionHeader.innerHTML = '<strong style="color: var(--primary-blue); font-size: 1.1em;">Hematology</strong>';
            sectionHeader.style.marginTop = '0.5rem';
            sectionHeader.style.marginBottom = '0.25rem';
            extractedList.appendChild(sectionHeader);
            
            if (hemo.hemoglobin?.value) addListItem('Hemoglobin', hemo.hemoglobin.value, hemo.hemoglobin.unit);
            if (hemo.rbcCount?.value) addListItem('RBC Count', hemo.rbcCount.value, hemo.rbcCount.unit);
            if (hemo.wbcCount?.value) addListItem('WBC Count', hemo.wbcCount.value, hemo.wbcCount.unit);
            if (hemo.plateletCount?.value) addListItem('Platelet Count', hemo.plateletCount.value, hemo.plateletCount.unit);
            if (hemo.hematocrit?.value) addListItem('Hematocrit (PCV)', hemo.hematocrit.value, hemo.hematocrit.unit);
            if (hemo.mcv?.value) addListItem('MCV', hemo.mcv.value, hemo.mcv.unit);
            if (hemo.mch?.value) addListItem('MCH', hemo.mch.value, hemo.mch.unit);
            if (hemo.mchc?.value) addListItem('MCHC', hemo.mchc.value, hemo.mchc.unit);
        }
    }
    
    // Display Differential Count
    if (values.differentialCount) {
        const diff = values.differentialCount;
        if (diff.neutrophils || diff.lymphocytes || diff.monocytes || diff.eosinophils || diff.basophils) {
            const sectionHeader = document.createElement('li');
            sectionHeader.innerHTML = '<strong style="color: var(--primary-blue); font-size: 1.1em;">Differential Count (%)</strong>';
            sectionHeader.style.marginTop = '0.5rem';
            sectionHeader.style.marginBottom = '0.25rem';
            extractedList.appendChild(sectionHeader);
            
            if (diff.neutrophils) addListItem('Neutrophils', diff.neutrophils, '%');
            if (diff.lymphocytes) addListItem('Lymphocytes', diff.lymphocytes, '%');
            if (diff.monocytes) addListItem('Monocytes', diff.monocytes, '%');
            if (diff.eosinophils) addListItem('Eosinophils', diff.eosinophils, '%');
            if (diff.basophils) addListItem('Basophils', diff.basophils, '%');
        }
    }
    
    // Display Blood Sugar
    if (values.bloodSugar) {
        const bs = values.bloodSugar;
        if (bs.fasting?.value || bs.random?.value || bs.postPrandial?.value) {
            const sectionHeader = document.createElement('li');
            sectionHeader.innerHTML = '<strong style="color: var(--primary-blue); font-size: 1.1em;">Blood Sugar</strong>';
            sectionHeader.style.marginTop = '0.5rem';
            sectionHeader.style.marginBottom = '0.25rem';
            extractedList.appendChild(sectionHeader);
            
            if (bs.fasting?.value) addListItem('Fasting', bs.fasting.value, bs.fasting.unit);
            if (bs.random?.value) addListItem('Random', bs.random.value, bs.random.unit);
            if (bs.postPrandial?.value) addListItem('Post-Prandial', bs.postPrandial.value, bs.postPrandial.unit);
        }
    }
    
    // Display Lipid Profile
    if (values.lipidProfile) {
        const lipid = values.lipidProfile;
        if (lipid.totalCholesterol || lipid.hdl || lipid.ldl || lipid.triglycerides) {
            const sectionHeader = document.createElement('li');
            sectionHeader.innerHTML = '<strong style="color: var(--primary-blue); font-size: 1.1em;">Lipid Profile</strong>';
            sectionHeader.style.marginTop = '0.5rem';
            sectionHeader.style.marginBottom = '0.25rem';
            extractedList.appendChild(sectionHeader);
            
            if (lipid.totalCholesterol) addListItem('Total Cholesterol', lipid.totalCholesterol, 'mg/dL');
            if (lipid.hdl) addListItem('HDL', lipid.hdl, 'mg/dL');
            if (lipid.ldl) addListItem('LDL', lipid.ldl, 'mg/dL');
            if (lipid.triglycerides) addListItem('Triglycerides', lipid.triglycerides, 'mg/dL');
        }
    }
    
    // Show the card
    extractedCard.style.display = 'block';
    
    // Auto-fill form fields if they exist (optional enhancement)
    autoFillBloodValues(values);
}

// ============================================
// Check if any values were extracted
// ============================================
function checkForExtractedValues(values) {
    if (!values || typeof values !== 'object') return false;
    
    // Check patient details
    if (values.patientDetails) {
        const pd = values.patientDetails;
        if (pd.name || pd.age || pd.gender || pd.reportDate || pd.labName) return true;
    }
    
    // Check hematology
    if (values.hematology) {
        const hemo = values.hematology;
        if (hemo.hemoglobin?.value || hemo.rbcCount?.value || hemo.wbcCount?.value || 
            hemo.plateletCount?.value || hemo.hematocrit?.value || hemo.mcv?.value || 
            hemo.mch?.value || hemo.mchc?.value) return true;
    }
    
    // Check differential count
    if (values.differentialCount) {
        const diff = values.differentialCount;
        if (diff.neutrophils || diff.lymphocytes || diff.monocytes || diff.eosinophils || diff.basophils) return true;
    }
    
    // Check blood sugar
    if (values.bloodSugar) {
        const bs = values.bloodSugar;
        if (bs.fasting?.value || bs.random?.value || bs.postPrandial?.value) return true;
    }
    
    // Check lipid profile
    if (values.lipidProfile) {
        const lipid = values.lipidProfile;
        if (lipid.totalCholesterol || lipid.hdl || lipid.ldl || lipid.triglycerides) return true;
    }
    
    return false;
}

// ============================================
// Hide Extracted Values
// ============================================
function hideExtractedValues() {
    const extractedCard = document.getElementById('autoExtractedValues');
    if (extractedCard) {
        extractedCard.style.display = 'none';
    }
}

// ============================================
// Auto-fill Blood Values (Optional)
// ============================================
function autoFillBloodValues(values) {
    // This function can auto-fill manual input fields if they exist
    // Works with the new structured format
    if (!values || typeof values !== 'object') return;
    
    // Example implementation (uncomment if you add these fields to the form):
    /*
    // Hematology values
    if (values.hematology) {
        const hemo = values.hematology;
        
        if (hemo.hemoglobin?.value) {
            const hbInput = document.getElementById('hb');
            if (hbInput && !hbInput.value) {
                hbInput.value = hemo.hemoglobin.value;
            }
        }
        
        if (hemo.wbcCount?.value) {
            const wbcInput = document.getElementById('wbc');
            if (wbcInput && !wbcInput.value) {
                wbcInput.value = hemo.wbcCount.value;
            }
        }
        
        if (hemo.plateletCount?.value) {
            const plateletsInput = document.getElementById('platelets');
            if (plateletsInput && !plateletsInput.value) {
                plateletsInput.value = hemo.plateletCount.value;
            }
        }
    }
    
    // Blood sugar values
    if (values.bloodSugar) {
        const bs = values.bloodSugar;
        
        if (bs.fasting?.value) {
            const fbsInput = document.getElementById('fbs');
            if (fbsInput && !fbsInput.value) {
                fbsInput.value = bs.fasting.value;
            }
        }
        
        if (bs.random?.value) {
            const rbsInput = document.getElementById('rbs');
            if (rbsInput && !rbsInput.value) {
                rbsInput.value = bs.random.value;
            }
        }
    }
    */
}

// ============================================
// Form Validation
// ============================================
function validateForm() {
    const form = document.getElementById('assessmentForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    const errors = [];
    
    // Check all required fields
    requiredFields.forEach(field => {
        if (field.type === 'checkbox') {
            if (!field.checked) {
                isValid = false;
                errors.push(`${field.name} is required`);
            }
        } else {
            if (field.value.trim() === '') {
                isValid = false;
                field.style.borderColor = '#ef4444';
                errors.push(`${field.name || field.id} is required`);
            } else {
                field.style.borderColor = '';
            }
        }
    });
    
    // Validate number fields
    const height = document.getElementById('height');
    const weight = document.getElementById('weight');
    
    if (height && height.value) {
        const heightVal = parseInt(height.value);
        if (heightVal < 50 || heightVal > 250) {
            isValid = false;
            height.style.borderColor = '#ef4444';
            errors.push('Height must be between 50 and 250 cm');
        }
    }
    
    if (weight && weight.value) {
        const weightVal = parseInt(weight.value);
        if (weightVal < 10 || weightVal > 300) {
            isValid = false;
            weight.style.borderColor = '#ef4444';
            errors.push('Weight must be between 10 and 300 kg');
        }
    }
    
    if (!isValid) {
        alert('Please fill in all required fields correctly.\n\nErrors:\n' + errors.join('\n'));
    }
    
    return isValid;
}

// ============================================
// Collect Form Data
// ============================================
function collectFormData() {
    const form = document.getElementById('assessmentForm');
    
    // Personal Details
    formData.personal = {
        name: document.getElementById('name').value.trim(),
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        height: document.getElementById('height').value,
        weight: document.getElementById('weight').value,
        city: document.getElementById('city').value.trim()
    };
    
    // Symptom Details
    formData.symptoms = {
        primarySymptom: document.getElementById('primarySymptom').value.trim(),
        secondarySymptoms: document.getElementById('secondarySymptoms').value.trim(),
        duration: document.getElementById('duration').value,
        severity: document.getElementById('severity').value,
        painScale: document.getElementById('painScale').value,
        onsetType: document.getElementById('onsetType').value,
        pattern: document.getElementById('pattern').value,
        triggers: document.getElementById('triggers').value.trim(),
        relievingFactors: document.getElementById('relievingFactors').value.trim(),
        affectedArea: document.getElementById('affectedArea').value,
        progression: document.getElementById('progression').value
    };
    
    // Medical History
    const preExistingConditions = document.getElementById('preExistingConditions').value;
    formData.history = {
        preExistingConditions: preExistingConditions,
        otherCondition: preExistingConditions === 'other' ? document.getElementById('otherCondition').value.trim() : '',
        pastSurgeries: document.getElementById('pastSurgeries').value.trim(),
        familyHistory: document.getElementById('familyHistory').value,
        allergies: document.getElementById('allergies').value,
        allergyDetails: document.getElementById('allergies').value !== 'none' && document.getElementById('allergies').value !== '' 
            ? document.getElementById('allergyDetails').value.trim() : '',
        currentMedications: document.getElementById('currentMedications').value.trim(),
        previousSimilarSymptoms: document.getElementById('previousSimilarSymptoms').value.trim(),
        pregnancyStatus: document.getElementById('pregnancyStatus').value
    };
    
    // Lifestyle
    formData.lifestyle = {
        dietPattern: document.getElementById('dietPattern').value,
        sleepHours: document.getElementById('sleepHours').value,
        waterIntake: document.getElementById('waterIntake').value,
        gymSupplements: document.getElementById('gymSupplements')?.value || null,
        smokingHabit: document.getElementById('smokingHabit').value,
        alcoholConsumption: document.getElementById('alcoholConsumption').value,
        physicalActivity: document.getElementById('physicalActivity').value
    };
    
    // Additional Context
    formData.context = {
        recentTravel: document.getElementById('recentTravel').value.trim(),
        exposureToSick: document.getElementById('exposureToSick').value,
        stressLevel: document.getElementById('stressLevel').value,
        additionalNotes: document.getElementById('additionalNotes').value.trim()
    };
    
    // Blood Report (PDF + Extracted Values)
    const pdfInput = document.getElementById('bloodReportPdf');
    const pdfFile = pdfInput?.files[0];
    
    // Check if any values were extracted
    const hasExtractedValues = checkForExtractedValues(extractedBloodValues);
    
    formData.bloodReport = {
        pdfUploaded: !!pdfFile,
        pdfFileName: pdfFile?.name || null,
        // Include the full structured extracted data
        extractedData: hasExtractedValues ? extractedBloodValues : null
    };
    
    // Add timestamp
    formData.timestamp = new Date().toISOString();
    formData.submissionDate = new Date().toLocaleString();
    
    return formData;
}

// ============================================
// Handle Form Submit
// ============================================
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Collect data
    const data = collectFormData();
    
    // Save to localStorage
    try {
        localStorage.setItem('assessmentData', JSON.stringify(data));
        localStorage.setItem('autoStartAllAnalysis', 'true');
        console.log('Data saved to localStorage');
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        alert('Error saving data. Please try again.');
        return;
    }
    
    // Redirect to results page
    window.location.href = 'results.html';
}

// ============================================
// Download JSON
// ============================================
function downloadJSON(data) {
    try {
        // Create JSON string with pretty formatting
        const jsonString = JSON.stringify(data, null, 2);
        
        // Create blob
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `health-assessment-${timestamp}.json`;
        a.download = filename;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('JSON file downloaded successfully');
    } catch (error) {
        console.error('Error downloading JSON:', error);
        alert('Error downloading file. Please try again.');
    }
}

// ============================================
// Utility Functions
// ============================================

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get stored assessment data
function getStoredAssessmentData() {
    try {
        const stored = localStorage.getItem('assessmentData');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error reading from localStorage:', error);
    }
    return null;
}

