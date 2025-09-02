// Dynamic Work Data Entry System - Configuration Driven
// Loads WorkCodes.json and generates UI dynamically

// Global configuration and state
let workCodesConfig = null;
// Date counters removed - now using multi-date picker only
let allCategories = [];

// Multi-date picker state
let currentMultiDatePicker = null;
let multiDatePickerData = {
    selectedDates: [],
    currentMonth: new Date(),
    targetCategory: null,
    targetService: null
};

// Store date selections per service/category
let dateSelections = {}; // Format: {categoryKey_serviceCode: [dates], categoryKey: [dates]}

// Store count values per service/date combination
let dateCountValues = {}; // Format: {categoryKey_serviceCode: {date: count}, categoryKey: {date: count}}

// Helper functions for count value management
function storeExistingCountValues(container, selectionKey) {
    if (!container) return;
    
    // Initialize storage for this selection key if it doesn't exist
    if (!dateCountValues[selectionKey]) {
        dateCountValues[selectionKey] = {};
    }
    
    // Find existing date entries and store their count values
    const dateEntries = container.querySelectorAll('.date-entry');
    dateEntries.forEach(entry => {
        const dateInput = entry.querySelector('input[type="date"]');
        const countInput = entry.querySelector('input[type="number"]');
        
        if (dateInput && countInput && dateInput.value) {
            const dateValue = dateInput.value;
            const countValue = parseInt(countInput.value) || 1;
            dateCountValues[selectionKey][dateValue] = countValue;
            
            console.log(`💾 Stored count for ${selectionKey}[${dateValue}] = ${countValue}`);
        }
    });
}

function getStoredCountValue(selectionKey, dateStr) {
    if (!dateCountValues[selectionKey] || !dateCountValues[selectionKey][dateStr]) {
        return null;
    }
    return dateCountValues[selectionKey][dateStr];
}

function updateStoredCountValue(selectionKey, dateStr, count) {
    if (!dateCountValues[selectionKey]) {
        dateCountValues[selectionKey] = {};
    }
    
    const countValue = parseInt(count) || 1;
    dateCountValues[selectionKey][dateStr] = countValue;
    
    console.log(`📝 Updated count for ${selectionKey}[${dateStr}] = ${countValue}`);
}

// Helper function to generate service and register dates based on business logic
function generateServiceAndRegisterDates(selectedDate) {
    const smartDefaultMonth = getSmartDefaultMonth();
    const selectedDateObj = new Date(selectedDate);
    const defaultMonthYear = `${smartDefaultMonth.getFullYear()}-${String(smartDefaultMonth.getMonth() + 1).padStart(2, '0')}`;
    
    // Check if selected date is before the smart default month
    const selectedMonthYear = `${selectedDateObj.getFullYear()}-${String(selectedDateObj.getMonth() + 1).padStart(2, '0')}`;
    
    if (selectedMonthYear < defaultMonthYear) {
        // Date is before default month - use special logic
        const dayOfMonth = String(selectedDateObj.getDate()).padStart(2, '0');
        const serviceDate = `${defaultMonthYear}-${dayOfMonth}`; // Same day in default month
        const registerDate = selectedDate; // Keep original date
        
        console.log(`📅 Previous month date detected:`, {
            selectedDate: selectedDate,
            defaultMonth: defaultMonthYear,
            serviceDate: serviceDate,
            registerDate: registerDate,
            logic: 'Service=default month, Register=selected month'
        });
        
        return { serviceDate, registerDate };
    } else {
        // Normal case - both dates are the same
        return { serviceDate: selectedDate, registerDate: selectedDate };
    }
}

// Update button text to show selected date count
function updateDateButtonText(categoryKey, serviceCode = null) {
    const selectionKey = serviceCode ? `${categoryKey}_${serviceCode}` : categoryKey;
    const selectedDates = dateSelections[selectionKey] || [];
    const count = selectedDates.length;
    
    let buttonSelector;
    if (serviceCode) {
        // Individual service button
        buttonSelector = `button[onclick="showMultiDatePicker('${categoryKey}', '${serviceCode}')"]`;
    } else {
        // Category button
        buttonSelector = `button[onclick="showMultiDatePicker('${categoryKey}')"]`;
    }
    
    const button = document.querySelector(buttonSelector);
    if (button) {
        const baseText = '📅 Select Dates';
        if (count > 0) {
            button.textContent = `${baseText} (${count} selected)`;
            button.style.background = '#28a745'; // Green to indicate dates selected
            button.style.fontWeight = 'bold';
        } else {
            button.textContent = baseText;
            button.style.background = ''; // Reset to default
            button.style.fontWeight = '';
        }
    }
}

// Load WorkCodes.json configuration
async function loadWorkCodesConfiguration() {
    try {
        // Try multiple possible paths for the JSON file
        const possiblePaths = [
            'WorkCodes.json',
            './WorkCodes.json',
            '../resources/WorkCodes.json',
            'src/main/resources/WorkCodes.json'
        ];
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    workCodesConfig = await response.json();
                    console.log('✅ WorkCodes configuration loaded from:', path);
                    break;
                }
            } catch (e) {
                // Try next path
                continue;
            }
        }
        
        if (!workCodesConfig) {
            throw new Error('WorkCodes.json not found in any expected location');
        }
        
        // Generate HTML from configuration
        generateSectionsFromConfig();
        showConfigInfo();
        
    } catch (error) {
        console.error('❌ Failed to load WorkCodes configuration:', error);
        loadFallbackConfiguration();
    }
}

// Fallback configuration if JSON loading fails
function loadFallbackConfiguration() {
    console.log('⚠️  Loading fallback configuration...');
    
    workCodesConfig = {
        metadata: {
            version: "1.0-fallback",
            description: "Fallback configuration when WorkCodes.json cannot be loaded"
        },
        categories: {
            DELIVERY: {
                name: "Delivery Services",
                type: "fixed_bundle",
                codes: [
                    { code: "I1.4", amount: 300, description: "BCG/Delivery JAANCH" },
                    { code: "C1.2", amount: 100, description: "General Check" },
                    { code: "C1.4", amount: 100, description: "IFA Supplementation [1-3]" },
                    { code: "C1.5", amount: 100, description: "TT Vaccination [1-2]" }
                ]
            },
            BCG: {
                name: "BCG Only",
                type: "single_item",
                codes: [
                    { code: "I1.4", amount: 300, description: "BCG/Delivery JAANCH" }
                ]
            },
            TIKAKARAN: {
                name: "Immunization Services",
                type: "amount_based",
                codes: [
                    { code: "C3.6", amount: 50, description: "DPT-2 Booster [5-6 years]" },
                    { code: "C3.5", amount: 75, description: "DPT, OPV [2 years]" },
                    { code: "C3.4", amount: 100, description: "BCG-1, PENTA-3, OPV-1 [<1 year]" },
                    { code: "C4.1", amount: 250, description: "HBNC (Home Based Newborn Care)" }
                ]
            },
            OTHERS: {
                name: "Other Services",
                type: "individual_selection",
                codes: [
                    { code: "I2.1", amount: 300, description: "Operation" },
                    { code: "I5.3", amount: 1150, description: "SAARI Program" },
                    { code: "I5.4", amount: 150, description: "Mobile Recharge CUG Sim" },
                    { code: "I3.2", amount: 100, description: "POLIO Pulse Polio" },
                    { code: "I1.1", amount: 100, description: "ANC (Antenatal Care)" },
                    { code: "I2.5", amount: 150, description: "Copper-T" },
                    { code: "I2.6", amount: 100, description: "ANTRA" },
                    { code: "I8.17", amount: 1000, description: "TB Treatment" }
                ]
            }
        }
    };
    
    generateSectionsFromConfig();
    showConfigInfo(true);
}

// Generate HTML sections dynamically from configuration
function generateSectionsFromConfig() {
    const container = document.getElementById('dynamicSections');
    const categories = workCodesConfig.categories;
    
    let html = '';
    allCategories = Object.keys(categories);
    
    // Generate each category section
    Object.entries(categories).forEach(([categoryKey, categoryConfig]) => {
        html += generateCategorySection(categoryKey, categoryConfig);
    });
    
    // Add action buttons
    html += `
        <div class="text-center" style="margin-top: 30px;" id="actionButtons">
            <button class="btn btn-primary" onclick="generateJSON()">🔄 Generate JSON Data</button>
            <button class="btn btn-success" onclick="generateWorkEntries()">⚡ Generate Work Entries</button>
            <button class="btn btn-secondary" onclick="clearForm()">🧹 Clear Form</button>
            <button class="btn btn-secondary" onclick="reloadConfiguration()">🔄 Reload Config</button>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Multi-date picker only - single date options removed for cleaner UX
    const smartMonth = getSmartDefaultMonth();
    console.log('✅ Configuration loaded - simplified interface with multi-date picker only:', {
        smartDefaultMonth: smartMonth.toLocaleDateString('en-US', {year: 'numeric', month: 'long'}),
        currentDate: new Date().toLocaleDateString(),
        logic: new Date().getDate() < 15 ? 'Previous month (current day < 15)' : 'Current month (current day >= 15)',
        interface: 'Multi-date picker for all categories (including TIKAKARAN)'
    });
}

// Generate individual category section HTML
function generateCategorySection(categoryKey, categoryConfig) {
    const sectionId = categoryKey.toLowerCase();
    const icon = getCategoryIcon(categoryKey);
    
    let html = `
        <div id="${sectionId}Section" class="section" data-category="${categoryKey}">
            <div class="section-header">`;
    
    // For categories that need individual selection, make title clickable instead of checkbox
    if (categoryConfig.type === 'amount_based' || categoryConfig.type === 'individual_selection') {
        html += `
                <div class="section-title clickable-title" onclick="toggleSection('${sectionId}')" style="cursor: pointer;">${icon} ${categoryConfig.name}</div>`;
    } else {
        // Keep checkbox for fixed_bundle and single_item categories
        html += `
                <input type="checkbox" id="${sectionId}Toggle" class="section-toggle" onchange="toggleSection('${sectionId}')">
                <div class="section-title">${icon} ${categoryConfig.name}</div>`;
    }
    
    // Add category-specific controls
    if (categoryConfig.type === 'fixed_bundle' || categoryConfig.type === 'single_item' || categoryConfig.type === 'amount_based') {
        // Multi-date picker for all category types
        html += `
                    <button type="button" class="btn btn-secondary date-select-btn" onclick="showMultiDatePicker('${categoryKey}')" style="margin-left: auto;">📅 Select Dates</button>
                `;
    }
    
    html += `
            </div>
            <div class="section-content">
    `;
    
    // Generate content based on category type
    if (categoryConfig.type === 'fixed_bundle') {
        html += `<p><strong>Complete ${categoryConfig.name.toLowerCase()} process (all tasks will be included for each date):</strong></p>`;
        categoryConfig.codes.forEach(code => {
            html += `
                <div class="item-row" data-search="${code.code.toLowerCase()} ${code.description.toLowerCase()} ${code.amount}">
                    <div class="item-info">
                        <span class="item-code">${code.code}</span> - 
                        <span class="item-amount">₹${code.amount}</span> - 
                        <span class="item-description">${code.description}</span>
                    </div>
                </div>
            `;
        });
        html += `
            <div class="multiple-dates-container">
                <h4>📅 ${categoryConfig.name} Dates:</h4>
                <div id="${sectionId}Dates">
                    <!-- Dynamic date entries will be added here -->
                </div>
            </div>
        `;
    } else if (categoryConfig.type === 'single_item') {
        html += `<p><strong>${categoryConfig.name} (standalone):</strong></p>`;
        categoryConfig.codes.forEach(code => {
            html += `
                <div class="item-row" data-search="${code.code.toLowerCase()} ${code.description.toLowerCase()} ${code.amount}">
                    <div class="item-info">
                        <span class="item-code">${code.code}</span> - 
                        <span class="item-amount">₹${code.amount}</span> - 
                        <span class="item-description">${code.description}</span>
                    </div>
                </div>
            `;
        });
        html += `
            <div class="multiple-dates-container">
                <h4>📅 ${categoryConfig.name} Dates:</h4>
                <div id="${sectionId}Dates">
                    <!-- Dynamic date entries will be added here -->
                </div>
            </div>
        `;
    } else if (categoryConfig.type === 'amount_based') {
        html += `<p><strong>Select ${categoryConfig.name.toLowerCase()} and specify counts:</strong></p>`;
        categoryConfig.codes.forEach(code => {
            html += `
                <div class="item-row clickable-item" data-search="${code.code.toLowerCase()} ${code.description.toLowerCase()} ${code.amount}" onclick="toggleItemSelection('${sectionId}_${code.code}')">
                    <input type="checkbox" class="item-checkbox" id="${sectionId}_${code.code}" onchange="handleCheckboxChange(this)">
                    <div class="item-info">
                        <span class="item-code">${code.code}</span> - 
                        <span class="item-amount">₹${code.amount}</span> - 
                        <span class="item-description">${code.description}</span>
                    </div>
                    <div class="count-controls">
                        <label>Count:</label>
                        <div class="count-input-group">
                            <button type="button" class="count-btn count-minus" onclick="adjustCount('count_${code.code}', -1); event.stopPropagation();">-</button>
                            <input type="number" class="count-input" id="count_${code.code}" value="1" min="1" readonly>
                            <button type="button" class="count-btn count-plus" onclick="adjustCount('count_${code.code}', 1); event.stopPropagation();">+</button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `
            <div class="multiple-dates-container">
                <h4>📅 ${categoryConfig.name} Dates:</h4>
                <div id="${sectionId}Dates">
                    <!-- Dynamic date entries will be added here -->
                </div>
            </div>
        `;
    } else if (categoryConfig.type === 'individual_selection') {
        html += `<p><strong>Select ${categoryConfig.name.toLowerCase()} (each service can have multiple dates):</strong></p>`;
        categoryConfig.codes.forEach(code => {
            html += `
                <div class="service-item" id="service_${code.code}" data-search="${code.code.toLowerCase()} ${code.description.toLowerCase()} ${code.amount}">
                    <div class="item-row clickable-item" onclick="toggleItemSelection('${sectionId}_${code.code}')">
                        <input type="checkbox" class="item-checkbox" id="${sectionId}_${code.code}" onchange="handleCheckboxChange(this, '${code.code}')">
                        <div class="item-info">
                            <span class="item-code">${code.code}</span> - 
                            <span class="item-amount">₹${code.amount}</span> - 
                            <span class="item-description">${code.description}</span>
                        </div>
                        <div style="margin-left: auto; display: flex; align-items: center; gap: 10px;">
                            <button type="button" class="btn btn-secondary date-select-btn" onclick="showMultiDatePicker('${categoryKey}', '${code.code}'); event.stopPropagation();">📅 Select Dates</button>
                        </div>
                    </div>
                    <div class="service-dates" id="dates_${code.code}">
                        <!-- Dynamic date entries will be added here -->
                    </div>
                </div>
            `;
        });
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

// Get appropriate icon for category
function getCategoryIcon(categoryKey) {
    const icons = {
        'DELIVERY': '🤱',
        'BCG': '💉',
        'TIKAKARAN': '🏥',
        'OTHERS': '📋'
    };
    return icons[categoryKey] || '📋';
}

// Show configuration information
function showConfigInfo(isFallback = false) {
    const container = document.getElementById('dynamicSections');
    const totalServices = Object.values(workCodesConfig.categories).reduce((total, category) => total + category.codes.length, 0);
    
    const infoHtml = `
        <div class="config-info">
            ${isFallback ? '⚠️  Fallback Configuration Loaded' : '✅ Configuration Loaded from WorkCodes.json'}<br>
            <strong>Version:</strong> ${workCodesConfig.metadata.version || 'Unknown'}<br>
            <strong>Categories:</strong> ${Object.keys(workCodesConfig.categories).length}<br>
            <strong>Total Services:</strong> ${totalServices}<br>
            ${isFallback ? '<em>Note: Using built-in fallback data. Place WorkCodes.json in the same directory for full functionality.</em>' : ''}
        </div>
    `;
    
    container.insertAdjacentHTML('afterbegin', infoHtml);
}

// Search functionality
function filterServices() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const allSections = document.querySelectorAll('.section');
    const allServiceItems = document.querySelectorAll('.service-item');
    const allItemRows = document.querySelectorAll('.item-row[data-search]');
    
    let visibleSections = 0;
    let visibleServices = 0;
    
    if (!searchTerm) {
        // Show all when no search term
        allSections.forEach(section => section.classList.remove('hidden'));
        allServiceItems.forEach(item => item.classList.remove('hidden'));
        allItemRows.forEach(row => {
            row.classList.remove('hidden');
            row.innerHTML = row.innerHTML.replace(/<span class="highlight">(.*?)<\/span>/gi, '$1');
        });
        
        document.getElementById('searchResultsCount').textContent = 'All services shown';
        return;
    }
    
    // Filter sections and services
    allSections.forEach(section => {
        let sectionHasMatch = false;
        
        // Check if section name matches
        const sectionTitle = section.querySelector('.section-title').textContent.toLowerCase();
        if (sectionTitle.includes(searchTerm)) {
            sectionHasMatch = true;
        }
        
        // Check service items in this section
        const sectionServiceItems = section.querySelectorAll('.service-item[data-search]');
        const sectionItemRows = section.querySelectorAll('.item-row[data-search]');
        
        sectionServiceItems.forEach(item => {
            const searchData = item.getAttribute('data-search');
            if (searchData.includes(searchTerm)) {
                item.classList.remove('hidden');
                highlightText(item, searchTerm);
                sectionHasMatch = true;
                visibleServices++;
            } else {
                item.classList.add('hidden');
            }
        });
        
        sectionItemRows.forEach(row => {
            const searchData = row.getAttribute('data-search');
            if (searchData.includes(searchTerm)) {
                row.classList.remove('hidden');
                highlightText(row, searchTerm);
                sectionHasMatch = true;
                visibleServices++;
            } else {
                row.classList.add('hidden');
            }
        });
        
        if (sectionHasMatch) {
            section.classList.remove('hidden');
            visibleSections++;
        } else {
            section.classList.add('hidden');
        }
    });
    
    // Update search statistics
    const totalServices = allServiceItems.length + allItemRows.length;
    document.getElementById('searchResultsCount').textContent = 
        `Found ${visibleServices} services in ${visibleSections} categories (${totalServices} total)`;
}

// Highlight search terms
function highlightText(element, searchTerm) {
    const textElements = element.querySelectorAll('.item-code, .item-description');
    textElements.forEach(textEl => {
        let text = textEl.textContent;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        textEl.innerHTML = text.replace(regex, '<span class="highlight">$1</span>');
    });
}

// Single date functions removed - now everything uses multi-date picker only

// Utility functions
function toggleSection(sectionName) {
    const section = document.getElementById(sectionName + 'Section');
    const toggle = document.getElementById(sectionName + 'Toggle');
    
    // Handle clickable titles (for categories without checkboxes)
    if (!toggle) {
        if (section.classList.contains('active')) {
            section.classList.remove('active');
        } else {
            section.classList.add('active');
        }
        return;
    }
    
    // Handle checkbox-based toggles
    if (toggle && toggle.checked) {
        section.classList.add('active');
    } else if (section) {
        section.classList.remove('active');
    }
}

function toggleServiceDates(serviceCode) {
    const checkbox = document.getElementById('others_' + serviceCode);
    const datesContainer = document.getElementById('dates_' + serviceCode);
    
    if (checkbox && checkbox.checked) {
        datesContainer.classList.add('active');
        if (datesContainer.children.length === 0) {
            addServiceDate(serviceCode);
        }
    } else if (datesContainer) {
        datesContainer.classList.remove('active');
    }
}

function removeDateEntry(dateEntry) {
    // Get the date value and service/category info from data attributes
    const dateInput = dateEntry.querySelector('input[type="date"]');
    const dateValue = dateInput ? dateInput.value : null;
    const categoryKey = dateEntry.dataset.category;
    const serviceCode = dateEntry.dataset.service;
    
    if (dateValue && categoryKey) {
        // Update persistent storage
        const selectionKey = serviceCode ? `${categoryKey}_${serviceCode}` : categoryKey;
        
        // Remove from date selections
        if (dateSelections[selectionKey]) {
            const index = dateSelections[selectionKey].indexOf(dateValue);
            if (index > -1) {
                dateSelections[selectionKey].splice(index, 1);
                console.log(`🗑️ Removed date ${dateValue} from ${selectionKey}:`, dateSelections[selectionKey]);
            }
            
            // If no dates left, remove the key entirely
            if (dateSelections[selectionKey].length === 0) {
                delete dateSelections[selectionKey];
                console.log(`🗑️ Cleared all dates for ${selectionKey}`);
            }
        }
        
        // Remove from count values storage
        if (dateCountValues[selectionKey] && dateCountValues[selectionKey][dateValue]) {
            delete dateCountValues[selectionKey][dateValue];
            console.log(`🗑️ Removed count value for ${selectionKey}[${dateValue}]`);
            
            // If no count values left, remove the key entirely
            if (Object.keys(dateCountValues[selectionKey]).length === 0) {
                delete dateCountValues[selectionKey];
                console.log(`🗑️ Cleared all count values for ${selectionKey}`);
            }
        }
        
        // Update button text to reflect the change
        updateDateButtonText(categoryKey, serviceCode);
    }
    
    // Remove the DOM element
    dateEntry.remove();
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Smart default month - show previous month if current date < 15th
function getSmartDefaultMonth() {
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    console.log('📅 Smart Default Month Logic:', {
        today: today.toLocaleDateString(),
        dayOfMonth: dayOfMonth,
        condition: `${dayOfMonth} < 15`,
        willUsePreviousMonth: dayOfMonth < 15
    });
    
    if (dayOfMonth < 15) {
        // Show previous month
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        console.log('🔙 Calendar will open to PREVIOUS month:', {
            month: prevMonth.toLocaleDateString('en-US', {year: 'numeric', month: 'long'}),
            reason: `Current day ${dayOfMonth} < 15`
        });
        return prevMonth;
    } else {
        // Show current month
        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        console.log('📍 Calendar will open to CURRENT month:', {
            month: currentMonth.toLocaleDateString('en-US', {year: 'numeric', month: 'long'}),
            reason: `Current day ${dayOfMonth} >= 15`
        });
        return currentMonth;
    }
}

// Smart default date - show date from previous month if current date < 15th
function getSmartDefaultDate() {
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    console.log('🧠 Smart date calculation:', {
        today: today.toDateString(),
        dayOfMonth: dayOfMonth,
        shouldUsePrevMonth: dayOfMonth < 15
    });
    
    if (dayOfMonth < 15) {
        // Show date from previous month (same day)
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, dayOfMonth);
        const smartDate = prevMonth.toISOString().split('T')[0];
        console.log('🧠 Using previous month:', {
            prevMonth: prevMonth.toDateString(),
            smartDate: smartDate
        });
        return smartDate;
    } else {
        // Show today's date
        const todayDate = today.toISOString().split('T')[0];
        console.log('🧠 Using current month:', {
            today: today.toDateString(),
            todayDate: todayDate
        });
        return todayDate;
    }
}

// Multi-date picker functionality
function showMultiDatePicker(categoryKey, serviceCode = null) {
    // 1. FIRST: Check if any checkboxes are selected
    const selectedServices = getSelectedServicesForCategory(categoryKey, serviceCode);
    
    if (selectedServices.length === 0) {
        showValidationError(categoryKey, serviceCode);
        return;
    }
    
    // 2. Load existing date selections for this service/category
    const selectionKey = serviceCode ? `${categoryKey}_${serviceCode}` : categoryKey;
    const existingDates = dateSelections[selectionKey] || [];
    
    // 3. Initialize picker data with existing selections
    multiDatePickerData.selectedDates = [...existingDates]; // Copy existing dates
    multiDatePickerData.currentMonth = getSmartDefaultMonth();
    multiDatePickerData.targetCategory = categoryKey;
    multiDatePickerData.targetService = serviceCode;
    
    console.log(`📅 Opening date picker for ${selectionKey}:`, {
        selectedServices: selectedServices.map(s => s.code || s),
        existingDates: existingDates,
        selectionKey: selectionKey
    });
    
    // 4. Create multi-date picker HTML
    const pickerHTML = createMultiDatePickerHTML();
    
    // 5. Show picker in a modal-like container
    showMultiDatePickerModal(pickerHTML);
}

// Helper function to get selected services for a category
function getSelectedServicesForCategory(categoryKey, serviceCode) {
    const selectedServices = [];
    const sectionId = categoryKey.toLowerCase();
    
    if (serviceCode) {
        // Individual service - check if this specific service is selected
        const checkbox = document.getElementById(`${sectionId}_${serviceCode}`);
        if (checkbox && checkbox.checked) {
            selectedServices.push({code: serviceCode, selected: true});
        }
    } else {
        // Category-wide - handle different category types
        if (workCodesConfig && workCodesConfig.categories[categoryKey]) {
            const categoryConfig = workCodesConfig.categories[categoryKey];
            
            if (categoryConfig.type === 'amount_based' || categoryConfig.type === 'individual_selection') {
                // For categories without toggles, check if any individual services are selected
                categoryConfig.codes.forEach(code => {
                    const checkbox = document.getElementById(`${sectionId}_${code.code}`);
                    if (checkbox && checkbox.checked) {
                        selectedServices.push({code: code.code, selected: true});
                    }
                });
            } else {
                // For fixed_bundle and single_item categories, check category toggle
                const categoryToggle = document.getElementById(`${sectionId}Toggle`);
                if (categoryToggle && categoryToggle.checked) {
                    selectedServices.push({category: categoryKey, selected: true});
                }
            }
        }
    }
    
    return selectedServices;
}

// Show validation error when no checkboxes are selected
function showValidationError(categoryKey, serviceCode) {
    const categoryName = workCodesConfig?.categories[categoryKey]?.name || categoryKey;
    
    let message;
    if (serviceCode) {
        message = `Please select the checkbox for service "${serviceCode}" before choosing dates.`;
    } else {
        const categoryConfig = workCodesConfig?.categories[categoryKey];
        if (categoryConfig?.type === 'amount_based' || categoryConfig?.type === 'individual_selection') {
            message = `Please select at least one service from "${categoryName}" before choosing dates.`;
        } else {
            message = `Please check the "${categoryName}" checkbox before selecting dates.`;
        }
    }
    
    // Show user-friendly alert
    alert(`⚠️ Selection Required\n\n${message}`);
    
    console.warn('📅 Date picker blocked - no services selected:', {
        categoryKey,
        serviceCode,
        message
    });
}

function createMultiDatePickerHTML() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    const currentMonth = multiDatePickerData.currentMonth;
    const monthYear = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    
    const selectionKey = multiDatePickerData.targetService 
        ? `${multiDatePickerData.targetCategory}_${multiDatePickerData.targetService}` 
        : multiDatePickerData.targetCategory;
        
    const targetName = multiDatePickerData.targetService 
        ? `${multiDatePickerData.targetService}` 
        : workCodesConfig?.categories[multiDatePickerData.targetCategory]?.name || multiDatePickerData.targetCategory;
        
    const existingCount = multiDatePickerData.selectedDates.length;
    const existingText = existingCount > 0 ? ` (${existingCount} already selected)` : '';
    
    let html = `
        <div class="multi-date-picker">
            <h4>📅 Select Dates for ${targetName}${existingText}</h4>
            
            <div class="calendar-header">
                <button type="button" class="calendar-nav" onclick="changeMonth(-1)">‹ Previous</button>
                <span style="font-weight: bold; font-size: 1.1em;">${monthYear}</span>
                <button type="button" class="calendar-nav" onclick="changeMonth(1)">Next ›</button>
            </div>
            
            <div class="calendar-grid">
    `;
    
    // Day headers
    dayNames.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Generate calendar days
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const today = new Date();
    
    for (let i = 0; i < 42; i++) { // 6 weeks max
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dateStr = date.toISOString().split('T')[0];
        const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = multiDatePickerData.selectedDates.includes(dateStr);
        
        let classes = ['calendar-day'];
        if (!isCurrentMonth) classes.push('other-month');
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');
        
        html += `<div class="${classes.join(' ')}" onclick="toggleDateSelection('${dateStr}')" data-date="${dateStr}">${date.getDate()}</div>`;
        
        if ((i + 1) % 7 === 0 && date > lastDay) break; // Stop if we've passed the month
    }
    
    html += `
            </div>
            
            <div class="selected-dates-preview">
                <strong>Selected Dates (${multiDatePickerData.selectedDates.length}):</strong>
                <div id="selectedDatesContainer">
                    ${generateSelectedDateTags()}
                </div>
            </div>
            
            <div class="multi-date-actions">
                <button type="button" class="btn btn-secondary" onclick="clearAllSelectedDates()">Clear All</button>
                <button type="button" class="btn btn-secondary" onclick="closeMultiDatePicker()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="applySelectedDates()">Apply Selected Dates</button>
            </div>
        </div>
    `;
    
    return html;
}

function showMultiDatePickerModal(html) {
    // Create or update modal container
    let modal = document.getElementById('multiDatePickerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'multiDatePickerModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `<div style="max-width: 600px; max-height: 90vh; overflow-y: auto;">${html}</div>`;
    modal.style.display = 'flex';
}

function toggleDateSelection(dateStr) {
    const index = multiDatePickerData.selectedDates.indexOf(dateStr);
    if (index > -1) {
        multiDatePickerData.selectedDates.splice(index, 1);
    } else {
        multiDatePickerData.selectedDates.push(dateStr);
        multiDatePickerData.selectedDates.sort();
    }
    
    // Update visual selection
    const dayElement = document.querySelector(`[data-date="${dateStr}"]`);
    if (dayElement) {
        dayElement.classList.toggle('selected');
    }
    
    // Update selected dates preview
    const container = document.getElementById('selectedDatesContainer');
    if (container) {
        container.innerHTML = generateSelectedDateTags();
    }
}

function generateSelectedDateTags() {
    return multiDatePickerData.selectedDates.map(dateStr => {
        const date = new Date(dateStr);
        const formatted = date.toLocaleDateString();
        return `<span class="selected-date-tag">${formatted} <span class="remove-date" onclick="removeSelectedDate('${dateStr}')">×</span></span>`;
    }).join('');
}

function removeSelectedDate(dateStr) {
    toggleDateSelection(dateStr);
}

function changeMonth(direction) {
    multiDatePickerData.currentMonth.setMonth(multiDatePickerData.currentMonth.getMonth() + direction);
    
    // Regenerate calendar
    const pickerHTML = createMultiDatePickerHTML();
    showMultiDatePickerModal(pickerHTML);
}

function clearAllSelectedDates() {
    multiDatePickerData.selectedDates = [];
    
    // Update visual
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    const container = document.getElementById('selectedDatesContainer');
    if (container) {
        container.innerHTML = generateSelectedDateTags();
    }
}

function closeMultiDatePicker() {
    const modal = document.getElementById('multiDatePickerModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function applySelectedDates() {
    if (multiDatePickerData.selectedDates.length === 0) {
        alert('⚠️ No dates selected\n\nPlease select at least one date, or click Cancel to close without changes.');
        return;
    }
    
    const categoryKey = multiDatePickerData.targetCategory;
    const serviceCode = multiDatePickerData.targetService;
    
    // Store the date selections persistently
    const selectionKey = serviceCode ? `${categoryKey}_${serviceCode}` : categoryKey;
    dateSelections[selectionKey] = [...multiDatePickerData.selectedDates]; // Store a copy
    
    console.log(`💾 Stored date selections for ${selectionKey}:`, dateSelections[selectionKey]);
    
    if (serviceCode) {
        // Apply to specific service
        applyDatesToService(serviceCode);
    } else {
        // Apply to category (DELIVERY, BCG, TIKAKARAN)
        applyDatesToCategory(categoryKey);
    }
    
    // Update button text to show selection count
    updateDateButtonText(categoryKey, serviceCode);
    
    closeMultiDatePicker();
}

function applyDatesToCategory(categoryKey) {
    const sectionId = categoryKey.toLowerCase();
    const container = document.getElementById(sectionId + 'Dates');
    
    if (!container) return;
    
    // Store count values from existing entries before clearing
    const selectionKey = categoryKey;
    storeExistingCountValues(container, selectionKey);
    
    // Clear existing dates
    container.innerHTML = '';
    
    // Add each selected date
    multiDatePickerData.selectedDates.forEach((dateStr, index) => {
        const dateId = `${sectionId}_date_${Date.now()}_${index}`;
        const countId = `${sectionId}_count_${Date.now()}_${index}`;
        
        // Get existing count value or default to 1
        const existingCount = getStoredCountValue(selectionKey, dateStr) || 1;
        
        const dateEntry = document.createElement('div');
        dateEntry.className = 'date-entry';
        dateEntry.dataset.category = categoryKey; // Store category for removal tracking
        dateEntry.innerHTML = `
            <div class="date-entry-controls">
                <label>Date: <input type="date" id="${dateId}" class="date-input" value="${dateStr}"></label>
                <div class="count-controls">
                    <label>Count:</label>
                    <div class="count-input-group">
                        <button type="button" class="count-btn count-minus" onclick="adjustCount('${countId}', -1)">-</button>
                        <input type="number" id="${countId}" class="count-input" value="${existingCount}" min="1" readonly onchange="updateStoredCountValue('${selectionKey}', '${dateStr}', this.value)">
                        <button type="button" class="count-btn count-plus" onclick="adjustCount('${countId}', 1)">+</button>
                    </div>
                </div>
            </div>
            <button type="button" class="remove-date-btn" onclick="removeDateEntry(this.parentElement)">✕ Remove</button>
        `;
        
        container.appendChild(dateEntry);
        
        // Store the count value
        updateStoredCountValue(selectionKey, dateStr, existingCount);
    });
    
    console.log(`✅ Applied ${multiDatePickerData.selectedDates.length} dates to ${categoryKey} with preserved counts`);
}

function applyDatesToService(serviceCode) {
    const container = document.getElementById('dates_' + serviceCode);
    
    if (!container) {
        console.error(`❌ Container not found for service: ${serviceCode}`);
        console.log(`🔍 Trying to find container with ID: dates_${serviceCode}`);
        return;
    }
    
    // Store count values from existing entries before clearing
    const selectionKey = `${multiDatePickerData.targetCategory}_${serviceCode}`;
    storeExistingCountValues(container, selectionKey);
    
    // Clear existing dates
    container.innerHTML = '';
    
    // Add each selected date
    multiDatePickerData.selectedDates.forEach((dateStr, index) => {
        const dateId = `service_date_${serviceCode}_${Date.now()}_${index}`;
        const countId = `service_count_${serviceCode}_${Date.now()}_${index}`;
        
        // Get existing count value or default to 1
        const existingCount = getStoredCountValue(selectionKey, dateStr) || 1;
        
        const dateEntry = document.createElement('div');
        dateEntry.className = 'date-entry';
        dateEntry.dataset.category = multiDatePickerData.targetCategory; // Store category for removal tracking
        dateEntry.dataset.service = serviceCode; // Store service for removal tracking
        dateEntry.innerHTML = `
            <div class="date-entry-controls">
                <label>Date: <input type="date" id="${dateId}" class="date-input" value="${dateStr}"></label>
                <div class="count-controls">
                    <label>Count:</label>
                    <div class="count-input-group">
                        <button type="button" class="count-btn count-minus" onclick="adjustCount('${countId}', -1)">-</button>
                        <input type="number" id="${countId}" class="count-input" value="${existingCount}" min="1" readonly onchange="updateStoredCountValue('${selectionKey}', '${dateStr}', this.value)">
                        <button type="button" class="count-btn count-plus" onclick="adjustCount('${countId}', 1)">+</button>
                    </div>
                </div>
            </div>
            <button type="button" class="remove-date-btn" onclick="removeDateEntry(this.parentElement)">✕ Remove</button>
        `;
        
        container.appendChild(dateEntry);
        
        // Store the count value
        updateStoredCountValue(selectionKey, dateStr, existingCount);
    });
    
    console.log(`✅ Applied ${multiDatePickerData.selectedDates.length} dates to service ${serviceCode} with preserved counts`);
}

// Generate JSON (updated for dynamic system)
function generateJSON() {
    if (!workCodesConfig) {
        alert('Configuration not loaded. Please wait or reload the page.');
        return;
    }
    
    const data = {
        metadata: {
            generatedAt: new Date().toISOString(),
            userAgent: navigator.userAgent,
            version: "3.0-dynamic",
            configVersion: workCodesConfig.metadata.version
        },
        workData: []
    };
    
    let emptyDateWarnings = [];
    let skippedEntries = 0;
    
    // Process each category dynamically
    Object.entries(workCodesConfig.categories).forEach(([categoryKey, categoryConfig]) => {
        const sectionId = categoryKey.toLowerCase();
        const toggle = document.getElementById(sectionId + 'Toggle');
        
        // For categories with toggles (fixed_bundle, single_item), check if toggle is checked
        // For categories without toggles (amount_based, individual_selection), check if any services are selected
        let shouldProcessCategory = false;
        
        if (toggle && toggle.checked) {
            // Category has toggle and it's checked
            shouldProcessCategory = true;
        } else if (!toggle && (categoryConfig.type === 'amount_based' || categoryConfig.type === 'individual_selection')) {
            // Category has no toggle (clickable title), check if any individual services are selected
            shouldProcessCategory = categoryConfig.codes.some(code => {
                const checkbox = document.getElementById(sectionId + '_' + code.code);
                return checkbox && checkbox.checked;
            });
        }
        
        if (shouldProcessCategory) {
            if (categoryConfig.type === 'fixed_bundle' || categoryConfig.type === 'single_item') {
                // Multiple dates approach for DELIVERY and BCG
                const datesContainer = document.getElementById(sectionId + 'Dates');
                if (datesContainer) {
                    const dateEntries = datesContainer.querySelectorAll('.date-entry');
                    dateEntries.forEach(entry => {
                        const dateInput = entry.querySelector('input[type="date"]');
                        const countInput = entry.querySelector('input[type="number"]');
                        
                        if (dateInput && dateInput.value) {
                            const count = parseInt(countInput.value) || 1;
                            const { serviceDate, registerDate } = generateServiceAndRegisterDates(dateInput.value);
                            
                            // For fixed_bundle (like DELIVERY), generate entry for each service code
                            if (categoryConfig.type === 'fixed_bundle') {
                                categoryConfig.codes.forEach(code => {
                                    data.workData.push({
                                        category: categoryKey,
                                        code: code.code,
                                        serviceDate: serviceDate,
                                        registerDate: registerDate,
                                        count: count,
                                        type: "individual"
                                    });
                                });
                            } else {
                                // For single_item (like BCG), generate one entry per category
                                categoryConfig.codes.forEach(code => {
                                    data.workData.push({
                                        category: categoryKey,
                                        code: code.code,
                                        serviceDate: serviceDate,
                                        registerDate: registerDate,
                                        count: count,
                                        type: "individual"
                                    });
                                });
                            }
                        } else if (dateInput && !dateInput.value) {
                            emptyDateWarnings.push(`${categoryKey} service has empty date`);
                            skippedEntries++;
                        }
                    });
                }
            } else if (categoryConfig.type === 'amount_based') {
                // Multi-date approach for TIKAKARAN (amount-based services)
                const datesContainer = document.getElementById(sectionId + 'Dates');
                if (datesContainer) {
                    const dateEntries = datesContainer.querySelectorAll('.date-entry');
                    dateEntries.forEach(entry => {
                        const dateInput = entry.querySelector('input[type="date"]');
                        if (dateInput && dateInput.value) {
                            const { serviceDate, registerDate } = generateServiceAndRegisterDates(dateInput.value);
                            
                            // Process each selected service for this date
                            categoryConfig.codes.forEach(code => {
                                const checkbox = document.getElementById(sectionId + '_' + code.code);
                                if (checkbox && checkbox.checked) {
                                    const countInput = document.getElementById('count_' + code.code);
                                    data.workData.push({
                                        category: categoryKey,
                                        code: code.code,
                                        serviceDate: serviceDate,
                                        registerDate: registerDate,
                                        count: parseInt(countInput.value) || 1,
                                        type: "individual"
                                    });
                                }
                            });
                        } else if (dateInput && !dateInput.value) {
                            emptyDateWarnings.push(`${categoryKey} service has empty date`);
                            skippedEntries++;
                        }
                    });
                } else {
                    // Check if any services are selected but no dates provided
                    const hasSelectedServices = categoryConfig.codes.some(code => {
                        const checkbox = document.getElementById(sectionId + '_' + code.code);
                        return checkbox && checkbox.checked;
                    });
                    
                    if (hasSelectedServices) {
                        emptyDateWarnings.push(`${categoryKey} has selected services but no dates specified`);
                        skippedEntries++;
                    }
                }
            } else if (categoryConfig.type === 'individual_selection') {
                // Individual service dates
                categoryConfig.codes.forEach(code => {
                    const checkbox = document.getElementById(sectionId + '_' + code.code);
                    if (checkbox && checkbox.checked) {
                        const serviceDates = document.getElementById('dates_' + code.code);
                        if (serviceDates) {
                            const dateEntries = serviceDates.querySelectorAll('.date-entry');
                            let hasValidDates = false;
                            
                            dateEntries.forEach(entry => {
                                const dateInput = entry.querySelector('input[type="date"]');
                                const countInput = entry.querySelector('input[type="number"]');
                                
                                if (dateInput && dateInput.value) {
                                    const { serviceDate, registerDate } = generateServiceAndRegisterDates(dateInput.value);
                                    
                                    data.workData.push({
                                        category: categoryKey,
                                        code: code.code,
                                        serviceDate: serviceDate,
                                        registerDate: registerDate,
                                        count: parseInt(countInput.value) || 1,
                                        type: "individual"
                                    });
                                    hasValidDates = true;
                                } else if (dateInput && !dateInput.value) {
                                    emptyDateWarnings.push(`${code.code} service has empty date`);
                                    skippedEntries++;
                                }
                            });
                            
                            // If service is selected but no date entries exist
                            if (!hasValidDates && dateEntries.length === 0) {
                                emptyDateWarnings.push(`${code.code} service is selected but no dates added`);
                                skippedEntries++;
                            }
                        }
                    }
                });
            }
        }
    });
    
    // Show warnings if there are empty dates
    if (emptyDateWarnings.length > 0) {
        const warningMessage = `⚠️ WARNING: Found ${skippedEntries} entries with missing dates:\n\n` +
            emptyDateWarnings.map(warning => `• ${warning}`).join('\n') + 
            `\n\nThese entries were skipped. Please fill in the dates and try again.\n\n` +
            `Generated ${data.workData.length} valid entries.`;
        
        alert(warningMessage);
        console.warn('📅 Empty date validation:', {
            warnings: emptyDateWarnings,
            skippedEntries: skippedEntries,
            validEntries: data.workData.length
        });
    }
    
    displayResults(data);
}

function generateWorkEntries() {
    generateJSON();
}

function displayResults(data) {
    document.getElementById('outputSection').style.display = 'block';
    document.getElementById('jsonOutput').textContent = JSON.stringify(data, null, 2);
    
    const totalItemEntries = data.workData.length;
    const totalWorkEntries = generateWorkEntriesFromJSON(data).length;
    const categories = [...new Set(data.workData.map(item => item.category))];
    
    document.getElementById('summaryContent').innerHTML = `
        <strong>Total Data Items:</strong> ${totalItemEntries}<br>
        <strong>Total Work Entries:</strong> ${totalWorkEntries}<br>
        <strong>Categories Used:</strong> ${categories.join(', ')}<br>
        <strong>Config Version:</strong> ${data.metadata.configVersion || 'Unknown'}<br>
        <strong>Generated At:</strong> ${new Date(data.metadata.generatedAt).toLocaleString()}
    `;
    
    const workEntries = generateWorkEntriesFromJSON(data);
    document.getElementById('workEntriesOutput').textContent = workEntries.join('\n');
}

function generateWorkEntriesFromJSON(data) {
    const entries = [];
    
    data.workData.forEach(item => {
        // Handle new data structure with separate service and register dates
        const serviceDate = item.serviceDate || item.date; // Fallback for old format
        const registerDate = item.registerDate || item.date; // Fallback for old format
        
        const formattedServiceDate = formatDate(serviceDate);
        const formattedRegisterDate = formatDate(registerDate);
        
        // All work entries now have individual codes with proper counts
        entries.push(`${item.code} ${item.count} ${formattedServiceDate} ${formattedRegisterDate}`);
    });
    
    return entries;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function clearForm() {
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[type="date"]').forEach(input => input.value = '');
    document.querySelectorAll('input[type="number"]').forEach(input => input.value = '1');
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.service-dates').forEach(container => {
        container.innerHTML = '';
        container.classList.remove('active');
    });
    
    // Clear dynamic date containers
    allCategories.forEach(category => {
        const sectionId = category.toLowerCase();
        const container = document.getElementById(sectionId + 'Dates');
        if (container) container.innerHTML = '';
    });
    
    document.getElementById('outputSection').style.display = 'none';
    document.getElementById('searchInput').value = '';
    
    // Reset counters
    deliveryDateCounter = 0;
    bcgDateCounter = 0;
    serviceDateCounters = {};
    
    // Clear search
    filterServices();
}

function reloadConfiguration() {
    document.getElementById('dynamicSections').innerHTML = '<div class="loading-message"><h3>⏳ Reloading configuration...</h3></div>';
    workCodesConfig = null;
    loadWorkCodesConfiguration();
}

// New UI interaction functions

// Toggle item selection when clicking on item row
function toggleItemSelection(checkboxId) {
    const checkbox = document.getElementById(checkboxId);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        handleCheckboxChange(checkbox, extractServiceCode(checkboxId));
    }
}

// Handle checkbox state changes and visual feedback
function handleCheckboxChange(checkbox, serviceCode = null) {
    const itemRow = checkbox.closest('.item-row') || checkbox.closest('.service-item');
    const dateButton = itemRow ? itemRow.querySelector('.date-select-btn') : null;
    
    if (checkbox.checked) {
        // Item selected - highlight and enable date button
        if (itemRow) {
            itemRow.classList.add('item-selected');
        }
        if (dateButton) {
            dateButton.classList.remove('btn-disabled');
            dateButton.classList.add('btn-enabled');
            dateButton.disabled = false;
        }
        
        // For individual selection items, show dates container
        if (serviceCode) {
            toggleServiceDates(serviceCode);
        }
    } else {
        // Item deselected - remove highlight and disable date button
        if (itemRow) {
            itemRow.classList.remove('item-selected');
        }
        if (dateButton) {
            dateButton.classList.remove('btn-enabled');
            dateButton.classList.add('btn-disabled');
            dateButton.disabled = false; // Keep clickable for user feedback
        }
        
        // For individual selection items, hide dates container
        if (serviceCode) {
            const datesContainer = document.getElementById('dates_' + serviceCode);
            if (datesContainer) {
                datesContainer.classList.remove('active');
            }
        }
    }
}

// Extract service code from checkbox ID
function extractServiceCode(checkboxId) {
    const parts = checkboxId.split('_');
    return parts.length > 1 ? parts.slice(1).join('_') : null;
}

// Adjust count using +/- buttons
function adjustCount(countInputId, delta) {
    const countInput = document.getElementById(countInputId);
    if (countInput) {
        let currentValue = parseInt(countInput.value) || 1;
        let newValue = currentValue + delta;
        
        // Ensure minimum value of 1
        if (newValue < 1) {
            newValue = 1;
        }
        
        countInput.value = newValue;
        
        // Trigger any change events that might be needed for storage updates
        const event = new Event('change', { bubbles: true });
        countInput.dispatchEvent(event);
        
        // For date entries, also update stored count values directly
        const dateEntry = countInput.closest('.date-entry');
        if (dateEntry) {
            const dateInput = dateEntry.querySelector('input[type="date"]');
            if (dateInput && dateInput.value) {
                const category = dateEntry.dataset.category;
                const service = dateEntry.dataset.service;
                const selectionKey = service ? `${category}_${service}` : category;
                updateStoredCountValue(selectionKey, dateInput.value, newValue);
            }
        }
        
        console.log(`📊 Count adjusted for ${countInputId}: ${currentValue} → ${newValue}`);
    }
}

// Update date button styling based on enablement
function updateDateButtonStyling() {
    document.querySelectorAll('.date-select-btn').forEach(button => {
        // Check if any related checkboxes are selected
        const section = button.closest('.section');
        const hasSelectedItems = section ? section.querySelectorAll('.item-checkbox:checked').length > 0 : false;
        const categoryToggle = section ? section.querySelector('.section-toggle') : null;
        const isCategorySelected = categoryToggle ? categoryToggle.checked : false;
        
        if (hasSelectedItems || isCategorySelected) {
            button.classList.remove('btn-disabled');
            button.classList.add('btn-enabled');
        } else {
            button.classList.add('btn-disabled');
            button.classList.remove('btn-enabled');
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing dynamic work data entry system...');
    
    // Debug smart date functionality
    const smartDate = getSmartDefaultDate();
    const smartMonth = getSmartDefaultMonth();
    console.log('🔍 Debug info:', {
        today: new Date().toDateString(),
        smartDate: smartDate,
        smartMonth: smartMonth.toDateString(),
        dayOfMonth: new Date().getDate()
    });
    
    loadWorkCodesConfiguration();
    
    // Set up periodic date button styling updates
    setTimeout(() => {
        updateDateButtonStyling();
    }, 1000);
});
 