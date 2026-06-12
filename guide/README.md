<p align="center">
  <img src="assets/marinestream_logo_white.png" alt="MarineStream" height="60" style="background:#003366;padding:10px;border-radius:8px;">
</p>

<h1 align="center">🦪 Hull Biofouling Identification Guide</h1>

<p align="center">
  <strong>A visual field guide for identifying invasive marine species on vessel hulls</strong><br>
  <em>Developed for commercial divers across Australia</em>
</p>

<p align="center">
  <a href="#-for-marine-scientists">For Scientists</a> •
  <a href="#-for-developers">For Developers</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-species-covered">Species List</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0-blue?style=flat-square" alt="Version 2.0">
  <img src="https://img.shields.io/badge/December-2025-green?style=flat-square" alt="December 2025">
  <img src="https://img.shields.io/badge/Regions-All_Australian_States-orange?style=flat-square" alt="All Australian States">
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=flat-square" alt="Proprietary">
</p>

---

## 🔬 For Marine Scientists

### Purpose & Scope

This guide serves as a **rapid visual identification tool** for biofouling organisms commonly encountered during in-water hull cleaning operations. It bridges the gap between scientific taxonomy and practical field identification, enabling commercial divers to:

- **Distinguish invasive species from native fouling communities**
- **Apply appropriate biosecurity response protocols**
- **Document and report potential pest incursions**

### Taxonomic Coverage

The guide covers **25+ species** across key biofouling taxa:

| Taxonomic Group | Invasive Species | Native Species |
|-----------------|------------------|----------------|
| **Ascidiacea** (Sea Squirts) | *Didemnum vexillum*, *D. perlucidum*, *Styela clava*, *S. plicata*, *Ciona intestinalis* | *Cnemidocarpa* spp., Native Didemnidae |
| **Bivalvia** (Mussels/Oysters) | *Perna viridis*, *P. perna*, *P. canaliculus*, *Mytilopsis sallei*, *Magallana gigas* | *Mytilus galloprovincialis*, *Trichomya hirsuta*, *Saccostrea glomerata* |
| **Polychaeta** (Tube Worms) | *Sabella spallanzanii* | Serpulidae, Spirorbidae, *Galeolaria caespitosa* |
| **Phaeophyceae** (Brown Algae) | *Undaria pinnatifida* | *Hincksia* spp. |
| **Chlorophyta** (Green Algae) | *Caulerpa taxifolia* | *Ulva australis*, *Cladophora* spp. |
| **Bryozoa** | — | *Bugula* spp., *Watersipora* spp., *Celleporaria* spp. |
| **Malacostraca** (Crabs) | *Carcinus maenas*, *Charybdis japonica*, *Eriocheir sinensis* | — |
| **Asteroidea** (Sea Stars) | *Asterias amurensis* | — |

### Regional Biosecurity Context

The guide incorporates **jurisdiction-specific** biosecurity frameworks for all Australian states:

| Region | Regulatory Authority | Priority Pests |
|--------|---------------------|----------------|
| **Western Australia** | DPIRD WA | *D. vexillum* (established HMAS Stirling), *D. perlucidum* |
| **New South Wales** | NSW DPI | *Caulerpa taxifolia* (CLASS 1 NOXIOUS), *A. amurensis* (PROHIBITED) |
| **Victoria** | Agriculture Victoria | *A. amurensis* (established Port Phillip Bay) |
| **Tasmania** | Biosecurity Tasmania | *A. amurensis*, *U. pinnatifida* |
| **Queensland** | Biosecurity Queensland | Asian paddle crab (White Spot Syndrome vector) |
| **South Australia** | PIRSA | *S. spallanzanii*, *U. pinnatifida* |
| **Northern Territory** | NT DEPWS | Tropical invasive bivalves |

### Identification Methodology

Each species entry includes:

1. **Morphological Descriptors** — Key visual characteristics for rapid field ID
2. **Size Reference** — Typical dimensions with anatomical landmarks
3. **Lookalike Differentiation** — Side-by-side comparisons with similar natives
4. **Biosecurity Priority** — HIGH (stop work) / MEDIUM (24hr report) / LOW (log only)
5. **Regional Notes** — State-specific establishment status and reporting requirements

### Scientific Data Sources

- **NIMPIS** — National Introduced Marine Pest Information System
- **DAFF** — Department of Agriculture, Fisheries and Forestry
- **State Biosecurity Agencies** — DPIRD, NSW DPI, Agriculture VIC, Biosecurity TAS
- **CSIRO Marine & Atmospheric Research**
- **Primary Literature** — Taxonomy validated against current nomenclature (WoRMS)

### Reporting Protocols

The guide integrates with Australia's marine pest reporting infrastructure:

```
🔴 HIGH PRIORITY DETECTION
├── STOP in-water operations in affected area
├── Photographic documentation (macro + context, scale reference)
├── GPS coordinates of detection
├── Contact Exotic Marine Pest Hotline: 1800 900 090 (24/7)
└── State agency notification within same operational day

🟠 MEDIUM PRIORITY DETECTION  
├── Complete current work area
├── Document detection with photos and location
└── Report via marinepests.gov.au within 24 hours

🟢 NATIVE SPECIES
└── No reporting required — normal fouling community
```

### Citation

> MarineStream. (2025). *Hull Biofouling Identification Guide* (Version 2.0). Franmarine Underwater Services. Retrieved from [project repository]

---

## 💻 For Developers

### Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                    BIOFOULING ID GUIDE                  │
├─────────────────────────────────────────────────────────┤
│  Frontend          │  Pure HTML5 / CSS3 / Vanilla JS   │
│  Fonts             │  Google Fonts (Inter, Bitter,     │
│                    │  Source Sans 3)                   │
│  State Management  │  LocalStorage (region prefs)      │
│  Print Layouts     │  CSS @page, @media print          │
│  Dependencies      │  Zero (fully self-contained)      │
│  Build System      │  None required                    │
└─────────────────────────────────────────────────────────┘
```

### Project Architecture

```
BiofoulingIdGuide/
├── index.html              # Main interactive web application
├── script.js               # Core JavaScript functionality
├── style.css               # Shared stylesheet (1100+ lines)
│
├── A3Poster.html           # WA - Printable A3 landscape wall poster
├── A3Poster-NSW.html       # NSW variant
├── A3Poster-VIC.html       # VIC variant
├── A3Poster-TAS.html       # TAS variant
├── A3Poster-QLD.html       # QLD variant
├── A3Poster-SA.html        # SA variant
├── A3Poster-NT.html        # NT variant
│
├── A5Booklet.html          # WA - Printable A5 pocket booklet (16 pages)
├── A5Booklet-NSW.html      # NSW variant
├── A5Booklet-VIC.html      # VIC variant
├── A5Booklet-TAS.html      # TAS variant
├── A5Booklet-QLD.html      # QLD variant
├── A5Booklet-SA.html       # SA variant
├── A5Booklet-NT.html       # NT variant
│
├── assets/
│   ├── marinestream_logo_white.png
│   ├── favicon.ico
│   └── [species images - .jpg, .png, .webp]
│
├── WA_Hull_Fouling_Species.xlsx    # Source data spreadsheet
└── README.md
```

### Key Features

#### 1. Region-Aware Content System

The application uses a CSS class-based content switching mechanism with JS coordination:

```javascript
// Region data structure (script.js)
const regionData = {
    wa:  { name: 'Western Australia', shortName: 'WA', icon: '🦘' },
    nsw: { name: 'New South Wales',   shortName: 'NSW', icon: '🌊' },
    vic: { name: 'Victoria',          shortName: 'VIC', icon: '⭐' },
    tas: { name: 'Tasmania',          shortName: 'TAS', icon: '🏔️' },
    qld: { name: 'Queensland',        shortName: 'QLD', icon: '☀️' },
    sa:  { name: 'South Australia',   shortName: 'SA', icon: '🍷' },
    nt:  { name: 'Northern Territory', shortName: 'NT', icon: '🐊' }
};
```

```css
/* CSS visibility rules (style.css) */
body[data-region="nsw"] .wa-content  { display: none !important; }
body[data-region="nsw"] .nsw-content { display: block !important; }
```

```html
<!-- HTML content switching pattern -->
<p class="region-content wa-content">WA-specific text here</p>
<p class="region-content nsw-content" style="display:none;">NSW-specific text</p>
```

#### 2. Species Gallery Modal

Interactive image viewer with multi-image carousel support:

```javascript
// Species cards store multiple images in data attributes
<div class="species-card" data-images="assets/img1.jpg,assets/img2.jpg,assets/img3.jpg">

// Modal populates dynamically from card click events
document.querySelectorAll('.species-card').forEach(card => {
    card.addEventListener('click', function() {
        const imagesData = this.getAttribute('data-images');
        const images = imagesData ? imagesData.split(',').map(s => s.trim()) : [];
        // ... populate modal with thumbnails
    });
});
```

#### 3. Print Optimization

Both A3 Poster and A5 Booklet use precise CSS print layouts:

```css
/* A5 Booklet - Prints on A4 landscape, 2-up */
@page {
    size: 297mm 210mm; /* A4 Landscape */
    margin: 0;
}

.a4-sheet {
    width: 297mm;
    height: 210mm;
    display: flex;
    page-break-after: always;
}

.page {
    width: 148.5mm;  /* Half of A4 = A5 */
    height: 210mm;
}
```

```css
/* A3 Poster - Single landscape page */
@page {
    size: A3 landscape;
    margin: 8mm;
}

.poster {
    width: 420mm;
    height: 297mm;
}
```

#### 4. Search & Filter

Real-time species filtering across categories:

```javascript
function filterSpecies(type) {
    const searchInput = document.getElementById(type + '-search').value.toLowerCase();
    const grid = document.getElementById(type + '-grid');
    const cards = grid.querySelectorAll('.species-card');
    
    cards.forEach(card => {
        const searchData = card.getAttribute('data-name').toLowerCase();
        const content = card.textContent.toLowerCase();
        if (searchData.includes(searchInput) || content.includes(searchInput)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}
```

### CSS Architecture

The stylesheet follows a modular structure:

| Section | Lines | Purpose |
|---------|-------|---------|
| CSS Variables | 1-19 | Brand colors, spacing tokens |
| Region Modal | 40-144 | First-visit region selection overlay |
| Region Dropdown | 145-232 | Header navigation dropdown |
| Region Content Rules | 267-328 | Visibility switching by state |
| Header/Hero | 348-394 | Navigation and hero section |
| Species Cards | 493-598 | Main content card system |
| Gallery Modal | 891-1047 | Image lightbox system |
| Print Styles | 852-856 | Print-specific overrides |
| Responsive | 815-826, 1094-1120 | Mobile breakpoints |

### Running Locally

```bash
# No build step required - open directly in browser
# Option 1: File system
open index.html

# Option 2: Local server (recommended for development)
npx serve .
# or
python -m http.server 8000
# or
php -S localhost:8000
```

### Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 90+ | ✅ Full | Recommended for printing |
| Edge 90+ | ✅ Full | Recommended for printing |
| Firefox 88+ | ✅ Full | |
| Safari 14+ | ✅ Full | |
| Mobile Chrome | ✅ Full | Responsive design |
| Mobile Safari | ✅ Full | Responsive design |

### Print Instructions

#### A3 Poster
1. Open `A3Poster.html` (or region variant) in Chrome/Edge
2. Press `Ctrl+P` / `Cmd+P`
3. Select paper size: **A3**
4. Orientation: **Landscape**
5. Enable: **"Background graphics"**
6. Print → Laminate for durability

#### A5 Booklet
1. Open `A5Booklet.html` (or region variant) in Chrome/Edge
2. Press `Ctrl+P` / `Cmd+P`
3. Select paper size: **A4**
4. Orientation: **Landscape**
5. Enable: **"Background graphics"**
6. Pages: Print all 8 sheets
7. Fold and staple at center to create booklet

### Extending the Guide

#### Adding a New Species

1. Add species images to `assets/`
2. Create new species card in appropriate section of `index.html`:

```html
<div class="species-card invasive" 
     data-name="scientific name common name" 
     data-images="assets/img1.jpg,assets/img2.jpg">
    <div class="species-image">
        <img src="assets/img1.jpg" alt="Species Name">
    </div>
    <div class="species-content">
        <div class="species-header">
            <div>
                <div class="species-name">Common Name</div>
                <div class="species-scientific">Genus species</div>
            </div>
            <span class="priority high">HIGH</span>
        </div>
        <span class="species-group">Taxonomic Group</span>
        <p class="species-description">Description text...</p>
        <div class="species-features">
            <h4>How to Spot It</h4>
            <ul>
                <li>Feature 1</li>
                <li>Feature 2</li>
            </ul>
        </div>
    </div>
</div>
```

3. Update regional variants (A3Poster-*.html, A5Booklet-*.html) if applicable

#### Adding a New Region

1. Add region to `regionData` object in `script.js`
2. Add CSS visibility rules in `style.css` for new region class
3. Add region option to modal and dropdown in `index.html`
4. Create region-specific poster and booklet variants

### Performance Notes

- **No external dependencies** — loads instantly, works offline
- **Lazy image loading** — consider adding `loading="lazy"` for large galleries
- **CSS-only interactions** — minimal JS, maximum performance
- **Print-optimized assets** — images sized for print resolution (300dpi)

---

## 🚀 Quick Start

```bash
# Clone or download the project
git clone <repository-url>

# Open the main guide
open index.html

# Or use a local server
npx serve .
```

**That's it!** No npm install, no build step, no configuration.

---

## 📊 Species Covered

### 🔴 HIGH Priority (Stop & Report Immediately)

| Species | Common Name | Key ID Features |
|---------|-------------|-----------------|
| *Didemnum vexillum* | Carpet Sea Squirt | Creamy-tan mat, veiny texture, dripping tendrils |
| *Didemnum perlucidum* | White Colonial Sea Squirt | White/translucent thin sheets |
| *Perna viridis* | Asian Green Mussel | Bright emerald green shell, 80-165mm |
| *Mytilopsis sallei* | Black-striped False Mussel | Small (25mm), dark stripes, dense clusters |
| *Sabella spallanzanii* | European Fan Worm | Large spiral fan (45-60mm), striped, brown leathery tube |
| *Caulerpa taxifolia* | Killer Algae | Bright green feathery fronds |
| *Asterias amurensis* | Northern Pacific Seastar | Large (50cm), 5 upturned arms, yellow-orange |

### 🟠 MEDIUM Priority (Report within 24 hours)

| Species | Common Name | Key ID Features |
|---------|-------------|-----------------|
| *Perna perna* | Brown Mussel | Dark brown/black, up to 90mm, thick clusters |
| *Perna canaliculus* | NZ Green-lipped Mussel | Green lip on shell edge, massive (up to 240mm) |
| *Magallana gigas* | Pacific Oyster | Irregular shell, sharp frilly edges |
| *Styela clava* | Stalked Sea Squirt | Brown pickle on stalk, leathery wrinkled |
| *Styela plicata* | Pleated Sea Squirt | Grey-brown, ridged like brain |
| *Ciona intestinalis* | Vase Tunicate | Translucent yellow-green tube, soft |
| *Undaria pinnatifida* | Japanese Kelp (Wakame) | Brown fronds with midrib, wavy edges |
| *Carcinus maenas* | European Shore Crab | Green shell, 5 spines each side of eyes |
| *Charybdis japonica* | Asian Paddle Crab | Paddle-shaped rear legs, 6 spines between eyes |

### 🟢 Native Species (No Report Required)

*Mytilus galloprovincialis*, *Balanidae*, *Megabalanus* spp., Serpulidae, *Galeolaria caespitosa*, *Bugula* spp., *Watersipora* spp., *Celleporaria* spp., Demospongiae, *Cnemidocarpa* spp., *Ulva australis*, *Cladophora* spp., *Hincksia* spp., *Gracilaria* spp., *Trichomya hirsuta*, *Saccostrea glomerata*

---

## 📞 Emergency Contacts

| Contact | Number | When to Call |
|---------|--------|--------------|
| **DAFF Exotic Marine Pest Hotline** | **1800 900 090** | 24/7 — Any suspected pest detection |
| **DPIRD WA Pest Watch** | 1800 084 881 | WA state-level reporting |
| **NSW DPI Aquatic Biosecurity** | 1300 795 299 | NSW detections |
| **Online Reporting** | marinepests.gov.au/report | Non-urgent reports |

---

## 👥 Team

**Franmarine Underwater Services / MarineStream**

| Role | Contact |
|------|---------|
| **Developer & Marine Scientist** | Mat Harvey — [GitHub](https://github.com/mathew-harvey) |
| **Biofouling Manager** | Mat Harvey |
| **Operations Manager** | Sam Diamond |

---

## 📄 Version History

| Version | Date | Changes |
|---------|------|---------|
| **2.0** | December 2025 | Hull-specific species list, multi-region support, A5 booklet format, simplified diver-friendly language, native comparison species |
| **1.0** | November 2025 | Initial release, WA focus |

---

<p align="center">
  <strong>🦪 Remember: If in doubt, report it.</strong><br>
  <em>Better to call and check than let a pest through.</em>
</p>

<p align="center">
  <sub>© 2025 MarineStream / Franmarine Underwater Services</sub>
</p>
