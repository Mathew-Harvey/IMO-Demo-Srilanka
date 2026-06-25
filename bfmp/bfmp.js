document.addEventListener('DOMContentLoaded', () => {
    const generatorContent = document.querySelector('.generator-content');
    if (!generatorContent) {
        console.error('Standalone BFMP generator container not found');
        return;
    }
    generatorContent.style.display = 'block';
    initBiofoulingPlanGenerator(generatorContent);
});

function initBiofoulingPlanGenerator(container) {
    const tabButtons = Array.from(container.querySelectorAll('.tab-btn'));
    const tabPanes = Array.from(container.querySelectorAll('.tab-pane'));
    const progressSteps = Array.from(container.querySelectorAll('.progress-step'));

    const previewButton = container.querySelector('#preview-plan');
    const generateButton = container.querySelector('#generate-plan');
    const planPreviewContainer = document.getElementById('plan-preview-container');
    const planPreviewModal = document.getElementById('plan-preview-modal');
    const closePreviewButton = document.getElementById('close-preview');
    const printPlanButton = document.getElementById('print-plan');
    const modalCloseButton = planPreviewModal?.querySelector('.modal-close');

    const disablePdfDownload = true;

    function activateTab(tabId) {
        tabButtons.forEach(btn => {
            const isActive = btn.dataset.tab === tabId;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
        });
        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === tabId);
        });
        updateProgressIndicator();
    }

    function updateProgressIndicator() {
        const activeTab = container.querySelector('.tab-btn.active');
        const activeIndex = tabButtons.indexOf(activeTab) + 1;
        progressSteps.forEach(step => {
            const stepIndex = Number(step.dataset.step);
            step.classList.toggle('active', stepIndex === activeIndex);
            step.classList.toggle('completed', stepIndex < activeIndex);
        });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });

    container.querySelectorAll('.next-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const nextTabId = btn.dataset.next;
            if (nextTabId) activateTab(nextTabId);
        });
    });

    container.querySelectorAll('.prev-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const prevTabId = btn.dataset.prev;
            if (prevTabId) activateTab(prevTabId);
        });
    });

    setupFileUploadPreview('diagramFiles', 'diagrams-preview');
    setupFileUploadPreview('coverPhoto', 'cover-preview');
    setupFileUploadPreview('companyLogo', 'logo-preview');

    setupDynamicSection('#add-afc', '#afc-container', '.afc-item', 'afc', updateAfcIds);
    setupDynamicSection('#add-mgps', '#mgps-container', '.mgps-item', 'mgps', updateMgpsIds);
    
    // Populate example text in fields
    populateExampleText();

    if (disablePdfDownload && generateButton) {
        generateButton.style.display = 'none';
        generateButton.setAttribute('aria-hidden', 'true');
    }

    if (previewButton && planPreviewContainer && planPreviewModal) {
        previewButton.addEventListener('click', () => {
            try {
                const accumulatedData = collectPlanData();
                if (!accumulatedData) return;

                const loadingIndicator = showLoadingIndicator('Generating preview...');
                setTimeout(() => {
                    try {
                        planPreviewContainer.innerHTML = generatePlanHtml(accumulatedData);
                        planPreviewModal.classList.add('active');
                    } finally {
                        hideLoadingIndicator(loadingIndicator);
                    }
                }, 250);
            } catch (error) {
                console.error('Error building preview', error);
                alert('Something went wrong while generating the preview. Please try again.');
            }
        });
    }

    if (closePreviewButton) {
        closePreviewButton.addEventListener('click', () => closeModal(planPreviewModal));
    }

    if (modalCloseButton) {
        modalCloseButton.addEventListener('click', () => closeModal(planPreviewModal));
    }

    if (planPreviewModal) {
        planPreviewModal.addEventListener('click', event => {
            if (event.target === planPreviewModal) closeModal(planPreviewModal);
        });
    }

    if (printPlanButton && planPreviewContainer) {
        printPlanButton.addEventListener('click', async () => {
            if (!planPreviewContainer.innerHTML.trim()) {
                alert('Generate a preview before printing.');
                return;
            }
            await openPrintWindow(planPreviewContainer.innerHTML);
        });
    }

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && planPreviewModal?.classList.contains('active')) {
            closeModal(planPreviewModal);
        }
    });

    activateTab(tabButtons[0]?.dataset.tab || 'vessel-details');
}

function populateExampleText() {
    const examples = {
        'tradingRoutes': "Primary operations in Sri Lankan and regional waters, ports including [EDIT: Colombo, Galle, Hambantota, Trincomalee]. Occasional transits to Indian Ocean and Bay of Bengal destinations. Regular trading routes include [EDIT: Colombo–Singapore, Colombo–Dubai].",
        'climateZones': "Tropical waters (Indian Ocean, Bay of Bengal), monsoon-influenced conditions. Water temperatures ranging from [EDIT: 26°C to 30°C] year-round in coastal Sri Lanka waters.",
        'layupProcedures': "For idle periods exceeding 30 days, MGPS to be operated daily for minimum [EDIT: 2 hours]. Underwater inspection to be conducted prior to extended layup and within 7 days of resuming operations. Consider in-water cleaning if idle period exceeds [EDIT: 60 days] in tropical waters.",
        'speedRestrictions': "Vessel operates at reduced speeds during port manoeuvres (typically [EDIT: 6-12 knots]). Extended periods at anchor in [EDIT: Colombo anchorage]. Slow steaming practiced for fuel efficiency on long transits.",
        'nicheAreaDescription': "Sea chests: [EDIT: Two main engine cooling water sea chests, dimensions approximately 1.2m x 0.8m, protected by bronze gratings]. Bow thruster: [EDIT: Single tunnel thruster, 1.5m diameter, 8m length]. Propellers: [EDIT: Twin controllable pitch propellers, 5-blade, 3.2m diameter]. Rudders: [EDIT: Semi-balanced rudders with stock, approximate area 12 m²]. All major niche areas accessible during drydocking.",
        'unprotectedAreas': "Propeller blades (bare bronze, polished during drydock). Shaft struts and brackets (limited coating application due to geometry). Internal surfaces of thruster tunnels (difficult access, partial coating coverage). Transducer faces (uncoated as per manufacturer requirements). Anode surfaces (uncoated by design).",
        'internalSystemsDescription': "Main engine cooling: [EDIT: Two independent circuits, approximately 150m total piping length, protected by MGPS]. Auxiliary cooling: [EDIT: Single circuit, 80m piping, MGPS protected]. Fire fighting: [EDIT: Ring main system, 200m piping, no MGPS]. All systems have primary filtration at sea chest entry.",
        'afcLocations1': "Applied to flat bottom, vertical sides, bow and stern sections. Boot-top area with separate tie coat. Not applied to propellers, shaft brackets, or transducer faces. Niche areas including sea chest gratings, rudder surfaces, and thruster tunnel entries.",
        'afcSuitableProfile1': "Designed for vessels operating at speeds of [EDIT: 10-25 knots]. Suitable for tropical waters. Effective with idle periods up to [EDIT: 30 days]. Performance optimized for continuous operation with minimal stationary periods.",
        'afcMaintenance1': "Visual inspection during each underwater hull inspection. Touch-up repairs using approved products as required for damage areas. Light mechanical cleaning (soft brush/sponge) acceptable if biofouling accumulation observed. Recoating interval: [EDIT: 60 months] or at next scheduled drydocking.",
        'afcSpecialConsiderations1': "Application requires surface preparation to SA 2.5 standard. Minimum surface temperature [EDIT: 10°C], maximum relative humidity [EDIT: 85%] during application. Not suitable for in-water cleaning using high-pressure systems.",
        'mgpsLocations1': "System installed in [EDIT: port and starboard sea chests]. Protects main engine cooling system, auxiliary engine cooling, and HVAC seawater circuits. Control panels located in [EDIT: engine room].",
        'mgpsOperatingParameters1': "Operating voltage: [EDIT: 24V DC]. Current output: [EDIT: 0-10A adjustable]. Normal operating current: [EDIT: 6A]. Runtime: Continuous operation when seawater systems in use.",
        'mgpsMaintenance1': "Daily: Check system operation, verify indicator lights showing green/normal. Weekly: Record anode current readings, check for alarms. Monthly: Inspect anode condition, check electrical connections. Annually: Replace anodes if consumed below [EDIT: 30%] original size.",
        'inspectionDaily': "Check MGPS operation lights and current readings. Verify no MGPS alarms. Visual inspection of accessible deck drains and scuppers for marine growth. Record in ship's log. Responsibility: [EDIT: Engineering Officer of the Watch].",
        'inspectionWeekly': "Detailed MGPS performance check including anode current readings and water flow verification. Visual inspection of sea chest gratings (if accessible). Record in MGPS log and Biofouling Record Book. Responsibility: [EDIT: Chief Engineer].",
        'inspectionMonthly': "Inspection of internal seawater systems including sea chest chambers (if safe access available). Monitor cooling system pressures and temperatures. Review MGPS performance data. Document findings in Biofouling Record Book.",
        'inspectionQuarterly': "Detailed inspection of all accessible niche areas. Check floating equipment (fenders, mooring lines) for fouling. Photograph any biofouling observed. Report findings to [EDIT: Fleet Manager].",
        'inspectionAnnual': "Comprehensive underwater inspection (UWILD) or drydock inspection of all hull and niche areas. Full photographic survey. Assessment against biosecurity cleaning levels. Written report with recommendations.",
        'inspectionPreArrival': "Prior to arrival in ports with strict biosecurity requirements, review vessel biofouling history. Confirm last inspection date and results. Verify MGPS operational throughout voyage. Report invasive species sightings to MEPA as required.",
        'uwildProcedure': "UWILD conducted by qualified commercial divers with underwater photography/video equipment. Inspection covers hull (100% coverage), propellers, rudders, sea chest gratings, thruster tunnels, and all underwater appendages. Written report provided within [EDIT: 48 hours].",
        'uwildContractors': "[EDIT: Company Name], Contact: [EDIT: name, phone, email]. Services available in [EDIT: Colombo, Galle]. All contractors must hold appropriate diving certifications and liability insurance.",
        'cleaningHullSchedule': "Routine cleaning not required if biofouling remains at acceptable levels (slime layer only). Trigger for cleaning: UWILD report indicates biofouling rating above [EDIT: Level 2]. Extended idle period exceeding [EDIT: 60 days in tropical waters].",
        'cleaningNicheSchedule': "Sea chest gratings: cleaned during each drydock, or in-water if heavy fouling observed. Thruster tunnels: inspected annually, cleaned if biofouling present. Propellers: polished during each drydock.",
        'cleaningInternalSchedule': "Sea chests: physical cleaning during drydock. Cooling systems: MGPS provides continuous protection. Strainers: cleaned weekly or as required.",
        'cleaningMethods': "Approved methods: Soft brush/sponge (manual), grooming (light mechanical with soft pads), polishing (propellers only). NOT approved: High-pressure water blasting, abrasive pads, scrapers on coated surfaces.",
        'riskParameters': "Extended port stays (>30 days). Operating in warm tropical waters (>25°C). Reduced speed operations (<10 knots for extended periods). MGPS failure or degraded performance. Extended idle periods at anchor.",
        'deviationLimits': "Port stay exceeding [EDIT: 45 days]. Idle at anchor exceeding [EDIT: 21 days]. MGPS offline for more than [EDIT: 7 days]. Fuel consumption increase >5% compared to baseline.",
        'contingencyActions': "Immediate: Report deviation to [EDIT: Fleet Manager/Master]. Short-term: Arrange UWILD inspection within [EDIT: 14 days]. Plan for in-water cleaning if biofouling confirmed. Medium-term: Conduct in-water cleaning if required.",
        'longTermActions': "Review anti-fouling coating selection and performance. Consider alternative coating systems at next drydock. Upgrade or install additional MGPS capacity. Revise BFMP based on lessons learned.",
        'wasteManagement': "All biofouling material removed during cleaning to be captured and contained. No discharge of biofouling waste into water. Disposal in accordance with MARPOL Annex V and local port regulations including MEPA requirements.",
        'wasteContainment': "Containment curtains deployed around cleaning area. Vacuum collection systems used for removal. Soft brushes and sponges used to minimize material dispersal.",
        'safetyProcedures': "Lockout/tagout: All shafts, propellers, thrusters, rudders isolated before in-water work. Confined space entry per ship's procedures. Diving operations: Dive plan prepared and approved. Safety diver on standby.",
        'safetyEquipment': "PPE: Gloves, safety glasses, respirators, protective coveralls. Confined space: Gas detector, ventilation fan, communication equipment. Diving: Full diving equipment per operation requirements, emergency oxygen.",
        'emergencyProcedures': "Medical emergency: Cease operations immediately. Administer first aid. Diving emergency: Execute emergency ascent procedures. Contact numbers: Emergency [EDIT: 119], Port Control [EDIT: number], Company [EDIT: number].",
        'crewTraining': "All crew involved in biofouling management to receive initial training on this BFMP within [EDIT: 1 month] of joining vessel. Training includes review of this BFMP, biosecurity risks, inspection techniques, and record keeping.",
        'trainingTopics': "Understanding biofouling and invasive aquatic species risks. IMO MEPC.207(62) guidelines overview. Sri Lanka MEPA reporting requirements. Identification of biofouling. Inspection procedures and schedules. Record keeping in Biofouling Record Book.",
        'reportingProcedures': "All biofouling-related activities recorded in Biofouling Record Book by [EDIT: Chief Officer]. Significant issues reported immediately to Master. Master notifies [EDIT: Fleet Manager] of MGPS failures, significant biofouling, extended idle periods.",
        'externalReporting': "Sri Lanka: Report invasive marine species sightings to MEPA (mepa.gov.lk). Australia: Complete MARS declaration at least 48 hours prior to arrival. New Zealand: Complete MPI pre-arrival biosecurity declaration.",
        'documentRetention': "BFMP and Biofouling Record Book maintained onboard at all times. Records retained for vessel's operational life or minimum [EDIT: 5 years]. Digital backup copies maintained by [EDIT: Fleet Manager] at shore office.",
        'keyContacts': "BFMP Coordinator (Onboard): [EDIT: Chief Officer, email, phone]. Fleet Manager: [EDIT: name, email, phone]. UWILD Contractor: [EDIT: company, contact, phone]. MEPA: mepa.gov.lk. Emergency Contact: [EDIT: 24/7 number]."
    };

    for (const [id, text] of Object.entries(examples)) {
        const element = document.getElementById(id);
        if (element && element.value === '') {
            element.value = text;
        }
    }
}

function setupFileUploadPreview(inputId, previewId) {
    const fileInput = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewId);
    if (!fileInput || !previewContainer) return;

    fileInput.addEventListener('change', event => {
        const files = Array.from(event.target.files || []);
        previewContainer.innerHTML = '';
        if (files.length === 0) return;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = e => {
                const wrapper = document.createElement('div');
                wrapper.className = previewContainer.classList.contains('photos-preview') ? 'photo-preview' : '';

                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = previewContainer.classList.contains('photos-preview') ? 'preview-img' : 'cover-preview-img';
                    img.alt = file.name;
                    wrapper.appendChild(img);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.textContent = file.name;
                    placeholder.className = 'placeholder-text';
                    wrapper.appendChild(placeholder);
                }

                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'photo-delete-btn';
                removeButton.innerHTML = '<i class="fas fa-times"></i>';
                removeButton.addEventListener('click', () => {
                    wrapper.remove();
                    fileInput.value = '';
                });

                if (previewContainer.classList.contains('photos-preview')) {
                    wrapper.appendChild(removeButton);
                    previewContainer.appendChild(wrapper);
                } else {
                    previewContainer.innerHTML = '';
                    previewContainer.appendChild(wrapper);
                }
            };
            reader.readAsDataURL(file);
        });
    });
}

function setupDynamicSection(addButtonSelector, containerSelector, itemSelector, prefix, updateFn) {
    const addButton = document.querySelector(addButtonSelector);
    const container = document.querySelector(containerSelector);
    if (!addButton || !container) return;

    addButton.addEventListener('click', () => {
        const firstItem = container.querySelector(itemSelector);
        if (!firstItem) return;

        const clone = firstItem.cloneNode(true);
        clone.querySelectorAll('input, select, textarea').forEach(field => {
            if (field.tagName === 'SELECT') {
                field.selectedIndex = 0;
            } else {
                field.value = '';
            }
        });
        const removeButton = clone.querySelector(`.remove-${prefix}`);
        if (removeButton) {
            removeButton.style.display = 'inline-flex';
        }
        container.appendChild(clone);
        updateFn(container);
    });

    container.addEventListener('click', event => {
        const target = event.target.closest(`.remove-${prefix}`);
        if (!target) return;
        const item = target.closest(itemSelector);
        if (!item) return;
        if (container.querySelectorAll(itemSelector).length === 1) return;
        item.remove();
        updateFn(container);
    });

    updateFn(container);
}

function updateAfcIds(container) {
    const afcItems = Array.from(container.querySelectorAll('.afc-item'));
    afcItems.forEach((item, index) => {
        const id = index + 1;
        item.dataset.afcId = String(id);
        item.querySelectorAll('label').forEach(label => {
            const forValue = label.getAttribute('for');
            if (forValue) label.setAttribute('for', forValue.replace(/\d+$/, String(id)));
        });
        item.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.tagName === 'LABEL') {
                return;
            } else {
                const newId = el.id.replace(/\d+$/, String(id));
                el.id = newId;
                if (el.name) el.name = el.name.replace(/\d+$/, String(id));
            }
        });
        const removeButton = item.querySelector('.remove-afc');
        if (removeButton) {
            removeButton.style.display = afcItems.length > 1 ? 'inline-flex' : 'none';
        }
    });
}

function updateMgpsIds(container) {
    const mgpsItems = Array.from(container.querySelectorAll('.mgps-item'));
    mgpsItems.forEach((item, index) => {
        const id = index + 1;
        item.dataset.mgpsId = String(id);
        item.querySelectorAll('label').forEach(label => {
            const forValue = label.getAttribute('for');
            if (forValue) label.setAttribute('for', forValue.replace(/\d+$/, String(id)));
        });
        item.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.tagName === 'LABEL') {
                return;
            } else {
                const newId = el.id.replace(/\d+$/, String(id));
                el.id = newId;
                if (el.name) el.name = el.name.replace(/\d+$/, String(id));
            }
        });
        const removeButton = item.querySelector('.remove-mgps');
        if (removeButton) {
            removeButton.style.display = mgpsItems.length > 1 ? 'inline-flex' : 'none';
        }
    });
}

function collectPlanData() {
    const data = {
        vessel: {
            name: getValue('vesselName'),
            imo: getValue('imoNumber'),
            callSign: getValue('callSign'),
            officialNumber: getValue('officialNumber'),
            constructionDate: getValue('constructionDate'),
            portOfRegistry: getValue('portOfRegistry'),
            type: getValue('vesselType'),
            vesselClass: getValue('vesselClass'),
            grossTonnage: getValue('grossTonnage'),
            netTonnage: getValue('netTonnage'),
            deadweight: getValue('deadweight'),
            beam: getValue('beam'),
            length: getValue('length'),
            lengthBP: getValue('lengthBP'),
            maxDraft: getValue('maxDraft'),
            minDraft: getValue('minDraft'),
            flag: getValue('flag'),
            classificationSociety: getValue('classificationSociety')
        },
        owner: {
            name: getValue('ownerName'),
            address: getValue('ownerAddress'),
            operatorName: getValue('operatorName'),
            operatorContact: getValue('operatorContact'),
            masterName: getValue('masterName'),
            emergencyContact: getValue('emergencyContact')
        },
        revision: {
            lastDrydock: getValue('lastDrydock'),
            nextDrydock: getValue('nextDrydock'),
            number: getValue('revisionNumber'),
            date: getValue('revisionDate'),
            responsiblePerson: getValue('responsiblePerson'),
            responsiblePosition: getValue('responsiblePosition')
        },
        operatingProfile: {
            speed: getValue('operatingSpeed'),
            maxSpeed: getValue('maxSpeed'),
            minSpeed: getValue('minSpeed'),
            inServicePeriod: getValue('inServicePeriod'),
            drydockInterval: getValue('drydockInterval'),
            annualOperatingDays: getValue('annualOperatingDays'),
            tradingRoutes: getValue('tradingRoutes'),
            operatingArea: getValue('operatingArea'),
            climateZones: getValue('climateZones'),
            seasonalOperations: getValue('seasonalOperations'),
            averageIdlePeriod: getValue('averageIdlePeriod'),
            maxIdlePeriod: getValue('maxIdlePeriod'),
            layupProcedures: getValue('layupProcedures'),
            speedRestrictions: getValue('speedRestrictions'),
            afsSuitability: getValue('afsSuitability'),
            afsSuitabilityNotes: getValue('afsSuitabilityNotes')
        },
        nicheAreas: {
            selected: getCheckedCheckboxes('.niche-checkbox'),
            internalSystems: getCheckedCheckboxes('[id^="internal_"]'),
            description: getValue('nicheAreaDescription'),
            unprotectedAreas: getValue('unprotectedAreas'),
            internalSystemsDescription: getValue('internalSystemsDescription'),
            diagrams: getFileDataUrls('diagramFiles')
        },
        afc: collectDynamicData('.afc-item', 'afc', [
            'ProductName',
            'Manufacturer',
            'Type',
            'ServiceLife',
            'ApplicationDate',
            'DrydockLocation',
            'PrimerName',
            'PrimerCoats',
            'Tiecoat',
            'Topcoats',
            'Thickness',
            'Color',
            'Locations',
            'SuitableProfile',
            'Maintenance',
            'SpecialConsiderations'
        ]),
        iafs: {
            number: getValue('iafsNumber'),
            issueDate: getValue('iafsIssueDate'),
            file: getFileDataUrl('iafsFile')
        },
        mgps: collectDynamicData('.mgps-item', 'mgps', [
            'Manufacturer',
            'Model',
            'Type',
            'ServiceLife',
            'InstallDate',
            'LastService',
            'OperationalStatus',
            'MaintenanceInterval',
            'Locations',
            'OperatingParameters',
            'Maintenance',
            'Manual',
            'ManualLocation'
        ]),
        afsInstallation: getValue('afsInstallation'),
        inspections: {
            daily: getValue('inspectionDaily'),
            weekly: getValue('inspectionWeekly'),
            monthly: getValue('inspectionMonthly'),
            quarterly: getValue('inspectionQuarterly'),
            annual: getValue('inspectionAnnual'),
            preArrival: getValue('inspectionPreArrival')
        },
        uwild: {
            frequency: getValue('uwildFrequency'),
            lastDate: getValue('uwildLastDate'),
            procedure: getValue('uwildProcedure'),
            contractors: getValue('uwildContractors')
        },
        cleaning: {
            hullSchedule: getValue('cleaningHullSchedule'),
            nicheSchedule: getValue('cleaningNicheSchedule'),
            internalSchedule: getValue('cleaningInternalSchedule'),
            methods: getValue('cleaningMethods'),
            contractors: getValue('cleaningContractors'),
            restrictions: getValue('cleaningRestrictions')
        },
        riskManagement: {
            parameters: getValue('riskParameters'),
            deviationLimits: getValue('deviationLimits'),
            contingencyActions: getValue('contingencyActions'),
            longTermActions: getValue('longTermActions')
        },
        procedures: {
            wasteManagement: getValue('wasteManagement'),
            wasteContainment: getValue('wasteContainment'),
            safetyProcedures: getValue('safetyProcedures'),
            safetyEquipment: getValue('safetyEquipment'),
            emergencyProcedures: getValue('emergencyProcedures')
        },
        training: {
            details: getValue('crewTraining'),
            topics: getValue('trainingTopics'),
            frequency: getValue('trainingFrequency'),
            provider: getValue('trainingProvider')
        },
        communication: {
            reportingProcedures: getValue('reportingProcedures'),
            externalReporting: getValue('externalReporting'),
            documentRetention: getValue('documentRetention'),
            keyContacts: getValue('keyContacts')
        },
        document: {
            title: getValue('planTitle'),
            number: getValue('documentNumber'),
            revision: getValue('documentRevision'),
            format: getValue('planFormat'),
            coverPhoto: getFileDataUrl('coverPhoto'),
            companyLogo: getFileDataUrl('companyLogo')
        }
    };

    const requiredStatus = validateRequiredFields();
    if (!requiredStatus.valid) {
        const proceed = confirm(`Some sections have missing recommended fields: ${requiredStatus.sections.join(', ')}. Continue and insert placeholders for missing information?`);
        if (!proceed) return null;
    }

    return data;
}

function getValue(id) {
    const element = document.getElementById(id);
    if (!element) return '';
    if (element.type === 'checkbox') return element.checked;
    return element.value;
}

function getFileDataUrl(id) {
    const input = document.getElementById(id);
    if (!input || !input.files || input.files.length === 0) return null;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) return null;
    try {
        return URL.createObjectURL(file);
    } catch {
        return null;
    }
}

function getFileDataUrls(id) {
    const previewContainerId = document.getElementById(id)?.getAttribute('data-preview');
    if (!previewContainerId) return [];
    const previewContainer = document.getElementById(previewContainerId);
    if (!previewContainer) return [];
    return Array.from(previewContainer.querySelectorAll('img.preview-img')).map(img => img.src);
}

function getCheckedCheckboxes(selector) {
    return Array.from(document.querySelectorAll(selector))
        .filter(cb => cb.checked)
        .map(cb => cb.value);
}

function collectDynamicData(selector, prefix, fields) {
    return Array.from(document.querySelectorAll(selector)).map(item => {
        const datasetId = item.dataset[`${prefix}Id`];
        return fields.reduce((acc, field) => {
            const key = field.charAt(0).toLowerCase() + field.slice(1);
            acc[key] = getValue(`${prefix}${field}${datasetId}`);
            return acc;
        }, {});
    });
}

function validateRequiredFields() {
    const sections = [
        { id: 'vessel-details', label: 'Vessel Details' },
        { id: 'operating-profile', label: 'Operating Profile' },
        { id: 'anti-fouling', label: 'Anti-fouling Systems' },
        { id: 'management', label: 'Management Procedures' },
        { id: 'generate', label: 'Generate Plan' }
    ];

    const missing = [];
    sections.forEach(section => {
        const pane = document.getElementById(section.id);
        if (!pane) return;
        const requiredFields = Array.from(pane.querySelectorAll('[required]'));
        const isMissing = requiredFields.some(field => {
            if (field.type === 'file') {
                return !field.files || field.files.length === 0;
            }
            return field.value.trim() === '';
        });
        if (isMissing) missing.push(section.label);
    });

    return { valid: missing.length === 0, sections: missing };
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = '';
}

async function openPrintWindow(htmlContent) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Pop-up blocked. Allow pop-ups to print or save the plan.');
        return;
    }
    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Biofouling Management Plan</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: Arial, sans-serif; color: #333; background: #fff; }
        .report-preview { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
        .report-header { border-bottom: 2px solid #ddd; margin-bottom: 12px; padding-bottom: 8px; }
        img { max-width: 100% !important; height: auto !important; }
        table { page-break-inside: avoid; border-collapse: collapse; width: 100%; }
        h2, h3 { page-break-after: avoid; }
        .diagram-image { page-break-inside: avoid; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background: #f8fafc; }
        ul { padding-left: 1.1rem; }
        .placeholder-text { color: #555; font-style: italic; }
    </style>
</head>
<body>${htmlContent}</body>
</html>`);
    printWindow.document.close();

    await new Promise(resolve => {
        const images = Array.from(printWindow.document.images);
        if (images.length === 0) return resolve();
        let remaining = images.length;
        images.forEach(img => {
            if (img.complete) {
                if (--remaining === 0) resolve();
            } else {
                img.onload = img.onerror = () => {
                    if (--remaining === 0) resolve();
                };
            }
        });
    });

    printWindow.focus();
    printWindow.print();
}

function showLoadingIndicator(message) {
    const indicator = document.createElement('div');
    indicator.className = 'loading-indicator';
    indicator.innerHTML = `<i class="fas fa-spinner"></i><span>${message}</span>`;
    document.body.appendChild(indicator);
    return indicator;
}

function hideLoadingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

function generatePlanHtml(data) {
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString();
    }

    function getFieldValueOrPlaceholder(value, placeholder) {
        if (value === undefined || value === null || value === '') {
            return `<span class="placeholder-text">${placeholder}</span>`;
        }
        return value;
    }

    const planFormat = data.document.format || 'Full Plan';
    const includeBFMP = planFormat === 'Full Plan' || planFormat === 'BFMP Only';
    const includeBFRB = planFormat === 'Full Plan' || planFormat === 'BFRB Only';

    const tocItems = [];
    if (includeBFMP) {
        tocItems.push(
            '<li><a href="#intro">1. Scope and Purpose</a></li>',
            '<li><a href="#vessel">2. Vessel Particulars</a></li>',
            '<li><a href="#revision">3. Record of Revision</a></li>',
            '<li><a href="#operating">4. Operating Profile</a></li>',
            '<li><a href="#niche">5. Hull and Niche Areas</a></li>',
            '<li><a href="#afs">6. Anti-fouling Systems (AFS)</a></li>',
            '<li><a href="#installation">7. Installation of Anti-fouling Systems</a></li>',
            '<li><a href="#inspection">8. Inspection Schedule</a></li>',
            '<li><a href="#cleaning">9. Cleaning Schedule</a></li>',
            '<li><a href="#monitoring">10. Monitoring of Biofouling Risk Parameters</a></li>',
            '<li><a href="#waste">11. Capture and Disposal of Waste</a></li>',
            '<li><a href="#safety">12. Safety Procedures</a></li>',
            '<li><a href="#training">13. Crew Training and Familiarisation</a></li>',
            '<li><a href="#communication">14. Communication and Reporting</a></li>',
            '<li><a href="#review">15. Review and Amendment</a></li>',
            '<li><a href="#glossary">16. Glossary of Terms</a></li>',
            '<li><a href="#references">17. References and Bibliography</a></li>'
        );
    }
    if (includeBFRB) {
        tocItems.push('<li><a href="#recordbook">Biofouling Record Book</a></li>');
    }

    const tocHtml = `
        <h2>Index</h2>
        <div class="toc">
            <ol>${tocItems.join('')}</ol>
        </div>
    `;

    let afcHtml = '';
    if (data.afc && data.afc.length > 0) {
        afcHtml = data.afc.map((afc, index) => `
            <div class="afs-section">
                <h4>Anti-fouling Coating ${index + 1}: ${afc.productName || 'Unspecified Coating'}</h4>
                <table class="details-table">
                    <tr>
                        <th>Product Name</th>
                        <td>${getFieldValueOrPlaceholder(afc.productName, 'Enter the specific anti-fouling coating product name as per manufacturer specification.')}</td>
                        <th>Manufacturer</th>
                        <td>${getFieldValueOrPlaceholder(afc.manufacturer, 'Specify the manufacturer of the anti-fouling coating system.')}</td>
                    </tr>
                    <tr>
                        <th>Type of AFC</th>
                        <td>${getFieldValueOrPlaceholder(afc.type, 'Indicate coating type (e.g., Self-Polishing Copolymer, Hard Coating, etc.)')}</td>
                        <th>Intended Service Life</th>
                        <td>${getFieldValueOrPlaceholder(afc.serviceLife, 'Specify expected service life in years based on manufacturer recommendations.')} ${afc.serviceLife ? 'years' : ''}</td>
                    </tr>
                    <tr>
                        <th>Locations Applied</th>
                        <td colspan="3">${getFieldValueOrPlaceholder(afc.locations, 'Identify specific areas of the vessel where this coating is applied (hull areas, niche areas, etc.)')}</td>
                    </tr>
                    <tr>
                        <th>Suitable Operating Profiles</th>
                        <td colspan="3">${getFieldValueOrPlaceholder(afc.suitableProfile, 'Document operating conditions for which this coating is suitable (speed, activity/inactivity periods).')}</td>
                    </tr>
                        <tr>
                            <th>Maintenance Regime</th>
                            <td colspan="3">${getFieldValueOrPlaceholder(afc.maintenance, 'Detail the recommended maintenance procedures and schedule for this coating system.')}</td>
                        </tr>
                </table>
            </div>
        `).join('');
    } else {
        afcHtml = `
            <div class="placeholder-section">
                <p>No anti-fouling coating information has been provided. Anti-fouling coatings are critical for managing biofouling accumulation on the vessel's hull and other wetted surfaces. Please add information about all anti-fouling systems used on the vessel including product names, manufacturers, types, service life, and application areas.</p>
            </div>
        `;
    }

    let mgpsHtml = '';
    if (data.mgps && data.mgps.length > 0) {
        mgpsHtml = data.mgps.map((mgps, index) => `
            <div class="mgps-section">
                <h4>Marine Growth Prevention System ${index + 1}: ${mgps.model || 'Unspecified System'}</h4>
                <table class="details-table">
                    <tr>
                        <th>Manufacturer</th>
                        <td>${getFieldValueOrPlaceholder(mgps.manufacturer, 'Enter the manufacturer of the MGPS system.')}</td>
                        <th>Model</th>
                        <td>${getFieldValueOrPlaceholder(mgps.model, 'Specify the model name/number of the MGPS.')}</td>
                    </tr>
                    <tr>
                        <th>Type of MGPS</th>
                        <td>${getFieldValueOrPlaceholder(mgps.type, 'Indicate the type of system (Anodic, Impressed Current, Ultrasonic, etc.)')}</td>
                        <th>Service Life</th>
                        <td>${getFieldValueOrPlaceholder(mgps.serviceLife, 'Specify expected service life in years.')} ${mgps.serviceLife ? 'years' : ''}</td>
                    </tr>
                    <tr>
                        <th>Locations Installed</th>
                        <td colspan="3">${getFieldValueOrPlaceholder(mgps.locations, 'Detail where this MGPS is installed on the vessel (sea chests, internal piping, etc.)')}</td>
                    </tr>
                    <tr>
                        <th>Operating Manual Available</th>
                        <td colspan="3">${getFieldValueOrPlaceholder(mgps.manual, 'Indicate if an operating manual is available and where it is kept.')}</td>
                    </tr>
                </table>
            </div>
        `).join('');
    } else {
        mgpsHtml = `
            <div class="placeholder-section">
                <p>No Marine Growth Prevention System (MGPS) information has been provided. MGPS are important for protecting internal seawater systems from biofouling. If your vessel has MGPS installed, please provide details including manufacturer, model, type, and installation locations.</p>
            </div>
        `;
    }

    let diagramsHtml = '';
    if (data.nicheAreas.diagrams && data.nicheAreas.diagrams.length > 0) {
        diagramsHtml = data.nicheAreas.diagrams.map((diagram, index) => `
            <div class="diagram-image">
                <img src="${diagram}" alt="Vessel Diagram ${index + 1}">
                <p><strong>Diagram ${index + 1}:</strong> Areas where biofouling is likely to accumulate.</p>
            </div>
        `).join('');
    } else {
        diagramsHtml = '<p class="placeholder-section">No diagrams provided. Diagrams of the vessel showing hull and niche areas should be inserted here. These diagrams are important for identifying high-risk areas for biofouling accumulation and for planning inspection and cleaning activities.</p>';
    }

    return `
        <div class="report-preview">
            ${data.document.coverPhoto ? `
            <div class="cover-page">
                <div class="cover-image"><img src="${data.document.coverPhoto}" alt="Cover Photo"></div>
                <div class="cover-meta">
                    <h1>${data.document.title || 'Biofouling Management Plan'}</h1>
                    <p><strong>Vessel:</strong> ${getFieldValueOrPlaceholder(data.vessel.name, 'Enter vessel name')}</p>
                    <p><strong>IMO:</strong> ${getFieldValueOrPlaceholder(data.vessel.imo, 'Enter IMO number')}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
            </div>
            <div class="page-break"></div>` : ''}
            <div class="report-header">
                <h1>${data.document.title || 'Biofouling Management Plan'}</h1>
                <p><strong>Document Number:</strong> ${getFieldValueOrPlaceholder(data.document.number, 'Enter a document identifier for reference')} <span class="rev-marker">Rev ${data.document.revision || '0'}</span></p>
                <p><strong>Vessel Name:</strong> ${getFieldValueOrPlaceholder(data.vessel.name, 'Enter vessel name')}</p>
                <p><strong>IMO Number:</strong> ${getFieldValueOrPlaceholder(data.vessel.imo, 'Enter IMO number')}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                ${data.document.companyLogo ? `<img src="${data.document.companyLogo}" alt="Company Logo" style="max-height: 60px; max-width: 200px; margin-top: 10px;">` : ''}
            </div>

            ${tocHtml}

            ${includeBFMP ? `
            <h2 id="intro">1. Scope and Purpose</h2>
            <div class="section">
                <h3>1.1 Background and Scope</h3>
                <p>Biofouling represents a significant vector for the transfer of invasive aquatic species. If not managed appropriately, biofouling on vessels has the potential to result in the establishment of invasive aquatic species which may pose threats to human, animal and plant life, economic and cultural activities, and the aquatic environment. Biofouling can also impose operational limitations and additional costs for vessel maintenance and operations.</p>
                <p>This Biofouling Management Plan has been developed to comply with the International Maritime Organization's Guidelines for the Control and Management of Ships' Biofouling to Minimise the Transfer of Invasive Aquatic Species (IMO Resolution MEPC.207(62)), Australian national guidelines based on the Biosecurity Act 2015, and other applicable international and national regulations.</p>
                <p>Biofouling is the accumulation of aquatic organisms such as microorganisms, plants, algae, and animals on surfaces and structures immersed in or exposed to the aquatic environment. Implementation of an effective biofouling management regime is critical for minimising the transfer of invasive aquatic species and reducing operational costs associated with increased hull resistance.</p>
                
                <h3>1.2 Vessel Applicability</h3>
                <p>This Biofouling Management Plan is specific and unique to the vessel ${getFieldValueOrPlaceholder(data.vessel.name, 'Vessel name must be entered in the Vessel Details section')}, IMO ${getFieldValueOrPlaceholder(data.vessel.imo, 'IMO number must be entered in the Vessel Details section')}, and has been prepared in accordance with IMO Resolution MEPC.207(62).</p>
                <p>This Plan is to be used in conjunction with the vessel's Biofouling Record Book, which documents all inspections and biofouling management measures undertaken on the vessel.</p>
                
                <h3>1.3 Safety and Training Considerations</h3>
                <p><strong>Safety Procedures:</strong> The vessel's safety procedures must be followed for all inspection and cleaning work, including:</p>
                <ul>
                    <li>Lockout/tagout of propulsion shafts, rudders, thrusters, trim tabs, and other rotating or moving equipment</li>
                    <li>Confined space entry procedures in accordance with vessel procedures and applicable regulations</li>
                    <li>Diving operations safety protocols for underwater inspection and cleaning activities</li>
                    <li>All relevant tag-out and permit-to-work procedures as specified in vessel standing orders</li>
                </ul>
                <p><strong>Personnel Qualifications:</strong> All personnel involved with in-water inspection and cleaning of biofouling must be:</p>
                <ul>
                    <li>Suitably qualified for underwater tasks or confined space entry as applicable</li>
                    <li>Trained in identifying biofouling and assessing biofouling levels</li>
                    <li>Familiar with this Biofouling Management Plan and associated procedures</li>
                    <li>Aware of biosecurity requirements and invasive species risks</li>
                </ul>
                <p><strong>Regulatory Compliance:</strong> In-water hull cleaning should only be conducted following approval from the port authority or other applicable regulatory authority, consistent with local and national in-water cleaning guidelines. Safety Data Sheets (SDS) must be obtained and held with the Biofouling Record Book for all chemicals used for cleaning or treatment of biofouling.</p>
                
                <h3>1.4 Plan Structure</h3>
                <p>This Biofouling Management Plan details:</p>
                <ul>
                    <li>Vessel particulars and operational profile</li>
                    <li>Description of hull and niche areas where biofouling is likely to accumulate</li>
                    <li>Anti-fouling systems installed on the vessel</li>
                    <li>Inspection and cleaning schedules and procedures</li>
                    <li>Risk monitoring and contingency planning</li>
                    <li>Waste disposal, safety procedures, and crew training requirements</li>
                    <li>Communication, reporting, and record-keeping procedures</li>
                </ul>
            </div>

            <h2 id="vessel">2. Vessel Particulars</h2>
            <div class="section">
                <table class="details-table">
                    <tr>
                        <th>Vessel Name</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.name, 'Enter the full name of the vessel')}</td>
                        <th>IMO Number</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.imo, 'Enter IMO number')}</td>
                    </tr>
                    <tr>
                        <th>Call Sign</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.callSign, 'Enter vessel call sign')}</td>
                        <th>Official Number</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.officialNumber, 'Enter official number if applicable')}</td>
                    </tr>
                    <tr>
                        <th>Date of Construction</th>
                        <td>${formatDate(data.vessel.constructionDate) === 'N/A' ? getFieldValueOrPlaceholder('', 'Enter date of construction') : formatDate(data.vessel.constructionDate)}</td>
                        <th>Port of Registry</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.portOfRegistry, 'Enter port of registry')}</td>
                    </tr>
                    <tr>
                        <th>Vessel Type</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.type, 'Enter vessel type')}</td>
                        <th>Vessel Class</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.vesselClass, 'Enter vessel class if applicable')}</td>
                    </tr>
                    <tr>
                        <th>Gross Tonnage</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.grossTonnage, 'Enter gross tonnage')}</td>
                        <th>Net Tonnage</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.netTonnage, 'Enter net tonnage if applicable')}</td>
                    </tr>
                    <tr>
                        <th>Deadweight Tonnage</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.deadweight, 'Enter DWT if applicable')}</td>
                        <th>Classification Society</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.classificationSociety, 'Enter classification society')}</td>
                    </tr>
                    <tr>
                        <th>Length Overall (m)</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.length, 'Enter LOA')}</td>
                        <th>Length BP (m)</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.lengthBP, 'Enter length between perpendiculars')}</td>
                    </tr>
                    <tr>
                        <th>Beam (m)</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.beam, 'Enter beam')}</td>
                        <th>Flag State</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.flag, 'Enter flag state')}</td>
                    </tr>
                    <tr>
                        <th>Maximum Draft (m)</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.maxDraft, 'Enter maximum draft')}</td>
                        <th>Minimum Draft (m)</th>
                        <td>${getFieldValueOrPlaceholder(data.vessel.minDraft, 'Enter minimum draft')}</td>
                    </tr>
                </table>
                
                <h3>2.1 Owner and Operator Information</h3>
                <table class="details-table">
                    <tr>
                        <th>Registered Owner</th>
                        <td colspan="3">${getFieldValueOrPlaceholder(data.owner.name, 'Enter registered owner name')}</td>
                    </tr>
                    <tr>
                        <th>Owner Address</th>
                        <td colspan="3">${getFieldValueOrPlaceholder(data.owner.address, 'Enter owner address')}</td>
                    </tr>
                    <tr>
                        <th>Operator/Manager</th>
                        <td>${getFieldValueOrPlaceholder(data.owner.operatorName, 'Enter operator name')}</td>
                        <th>Operator Contact</th>
                        <td>${getFieldValueOrPlaceholder(data.owner.operatorContact, 'Enter contact details')}</td>
                    </tr>
                    <tr>
                        <th>Master's Name</th>
                        <td>${getFieldValueOrPlaceholder(data.owner.masterName, 'Enter master name')}</td>
                        <th>Emergency Contact</th>
                        <td>${getFieldValueOrPlaceholder(data.owner.emergencyContact, 'Enter emergency contact')}</td>
                    </tr>
                </table>
            </div>

            <h2 id="revision">3. Record of Revision of the BFMP</h2>
            <div class="section">
                <table class="details-table">
                    <tr>
                        <th>Date of Last Dry-docking</th>
                        <td>${formatDate(data.revision.lastDrydock) === 'N/A' ? getFieldValueOrPlaceholder('', 'Enter the date of the vessel\'s most recent dry-dock.') : formatDate(data.revision.lastDrydock)}</td>
                        <th>Date of Next Scheduled Dry-docking</th>
                        <td>${formatDate(data.revision.nextDrydock) === 'N/A' ? getFieldValueOrPlaceholder('', 'Enter the date of the vessel\'s next planned dry-dock.') : formatDate(data.revision.nextDrydock)}</td>
                    </tr>
                    <tr>
                        <th>Revision Number</th>
                        <td>${getFieldValueOrPlaceholder(data.revision.number, 'Enter the BFMP revision identifier (e.g., Rev. 1).')}</td>
                        <th>Revision Date</th>
                        <td>${formatDate(data.revision.date) === 'N/A' ? getFieldValueOrPlaceholder('', 'Enter the date of this BFMP revision.') : formatDate(data.revision.date)}</td>
                    </tr>
                    <tr>
                        <th>Responsible Person</th>
                        <td>${getFieldValueOrPlaceholder(data.revision.responsiblePerson, 'Enter the name of the person responsible for BFMP implementation.')}</td>
                        <th>Position/Role</th>
                        <td>${getFieldValueOrPlaceholder(data.revision.responsiblePosition, 'Enter the role/position of the responsible person (e.g., Chief Officer).')}</td>
                    </tr>
                </table>
            </div>

            <h2 id="operating">4. Operating Profile</h2>
            <div class="section">
                <table class="details-table">
                    <tr>
                        <th>Typical Operating Speed</th>
                        <td>${getFieldValueOrPlaceholder(data.operatingProfile.speed, 'Enter the vessel\'s typical operating speed in knots.')} ${data.operatingProfile.speed ? 'knots' : ''}</td>
                        <th>In-service Period</th>
                        <td>${getFieldValueOrPlaceholder(data.operatingProfile.inServicePeriod, 'Enter the typical duration between dry-dockings in months.')} ${data.operatingProfile.inServicePeriod ? 'months' : ''}</td>
                    </tr>
                    <tr>
                        <th>Primary Operating Area</th>
                        <td>${getFieldValueOrPlaceholder(data.operatingProfile.operatingArea, 'Specify the primary geographical region(s) where the vessel operates.')}</td>
                        <th>AFS Suitable for Operating Profile</th>
                        <td>${getFieldValueOrPlaceholder(data.operatingProfile.afsSuitability, 'Indicate whether the current anti-fouling systems are appropriate for the vessel\'s operating profile.')}</td>
                    </tr>
                </table>
                <h3>4.1 Typical Trading Routes</h3>
                <p>${getFieldValueOrPlaceholder(data.operatingProfile.tradingRoutes, 'Detail the vessel\'s regular trading routes, including common ports of call.')}</p>
                <h3>4.2 Climate Zones</h3>
                <p>${getFieldValueOrPlaceholder(data.operatingProfile.climateZones, 'Specify the climate zones where the vessel operates (e.g., tropical, temperate, polar).')}</p>
            </div>

            <h2 id="niche">5. Hull and Niche Areas Where Biofouling is Most Likely to Accumulate</h2>
            <div class="section">
                <h3>5.1 Description of Hull and Niche Areas</h3>
                <p>${getFieldValueOrPlaceholder(data.nicheAreas.description, 'Provide a detailed inventory of the vessel\'s hull and niche areas where biofouling can accumulate. Include specific information about sea chests, bow thrusters, propellers, rudders and other niche areas.')}</p>
                <h3>5.2 Location of Areas Where Biofouling is Most Likely to Accumulate</h3>
                ${diagramsHtml}
            </div>

            <h2 id="afs">6. Description of the Anti-fouling Systems (AFS)</h2>
            <div class="section">
                <h3>6.1 Anti-fouling Coatings</h3>
                ${afcHtml}
                <h3>6.2 IAFS Certificate</h3>
                <p><strong>Certificate Number:</strong> ${getFieldValueOrPlaceholder(data.iafs.number, 'Enter the International Anti-fouling System Certificate number if applicable.')}</p>
                <p><strong>Issue Date:</strong> ${formatDate(data.iafs.issueDate) === 'N/A' ? getFieldValueOrPlaceholder('', 'Enter the IAFS certificate issue date.') : formatDate(data.iafs.issueDate)}</p>
                ${data.iafs.file ? `<p><img src="${data.iafs.file}" alt="IAFS Certificate" style="max-width: 100%;"></p>` : '<p class="placeholder-text">Upload a copy of the IAFS certificate (image formats recommended) to include here.</p>'}
                <h3>6.3 Marine Growth Prevention Systems</h3>
                ${mgpsHtml}
            </div>

            <h2 id="installation">7. Installation of Anti-fouling Systems</h2>
            <div class="section">
                <p>${getFieldValueOrPlaceholder(data.afsInstallation, 'Provide comprehensive details about the installation of all anti-fouling systems on the vessel. Include information about which specific systems are applied to different areas of the vessel, coverage extent, and any areas without anti-fouling protection.')}</p>
            </div>

            <h2 id="inspection">8. Inspection Schedule</h2>
            <div class="section">
                <h3>8.1 Routine Inspection Activities</h3>
                <p><strong>Daily:</strong> ${getFieldValueOrPlaceholder(data.inspections.daily, 'MGPS operation checks, visual checks of accessible areas')}</p>
                <p><strong>Weekly:</strong> ${getFieldValueOrPlaceholder(data.inspections.weekly, 'MGPS detailed checks, seachest grating visual inspection')}</p>
                <p><strong>Monthly:</strong> ${getFieldValueOrPlaceholder(data.inspections.monthly, 'Internal seawater systems inspection, MGPS performance review')}</p>
                <p><strong>Quarterly:</strong> ${getFieldValueOrPlaceholder(data.inspections.quarterly, 'Detailed niche area inspections, floating equipment checks')}</p>
                <p><strong>Annual:</strong> ${getFieldValueOrPlaceholder(data.inspections.annual, 'Comprehensive underwater inspection (UWILD or drydock)')}</p>
                <p><strong>Pre-Arrival:</strong> ${getFieldValueOrPlaceholder(data.inspections.preArrival, 'Pre-arrival biosecurity inspection procedures')}</p>
                
                <h3>8.2 Underwater Inspection in Water (UWILD)</h3>
                <p><strong>Frequency:</strong> ${getFieldValueOrPlaceholder(data.uwild.frequency, 'Define UWILD inspection frequency (e.g., quarterly, semi-annual, annual)')}</p>
                <p><strong>Last UWILD Date:</strong> ${formatDate(data.uwild.lastDate) === 'N/A' ? getFieldValueOrPlaceholder('', 'Enter date of last UWILD inspection') : formatDate(data.uwild.lastDate)}</p>
                <p><strong>UWILD Procedures:</strong> ${getFieldValueOrPlaceholder(data.uwild.procedure, 'Describe UWILD procedures, areas covered, recording methods, and reporting')}</p>
                <p><strong>Approved Contractors:</strong> ${getFieldValueOrPlaceholder(data.uwild.contractors, 'List approved UWILD contractors or internal capabilities')}</p>
            </div>

            <h2 id="cleaning">9. Cleaning Schedule</h2>
            <div class="section">
                <h3>9.1 Hull Cleaning</h3>
                <p>${getFieldValueOrPlaceholder(data.cleaning.hullSchedule, 'Document the hull cleaning schedule, including frequency, methods, and conditions triggering hull cleaning')}</p>
                
                <h3>9.2 Niche Area Cleaning</h3>
                <p>${getFieldValueOrPlaceholder(data.cleaning.nicheSchedule, 'Specify cleaning frequency and methods for sea chests, thrusters, gratings, and other niche areas')}</p>
                
                <h3>9.3 Internal System Cleaning</h3>
                <p>${getFieldValueOrPlaceholder(data.cleaning.internalSchedule, 'Describe cleaning/flushing procedures for internal seawater systems')}</p>
                
                <h3>9.4 Cleaning Methods & Equipment</h3>
                <p>${getFieldValueOrPlaceholder(data.cleaning.methods, 'Detail approved cleaning methods (brushing, polishing, grooming, pressure washing), equipment, and limitations')}</p>
                
                <h3>9.5 Approved Cleaning Contractors</h3>
                <p>${getFieldValueOrPlaceholder(data.cleaning.contractors, 'List approved in-water cleaning contractors and contact details')}</p>
                
                <h3>9.6 Cleaning Restrictions & Requirements</h3>
                <p>${getFieldValueOrPlaceholder(data.cleaning.restrictions, 'Document port authority requirements, environmental restrictions, and capture requirements')}</p>
            </div>

            <h2 id="monitoring">10. Monitoring of Biofouling Risk Parameters and Contingency Actions</h2>
            <div class="section">
                <h3>10.1 Biofouling Risk Parameters</h3>
                <p>${getFieldValueOrPlaceholder(data.riskManagement.parameters, 'List the specific parameters that indicate increased biofouling risk (e.g., extended port stays, reduced speed operations, warm waters, freshwater exposure).')}</p>
                <h3>10.2 Evaluation Deviations and Deviation Limits</h3>
                <p>${getFieldValueOrPlaceholder(data.riskManagement.deviationLimits, 'Define the specific limits for each risk parameter that would trigger contingency actions.')}</p>
                <h3>10.3 Contingency Actions</h3>
                <p>${getFieldValueOrPlaceholder(data.riskManagement.contingencyActions, 'Specify actions to be taken when parameters exceed defined limits. Include decision criteria, responsible parties, and timelines.')}</p>
                <h3>10.4 Long-term Actions</h3>
                <p>${getFieldValueOrPlaceholder(data.riskManagement.longTermActions, 'Detail longer-term management responses following repeated or significant deviations (e.g., increase inspection frequency, update anti-fouling systems, revise the BFMP).')}</p>
            </div>

            <h2 id="waste">11. Capture and Disposal of Waste</h2>
            <div class="section">
                <h3>11.1 Waste Management Procedures</h3>
                <p>${getFieldValueOrPlaceholder(data.procedures.wasteManagement, 'Document procedures for the capture, treatment, and disposal of biofouling waste in accordance with MARPOL Annex V, local port regulations, and biosecurity requirements. Specify requirements for waste segregation, temporary storage, and approved disposal methods. Include procedures for documenting waste disposal in accordance with regulatory requirements.')}</p>
                
                <h3>11.2 Waste Containment Methods</h3>
                <p>${getFieldValueOrPlaceholder(data.procedures.wasteContainment, 'Detail the equipment and methods used to contain biofouling waste during cleaning operations. This may include: containment curtains, collection devices, filtration systems, vacuum equipment, and temporary storage containers. Specify procedures for preventing release of biofouling material into the surrounding water during in-water cleaning activities.')}</p>
            </div>

            <h2 id="safety">12. Safety Procedures for the Vessel and Crew</h2>
            <div class="section">
                <h3>12.1 General Safety Procedures</h3>
                <p>${getFieldValueOrPlaceholder(data.procedures.safetyProcedures, 'Detail safety procedures for all biofouling management activities including: lockout/tagout procedures for rotating equipment (propellers, thrusters, trim tabs), confined space entry procedures for internal system inspection/cleaning, diving operations safety protocols, chemical handling procedures for cleaning agents and biocides, working at heights for above-waterline tasks, and permit-to-work systems.')}</p>
                
                <h3>12.2 Required Safety Equipment</h3>
                <p>${getFieldValueOrPlaceholder(data.procedures.safetyEquipment, 'List all personal protective equipment and safety equipment required for biofouling management activities:\n• PPE: gloves, safety glasses, respirators, protective clothing\n• Confined space equipment: gas detectors, ventilation equipment, communication devices, rescue equipment\n• Diving equipment: appropriate to the diving operation\n• Lockout/tagout devices\n• First aid equipment\n• Safety data sheets for all chemicals used')}</p>
                
                <h3>12.3 Emergency Procedures</h3>
                <p>${getFieldValueOrPlaceholder(data.procedures.emergencyProcedures, 'Document emergency response procedures for incidents during biofouling management activities including: medical emergencies, confined space incidents, diving emergencies, chemical spills or exposure, equipment failure, and unplanned release of biofouling waste. Include emergency contact numbers and procedures for notifying relevant authorities.')}</p>
            </div>

            <h2 id="training">13. Crew Training and Familiarisation</h2>
            <div class="section">
                <h3>13.1 Training Program</h3>
                <p>${getFieldValueOrPlaceholder(data.training.details, 'Outline the training program for crew members involved in biofouling management activities. Specify training content, frequency, who delivers the training, and which crew members require training.')}</p>
                
                <h3>13.2 Training Topics</h3>
                <p>${getFieldValueOrPlaceholder(data.training.topics, 'Biofouling identification, IMO guidelines, inspection procedures, record keeping, biosecurity awareness, safety procedures')}</p>
                
                <h3>13.3 Training Frequency and Provider</h3>
                <p><strong>Training Frequency:</strong> ${getFieldValueOrPlaceholder(data.training.frequency, 'Define training frequency (e.g., initial, annual, biannual)')}</p>
                <p><strong>Training Provider:</strong> ${getFieldValueOrPlaceholder(data.training.provider, 'Specify internal or external training provider')}</p>
                
                <h3>13.4 Training Register</h3>
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>Crew Member Name</th>
                            <th>Position</th>
                            <th>Training Date</th>
                            <th>Trainer</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="4">Training register to be maintained by vessel management.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <h2 id="communication">14. Communication and Reporting</h2>
            <div class="section">
                <h3>14.1 Internal Reporting Procedures</h3>
                <p>${getFieldValueOrPlaceholder(data.communication.reportingProcedures, 'Document internal reporting procedures for biofouling management. Specify who is responsible for monitoring and reporting biofouling status, to whom reports should be made, and under what circumstances. Include reporting lines for significant biofouling events, deviations from the plan, or situations requiring management intervention.')}</p>
                
                <h3>14.2 External Reporting Requirements</h3>
                <p>${getFieldValueOrPlaceholder(data.communication.externalReporting, 'Detail external reporting requirements to port state authorities, biosecurity agencies, or regulatory bodies. Include requirements for MARS (Maritime Arrivals Reporting System) in Australia, MPI declarations in New Zealand, California reporting forms, and any other jurisdiction-specific requirements. Specify timeframes and procedures for these reports.')}</p>
                
                <h3>14.3 Documentation and Record Retention</h3>
                <p>${getFieldValueOrPlaceholder(data.communication.documentRetention, 'Specify record keeping requirements for the Biofouling Management Plan and associated Biofouling Record Book. Include retention periods (typically minimum 5 years or vessel lifetime), storage locations (onboard and shore-based), backup procedures, and who has access to these documents. Document any specific regulatory requirements for record retention.')}</p>
                
                <h3>14.4 Key Contacts</h3>
                <p>${getFieldValueOrPlaceholder(data.communication.keyContacts, 'Provide contact details for key personnel and organizations involved in biofouling management:\n• BFMP Coordinator (onboard contact)\n• Shore Management (technical superintendent, fleet manager)\n• Approved Inspection Contractors\n• Approved Cleaning Contractors\n• Regulatory Authorities (DAFF, MPI, port authorities)\n• Classification Society\n• Emergency Response Contacts')}</p>
            </div>
            
            <h2 id="review">15. Review and Amendment</h2>
            <div class="section">
                <h3>15.1 Review Schedule</h3>
                <p>This Biofouling Management Plan shall be reviewed and updated as necessary, but at intervals not exceeding five (5) years. Reviews should also be conducted following:</p>
                <ul>
                    <li>Significant changes to the vessel's operational profile</li>
                    <li>Major modifications to the vessel's hull or underwater appendages</li>
                    <li>Application of new anti-fouling systems</li>
                    <li>Changes to relevant regulations or industry standards</li>
                    <li>Significant biofouling events or biosecurity incidents</li>
                    <li>Following feedback from regulatory inspections</li>
                </ul>
                
                <h3>15.2 Amendment Procedures</h3>
                <p>Amendments to this Biofouling Management Plan shall be:</p>
                <ul>
                    <li>Proposed by the ${getFieldValueOrPlaceholder(data.revision.responsiblePosition, 'responsible person')} or other designated personnel</li>
                    <li>Reviewed and approved by vessel management and/or the vessel owner</li>
                    <li>Documented in Section 3 (Record of Revision)</li>
                    <li>Communicated to all relevant personnel</li>
                    <li>Retained as part of the vessel's official documentation</li>
                </ul>
                
                <h3>15.3 Distribution and Accessibility</h3>
                <p>This Biofouling Management Plan and the associated Biofouling Record Book shall be:</p>
                <ul>
                    <li>Maintained onboard the vessel at all times</li>
                    <li>Made available for inspection by Port State Control, quarantine authorities, and other regulatory bodies</li>
                    <li>Accessible to all crew members involved in biofouling management activities</li>
                    <li>Backed up in shore-based systems to prevent loss</li>
                </ul>
            </div>
            
            <h2 id="glossary">16. Glossary of Terms</h2>
            <div class="section">
                <table class="details-table">
                    <tr>
                        <th>Term</th>
                        <th>Definition</th>
                    </tr>
                    <tr>
                        <td><strong>AFC</strong></td>
                        <td>Anti-Fouling Coating - Paint or coating system applied to underwater surfaces to prevent or reduce biofouling accumulation</td>
                    </tr>
                    <tr>
                        <td><strong>AFS</strong></td>
                        <td>Anti-Fouling System - The overall system including coatings, MGPS, and management procedures used to prevent biofouling</td>
                    </tr>
                    <tr>
                        <td><strong>Biofouling</strong></td>
                        <td>The accumulation of aquatic organisms such as microorganisms, plants, algae, and animals on surfaces and structures immersed in or exposed to the aquatic environment</td>
                    </tr>
                    <tr>
                        <td><strong>BFMP</strong></td>
                        <td>Biofouling Management Plan - A vessel-specific plan outlining procedures to manage and minimize biofouling</td>
                    </tr>
                    <tr>
                        <td><strong>BFRB</strong></td>
                        <td>Biofouling Record Book - Record of biofouling management activities undertaken on a vessel</td>
                    </tr>
                    <tr>
                        <td><strong>DAFF</strong></td>
                        <td>Australian Department of Agriculture, Fisheries and Forestry (responsible for biosecurity)</td>
                    </tr>
                    <tr>
                        <td><strong>DFT</strong></td>
                        <td>Dry Film Thickness - The thickness of a dried coating, typically measured in micrometers (μm)</td>
                    </tr>
                    <tr>
                        <td><strong>IAFS</strong></td>
                        <td>International Anti-Fouling System Certificate - Certificate issued under the AFS Convention</td>
                    </tr>
                    <tr>
                        <td><strong>IMO</strong></td>
                        <td>International Maritime Organization - UN agency responsible for maritime safety and pollution prevention</td>
                    </tr>
                    <tr>
                        <td><strong>IMS/IAS</strong></td>
                        <td>Invasive Marine/Aquatic Species - Non-native species that can cause ecological or economic harm</td>
                    </tr>
                    <tr>
                        <td><strong>MARS</strong></td>
                        <td>Maritime Arrivals Reporting System - Australian system for reporting vessel arrivals and biosecurity information</td>
                    </tr>
                    <tr>
                        <td><strong>MGPS</strong></td>
                        <td>Marine Growth Prevention System - System using electrolysis, chemicals, or other methods to prevent biofouling in internal seawater systems</td>
                    </tr>
                    <tr>
                        <td><strong>MPI</strong></td>
                        <td>Ministry for Primary Industries (New Zealand) - Responsible for biosecurity in New Zealand</td>
                    </tr>
                    <tr>
                        <td><strong>Niche Areas</strong></td>
                        <td>Areas of a vessel where biofouling is likely to accumulate (sea chests, thruster tunnels, gratings, etc.)</td>
                    </tr>
                    <tr>
                        <td><strong>UWILD</strong></td>
                        <td>Underwater Inspection in Lieu of Drydocking - Inspection of underwater hull while vessel remains afloat</td>
                    </tr>
                </table>
            </div>
            
            <h2 id="references">17. References and Bibliography</h2>
            <div class="section">
                <h3>17.1 International Conventions and Guidelines</h3>
                <ul>
                    <li>IMO Resolution MEPC.207(62) - Guidelines for the Control and Management of Ships' Biofouling to Minimize the Transfer of Invasive Aquatic Species (2011)</li>
                    <li>International Convention on the Control of Harmful Anti-Fouling Systems on Ships, 2001 (AFS Convention)</li>
                    <li>International Convention for the Prevention of Pollution from Ships (MARPOL)</li>
                </ul>
                
                <h3>17.2 National Regulations and Guidelines</h3>
                <ul>
                    <li>Commonwealth of Australia Biosecurity Act 2015</li>
                    <li>Australian National Biofouling Management Guidance for Non-Trading Vessels, DAFF (2015)</li>
                    <li>Anti-fouling and In-water Cleaning Guidelines, Australian Government (2015)</li>
                    <li>New Zealand Craft Risk Management Standard: Biofouling on Vessels Arriving to New Zealand, MPI (2018)</li>
                    <li>California Code of Regulations, Title 2, Section 2298.1 et seq. - Biofouling Management Regulations</li>
                </ul>
                
                <h3>17.3 Industry Standards and Publications</h3>
                <ul>
                    <li>Classification Society Rules and Guidelines (vessel-specific)</li>
                    <li>Anti-fouling coating manufacturer technical data sheets and application guides</li>
                    <li>MGPS manufacturer operating and maintenance manuals</li>
                </ul>
            </div>
            ` : ''}

            ${includeBFMP && includeBFRB ? '<div class="page-break"></div>' : ''}

            ${includeBFRB ? `
            <h2 id="recordbook">Biofouling Record Book</h2>
            <div class="section">
                <p>The Biofouling Record Book (BFRB) must be used in conjunction with this Biofouling Management Plan. The BFRB demonstrates that the BFMP has been implemented through records of relevant biofouling activities.</p>
                <p>The BFRB must be maintained from the date of BFMP implementation and retained for the entire service life of the vessel. Entries in the BFRB must be signed and dated by the officer or officers in charge.</p>
                <h3>Record Book Template</h3>
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Activity Type</th>
                            <th>Location</th>
                            <th>Details</th>
                            <th>Person in Charge</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="5">Record of activities to be maintained here.</td>
                        </tr>
                    </tbody>
                </table>
                <p><strong>Activities to be recorded include:</strong></p>
                <ul>
                    <li>Cleaning activities</li>
                    <li>Inspections</li>
                    <li>Operation outside expected profile</li>
                    <li>AFC maintenance/service/damage</li>
                    <li>MGPS maintenance/service/downtime</li>
                </ul>
            </div>` : ''}

            <div class="footer">
                <p>This Biofouling Management Plan was generated using the MarineStream BFMP generator.</p>
                <p>&copy; ${new Date().getFullYear()} MarineStream Tools</p>
            </div>
        </div>
    `;
}
