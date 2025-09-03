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
    
    let button = null;
    
    if (serviceCode) {
        // Individual service button - find by onclick attribute containing the service code
        const buttons = document.querySelectorAll(`button[onclick*="showMultiDatePicker('${categoryKey}', '${serviceCode}')"]`);
        button = buttons[0]; // Take the first match
    } else {
        // Category button - find by onclick attribute containing just the category
        const buttons = document.querySelectorAll(`button[onclick*="showMultiDatePicker('${categoryKey}')"]`);
        // Filter to get exact category match (not including service code)
        for (let btn of buttons) {
            const onclick = btn.getAttribute('onclick');
            if (onclick.includes(`showMultiDatePicker('${categoryKey}')`) && !onclick.includes(`showMultiDatePicker('${categoryKey}',`)) {
                button = btn;
                break;
            }
        }
    }
    
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
        
        console.log(`📅 Updated button text for ${selectionKey}: ${count} dates selected`);
    } else {
        console.warn(`⚠️ Button not found for ${selectionKey}`);
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
    const categories = workCodesConfig.categories;
    allCategories = Object.keys(categories);
    
    // Split categories into Daily Work and Monthly Work
    const dailyWorkCategories = ['DELIVERY', 'BCG', 'TIKAKARAN', 'EMERGENCY', 'OTHERS'];
    const monthlyWorkCategories = ['MONTHLY_PACKAGE', 'STATE_PACKAGE'];
    
    // Generate Daily Work sections
    generateTabSections(dailyWorkCategories, 'dailyWorkSections', categories);
    
    // Generate Monthly Work sections
    generateTabSections(monthlyWorkCategories, 'monthlyWorkSections', categories);
    
    // Show action buttons
    document.getElementById('actionButtons').style.display = 'block';
    
    // Multi-date picker only - single date options removed for cleaner UX
    const smartMonth = getSmartDefaultMonth();
    console.log('✅ Configuration loaded - tab interface with multi-date picker:', {
        smartDefaultMonth: smartMonth.toLocaleDateString('en-US', {year: 'numeric', month: 'long'}),
        currentDate: new Date().toLocaleDateString(),
        logic: new Date().getDate() < 15 ? 'Previous month (current day < 15)' : 'Current month (current day >= 15)',
        dailyWorkCategories: dailyWorkCategories.length,
        monthlyWorkCategories: monthlyWorkCategories.length
    });
}

// Generate sections for a specific tab
function generateTabSections(categoryKeys, containerId, categories) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = '';
    
    // Generate each category section for this tab
    categoryKeys.forEach(categoryKey => {
        if (categories[categoryKey]) {
            html += generateCategorySection(categoryKey, categories[categoryKey]);
        }
    });
    
    // If no sections generated, show appropriate message
    if (html === '') {
        html = `
            <div class="loading-message">
                <h3>📋 No services configured for this tab</h3>
                <p>Please check WorkCodes.json configuration</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Generate individual category section HTML
function generateCategorySection(categoryKey, categoryConfig) {
    const sectionId = categoryKey.toLowerCase();
    const icon = getCategoryIcon(categoryKey);
    
    let html = `
        <div id="${sectionId}Section" class="section" data-category="${categoryKey}">
            <div class="section-header">`;
    
    // Handle different category types for title behavior
    if (categoryConfig.type === 'fixed_bundle' || categoryConfig.type === 'single_item') {
        // For bundle categories, use same structure as individual tasks
        html += `
                <div class="item-row clickable-item" onclick="toggleCategorySelectionDirect('${sectionId}', '${categoryKey}')">
                    <input type="checkbox" id="${sectionId}_category" class="item-checkbox category-checkbox" style="display: none;">
                    <div class="item-info">
                        <span class="section-title clickable-title" onclick="event.stopPropagation(); toggleSection('${sectionId}')" style="cursor: pointer;">${icon} ${categoryConfig.name}</span>
                    </div>
                </div>`;
    } else {
        // For other categories, just expandable titles
        html += `
                <div class="section-title clickable-title" onclick="toggleSection('${sectionId}')" style="cursor: pointer;">${icon} ${categoryConfig.name}</div>`;
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
        html += `<p><strong>Click anywhere on the row to select ${categoryConfig.name.toLowerCase()}, or click the title text to expand/collapse (all tasks will be included for each date):</strong></p>`;
        
        html += `<p><strong>This includes the following tasks:</strong></p>`;
        categoryConfig.codes.forEach(code => {
            html += `
                <div class="item-row task-display" data-search="${code.code.toLowerCase()} ${code.description.toLowerCase()} ${code.amount}">
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
        html += `<p><strong>Click anywhere on the row to select ${categoryConfig.name.toLowerCase()}, or click the title text to expand/collapse:</strong></p>`;
        
        html += `<p><strong>This includes:</strong></p>`;
        categoryConfig.codes.forEach(code => {
            html += `
                <div class="item-row task-display" data-search="${code.code.toLowerCase()} ${code.description.toLowerCase()} ${code.amount}">
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
        // Check if this is a Monthly Work category (no dates needed)
        const isMonthlyWork = categoryKey === 'MONTHLY_PACKAGE' || categoryKey === 'STATE_PACKAGE';
        
        if (isMonthlyWork) {
            html += `<p><strong>Select ${categoryConfig.name.toLowerCase()} (monthly activities - no dates required):</strong></p>`;
        } else {
        html += `<p><strong>Select ${categoryConfig.name.toLowerCase()} (each service can have multiple dates):</strong></p>`;
        }
        
        categoryConfig.codes.forEach(code => {
            // Check if this code needs count field
            const needsCount = isMonthlyWork && ['PC1.8', 'PC1.9', 'PC1.10'].includes(code.code);
            const countControls = needsCount ? generateMonthlyCountControls(code.code) : '';
            
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
                            ${countControls}
                            ${!isMonthlyWork ? `<button type="button" class="btn btn-secondary date-select-btn" onclick="showMultiDatePicker('${categoryKey}', '${code.code}'); event.stopPropagation();">📅 Select Dates</button>` : ''}
                        </div>
                    </div>
                    ${!isMonthlyWork ? `<div class="service-dates" id="dates_${code.code}">
                        <!-- Dynamic date entries will be added here -->
                    </div>` : ''}
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

// Generate count controls for Monthly Work items
function generateMonthlyCountControls(codeValue) {
    if (codeValue === 'PC1.9') {
        // PC1.9: Fixed at 5, disabled
        return `
            <div class="count-controls">
                <label>Count:</label>
                <div class="count-input-group">
                    <input type="number" class="count-input monthly-count" id="monthly_count_${codeValue}" value="5" min="5" max="5" readonly title="Fixed count for this service">
                </div>
            </div>
        `;
    } else if (codeValue === 'PC1.10') {
        // PC1.10: Range 6-35
        return `
            <div class="count-controls">
                <label>Count:</label>
                <div class="count-input-group">
                    <button type="button" class="count-btn count-minus" onclick="adjustMonthlyCount('monthly_count_${codeValue}', -1); event.stopPropagation();">-</button>
                    <input type="number" class="count-input monthly-count" id="monthly_count_${codeValue}" value="6" min="6" max="35" onchange="validateMonthlyCount(this, 6, 35)">
                    <button type="button" class="count-btn count-plus" onclick="adjustMonthlyCount('monthly_count_${codeValue}', 1); event.stopPropagation();">+</button>
                </div>
                <small style="color: #6c757d; font-size: 0.8em;">Range: 6-35</small>
            </div>
        `;
    } else if (codeValue === 'PC1.8') {
        // PC1.8: User editable, no specific range
        return `
            <div class="count-controls">
                <label>Count:</label>
                <div class="count-input-group">
                    <button type="button" class="count-btn count-minus" onclick="adjustMonthlyCount('monthly_count_${codeValue}', -1); event.stopPropagation();">-</button>
                    <input type="number" class="count-input monthly-count" id="monthly_count_${codeValue}" value="1" min="1">
                    <button type="button" class="count-btn count-plus" onclick="adjustMonthlyCount('monthly_count_${codeValue}', 1); event.stopPropagation();">+</button>
                </div>
            </div>
        `;
    }
    return '';
}

// Get appropriate icon for category
function getCategoryIcon(categoryKey) {
    const icons = {
        'DELIVERY': '🤱',
        'BCG': '💉',
        'TIKAKARAN': '🏥',
        'EMERGENCY': '🚨',
        'OTHERS': '📋',
        'MONTHLY_PACKAGE': '📦',
        'STATE_PACKAGE': '🏛️'
    };
    return icons[categoryKey] || '📋';
}

// Tab switching functionality
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(tabName + 'Content').classList.add('active');
    
    // Clear search when switching tabs
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        filterServices();
    }
    
    console.log(`🔄 Switched to ${tabName} tab`);
}

// Show configuration information
function showConfigInfo(isFallback = false) {
    const containers = [
        document.getElementById('dailyWorkSections'),
        document.getElementById('monthlyWorkSections')
    ];
    
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
    
    // Add config info to both tabs
    containers.forEach(container => {
        if (container) {
    container.insertAdjacentHTML('afterbegin', infoHtml);
        }
    });
}

// Search functionality - only searches within the active tab
function filterServices() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    // Get the currently active tab content
    const activeTab = document.querySelector('.tab-pane.active');
    if (!activeTab) return;
    
    const allSections = activeTab.querySelectorAll('.section');
    const allServiceItems = activeTab.querySelectorAll('.service-item');
    const allItemRows = activeTab.querySelectorAll('.item-row[data-search]');
    
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
        
        const searchResultsElement = document.getElementById('searchResultsCount');
        if (searchResultsElement) {
            searchResultsElement.textContent = 'All services shown';
        }
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
    const searchResultsElement = document.getElementById('searchResultsCount');
    if (searchResultsElement) {
        searchResultsElement.textContent = 
        `Found ${visibleServices} services in ${visibleSections} categories (${totalServices} total)`;
    }
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
    const expandBtn = section ? section.querySelector('.expand-btn') : null;
    
    // Handle clickable titles (for categories without checkboxes)
    if (!toggle) {
        if (section.classList.contains('active')) {
            section.classList.remove('active');
            if (expandBtn) expandBtn.classList.remove('expanded');
        } else {
            section.classList.add('active');
            if (expandBtn) expandBtn.classList.add('expanded');
        }
        return;
    }
    
    // Handle checkbox-based toggles
    if (toggle && toggle.checked) {
        section.classList.add('active');
        if (expandBtn) expandBtn.classList.add('expanded');
    } else if (section) {
        section.classList.remove('active');
        if (expandBtn) expandBtn.classList.remove('expanded');
    }
    
    // Update date button styling after any section toggle
    updateDateButtonStyling();
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
        
        // Also update all button texts to ensure consistency
        updateAllDateButtonTexts();
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
                // For fixed_bundle and single_item categories, check category checkbox
                const categoryCheckbox = document.getElementById(`${sectionId}_category`);
                if (categoryCheckbox && categoryCheckbox.checked) {
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
    
    // Also update all button texts to ensure consistency
    updateAllDateButtonTexts();
    
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
    
    // Force button text update for individual services
    updateDateButtonText(multiDatePickerData.targetCategory, serviceCode);
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
        workData: [],
        monthlyData: []  // Separate array for Monthly Work
    };
    
    let emptyDateWarnings = [];
    let skippedEntries = 0;
    
    // Process each category dynamically
    Object.entries(workCodesConfig.categories).forEach(([categoryKey, categoryConfig]) => {
        const sectionId = categoryKey.toLowerCase();
        const toggle = document.getElementById(sectionId + 'Toggle');
        const isMonthlyWork = categoryKey === 'MONTHLY_PACKAGE' || categoryKey === 'STATE_PACKAGE';
        
        // Check if category should be processed based on its selection method
        let shouldProcessCategory = false;
        
        // Check for old-style section toggle (no longer used but keeping for backwards compatibility)
        if (toggle && toggle.checked) {
            shouldProcessCategory = true;
        }
        // Check for new-style category checkbox (for fixed_bundle and single_item)
        else if (categoryConfig.type === 'fixed_bundle' || categoryConfig.type === 'single_item') {
            const categoryCheckbox = document.getElementById(sectionId + '_category');
            shouldProcessCategory = categoryCheckbox && categoryCheckbox.checked;
        }
        // Check for individual service selections (amount_based, individual_selection)
        else if (categoryConfig.type === 'amount_based' || categoryConfig.type === 'individual_selection') {
            shouldProcessCategory = categoryConfig.codes.some(code => {
                const checkbox = document.getElementById(sectionId + '_' + code.code);
                return checkbox && checkbox.checked;
            });
        }
        
        if (shouldProcessCategory) {
            // Handle Monthly Work categories differently
            if (isMonthlyWork) {
                processMonthlyWorkCategory(categoryKey, categoryConfig, data, sectionId);
            } else {
                processRegularCategory(categoryKey, categoryConfig, data, sectionId, emptyDateWarnings, skippedEntries);
            }
        }
    });
    
    // Show warnings if there are empty dates (only for regular categories)
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

// Process Monthly Work categories (no dates, just code and count)
function processMonthlyWorkCategory(categoryKey, categoryConfig, data, sectionId) {
    categoryConfig.codes.forEach(code => {
        const checkbox = document.getElementById(sectionId + '_' + code.code);
        if (checkbox && checkbox.checked) {
            let count = 1;
            
            // Get count for specific codes that have count fields
            if (['PC1.8', 'PC1.9', 'PC1.10'].includes(code.code)) {
                const countInput = document.getElementById('monthly_count_' + code.code);
                if (countInput) {
                    count = parseInt(countInput.value) || 1;
                }
            }
            
            data.monthlyData.push({
                category: categoryKey,
                code: code.code,
                count: count,
                type: "monthly"
            });
        }
    });
}

// Process regular categories (with dates)
function processRegularCategory(categoryKey, categoryConfig, data, sectionId, emptyDateWarnings, skippedEntries) {
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
                                    const price = code.amount || 0;
                                    const totalPrice = price * count;
                                    data.workData.push({
                                        category: categoryKey,
                                        code: code.code,
                                        price: price,
                                        serviceDate: serviceDate,
                                        registerDate: registerDate,
                                        count: count,
                                        totalPrice: totalPrice,
                                        type: "individual"
                                    });
                                });
                            } else {
                                // For single_item (like BCG), generate one entry per category
                                categoryConfig.codes.forEach(code => {
                                    const price = code.amount || 0;
                                    const totalPrice = price * count;
                                    data.workData.push({
                                        category: categoryKey,
                                        code: code.code,
                                        price: price,
                                        serviceDate: serviceDate,
                                        registerDate: registerDate,
                                        count: count,
                                        totalPrice: totalPrice,
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
                                    const count = parseInt(countInput.value) || 1;
                                    const price = code.amount || 0;
                                    const totalPrice = price * count;
                                    data.workData.push({
                                        category: categoryKey,
                                        code: code.code,
                                        price: price,
                                        serviceDate: serviceDate,
                                        registerDate: registerDate,
                                        count: count,
                                        totalPrice: totalPrice,
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
                                    const count = parseInt(countInput.value) || 1;
                                    const price = code.amount || 0;
                                    const totalPrice = price * count;
                                    
                                    data.workData.push({
                                        category: categoryKey,
                                        code: code.code,
                                        price: price,
                                        serviceDate: serviceDate,
                                        registerDate: registerDate,
                                        count: count,
                                        totalPrice: totalPrice,
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

function generateWorkEntries() {
    // Hide summary section when generating
    hideSummary();
    
    // Generate the work entries
    generateJSON();
    
    // Show success message
    console.log('✅ Work entries generated successfully after summary review');
}

function displayResults(data) {
    document.getElementById('outputSection').style.display = 'block';
    document.getElementById('jsonOutput').textContent = JSON.stringify(data, null, 2);
    
    const totalItemEntries = data.workData.length;
    const totalMonthlyEntries = data.monthlyData ? data.monthlyData.length : 0;
    const totalWorkEntries = generateWorkEntriesFromJSON(data).length;
    const categories = [...new Set(data.workData.map(item => item.category))];
    const monthlyCategories = data.monthlyData ? [...new Set(data.monthlyData.map(item => item.category))] : [];
    
    // Calculate grand total for regular entries only (exclude monthly)
    const grandTotal = data.workData.reduce((total, item) => total + (item.totalPrice || 0), 0);
    
    document.getElementById('summaryContent').innerHTML = `
        <strong>Daily Work Entries:</strong> ${totalItemEntries}<br>
        <strong>Monthly Work Entries:</strong> ${totalMonthlyEntries}<br>
        <strong>Total Work Entries:</strong> ${totalWorkEntries}<br>
        <strong>Daily Work Amount:</strong> ${grandTotal}<br>
        <strong>Daily Categories:</strong> ${categories.join(', ')}<br>
        <strong>Monthly Categories:</strong> ${monthlyCategories.join(', ')}<br>
        <strong>Config Version:</strong> ${data.metadata.configVersion || 'Unknown'}<br>
        <strong>Generated At:</strong> ${new Date(data.metadata.generatedAt).toLocaleString()}
    `;
    
    const workEntries = generateWorkEntriesFromJSON(data);
    document.getElementById('workEntriesOutput').textContent = workEntries.join('\n');
    
    // Generate and display table (only for daily work, exclude monthly)
    generateWorkEntriesTable(data.workData, grandTotal);
    
    // Generate and display monthly work table if there's monthly data
    if (data.monthlyData && data.monthlyData.length > 0) {
        generateMonthlyWorkTable(data.monthlyData);
        document.getElementById('monthlyWorkTableSection').style.display = 'block';
        // Calculate overall grand total after both tables are generated
        calculateMonthlyGrandTotal();
    } else {
        document.getElementById('monthlyWorkTableSection').style.display = 'none';
        // If no monthly data, grand total is just daily work total
        document.getElementById('monthlyGrandTotal').textContent = grandTotal;
    }
}

function generateWorkEntriesTable(workData, grandTotal) {
    const tableBody = document.getElementById('workEntriesTableBody');
    const tableFooter = document.getElementById('workEntriesTableFooter');
    const grandTotalElement = document.getElementById('grandTotal');
    
    // Clear existing table content
    tableBody.innerHTML = '';
    
    if (workData.length === 0) {
        // Show empty state
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-table-message">No work entries generated yet. Please select services and dates, then click "Generate Work Entries".</td></tr>';
        tableFooter.style.display = 'none';
        return;
    }
    
    // Generate table rows
    workData.forEach((item, index) => {
        const serviceDate = item.serviceDate || item.date;
        const registerDate = item.registerDate || item.date;
        
        const formattedServiceDate = formatDate(serviceDate);
        const formattedRegisterDate = formatDate(registerDate);
        
        const price = item.price || 0;
        const totalPrice = item.totalPrice || (price * item.count);
        const sequenceNumber = index + 1; // Sequential numbering starting from 1
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="seq-cell">${sequenceNumber}</td>
            <td class="code-cell">${item.code}</td>
            <td class="price-cell">${price}</td>
            <td class="count-cell">${item.count}</td>
            <td class="total-cell">${totalPrice}</td>
            <td class="date-cell">${formattedServiceDate}</td>
            <td class="date-cell">${formattedRegisterDate}</td>
        `;
        
        // Add hover effect with animation
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        tableBody.appendChild(row);
        
        // Animate row entry
        setTimeout(() => {
            row.style.transition = 'opacity 0.3s, transform 0.3s';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, index * 50); // Stagger animation
    });
    
    // Show footer with grand total (without ₹ symbol)
    grandTotalElement.textContent = `${grandTotal}`;
    tableFooter.style.display = 'table-footer-group';
    
    console.log(`📊 Generated table with ${workData.length} entries, Grand Total: ${grandTotal}`);
}

// Generate Monthly Work Table
function generateMonthlyWorkTable(monthlyData) {
    if (!workCodesConfig || !workCodesConfig.categories) {
        console.error('❌ WorkCodes configuration not available for monthly table generation');
        return;
    }

    // Get all selected codes from monthly data
    const selectedCodes = new Set(monthlyData.map(item => item.code));
    const selectedCodeData = {};
    monthlyData.forEach(item => {
        selectedCodeData[item.code] = item;
    });

    // Generate Monthly Package Table
    const monthlyPackageCodes = workCodesConfig.categories.MONTHLY_PACKAGE?.codes || [];
    const monthlyPackageTableBody = document.getElementById('monthlyPackageTableBody');
    const monthlyPackageTotal = document.getElementById('monthlyPackageTotal');
    
    generateMonthlySection(monthlyPackageCodes, monthlyPackageTableBody, selectedCodes, selectedCodeData, monthlyPackageTotal, 'MONTHLY_PACKAGE');

    // Generate State Package Table
    const statePackageCodes = workCodesConfig.categories.STATE_PACKAGE?.codes || [];
    const statePackageTableBody = document.getElementById('statePackageTableBody');
    const statePackageTotal = document.getElementById('statePackageTotal');
    
    generateMonthlySection(statePackageCodes, statePackageTableBody, selectedCodes, selectedCodeData, statePackageTotal, 'STATE_PACKAGE');
    
    console.log(`📋 Generated monthly work table with ${monthlyData.length} selected items`);
}

// Generate Monthly Section Table
function generateMonthlySection(codes, tableBody, selectedCodes, selectedCodeData, totalElement, sectionType) {
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Define specific order for Monthly Package
    const monthlyPackageOrder = ['PC1.1', 'PC1.2', 'PC1.3', 'PC1.4', 'PC1.5', 'PI1.1', 'PC1.7', 'PC1.8', 'PC1.9', 'PC1.10'];
    
    // Sort codes based on section type
    let sortedCodes = codes;
    if (sectionType === 'MONTHLY_PACKAGE') {
        // Sort Monthly Package codes according to specified order
        sortedCodes = codes.sort((a, b) => {
            const indexA = monthlyPackageOrder.indexOf(a.code);
            const indexB = monthlyPackageOrder.indexOf(b.code);
            if (indexA === -1) return 1; // Unknown codes go to end
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }
    
    // Create rows with 5 codes per row (adjust as needed)
    const codesPerRow = 5;
    let totalAmount = 0;
    let hasSelectedServices = false;
    
    for (let i = 0; i < sortedCodes.length; i += codesPerRow) {
        const row = document.createElement('tr');
        
        for (let j = 0; j < codesPerRow; j++) {
            const codeIndex = i + j;
            const cell = document.createElement('td');
            cell.className = 'monthly-work-cell';
            
            if (codeIndex < sortedCodes.length) {
                const code = sortedCodes[codeIndex];
                const isSelected = selectedCodes.has(code.code);
                const selectedData = selectedCodeData[code.code];
                
                if (isSelected) {
                    cell.classList.add('selected');
                    hasSelectedServices = true;
                    
                    // Special handling for State Service - always 1000 when any service is selected
                    if (sectionType === 'STATE_PACKAGE') {
                        // State service total will be set to 1000 outside this loop
                    } else {
                        // Calculate amount contribution for Monthly Package
                        let amount = code.amount || 0;
                        let count = 1;
                        
                        if (['PC1.8', 'PC1.9', 'PC1.10'].includes(code.code) && selectedData) {
                            count = selectedData.count || 1;
                            if (code.code === 'PC1.10') {
                                // PC1.10 is per beneficiary, so multiply by count
                                amount = amount * count;
                            } else if (code.code === 'PC1.9') {
                                // PC1.9 has special calculation (fixed at 5, amount is 50)
                                amount = 50; // Fixed amount for PC1.9
                            }
                        }
                        
                        totalAmount += amount;
                    }
                }
                
                // Create cell content
                let cellContent = `
                    <input type="checkbox" class="monthly-checkbox" ${isSelected ? 'checked' : ''} disabled>
                    <div class="monthly-code">${code.code}</div>
                    <div class="monthly-amount">${formatMonthlyAmount(code.code, code.amount || 0)}</div>
                `;
                
                // Add count information for specific codes
                if (['PC1.8', 'PC1.9', 'PC1.10'].includes(code.code) && isSelected && selectedData) {
                    cellContent += `<div class="monthly-count">संख्या: ${selectedData.count || 1}</div>`;
                }
                
                cell.innerHTML = cellContent;
            }
            
            row.appendChild(cell);
        }
        
        tableBody.appendChild(row);
    }
    
    // Update section total
    if (sectionType === 'STATE_PACKAGE' && hasSelectedServices) {
        // State Service: always 1000 when any service is selected
        totalElement.textContent = 1000;
    } else {
        // Monthly Package: calculated total
        totalElement.textContent = totalAmount;
    }
}

// Format monthly amount display
function formatMonthlyAmount(codeValue, amount) {
    if (codeValue === 'PC1.10') {
        return `${amount}/-रुपये प्रति लाभार्थी`;
    } else if (codeValue === 'PC1.9') {
        return `50/-रुपये प्रतिमाह`;
    } else if (amount === 0) {
        return `0/-रुपये`;
    } else {
        return `${amount}/-रुपये प्रतिमाह`;
    }
}

// Calculate Overall Grand Total (Daily Work + Monthly Work)
function calculateMonthlyGrandTotal() {
    // Get Monthly Work totals
    const monthlyPackageTotal = parseInt(document.getElementById('monthlyPackageTotal').textContent) || 0;
    const statePackageTotal = parseInt(document.getElementById('statePackageTotal').textContent) || 0;
    const monthlyWorkTotal = monthlyPackageTotal + statePackageTotal;
    
    // Get Daily Work total from the main table
    const dailyWorkTotal = parseInt(document.getElementById('grandTotal').textContent) || 0;
    
    // Calculate overall grand total
    const overallGrandTotal = dailyWorkTotal + monthlyWorkTotal;
    
    document.getElementById('monthlyGrandTotal').textContent = overallGrandTotal;
    
    console.log(`💰 Grand Total Calculation: Daily Work: ${dailyWorkTotal} + Monthly Work: ${monthlyWorkTotal} = Overall: ${overallGrandTotal}`);
}

function generateWorkEntriesFromJSON(data) {
    const entries = [];
    
    // Handle regular daily work entries
    data.workData.forEach(item => {
        // Handle new data structure with separate service and register dates
        const serviceDate = item.serviceDate || item.date; // Fallback for old format
        const registerDate = item.registerDate || item.date; // Fallback for old format
        
        const formattedServiceDate = formatDate(serviceDate);
        const formattedRegisterDate = formatDate(registerDate);
        
        // Original format: CODE COUNT SERVICE_DATE REGISTER_DATE (no pricing columns)
        entries.push(`${item.code} ${item.count} ${formattedServiceDate} ${formattedRegisterDate}`);
    });
    
    // Handle monthly work entries (different format)
    if (data.monthlyData && data.monthlyData.length > 0) {
        data.monthlyData.forEach(item => {
            // For monthly work: just CODE and COUNT (only for PC1.8, PC1.9, PC1.10)
            if (['PC1.8', 'PC1.9', 'PC1.10'].includes(item.code)) {
                entries.push(`${item.code} ${item.count}`);
            } else {
                // For other monthly codes, just the code
                entries.push(`${item.code}`);
            }
        });
    }
    
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
    // Clear form elements in both tabs
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[type="date"]').forEach(input => input.value = '');
    document.querySelectorAll('input[type="number"]:not(.monthly-count)').forEach(input => input.value = '1');
    
    // Remove selection highlights from all clickable items and category titles
    document.querySelectorAll('.item-selected').forEach(item => item.classList.remove('item-selected'));
    document.querySelectorAll('.category-selected').forEach(title => title.classList.remove('category-selected'));
    
    // Reset monthly count fields to their defaults
    document.querySelectorAll('.monthly-count').forEach(input => {
        const inputId = input.id;
        if (inputId.includes('PC1.9')) {
            input.value = '5'; // PC1.9 always 5
        } else if (inputId.includes('PC1.10')) {
            input.value = '6'; // PC1.10 minimum 6
        } else if (inputId.includes('PC1.8')) {
            input.value = '1'; // PC1.8 default 1
        }
    });
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
    
    // Hide summary section
    document.getElementById('summarySection').style.display = 'none';
    
    // Clear search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Clear the table
    const tableBody = document.getElementById('workEntriesTableBody');
    const tableFooter = document.getElementById('workEntriesTableFooter');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-table-message">No work entries generated yet. Please select services and dates, then click "Generate Work Entries".</td></tr>';
    }
    if (tableFooter) {
        tableFooter.style.display = 'none';
    }

    // Clear monthly work table
    const monthlyTableSection = document.getElementById('monthlyWorkTableSection');
    const monthlyPackageTableBody = document.getElementById('monthlyPackageTableBody');
    const statePackageTableBody = document.getElementById('statePackageTableBody');
    const monthlyPackageTotal = document.getElementById('monthlyPackageTotal');
    const statePackageTotal = document.getElementById('statePackageTotal');
    const monthlyGrandTotal = document.getElementById('monthlyGrandTotal');
    
    if (monthlyTableSection) {
        monthlyTableSection.style.display = 'none';
    }
    if (monthlyPackageTableBody) {
        monthlyPackageTableBody.innerHTML = '<tr><td colspan="5" class="empty-table-message">No monthly work data</td></tr>';
    }
    if (statePackageTableBody) {
        statePackageTableBody.innerHTML = '<tr><td colspan="5" class="empty-table-message">No state work data</td></tr>';
    }
    if (monthlyPackageTotal) {
        monthlyPackageTotal.textContent = '0';
    }
    if (statePackageTotal) {
        statePackageTotal.textContent = '0';
    }
    if (monthlyGrandTotal) {
        monthlyGrandTotal.textContent = '0';
    }
    
    // Clear persistent storage
    dateSelections = {};
    dateCountValues = {};
    
    // Clear search
    filterServices();
    
    console.log('🧹 Form cleared and table reset for both tabs');
}

// Show Summary Function
function showSummary() {
    if (!workCodesConfig) {
        alert('Configuration not loaded. Please wait or reload the page.');
        return;
    }

    const summaryData = generateWorkSummary();
    
    if (summaryData.length === 0) {
        alert('📋 No work selected. Please select some services and dates to generate a summary.');
        return;
    }

    // Display summary
    const summaryOutput = document.getElementById('summaryOutput');
    summaryOutput.innerHTML = summaryData.join('\n');
    
    // Show summary section
    document.getElementById('summarySection').style.display = 'block';
    
    // Scroll to summary section
    document.getElementById('summarySection').scrollIntoView({ behavior: 'smooth' });
    
    console.log('📋 Summary generated and displayed');
}

// Hide Summary Function
function hideSummary() {
    document.getElementById('summarySection').style.display = 'none';
}

// Generate Work Summary
function generateWorkSummary() {
    const summary = [];
    

    
    // Process each category
    Object.entries(workCodesConfig.categories).forEach(([categoryKey, categoryConfig]) => {
        const sectionId = categoryKey.toLowerCase();
        const toggle = document.getElementById(sectionId + 'Toggle');
        const isMonthlyWork = categoryKey === 'MONTHLY_PACKAGE' || categoryKey === 'STATE_PACKAGE';
        
        // Check if category is active
        let shouldProcessCategory = false;
        
        // Check for old-style section toggle (no longer used but keeping for backwards compatibility)
        if (toggle && toggle.checked) {
            shouldProcessCategory = true;
        }
        // Check for new-style category checkbox (for fixed_bundle and single_item)
        else if (categoryConfig.type === 'fixed_bundle' || categoryConfig.type === 'single_item') {
            const categoryCheckbox = document.getElementById(sectionId + '_category');
            shouldProcessCategory = categoryCheckbox && categoryCheckbox.checked;
        }
        // Check for individual service selections (amount_based, individual_selection)
        else if (categoryConfig.type === 'amount_based' || categoryConfig.type === 'individual_selection') {
            shouldProcessCategory = categoryConfig.codes.some(code => {
                const checkbox = document.getElementById(sectionId + '_' + code.code);
                return checkbox && checkbox.checked;
            });
        }
        
        if (shouldProcessCategory) {
            if (isMonthlyWork) {
                processMonthlySummary(categoryKey, categoryConfig, sectionId, summary);
            } else {
                processRegularSummary(categoryKey, categoryConfig, sectionId, summary);
            }
        }
    });
    
    return summary;
}

// Process Regular Categories Summary (Daily Work)
function processRegularSummary(categoryKey, categoryConfig, sectionId, summary) {
    if (categoryConfig.type === 'fixed_bundle' || categoryConfig.type === 'single_item') {
        // For DELIVERY and BCG
        const serviceName = categoryConfig.name;
        const datesContainer = document.getElementById(sectionId + 'Dates');
        const dates = [];
        let totalCount = 0;
        
        if (datesContainer) {
            const dateEntries = datesContainer.querySelectorAll('.date-entry');
            dateEntries.forEach(entry => {
                const dateInput = entry.querySelector('input[type="date"]');
                const countInput = entry.querySelector('input[type="number"]');
                
                if (dateInput && dateInput.value) {
                    const count = parseInt(countInput.value) || 1;
                    const formattedDate = formatSummaryDate(dateInput.value);
                    
                    // Add date multiple times based on count
                    for (let i = 0; i < count; i++) {
                        dates.push(formattedDate);
                        totalCount++;
                    }
                }
            });
        }
        
        if (dates.length > 0) {
            summary.push(`${serviceName} total ${totalCount} [${dates.join(', ')}]`);
        }
        
    } else if (categoryConfig.type === 'amount_based') {
        // For TIKAKARAN (amount-based services)
        const datesContainer = document.getElementById(sectionId + 'Dates');
        
        if (datesContainer) {
            const dateEntries = datesContainer.querySelectorAll('.date-entry');
            const servicesSummary = {};
            
            dateEntries.forEach(entry => {
                const dateInput = entry.querySelector('input[type="date"]');
                
                if (dateInput && dateInput.value) {
                    const formattedDate = formatSummaryDate(dateInput.value);
                    
                    categoryConfig.codes.forEach(code => {
                        const checkbox = document.getElementById(sectionId + '_' + code.code);
                        if (checkbox && checkbox.checked) {
                            const countInput = document.getElementById('count_' + code.code);
                            const count = parseInt(countInput.value) || 1;
                            const amount = code.amount || 0;
                            
                            const serviceKey = `${amount}`;
                            if (!servicesSummary[serviceKey]) {
                                servicesSummary[serviceKey] = { count: 0, dates: [] };
                            }
                            servicesSummary[serviceKey].count += count;
                            servicesSummary[serviceKey].dates.push(formattedDate);
                        }
                    });
                }
            });
            
            // Add Tikakaran services to summary
            Object.entries(servicesSummary).forEach(([serviceKey, data]) => {
                summary.push(`Tikakaran ${serviceKey} ${data.count} [${[...new Set(data.dates)].join(', ')}]`);
            });
        }
        
    } else if (categoryConfig.type === 'individual_selection') {
        // Check if this is monthly work
        const isMonthlyWork = categoryKey === 'MONTHLY_PACKAGE' || categoryKey === 'STATE_PACKAGE';
        
        if (!isMonthlyWork) {
        // For OTHER services (individual selection, non-monthly)
        categoryConfig.codes.forEach(code => {
            const checkbox = document.getElementById(sectionId + '_' + code.code);
            if (checkbox && checkbox.checked) {
                const serviceDates = document.getElementById('dates_' + code.code);
                const dates = [];
                let totalCount = 0;
                
                if (serviceDates) {
                    const dateEntries = serviceDates.querySelectorAll('.date-entry');
                    dateEntries.forEach(entry => {
                        const dateInput = entry.querySelector('input[type="date"]');
                        const countInput = entry.querySelector('input[type="number"]');
                        
                        if (dateInput && dateInput.value) {
                            const count = parseInt(countInput.value) || 1;
                            const formattedDate = formatSummaryDate(dateInput.value);
                            
                            // Add date multiple times based on count
                            for (let i = 0; i < count; i++) {
                                dates.push(formattedDate);
                                totalCount++;
                            }
                        }
                    });
                }
                
                if (dates.length > 0) {
                    summary.push(`${code.description} - ${totalCount} [${dates.join(', ')}]`);
                }
            }
        });
        }
    }
}

// Process Monthly Categories Summary
function processMonthlySummary(categoryKey, categoryConfig, sectionId, summary) {
    const categoryName = categoryConfig.name;
    const selectedServices = [];
    
    categoryConfig.codes.forEach(code => {
        const checkbox = document.getElementById(sectionId + '_' + code.code);
        if (checkbox && checkbox.checked) {
            let serviceInfo = code.code;
            
            // Add count information for specific codes
            if (['PC1.8', 'PC1.9', 'PC1.10'].includes(code.code)) {
                const countInput = document.getElementById('monthly_count_' + code.code);
                if (countInput) {
                    const count = parseInt(countInput.value) || 1;
                    serviceInfo += ` (Count: ${count})`;
                }
            }
            
            selectedServices.push(serviceInfo);
        }
    });
    
    if (selectedServices.length > 0) {
        summary.push(`\n📦 ${categoryName}:`);
        selectedServices.forEach(service => {
            summary.push(`  • ${service}`);
        });
    }
}

// Format date for summary display
function formatSummaryDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    
    return `${day} ${month}`;
}

function reloadConfiguration() {
    // Show loading message in both tabs
    const loadingMessage = '<div class="loading-message"><h3>⏳ Reloading configuration...</h3></div>';
    
    const dailyWorkContainer = document.getElementById('dailyWorkSections');
    const monthlyWorkContainer = document.getElementById('monthlyWorkSections');
    
    if (dailyWorkContainer) {
        dailyWorkContainer.innerHTML = loadingMessage;
    }
    if (monthlyWorkContainer) {
        monthlyWorkContainer.innerHTML = loadingMessage;
    }
    
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

// Toggle category selection directly on row click (for Delivery and BCG)
function toggleCategorySelectionDirect(sectionId, categoryKey) {
    const checkbox = document.getElementById(sectionId + '_category');
    const itemRow = document.querySelector(`[onclick="toggleCategorySelectionDirect('${sectionId}', '${categoryKey}')"]`);
    const titleElement = itemRow ? itemRow.querySelector('.section-title') : null;
    
    if (checkbox && itemRow && titleElement) {
        checkbox.checked = !checkbox.checked;
        
        // Update visual state - same as individual tasks
        if (checkbox.checked) {
            itemRow.classList.add('item-selected');
            titleElement.classList.add('category-selected');
        } else {
            itemRow.classList.remove('item-selected');
            titleElement.classList.remove('category-selected');
        }
        
        // Handle the checkbox change logic
        handleCategoryCheckboxChange(checkbox, categoryKey);
    }
}

// Toggle category selection (for clickable category items like Delivery and BCG)
function toggleCategorySelection(sectionId) {
    const checkbox = document.getElementById(sectionId + '_category');
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        
        // Find the category key from the section
        const categoryKey = sectionId.toUpperCase();
        handleCategoryCheckboxChange(checkbox, categoryKey);
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
    
    // Update all date button styling based on current selections
    updateDateButtonStyling();
}

// Handle category checkbox changes for fixed_bundle and single_item types
function handleCategoryCheckboxChange(checkbox, categoryKey) {
    const section = checkbox.closest('.section');
    const itemRow = checkbox.closest('.item-row');
    const titleElement = itemRow ? itemRow.querySelector('.section-title') : null;
    const dateButton = section ? section.querySelector('.date-select-btn') : null;
    
    if (checkbox.checked) {
        // Category selected - highlight row and enable date button (same as individual tasks)
        if (itemRow) {
            itemRow.classList.add('item-selected');
        }
        if (titleElement) {
            titleElement.classList.add('category-selected');
        }
        if (dateButton) {
            dateButton.classList.remove('btn-disabled');
            dateButton.classList.add('btn-enabled');
            dateButton.disabled = false;
        }
    } else {
        // Category deselected - remove highlight and disable date button
        if (itemRow) {
            itemRow.classList.remove('item-selected');
        }
        if (titleElement) {
            titleElement.classList.remove('category-selected');
        }
        if (dateButton) {
            dateButton.classList.remove('btn-enabled');
            dateButton.classList.add('btn-disabled');
            dateButton.disabled = false; // Keep clickable for user feedback
        }
    }
    
    // Update all date button styling based on current selections
    updateDateButtonStyling();
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

// Adjust monthly count with specific validation
function adjustMonthlyCount(countInputId, delta) {
    const countInput = document.getElementById(countInputId);
    if (countInput) {
        let currentValue = parseInt(countInput.value) || 1;
        let newValue = currentValue + delta;
        
        // Apply specific constraints based on the input
        const min = parseInt(countInput.min) || 1;
        const max = parseInt(countInput.max) || 999;
        
        if (newValue < min) {
            newValue = min;
        }
        if (newValue > max) {
            newValue = max;
        }
        
        countInput.value = newValue;
        
        console.log(`📊 Monthly count adjusted for ${countInputId}: ${currentValue} → ${newValue} (range: ${min}-${max})`);
    }
}

// Validate monthly count input
function validateMonthlyCount(input, min, max) {
    let value = parseInt(input.value);
    
    if (isNaN(value) || value < min) {
        input.value = min;
        alert(`⚠️ Minimum value is ${min}`);
    } else if (value > max) {
        input.value = max;
        alert(`⚠️ Maximum value is ${max}`);
    }
    
    console.log(`✅ Monthly count validated: ${input.value} (range: ${min}-${max})`);
}

// Update date button styling based on enablement
function updateDateButtonStyling() {
    document.querySelectorAll('.date-select-btn').forEach(button => {
        const section = button.closest('.section');
        const serviceItem = button.closest('.service-item');
        
        let shouldEnable = false;
        
        if (serviceItem) {
            // Individual service button (Others category) - only check its own checkbox
            const serviceCheckbox = serviceItem.querySelector('.item-checkbox');
            shouldEnable = serviceCheckbox && serviceCheckbox.checked;
        } else {
            // Category-level button (Delivery, BCG, etc.) - check category selection
            const categoryToggle = section ? section.querySelector('.section-toggle') : null;
            const categoryCheckbox = section ? section.querySelector('.category-checkbox') : null;
            const isCategorySelected = (categoryToggle && categoryToggle.checked) || (categoryCheckbox && categoryCheckbox.checked);
            
            // For category buttons, also check if any items in category are selected
            const hasSelectedItems = section ? section.querySelectorAll('.item-checkbox:checked').length > 0 : false;
            
            shouldEnable = isCategorySelected || hasSelectedItems;
        }
        
        if (shouldEnable) {
            button.classList.remove('btn-disabled');
            button.classList.add('btn-enabled');
        } else {
            button.classList.add('btn-disabled');
            button.classList.remove('btn-enabled');
        }
    });
}

// Update all date button texts across all categories
function updateAllDateButtonTexts() {
    if (!workCodesConfig) return;
    
    Object.entries(workCodesConfig.categories).forEach(([categoryKey, categoryConfig]) => {
        // Update category-level button text (for fixed_bundle, single_item, amount_based)
        if (categoryConfig.type !== 'individual_selection') {
            updateDateButtonText(categoryKey);
        } else {
            // Update individual service button texts (for individual_selection)
            categoryConfig.codes.forEach(code => {
                const isMonthlyWork = categoryKey === 'MONTHLY_PACKAGE' || categoryKey === 'STATE_PACKAGE';
                if (!isMonthlyWork) {
                    updateDateButtonText(categoryKey, code.code);
                }
            });
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
    
    // Set up periodic date button styling and text updates
    setTimeout(() => {
        updateDateButtonStyling();
        updateAllDateButtonTexts();
    }, 1000);
});
 