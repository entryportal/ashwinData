// Dynamic Work Data Entry System - Configuration Driven
// Loads WorkCodes.json and generates UI dynamically

// Global configuration and state
let workCodesConfig = null;
let deliveryDateCounter = 0;
let bcgDateCounter = 0;
let serviceDateCounters = {};
let allCategories = [];

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
    
    // Set default dates
    setTimeout(() => {
        const today = getTodayDate();
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.value) {
                input.value = today;
            }
        });
    }, 100);
}

// Generate individual category section HTML
function generateCategorySection(categoryKey, categoryConfig) {
    const sectionId = categoryKey.toLowerCase();
    const icon = getCategoryIcon(categoryKey);
    
    let html = `
        <div id="${sectionId}Section" class="section" data-category="${categoryKey}">
            <div class="section-header">
                <input type="checkbox" id="${sectionId}Toggle" class="section-toggle" onchange="toggleSection('${sectionId}')">
                <div class="section-title">${icon} ${categoryConfig.name}</div>
    `;
    
    // Add category-specific controls
    if (categoryConfig.type === 'fixed_bundle' || categoryConfig.type === 'single_item') {
        // Multiple dates supported for DELIVERY and BCG
        html += `<button type="button" class="btn btn-secondary" onclick="add${categoryKey}Date()" style="margin-left: auto;">➕ Add Date</button>`;
    } else if (categoryConfig.type === 'amount_based') {
        // Single date for TIKAKARAN
        html += `
            <div class="section-date">
                <label>Date: <input type="date" id="${sectionId}Date" class="date-input"></label>
            </div>
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
                <div class="item-row" data-search="${code.code.toLowerCase()} ${code.description.toLowerCase()} ${code.amount}">
                    <input type="checkbox" class="item-checkbox" id="${sectionId}_${code.code}">
                    <div class="item-info">
                        <span class="item-code">${code.code}</span> - 
                        <span class="item-amount">₹${code.amount}</span> - 
                        <span class="item-description">${code.description}</span>
                    </div>
                    <label>Count: <input type="number" class="count-input" id="count_${code.code}" value="1" min="1"></label>
                </div>
            `;
        });
    } else if (categoryConfig.type === 'individual_selection') {
        html += `<p><strong>Select ${categoryConfig.name.toLowerCase()} (each service can have multiple dates):</strong></p>`;
        categoryConfig.codes.forEach(code => {
            html += `
                <div class="service-item" id="service_${code.code}" data-search="${code.code.toLowerCase()} ${code.description.toLowerCase()} ${code.amount}">
                    <div class="item-row">
                        <input type="checkbox" class="item-checkbox" id="${sectionId}_${code.code}" onchange="toggleServiceDates('${code.code}')">
                        <div class="item-info">
                            <span class="item-code">${code.code}</span> - 
                            <span class="item-amount">₹${code.amount}</span> - 
                            <span class="item-description">${code.description}</span>
                        </div>
                        <button type="button" class="btn btn-secondary" onclick="addServiceDate('${code.code}')" style="margin-left: auto;">➕ Add Date</button>
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

// Dynamic date addition functions
function addDELIVERYDate() {
    addCategoryDate('delivery', 'deliveryDates', 'delivery_date_', 'delivery_count_', ++deliveryDateCounter);
}

function addBCGDate() {
    addCategoryDate('bcg', 'bcgDates', 'bcg_date_', 'bcg_count_', ++bcgDateCounter);
}

function addCategoryDate(categoryName, containerId, datePrefix, countPrefix, counter) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const dateId = datePrefix + counter;
    const countId = countPrefix + counter;
    
    const dateEntry = document.createElement('div');
    dateEntry.className = 'date-entry';
    dateEntry.innerHTML = `
        <div class="date-entry-controls">
            <label>Date: <input type="date" id="${dateId}" class="date-input"></label>
            <label>Count: <input type="number" id="${countId}" class="count-input" value="1" min="1"></label>
        </div>
        <button type="button" class="remove-date-btn" onclick="removeDateEntry(this.parentElement)">✕ Remove</button>
    `;
    
    container.appendChild(dateEntry);
    document.getElementById(dateId).value = getTodayDate();
}

// Add service-specific dates
function addServiceDate(serviceCode) {
    const container = document.getElementById('dates_' + serviceCode);
    if (!container) return;
    
    if (!serviceDateCounters[serviceCode]) {
        serviceDateCounters[serviceCode] = 0;
    }
    
    const dateId = 'service_date_' + serviceCode + '_' + (++serviceDateCounters[serviceCode]);
    const countId = 'service_count_' + serviceCode + '_' + serviceDateCounters[serviceCode];
    
    const dateEntry = document.createElement('div');
    dateEntry.className = 'date-entry';
    dateEntry.innerHTML = `
        <div class="date-entry-controls">
            <label>Date: <input type="date" id="${dateId}" class="date-input"></label>
            <label>Count: <input type="number" id="${countId}" class="count-input" value="1" min="1"></label>
        </div>
        <button type="button" class="remove-date-btn" onclick="removeDateEntry(this.parentElement)">✕ Remove</button>
    `;
    
    container.appendChild(dateEntry);
    document.getElementById(dateId).value = getTodayDate();
}

// Utility functions
function toggleSection(sectionName) {
    const section = document.getElementById(sectionName + 'Section');
    const toggle = document.getElementById(sectionName + 'Toggle');
    
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
    dateEntry.remove();
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
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
    
    // Process each category dynamically
    Object.entries(workCodesConfig.categories).forEach(([categoryKey, categoryConfig]) => {
        const sectionId = categoryKey.toLowerCase();
        const toggle = document.getElementById(sectionId + 'Toggle');
        
        if (toggle && toggle.checked) {
            if (categoryConfig.type === 'fixed_bundle' || categoryConfig.type === 'single_item') {
                // Multiple dates approach
                const datesContainer = document.getElementById(sectionId + 'Dates');
                if (datesContainer) {
                    const dateEntries = datesContainer.querySelectorAll('.date-entry');
                    dateEntries.forEach(entry => {
                        const dateInput = entry.querySelector('input[type="date"]');
                        const countInput = entry.querySelector('input[type="number"]');
                        
                        if (dateInput && dateInput.value) {
                            data.workData.push({
                                category: categoryKey,
                                date: dateInput.value,
                                count: parseInt(countInput.value) || 1,
                                type: categoryConfig.type
                            });
                        }
                    });
                }
            } else if (categoryConfig.type === 'amount_based') {
                // Single date approach
                const dateInput = document.getElementById(sectionId + 'Date');
                if (dateInput && dateInput.value) {
                    categoryConfig.codes.forEach(code => {
                        const checkbox = document.getElementById(sectionId + '_' + code.code);
                        if (checkbox && checkbox.checked) {
                            const countInput = document.getElementById('count_' + code.code);
                            data.workData.push({
                                category: categoryKey,
                                code: code.code,
                                date: dateInput.value,
                                count: parseInt(countInput.value) || 1,
                                type: "individual"
                            });
                        }
                    });
                }
            } else if (categoryConfig.type === 'individual_selection') {
                // Individual service dates
                categoryConfig.codes.forEach(code => {
                    const checkbox = document.getElementById(sectionId + '_' + code.code);
                    if (checkbox && checkbox.checked) {
                        const serviceDates = document.getElementById('dates_' + code.code);
                        if (serviceDates) {
                            const dateEntries = serviceDates.querySelectorAll('.date-entry');
                            dateEntries.forEach(entry => {
                                const dateInput = entry.querySelector('input[type="date"]');
                                const countInput = entry.querySelector('input[type="number"]');
                                
                                if (dateInput && dateInput.value) {
                                    data.workData.push({
                                        category: categoryKey,
                                        code: code.code,
                                        date: dateInput.value,
                                        count: parseInt(countInput.value) || 1,
                                        type: "individual"
                                    });
                                }
                            });
                        }
                    }
                });
            }
        }
    });
    
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
        const formattedDate = formatDate(item.date);
        const categoryConfig = workCodesConfig.categories[item.category];
        
        if (categoryConfig.type === 'fixed_bundle') {
            // Add all category tasks
            for (let i = 0; i < item.count; i++) {
                categoryConfig.codes.forEach(code => {
                    entries.push(`${code.code} 1 ${formattedDate} ${formattedDate}`);
                });
            }
        } else if (categoryConfig.type === 'single_item') {
            // Add single task with count
            for (let i = 0; i < item.count; i++) {
                categoryConfig.codes.forEach(code => {
                    entries.push(`${code.code} 1 ${formattedDate} ${formattedDate}`);
                });
            }
        } else {
            // Add individual tasks
            entries.push(`${item.code} ${item.count} ${formattedDate} ${formattedDate}`);
        }
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing dynamic work data entry system...');
    loadWorkCodesConfiguration();
});
