// Hull Fouling Calculator - MarineStream™
// Enhanced physics-based model with custom vessel support

function initHullFoulingCalculator() {
    if (window.calculatorInitialized) {
        console.log('Hull Fouling Calculator already initialized, skipping...');
        return;
    }

    console.log('Initializing Hull Fouling Calculator...');

    // Ensure Chart.js is available even if the HTML was served from an older cache
    function loadChartJsIfNeeded() {
        return new Promise((resolve) => {
            if (typeof Chart !== 'undefined') {
                return resolve(true);
            }
            // Avoid injecting multiple times
            if (document.getElementById('chartjs-local-loader')) {
                // Poll briefly until Chart appears
                const start = Date.now();
                const poll = () => {
                    if (typeof Chart !== 'undefined' || Date.now() - start > 3000) {
                        return resolve(typeof Chart !== 'undefined');
                    }
                    setTimeout(poll, 50);
                };
                return poll();
            }
            const script = document.createElement('script');
            script.id = 'chartjs-local-loader';
            script.src = './assets/chart.min.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    }

    // Currency conversion rates (relative to AUD)
    const conversionRates = {
        AUD: 1,
        GBP: 0.495,  // 1 AUD = 0.495 GBP (current rate ~0.495)
        USD: 0.644   // 1 AUD = 0.644 USD (current rate ~0.644)
    };

    const currencySymbols = {
        AUD: '$',
        GBP: '£',
        USD: '$'
    };

    // Physical constants
    const KNOTS_TO_MPS = 0.514444;
    const MPS_TO_KNOTS = 1.94384;
    const NU_WATER = 1.19e-6; // Kinematic viscosity (m²/s)
    const RHO_WATER = 1025;   // Density of seawater (kg/m³)
    const GRAVITY = 9.81;     // Gravity (m/s²)

    // Fuel properties
    const FUEL_CO2_FACTOR = 3.114; // kg CO2 per kg fuel (IMO default for HFO)
    const FUEL_ENERGY_DENSITY = 42.7; // MJ/kg
    const FUEL_DENSITY = 0.85; // kg/L
    const FUEL_PRICE_PER_LITER = 1.92; // $/L

    // Engine and propulsion constants
    const propEfficiency = 0.65; // Propulsive efficiency
    const sfoc = 200; // Specific fuel oil consumption (g/kWh)
    const fuelCostPerKg = FUEL_PRICE_PER_LITER / FUEL_DENSITY;
    const co2PerKgFuel = FUEL_CO2_FACTOR;

    let currentCurrency = 'AUD';

    // Enhanced vessel configurations
    const vesselConfigs = {
        tug: {
            name: "Harbor Tug (32m)",
            length: 32,
            beam: 10,
            draft: 4.5,
            cb: 0.65,
            ecoSpeed: 8,
            fullSpeed: 13,
            costEco: 600,    
            costFull: 2160,  
            waveExp: 4.5,
            category: 'workboat',
            crCf: 5.0  // High Cr/Cf: fuller hull, high Fr → wave-making dominates (Robert Allan Ltd.)
        },
        cruiseShip: {
            name: "Passenger Cruise Ship (93m)",
            length: 93,
            beam: 16,
            draft: 5.2,
            cb: 0.62,
            ecoSpeed: 10,
            fullSpeed: 13.8,
            costEco: 1600,
            costFull: 4200,
            waveExp: 4.6,
            category: 'cruise',
            crCf: 1.5  // Moderate Cr/Cf: slender hull form (Schultz 2007)
        },
        pilot: {
            name: "Pilot Vessel (16m)",
            length: 16.4,
            beam: 7.1,
            draft: 1.9,
            cb: 0.55,
            ecoSpeed: 10,
            fullSpeed: 13,
            costEco: 400,
            costFull: 1200,
            waveExp: 4.2,
            category: 'workboat',
            crCf: 2.7  // Calibrated to match UoM Pilot Vessel study: 20.3% resistance reduction at FR4
        },
        custom: {
            name: "Custom Vessel",
            // Will be populated dynamically
        }
    };

    // Enhanced FR to ks mapping - calibrated for simplified model
    const frKsMapping = [
        0,         // FR0: Smooth (0% increase)
        0.00003,   // FR1: Light slime (10-20% increase)
        0.00010,   // FR2: Medium slime (20-40% increase)
        0.00030,   // FR3: Heavy slime (40-80% increase)
        0.00080,   // FR4: Light calcareous (80-140% increase)
        0.00200    // FR5: Heavy calcareous (140-200% increase)
    ];

    let myChart = null;

    // Helper functions
    function interpolate(x, x1, x2, y1, y2) {
        if (x <= x1) return y1;
        if (x >= x2) return y2;
        return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
    }

    function knotsToMps(knots) {
        return knots * KNOTS_TO_MPS;
    }

    function mpsToKnots(mps) {
        return mps * MPS_TO_KNOTS;
    }

    // Add missing physics functions
    function calculateReynolds(speedMs, length) {
        return speedMs * length / NU_WATER;
    }

    function calculateWettedSurface(L, B, T, Cb) {
        // Holtrop & Mennen approximation for wetted surface area
        const displacement = L * B * T * Cb * RHO_WATER / 1000;
        const S = L * (2 * T + B) * Math.sqrt(Cb) * (0.453 + 0.4425 * Cb - 0.2862 * Cb * Cb + 0.003467 * B / T + 0.3696 * 0.65);
        return S;
    }

    function calculateWaveResistance(vessel, speedMs) {
        // Simplified wave resistance calculation - smooth and predictable
        const Fr = speedMs / Math.sqrt(GRAVITY * vessel.length);
        
        // Simple smooth wave resistance coefficient
        // Increases gradually with speed, no humps or discontinuities
        let Cw = 0;
        if (Fr > 0.05) {
            // Smooth polynomial increase - no humps
            Cw = 0.00008 * Math.pow(Fr, 4); // Simple 4th power law
        }
        
        const wettedSurface = calculateWettedSurface(vessel.length, vessel.beam, vessel.draft, vessel.cb);
        return 0.5 * RHO_WATER * wettedSurface * Cw * speedMs * speedMs;
    }

    function estimateFuelCost(vessel, speed, wettedSurface) {
        const speedMs = speed * KNOTS_TO_MPS;
        const Re = calculateReynolds(speedMs, vessel.length);
        const cf = calculateCf(Re, 0);
        
        const frictionResistance = 0.5 * RHO_WATER * wettedSurface * cf * speedMs * speedMs;
        const waveResistance = calculateWaveResistance(vessel, speedMs);
        const totalResistance = frictionResistance + waveResistance;
        
        const power = totalResistance * speedMs / 1000 / propEfficiency; // kW
        const fuelConsumption = power * sfoc / 1000; // kg/hr
        const cost = fuelConsumption * fuelCostPerKg;
        
        return cost;
    }

    // Enhanced physics functions
    function calculateReL(speedMps, L, nu) {
        return speedMps * L / nu;
    }

    function calculateCfs(ReL) {
        if (ReL <= 0) return 0;
        return 0.075 / Math.pow(Math.log10(ReL) - 2, 2);
    }

    // Improved rough skin friction coefficient calculation
    function calculateCf(ReL, ks, L) {
        const Cfs = calculateCfs(ReL);
        if (ks <= 0 || !ks) return Cfs;

        // For simplified calculation when L is not provided
        if (!L) {
            L = 50; // Default vessel length
        }

        // Simplified approach - smooth transition from smooth to rough
        // Avoid complex transitional regime calculations
        const roughnessRatio = ks / L;
        
        // Simple interpolation based on roughness
        // This gives a smooth increase in Cf with roughness
        const roughnessFactor = 1 + 100 * roughnessRatio; // Linear increase with roughness
        
        // Blend between smooth and rough based on roughness level
        const CfRough = Cfs * roughnessFactor;
        
        // Ensure reasonable bounds
        return Math.min(CfRough, Cfs * 3); // Cap at 3x smooth friction
    }

    // Calculate form factor K
    function calculateFormFactor(vessel) {
        const L = vessel.length;
        const B = vessel.beam || L / 5;
        const T = vessel.draft || B / 2.5;
        const Cb = vessel.cb || 0.65;

        const LR = L / Math.pow(vessel.displacement || (L * B * T * Cb * RHO_WATER / 1000), 1 / 3);

        // Simplified Holtrop & Mennen correlation
        const c14 = 1 + 0.011 * Cb;
        const K = c14 - 0.001 * LR;

        return Math.max(0, K);
    }

    // Get speed-dependent CA
    function getCA(speed, vessel) {
        if (vessel.CA_eco && vessel.CA_full) {
            return interpolate(speed, vessel.ecoSpeed, vessel.fullSpeed,
                vessel.CA_eco, vessel.CA_full);
        }
        return vessel.CA || 0.0005;
    }

    // Get speed-dependent CR/Cf ratio
    function getCrCfRatio(speed, vessel) {
        const Fr = speed * KNOTS_TO_MPS / Math.sqrt(GRAVITY * vessel.length);

        if (Fr < 0.15) {
            return vessel.CrCfRatio_eco || 0.5;
        } else if (Fr > 0.25) {
            return vessel.CrCfRatio_full || 2.0;
        } else {
            // Quadratic interpolation in transition zone
            const t = (Fr - 0.15) / 0.10;
            const eco = vessel.CrCfRatio_eco || 0.5;
            const full = vessel.CrCfRatio_full || 2.0;
            return eco + t * t * (full - eco);
        }
    }

    // Calculate total resistance increase
    function calculateDeltaRT(deltaCf, Cfs, CrCfRatio, CA, K) {
        if (Cfs <= 0) return 0;
        const Cv_smooth = Cfs * (1 + K);
        const denominator = Cv_smooth * (1 + CrCfRatio) + CA;
        if (denominator <= 0) return 0;
        return (deltaCf * (1 + K) / denominator) * 100;
    }

    // Estimate vessel parameters for custom vessels
    function estimateVesselParameters(L, B, T, Cb, category) {
        const displacement = L * B * T * Cb * RHO_WATER / 1000; // tonnes

        // Estimate speeds based on vessel category and size
        let speedFactor = 1.0;
        let efficiencyBase = 0.35;

        switch (category) {
            case 'cargo':
                speedFactor = 0.8;
                efficiencyBase = 0.40;
                break;
            case 'container':
                speedFactor = 1.2;
                efficiencyBase = 0.42;
                break;
            case 'cruise':
                speedFactor = 1.1;
                efficiencyBase = 0.43;
                break;
            case 'naval':
                speedFactor = 1.4;
                efficiencyBase = 0.38;
                break;
            case 'workboat':
                speedFactor = 0.9;
                efficiencyBase = 0.35;
                break;
            case 'yacht':
                speedFactor = 1.3;
                efficiencyBase = 0.37;
                break;
        }

        // Estimate speeds using Froude number relationships
        const ecoFr = 0.18 * speedFactor;
        const fullFr = 0.25 * speedFactor;
        const ecoSpeed = ecoFr * Math.sqrt(GRAVITY * L) * MPS_TO_KNOTS;
        const fullSpeed = fullFr * Math.sqrt(GRAVITY * L) * MPS_TO_KNOTS;

        // Estimate costs based on displacement and speed
        const powerEco = displacement * Math.pow(ecoSpeed, 2.5) * 0.015;
        const powerFull = displacement * Math.pow(fullSpeed, 2.5) * 0.015;

        const costEco = powerEco * FUEL_PRICE_PER_LITER / (efficiencyBase * FUEL_ENERGY_DENSITY * 3.6);
        const costFull = powerFull * FUEL_PRICE_PER_LITER / ((efficiencyBase + 0.05) * FUEL_ENERGY_DENSITY * 3.6);

        return {
            length: L,
            beam: B,
            draft: T,
            cb: Cb,
            displacement: displacement,
            ecoSpeed: Math.round(ecoSpeed * 2) / 2,
            fullSpeed: Math.round(fullSpeed * 2) / 2,
            costEco: Math.round(costEco / 50) * 50,
            costFull: Math.round(costFull / 50) * 50,
            waveExp: 4.5 + (Cb - 0.65) * 2,
            CA_eco: 0.0005 + (Cb - 0.65) * 0.001,
            CA_full: 0.0004 + (Cb - 0.65) * 0.0008,
            CrCfRatio_eco: 0.5 + (Cb - 0.65) * 2,
            CrCfRatio_full: 1.5 + (Cb - 0.65) * 3,
            eff_eco: efficiencyBase,
            eff_full: efficiencyBase + 0.05
        };
    }

    // Update custom vessel calculations
    function updateCustomVesselCalculations() {
        const L = Math.max(10, parseFloat(document.getElementById('customLength').value) || 50);
        const B = Math.max(3, parseFloat(document.getElementById('customBeam').value) || 10);
        const T = Math.max(1, parseFloat(document.getElementById('customDraft').value) || 4);
        const Cb = Math.min(0.9, Math.max(0.4, parseFloat(document.getElementById('customCb').value) || 0.65));

        const displacement = L * B * T * Cb * RHO_WATER / 1000;
        document.getElementById('customDisplacement').value = Math.round(displacement);
    }

    function convertCurrency(amount, fromCurrency, toCurrency) {
        const amountInAUD = fromCurrency === 'AUD'
            ? amount
            : amount / conversionRates[fromCurrency];
        return amountInAUD * conversionRates[toCurrency];
    }

    function solveAlphaBeta(costEco, costFull, ecoSpeed, fullSpeed, waveExp = 4.5) {
        const s1 = ecoSpeed, s2 = fullSpeed;
        const x1 = Math.pow(s1, 3);
        const y1 = Math.pow(s1, waveExp);
        const x2 = Math.pow(s2, 3);
        const y2 = Math.pow(s2, waveExp);

        const det = x1 * y2 - x2 * y1;
        const alpha = (costEco * y2 - costFull * y1) / det;
        const beta = (costFull * x1 - costEco * x2) / det;

        return { alpha, beta };
    }

    // Updated formatCurrency to distinguish currencies
    function formatCurrency(value) {
        let symbol = currencySymbols[currentCurrency];
        let codePrefix = '';
        if (currentCurrency === 'AUD') {
            codePrefix = 'A';
        } else if (currentCurrency === 'USD') {
            codePrefix = 'US';
        }
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.round(value));  // Round after conversion to avoid precision issues
        return codePrefix + symbol + formatted;
    }

    // Generic number formatter with thousands separators
    function formatNumber(value, decimals = 1) {
        if (!Number.isFinite(value)) return '0';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }

    // Emission factor helpers
    // Returns a sanitized CO2 emission factor (kg CO2 per kg fuel). Priority:
    // 1) Provided emissionFactor argument, 2) window.CO2_EMISSION_FACTOR, 3) default FUEL_CO2_FACTOR
    function getCo2EmissionFactor(emissionFactor) {
        let factor = emissionFactor;
        if (!Number.isFinite(factor)) {
            if (typeof window !== 'undefined' && Number.isFinite(window.CO2_EMISSION_FACTOR)) {
                factor = window.CO2_EMISSION_FACTOR;
            } else {
                factor = FUEL_CO2_FACTOR;
            }
        }
        // Guard against invalid values and clamp to reasonable marine ranges
        if (!Number.isFinite(factor) || factor <= 0) return FUEL_CO2_FACTOR;
        if (factor < 2.5 || factor > 3.7) return FUEL_CO2_FACTOR;
        return factor;
    }

    // Calculate CO2 from fuel mass using a configurable emission factor (kg CO2 = kg fuel * EF)
    function calculateCO2FromFuel(fuelMassKg, emissionFactor) {
        const fuel = parseFloat(fuelMassKg);
        if (!Number.isFinite(fuel) || fuel <= 0) return 0;
        const ef = getCo2EmissionFactor(emissionFactor);
        return fuel * ef;
    }

    // Invert emission factor to compute fuel mass from CO2 mass (kg fuel = kg CO2 / EF)
    function calculateFuelFromCO2(co2MassKg, emissionFactor) {
        const co2 = parseFloat(co2MassKg);
        if (!Number.isFinite(co2) || co2 <= 0) return 0;
        const ef = getCo2EmissionFactor(emissionFactor);
        return co2 / ef;
    }

    // Physics-based CO2 calculation (from shaft power via fuel consumption)
    function calculateCO2FromPower(powerKW, efficiency, emissionFactor) {
        const fuelConsumption = powerKW / (efficiency * FUEL_ENERGY_DENSITY * 1000 / 3600);
        return calculateCO2FromFuel(fuelConsumption, emissionFactor);
    }

    function calculateExtraCO2(extraCost, vessel, speed, emissionFactor) {
        const efficiency = interpolate(speed, vessel.ecoSpeed, vessel.fullSpeed,
            vessel.eff_eco, vessel.eff_full);
        const fuelPricePerKg = FUEL_PRICE_PER_LITER / FUEL_DENSITY;
        const extraFuelKgHr = extraCost / fuelPricePerKg;
        return calculateCO2FromFuel(extraFuelKgHr, emissionFactor);
    }

    function getValidationStatus(vesselType, frLevel, speed) {
        if (vesselType === 'cruiseShip' && frLevel === 5 &&
            Math.abs(speed - vesselConfigs.cruiseShip.fullSpeed) < 0.5) {
            return {
                validated: true,
                message: "Values validated by University of Melbourne Coral Adventurer study"
            };
        } else if (vesselType === 'tug' && frLevel === 4 &&
            Math.abs(speed - vesselConfigs.tug.fullSpeed) < 0.5) {
            return {
                validated: true,
                message: "Values validated by University of Melbourne Rio Tinto tugboat study"
            };
        } else if (vesselType === 'pilot' && frLevel === 4 &&
            Math.abs(speed - vesselConfigs.pilot.fullSpeed) < 0.5) {
            return {
                validated: true,
                message: "Values validated by University of Melbourne Pilot Vessel study showing 20.3% resistance reduction after cleaning"
            };
        }
        return { validated: false, message: "" };
    }

    function updateResultsText() {
        const vesselType = document.getElementById("vesselType").value;
        let vessel;
        
        // Read the user-editable Cr/Cf ratio from the UI
        const userCrCf = parseFloat(document.getElementById("crCfRatio").value) || 1.5;
        
        // Helper function to calculate costs at a given speed
        function calculateCostAt(speed) {
            // Use the alpha-beta model for base costs
            const { alpha, beta } = solveAlphaBeta(costEco, costFull, vessel.ecoSpeed, vessel.fullSpeed, 4.5);
            const baseCleanCost = alpha * Math.pow(speed, 3) + beta * Math.pow(speed, 4.5);
            
            // Frictional resistance increases per fouling rating (calibrated from UoM research)
            const foulingIncreases = [0, 0.15, 0.35, 0.60, 0.95, 1.93];
            const baseFoulingIncrease = foulingIncreases[frLevel] || 0;
            
            // Speed-dependent Cr/Cf: scale the user's value by (Fr/Fr_ref)²
            // At low speeds wave resistance is small → crCf is low → fouling matters more
            // At high speeds wave resistance dominates → crCf is high → fouling matters less
            const Fr = speed * 0.514444 / Math.sqrt(9.81 * vessel.length);
            const Fr_ref = vessel.fullSpeed * 0.514444 / Math.sqrt(9.81 * vessel.length);
            const frRatio = Fr_ref > 0 ? Math.min(Fr / Fr_ref, 1.5) : 0;
            const crCfEffective = userCrCf * frRatio * frRatio;
            
            // ∆RT/RT = ∆Cf/Cf / (1 + Cr/Cf)  — physics-based resistance splitting
            const effectiveFoulingIncrease = baseFoulingIncrease / (1 + crCfEffective);
            const costFouledHr = baseCleanCost * (1 + effectiveFoulingIncrease);
            
            // Derive fuel and CO₂ directly from the cost delta to keep values consistent
            // Compute using AUD internally regardless of display currency
            const extraCostAud = Math.max(0, costFouledHr - baseCleanCost);
            const extraFuel = extraCostAud / fuelCostPerKg; // kg/hr
            const extraCO2 = extraFuel * co2PerKgFuel;      // kg/hr
            
            // Convert costs to display currency if needed
            const displayClean = currentCurrency === 'AUD' ? 
                baseCleanCost : 
                convertCurrency(baseCleanCost, 'AUD', currentCurrency);
                
            const displayFouled = currentCurrency === 'AUD' ? 
                costFouledHr : 
                convertCurrency(costFouledHr, 'AUD', currentCurrency);
            
            return {
                clean: displayClean,
                fouled: displayFouled,
                fuelClean: 0,
                fuelFouled: 0,
                extraFuel: extraFuel,
                extraCO2: extraCO2,
                frictionIncrease: (effectiveFoulingIncrease * 100)
            };
        }
        
        if (vesselType === 'custom') {
            // Show custom vessel parameters
            document.getElementById('customVesselParams').style.display = 'block';
            
            // Get custom vessel parameters
            vessel = {
                name: "Custom Vessel",
                length: parseFloat(document.getElementById("customLength").value) || 50,
                beam: parseFloat(document.getElementById("customBeam").value) || 10,
                draft: parseFloat(document.getElementById("customDraft").value) || 4,
                cb: parseFloat(document.getElementById("customCb").value) || 0.65,
                ecoSpeed: parseFloat(document.getElementById("customEcoSpeed").value) || 10,
                fullSpeed: parseFloat(document.getElementById("customFullSpeed").value) || 15,
                category: document.getElementById("vesselCategory").value || 'cargo'
            };
        } else {
            // Hide custom vessel parameters
            document.getElementById('customVesselParams').style.display = 'none';
            vessel = vesselConfigs[vesselType];
        }
        
        // Get input costs in current currency
        let costEcoInput = parseFloat(document.getElementById("costEco").value);
        let costFullInput = parseFloat(document.getElementById("costFull").value);
        
        // If no user input, use vessel defaults converted to current currency
        if (!costEcoInput || isNaN(costEcoInput)) {
            costEcoInput = currentCurrency === 'AUD' ? 
                vessel.costEco : 
                convertCurrency(vessel.costEco, 'AUD', currentCurrency);
        }
        if (!costFullInput || isNaN(costFullInput)) {
            costFullInput = currentCurrency === 'AUD' ? 
                vessel.costFull : 
                convertCurrency(vessel.costFull, 'AUD', currentCurrency);
        }
        
        // Convert input costs to AUD for calculations if needed
        let costEco = currentCurrency === 'AUD' ? costEcoInput : convertCurrency(costEcoInput, currentCurrency, 'AUD');
        let costFull = currentCurrency === 'AUD' ? costFullInput : convertCurrency(costFullInput, currentCurrency, 'AUD');
        
        const frLevel = parseInt(document.getElementById("frSlider").value) || 0;
        const frLabel = `FR${frLevel}`;
        
        // Get fuel cost per kg for calculations
        const fuelCostPerKg = FUEL_PRICE_PER_LITER / FUEL_DENSITY;
        const co2PerKgFuel = getCo2EmissionFactor();
        
        // Calculate costs at different speeds
        const cEco = calculateCostAt(vessel.ecoSpeed);
        const cFull = calculateCostAt(vessel.fullSpeed);
        
        const increaseEco = ((cEco.fouled - cEco.clean) / cEco.clean * 100).toFixed(1);
        const increaseFull = ((cFull.fouled - cFull.clean) / cFull.clean * 100).toFixed(1);
        
        const extraCostFull = cFull.fouled - cFull.clean;
        const extraCO2Full = cFull.extraCO2;
        // Derive fuel from CO2 via inversion for display (ensures unit-consistent inversion path)
        const extraFuelFull = calculateFuelFromCO2(extraCO2Full, co2PerKgFuel);
        
        // Annual impact calculation (assuming 12hr/day, 200 days/year operation)
        const annualHours = 12 * 200;
        const annualExtraCost = extraCostFull * annualHours;
        const annualExtraCO2 = extraCO2Full * annualHours / 1000; // Convert to tonnes
        
        let resultsHtml = `
            <div class="result-item">
                <span class="result-label">Vessel Type:</span>
                <span class="result-value">${vessel.name}</span>
            </div>
            
            <div class="result-group">
                <div class="result-group-header">
                    <i class="fas fa-tachometer-alt"></i>
                    <h4>At ${vessel.ecoSpeed} knots (Economic Speed)</h4>
                </div>
                <div class="result-item">
                    <span class="result-label">Clean Hull:</span>
                    <span class="result-value">${formatCurrency(cEco.clean)}/hr</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Fouled Hull (${frLabel}):</span>
                    <span class="result-value">${formatCurrency(cEco.fouled)}/hr</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Cost Increase:</span>
                    <span class="result-value">${increaseEco}%</span>
                </div>
            </div>
            
            <div class="result-group">
                <div class="result-group-header">
                    <i class="fas fa-rocket"></i>
                    <h4>At ${vessel.fullSpeed} knots (Full Speed)</h4>
                </div>
                <div class="result-item">
                    <span class="result-label">Clean Hull:</span>
                    <span class="result-value">${formatCurrency(cFull.clean)}/hr</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Fouled Hull (${frLabel}):</span>
                    <span class="result-value">${formatCurrency(cFull.fouled)}/hr</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Cost Increase:</span>
                    <span class="result-value">${increaseFull}%</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Additional Cost:</span>
                    <span class="result-value">${formatCurrency(extraCostFull)}/hr</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Additional Fuel:</span>
                    <span class="result-value">${formatNumber(extraFuelFull, 1)} kg/hr</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Additional CO₂:</span>
                    <span class="result-value">${formatNumber(extraCO2Full, 1)} kg/hr</span>
                </div>
            </div>
            
            <div class="result-group">
                <div class="result-group-header">
                    <i class="fas fa-calendar-alt"></i>
                    <h4>Estimated Annual Impact</h4>
                </div>
                <div class="result-item">
                    <span class="result-label">Operating Schedule:</span>
                    <span class="result-value">12 hrs/day, 200 days/year</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Additional Fuel Cost:</span>
                    <span class="result-value">${formatCurrency(annualExtraCost)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Additional CO₂ Emissions:</span>
                    <span class="result-value">${formatNumber(annualExtraCO2, 1)} tonnes</span>
                </div>
            </div>
        `;
        
        document.getElementById("resultsText").innerHTML = resultsHtml;
        
        // Highlight active tick on slider
        document.querySelectorAll('.range-tick').forEach(tick => {
            const tickValue = parseInt(tick.getAttribute('data-value'));
            const tickDot = tick.querySelector('.tick-dot');
            
            if (tickValue === frLevel) {
                tickDot.style.backgroundColor = 'var(--primary)';
                tickDot.style.transform = 'scale(1.5)';
            } else {
                tickDot.style.backgroundColor = 'var(--neutral-500)';
                tickDot.style.transform = 'scale(1)';
            }
        });
    }
    
    function updateCalculator() {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not available, skipping chart update');
            updateResultsText(); // Still update the text results
            return;
        }
        
        const vesselType = document.getElementById("vesselType").value;
        let vessel;
        
        if (vesselType === 'custom') {
            // Show custom vessel parameters
            document.getElementById('customVesselParams').style.display = 'block';
            
            // Get custom vessel parameters
            vessel = {
                name: "Custom Vessel",
                length: parseFloat(document.getElementById("customLength").value) || 50,
                beam: parseFloat(document.getElementById("customBeam").value) || 10,
                draft: parseFloat(document.getElementById("customDraft").value) || 4,
                cb: parseFloat(document.getElementById("customCb").value) || 0.65,
                ecoSpeed: parseFloat(document.getElementById("customEcoSpeed").value) || 10,
                fullSpeed: parseFloat(document.getElementById("customFullSpeed").value) || 15,
                category: document.getElementById("vesselCategory").value || 'cargo'
            };
            
            // Calculate displacement
            const displacement = vessel.length * vessel.beam * vessel.draft * vessel.cb * 1.025;
            document.getElementById("customDisplacement").value = displacement.toFixed(0);
            
            // Calculate wetted surface area
            const wettedSurface = calculateWettedSurface(vessel.length, vessel.beam, vessel.draft, vessel.cb);
            
            // If costs aren't manually entered, estimate them
            if (!document.getElementById("costEco").value) {
                vessel.costEco = estimateFuelCost(vessel, vessel.ecoSpeed, wettedSurface);
                document.getElementById("costEco").value = Math.round(vessel.costEco);
            }
            if (!document.getElementById("costFull").value) {
                vessel.costFull = estimateFuelCost(vessel, vessel.fullSpeed, wettedSurface);
                document.getElementById("costFull").value = Math.round(vessel.costFull);
            }
        } else {
            // Hide custom vessel parameters
            document.getElementById('customVesselParams').style.display = 'none';
            vessel = vesselConfigs[vesselType];
            
            // Only update cost inputs if they're empty or if switching from custom
            const costEcoInput = document.getElementById("costEco");
            const costFullInput = document.getElementById("costFull");
            
            const previousType = document.getElementById("vesselType").getAttribute('data-previous') || '';
            
            // Check if we should update the values
            const shouldUpdate = !costEcoInput.hasAttribute('data-user-edited') || previousType === 'custom';
            
            if (shouldUpdate) {
                const costEcoConverted = currentCurrency === 'AUD' ?
                    vessel.costEco :
                    convertCurrency(vessel.costEco, 'AUD', currentCurrency);
                const costFullConverted = currentCurrency === 'AUD' ?
                    vessel.costFull :
                    convertCurrency(vessel.costFull, 'AUD', currentCurrency);

                costEcoInput.value = Math.round(costEcoConverted);
                costFullInput.value = Math.round(costFullConverted);
                
                // Remove the user-edited flag since we're setting defaults
                costEcoInput.removeAttribute('data-user-edited');
                costFullInput.removeAttribute('data-user-edited');
            }
        }
        
        // Store the current type as previous for next change
        document.getElementById("vesselType").setAttribute('data-previous', vesselType);
        
        // Get input costs in current currency
        let costEcoInput = parseFloat(document.getElementById("costEco").value);
        let costFullInput = parseFloat(document.getElementById("costFull").value);
        
        // If no user input, use vessel defaults converted to current currency
        if (!costEcoInput || isNaN(costEcoInput)) {
            costEcoInput = currentCurrency === 'AUD' ? 
                vessel.costEco : 
                convertCurrency(vessel.costEco, 'AUD', currentCurrency);
        }
        if (!costFullInput || isNaN(costFullInput)) {
            costFullInput = currentCurrency === 'AUD' ? 
                vessel.costFull : 
                convertCurrency(vessel.costFull, 'AUD', currentCurrency);
        }
        
        // Convert input costs to AUD for calculations if needed
        let costEco = currentCurrency === 'AUD' ? costEcoInput : convertCurrency(costEcoInput, currentCurrency, 'AUD');
        let costFull = currentCurrency === 'AUD' ? costFullInput : convertCurrency(costFullInput, currentCurrency, 'AUD');
        
        const frLevel = parseInt(document.getElementById("frSlider").value) || 0;
        const roughness = frKsMapping[frLevel] !== undefined ? frKsMapping[frLevel] : 0;
        
        // Update FR label
        const frLabel = `FR${frLevel}`;
        document.getElementById("frLabel").textContent = frLabel;
        
        // Calculate speed range for chart
        const minSpeed = Math.max(vessel.ecoSpeed - 4, 4);
        const maxSpeed = vessel.fullSpeed + 2;
        
        // Calculate wetted surface area
        const wettedSurface = calculateWettedSurface(vessel.length, vessel.beam, vessel.draft, vessel.cb);
        
        // Read the user-editable Cr/Cf ratio from the UI
        const userCrCf = parseFloat(document.getElementById("crCfRatio").value) || 1.5;
        
        // Calculate maximum values for fixed y-axis scaling
        // This prevents the clean hull line from appearing to change due to auto-scaling
        const { alpha, beta } = solveAlphaBeta(costEco, costFull, vessel.ecoSpeed, vessel.fullSpeed, 4.5);
        const maxCleanCost = alpha * Math.pow(maxSpeed, 3) + beta * Math.pow(maxSpeed, 4.5);
        
        // Calculate max fouled cost at FR5 (worst case) for consistent scaling
        const maxFoulingIncrease = 1.93; // FR5: 193% increase
        const maxFr = maxSpeed * 0.514444 / Math.sqrt(9.81 * vessel.length);
        const maxFr_ref = vessel.fullSpeed * 0.514444 / Math.sqrt(9.81 * vessel.length);
        const maxFrRatio = maxFr_ref > 0 ? Math.min(maxFr / maxFr_ref, 1.5) : 0;
        const maxCrCfEffective = userCrCf * maxFrRatio * maxFrRatio;
        const maxEffectiveFoulingIncrease = maxFoulingIncrease / (1 + maxCrCfEffective);
        const maxFouledCostAud = maxCleanCost * (1 + maxEffectiveFoulingIncrease);
        
        // Convert to display currency for scaling
        const maxFouledCost = currentCurrency === 'AUD' ? 
            maxFouledCostAud : 
            convertCurrency(maxFouledCostAud, 'AUD', currentCurrency);
            
        // Calculate max CO2 for secondary axis
        const maxExtraCostAud = maxFouledCostAud - maxCleanCost;
        const maxExtraFuel = maxExtraCostAud / fuelCostPerKg;
        const maxCO2 = calculateCO2FromFuel(maxExtraFuel, co2PerKgFuel);
        
        // Prepare data for chart
        const speeds = [];
        const cleanCosts = [];
        const fouledCosts = [];
        const fouledCostsLower = [];
        const fouledCostsUpper = [];
        const co2Emissions = [];
        
        // Adjust step size based on speed range for better readability
        const stepSize = (maxSpeed - minSpeed) > 8 ? 0.5 : 0.25;
        
        for (let s = minSpeed; s <= maxSpeed; s += stepSize) {
            const speedKnots = s;
            
            // Use the alpha-beta model for base costs (respecting user inputs)
            const { alpha, beta } = solveAlphaBeta(costEco, costFull, vessel.ecoSpeed, vessel.fullSpeed, 4.5);
            const baseCleanCost = alpha * Math.pow(speedKnots, 3) + beta * Math.pow(speedKnots, 4.5);
            
            // Frictional resistance increases per fouling rating (calibrated from UoM research)
            // FR0: 0%, FR1: 15%, FR2: 35%, FR3: 60%, FR4: 95%, FR5: 193%
            const foulingIncreases = [0, 0.15, 0.35, 0.60, 0.95, 1.93];
            const baseFoulingIncrease = foulingIncreases[frLevel] || 0;
            
            // Speed-dependent Cr/Cf: scale the user's value by (Fr/Fr_ref)²
            const Fr = speedKnots * 0.514444 / Math.sqrt(9.81 * vessel.length);
            const Fr_ref = vessel.fullSpeed * 0.514444 / Math.sqrt(9.81 * vessel.length);
            const frRatio = Fr_ref > 0 ? Math.min(Fr / Fr_ref, 1.5) : 0;
            const crCfEffective = userCrCf * frRatio * frRatio;
            
            // ∆RT/RT = ∆Cf/Cf / (1 + Cr/Cf)  — physics-based resistance splitting
            const effectiveFoulingIncrease = baseFoulingIncrease / (1 + crCfEffective);
            const costFouledHr = baseCleanCost * (1 + effectiveFoulingIncrease);
            
            // Calculate confidence intervals (±15% for fouling impact)
            const confidenceInterval = 0.15;
            const costFouledLower = baseCleanCost * (1 + effectiveFoulingIncrease * (1 - confidenceInterval));
            const costFouledUpper = baseCleanCost * (1 + effectiveFoulingIncrease * (1 + confidenceInterval));
            
            // Derive extra fuel and CO₂ directly from the cost delta (AUD basis)
            const extraCostAud = Math.max(0, costFouledHr - baseCleanCost);
            const extraFuel = extraCostAud / fuelCostPerKg; // kg/hr
            const co2Extra = calculateCO2FromFuel(extraFuel, co2PerKgFuel); // kg/hr
            
            speeds.push(s.toFixed(1));
            
            // Convert costs to current currency for display
            const displayCleanCost = currentCurrency === 'AUD' ? 
                baseCleanCost : 
                convertCurrency(baseCleanCost, 'AUD', currentCurrency);
                
            const displayFouledCost = currentCurrency === 'AUD' ? 
                costFouledHr : 
                convertCurrency(costFouledHr, 'AUD', currentCurrency);
                
            const displayFouledLower = currentCurrency === 'AUD' ? 
                costFouledLower : 
                convertCurrency(costFouledLower, 'AUD', currentCurrency);
                
            const displayFouledUpper = currentCurrency === 'AUD' ? 
                costFouledUpper : 
                convertCurrency(costFouledUpper, 'AUD', currentCurrency);
            
            cleanCosts.push(displayCleanCost);
            fouledCosts.push(displayFouledCost);
            fouledCostsLower.push(displayFouledLower);
            fouledCostsUpper.push(displayFouledUpper);
            co2Emissions.push(co2Extra);
        }
        
        // Update chart
        const ctx = document.getElementById("myChart");
        if (!ctx) {
            console.error("Chart canvas element not found");
            return;
        }

        // Double-check Chart.js is available before creating chart
        if (typeof Chart === 'undefined') {
            console.error("Chart.js not available for chart creation");
            return;
        }

        if (myChart) {
            myChart.destroy();
            myChart = null;
        }

        // Clear canvas explicitly
        const canvas = document.getElementById('myChart');
        if (canvas) {
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
        }

        try {
            myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: speeds,
                datasets: [
                    {
                        label: 'Clean Hull (FR0)',
                        data: cleanCosts,
                        borderColor: 'rgba(30, 77, 120, 1)',
                        backgroundColor: 'rgba(30, 77, 120, 0.1)',
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y',
                        borderWidth: 2
                    },
                    {
                        label: `Fouled Hull (${frLabel})`,
                        data: fouledCosts,
                        borderColor: 'rgba(232, 119, 34, 1)',
                        backgroundColor: 'rgba(232, 119, 34, 0.1)',
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y',
                        borderWidth: 2
                    },
                    {
                        label: 'Confidence Interval',
                        data: fouledCostsUpper,
                        borderColor: 'rgba(232, 119, 34, 0.3)',
                        backgroundColor: 'rgba(232, 119, 34, 0.05)',
                        fill: '+1',
                        tension: 0.4,
                        yAxisID: 'y',
                        borderWidth: 0,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        showLine: true
                    },
                    {
                        label: 'Confidence Lower',
                        data: fouledCostsLower,
                        borderColor: 'rgba(232, 119, 34, 0.3)',
                        backgroundColor: 'rgba(232, 119, 34, 0.05)',
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y',
                        borderWidth: 0,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        showLine: true
                    },
                    {
                        label: 'Additional CO₂ Emissions',
                        data: co2Emissions,
                        borderColor: 'rgba(16, 133, 101, 1)',
                        backgroundColor: 'rgba(16, 133, 101, 0)',
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1',
                        borderDash: [5, 5],
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                // Hide confidence interval datasets from tooltip
                                if (ctx.dataset.label === 'Confidence Interval' || 
                                    ctx.dataset.label === 'Confidence Lower') {
                                    return null;
                                }
                                if (ctx.dataset.yAxisID === 'y1') {
                                    return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} kg/hr`;
                                }
                                return `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}/hr`;
                            }
                        },
                        filter: function(tooltipItem) {
                            // Filter out confidence interval datasets
                            return tooltipItem.dataset.label !== 'Confidence Interval' && 
                                   tooltipItem.dataset.label !== 'Confidence Lower';
                        },
                        backgroundColor: 'rgba(26, 32, 44, 0.9)',
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        padding: 12,
                        borderColor: 'rgba(203, 213, 224, 0.3)',
                        borderWidth: 1
                    },
                    legend: {
                        position: 'top',
                        align: 'start',
                        labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            filter: function(legendItem) {
                                // Hide confidence interval datasets from legend
                                return legendItem.text !== 'Confidence Interval' && 
                                       legendItem.text !== 'Confidence Lower';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Speed (knots)',
                            font: { 
                                weight: 'bold',
                                size: window.innerWidth < 768 ? 10 : 12
                            },
                            color: 'rgba(74, 85, 104, 1)'
                        },
                        grid: {
                            display: true,
                            color: 'rgba(226, 232, 240, 0.6)'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: window.innerWidth < 768 ? 8 : 10
                            },
                            color: 'rgba(74, 85, 104, 0.8)',
                            callback: function(value, index, values) {
                                // Show fewer labels on small screens
                                if (window.innerWidth < 768) {
                                    return index % 2 === 0 ? this.getLabelForValue(value) : '';
                                }
                                return this.getLabelForValue(value);
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: `Operating Cost (${(currentCurrency === 'AUD' ? 'A' : currentCurrency === 'USD' ? 'US' : '')}${currencySymbols[currentCurrency]}/hr)`,
                            font: { 
                                weight: 'bold',
                                size: window.innerWidth < 768 ? 10 : 12
                            },
                            color: 'rgba(74, 85, 104, 1)'
                        },
                        beginAtZero: true,
                        min: 0,
                        max: Math.ceil(maxFouledCost * 1.1 / 500) * 500, // Round up to nearest 500 with 10% padding
                        ticks: {
                            font: {
                                size: window.innerWidth < 768 ? 8 : 10
                            },
                            color: 'rgba(74, 85, 104, 0.8)',
                            callback: function(value) {
                                return currencySymbols[currentCurrency] + Math.round(value);
                            },
                            stepSize: Math.max(500, Math.ceil(maxFouledCost * 1.1 / 10 / 500) * 500) // Nice round steps
                        },
                        grid: {
                            color: 'rgba(226, 232, 240, 0.6)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Additional CO₂ (kg/hr)',
                            font: { 
                                weight: 'bold',
                                size: window.innerWidth < 768 ? 10 : 12
                            },
                            color: 'rgba(74, 85, 104, 1)'
                        },
                        beginAtZero: true,
                        min: 0,
                        max: Math.ceil(maxCO2 * 1.1 / 50) * 50, // Round up to nearest 50 with 10% padding
                        grid: {
                            drawOnChartArea: false,
                            color: 'rgba(226, 232, 240, 0.6)'
                        },
                        ticks: {
                            font: {
                                size: window.innerWidth < 768 ? 8 : 10
                            },
                            color: 'rgba(74, 85, 104, 0.8)',
                            stepSize: Math.max(50, Math.ceil(maxCO2 * 1.1 / 10 / 50) * 50) // Nice round steps
                        }
                    }
                }
            }
        });
        
        // Update the results text after successful chart creation
        updateResultsText();
        
        } catch (error) {
            console.error('Error creating chart:', error);
            // Show error message to user
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #E87722; margin-bottom: 1rem;"></i>
                        <p><strong>Chart Error</strong></p>
                        <p>There was an error creating the chart. Please refresh the page to try again.</p>
                        <p>Error: ${error.message}</p>
                    </div>
                `;
            }
            return;
        }
        
        // Results are now handled by updateResultsText() function
    }

    function updateInputPlaceholders() {
        const vesselType = document.getElementById("vesselType").value;
        let vessel = vesselConfigs[vesselType];

        if (vesselType === 'custom') {
            // Generate default values for custom vessel
            const L = parseFloat(document.getElementById('customLength').value) || 50;
            const B = parseFloat(document.getElementById('customBeam').value) || 10;
            const T = parseFloat(document.getElementById('customDraft').value) || 4;
            const Cb = parseFloat(document.getElementById('customCb').value) || 0.65;
            const category = document.getElementById('vesselCategory').value;

            vessel = estimateVesselParameters(L, B, T, Cb, category);
        }

        const costEcoConverted = currentCurrency === 'AUD' ?
            vessel.costEco :
            convertCurrency(vessel.costEco, 'AUD', currentCurrency);

        const costFullConverted = currentCurrency === 'AUD' ?
            vessel.costFull :
            convertCurrency(vessel.costFull, 'AUD', currentCurrency);

        const costEcoInput = document.getElementById("costEco");
        const costFullInput = document.getElementById("costFull");

        if (!costEcoInput.value || vesselType === 'custom') {
            costEcoInput.value = Math.round(costEcoConverted);
        }

        if (!costFullInput.value || vesselType === 'custom') {
            costFullInput.value = Math.round(costFullConverted);
        }

        document.querySelectorAll('.help-text').forEach(helpText => {
            if (helpText.textContent.includes('fuel cost')) {
                helpText.textContent = helpText.textContent.replace(/[\$£]/g, currencySymbols[currentCurrency]);
            }
        });
    }

    function updateCurrencyPrefixes() {
        const prefixes = document.querySelectorAll('.currency-prefix');
        prefixes.forEach(prefix => {
            prefix.textContent = currencySymbols[currentCurrency];
        });
    }

    // Event listeners
    document.getElementById("vesselType").addEventListener("change", function () {
        const vesselType = this.value;
        const customParams = document.getElementById('customVesselParams');
        const previousType = this.getAttribute('data-previous') || '';

        if (vesselType === 'custom') {
            customParams.style.display = 'block';
            updateCustomVesselCalculations();
            // Set Cr/Cf default based on selected category
            const categoryCrCfDefaults = { cargo: 1.0, container: 1.5, cruise: 1.5, naval: 2.5, workboat: 3.0, yacht: 2.0 };
            const category = document.getElementById('vesselCategory').value || 'cargo';
            document.getElementById("crCfRatio").value = categoryCrCfDefaults[category] || 1.5;
        } else {
            customParams.style.display = 'none';
            const config = vesselConfigs[vesselType];
            
            // Load vessel-specific Cr/Cf default
            document.getElementById("crCfRatio").value = config.crCf || 1.5;
            
            // Only update costs if user hasn't manually edited them
            const costEcoInput = document.getElementById("costEco");
            const costFullInput = document.getElementById("costFull");
            
            // Check if we should update the values
            const shouldUpdate = !costEcoInput.hasAttribute('data-user-edited') || previousType === 'custom';
            
            if (shouldUpdate) {
                const costEcoConverted = currentCurrency === 'AUD' ?
                    config.costEco :
                    convertCurrency(config.costEco, 'AUD', currentCurrency);
                const costFullConverted = currentCurrency === 'AUD' ?
                    config.costFull :
                    convertCurrency(config.costFull, 'AUD', currentCurrency);

                costEcoInput.value = Math.round(costEcoConverted);
                costFullInput.value = Math.round(costFullConverted);
                
                // Remove the user-edited flag since we're setting defaults
                costEcoInput.removeAttribute('data-user-edited');
                costFullInput.removeAttribute('data-user-edited');
            }
        }
        
        // Store the current type as previous for next change
        this.setAttribute('data-previous', vesselType);

        updateCalculator();
    });

    // Custom vessel input listeners
    document.getElementById('customLength').addEventListener('input', function () {
        updateCustomVesselCalculations();
        updateInputPlaceholders();
        updateCalculator();
    });

    document.getElementById('customBeam').addEventListener('input', function () {
        updateCustomVesselCalculations();
        updateInputPlaceholders();
        updateCalculator();
    });

    document.getElementById('customDraft').addEventListener('input', function () {
        updateCustomVesselCalculations();
        updateInputPlaceholders();
        updateCalculator();
    });

    document.getElementById('customCb').addEventListener('input', function () {
        updateCustomVesselCalculations();
        updateInputPlaceholders();
        updateCalculator();
    });

    document.getElementById('vesselCategory').addEventListener('change', function () {
        // Update Cr/Cf default when custom vessel category changes
        const categoryCrCfDefaults = { cargo: 1.0, container: 1.5, cruise: 1.5, naval: 2.5, workboat: 3.0, yacht: 2.0 };
        document.getElementById("crCfRatio").value = categoryCrCfDefaults[this.value] || 1.5;
        updateInputPlaceholders();
        updateCalculator();
    });

    document.getElementById('customEcoSpeed').addEventListener("input", updateCalculator);
    document.getElementById('customFullSpeed').addEventListener("input", updateCalculator);

    // Cr/Cf ratio input listener
    document.getElementById("crCfRatio").addEventListener("input", updateCalculator);

    document.getElementById("costEco").addEventListener("input", function() {
        this.setAttribute('data-user-edited', 'true');
        updateCalculator();
    });
    
    document.getElementById("costFull").addEventListener("input", function() {
        this.setAttribute('data-user-edited', 'true');
        updateCalculator();
    });

    document.getElementById("frSlider").addEventListener("input", updateCalculator);

    document.getElementById("currencySelect").addEventListener("change", function () {
        const newCurrency = this.value;
        const oldCurrency = currentCurrency;

        if (newCurrency === oldCurrency) return;

        const costEcoInput = parseFloat(document.getElementById("costEco").value) || 0;
        const costFullInput = parseFloat(document.getElementById("costFull").value) || 0;

        currentCurrency = newCurrency;
        updateCurrencyPrefixes();

        if (costEcoInput > 0) {
            const convertedCostEco = convertCurrency(costEcoInput, oldCurrency, newCurrency);
            document.getElementById("costEco").value = Math.round(convertedCostEco);
        }

        if (costFullInput > 0) {
            const convertedCostFull = convertCurrency(costFullInput, oldCurrency, newCurrency);
            document.getElementById("costFull").value = Math.round(convertedCostFull);
        }

        updateInputPlaceholders();
        updateCalculator();
    });

    document.querySelectorAll('.range-tick').forEach(tick => {
        tick.addEventListener('click', function () {
            const value = this.getAttribute('data-value');
            document.getElementById('frSlider').value = value;
            updateCalculator();
        });
    });

    window.addEventListener('resize', function () {
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer && myChart) {
            setTimeout(() => {
                myChart.resize();
                updateCalculator();
            }, 100);
        } else {
            updateCalculator();
        }
    });

    // Initialize
    const initialVessel = vesselConfigs[document.getElementById("vesselType").value];
    document.getElementById("costEco").value = initialVessel.costEco;
    document.getElementById("costFull").value = initialVessel.costFull;
    document.getElementById("crCfRatio").value = initialVessel.crCf || 1.5;
    updateInputPlaceholders();
    updateCurrencyPrefixes();
    
    // Ensure Chart is loaded, then render; if it fails, still show text results
    loadChartJsIfNeeded().then(() => {
        updateCalculator();
    });

    window.calculatorInitialized = true;
}


// This calculator now runs as a standalone page