/**
 * Hull Biofouling ID Guide - JavaScript
 * MarineStream
 */

// =============================================
// Region Selector
// =============================================

const regionData = {
    wa: {
        name: 'Western Australia',
        shortName: 'WA',
        icon: '🦘'
    },
    nsw: {
        name: 'New South Wales',
        shortName: 'NSW',
        icon: '🌊'
    },
    vic: {
        name: 'Victoria',
        shortName: 'VIC',
        icon: '⭐'
    },
    tas: {
        name: 'Tasmania',
        shortName: 'TAS',
        icon: '🏔️'
    },
    qld: {
        name: 'Queensland',
        shortName: 'QLD',
        icon: '☀️'
    },
    sa: {
        name: 'South Australia',
        shortName: 'SA',
        icon: '🍷'
    },
    nt: {
        name: 'Northern Territory',
        shortName: 'NT',
        icon: '🐊'
    },
    sl: {
        name: 'Sri Lanka',
        shortName: 'SL',
        icon: '🇱🇰'
    }
};

function setRegion(region) {
    // Update body data attribute
    document.body.setAttribute('data-region', region);
    
    // Update region badge in hero
    const badgeText = document.getElementById('region-badge-text');
    if (badgeText) {
        badgeText.textContent = regionData[region].name;
        badgeText.parentElement.style.animation = 'none';
        badgeText.parentElement.offsetHeight;
        badgeText.parentElement.style.animation = 'fadeInUp 0.3s ease';
    }
    
    // Update header dropdown
    const dropdownText = document.getElementById('region-dropdown-text');
    const dropdownIcon = document.getElementById('region-dropdown-icon');
    if (dropdownText) dropdownText.textContent = regionData[region].shortName;
    if (dropdownIcon) dropdownIcon.textContent = regionData[region].icon;
    
    // Update dropdown menu active state
    document.querySelectorAll('.region-dropdown-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-region') === region) {
            item.classList.add('active');
        }
    });
    
    // Update hero subtitle
    const regionTextSpans = document.querySelectorAll('.region-text');
    regionTextSpans.forEach(span => {
        span.textContent = regionData[region].shortName;
    });
    
    // Re-label regulatory badges for regions without local legal classifications
    applyRegionLabels(region);

    // Store preference in localStorage
    localStorage.setItem('biofouling-region', region);

    // Close dropdown if open
    closeRegionDropdown();
}

// For non-Australian regions (e.g. Sri Lanka) the Australian legal status badges
// ("NOXIOUS", "PROHIBITED", etc.) and "... WA Noxious Listed" group labels are
// not accurate. Rather than duplicate every species card, we relabel the visible
// invasive badges to generic risk wording and restore the originals when an
// Australian region is selected again.
function applyRegionLabels(region) {
    const isSL = region === 'sl';

    document.querySelectorAll('.species-card.invasive .priority').forEach(el => {
        if (el.dataset.origLabel === undefined) el.dataset.origLabel = el.textContent.trim();
        if (isSL) {
            if (el.classList.contains('high')) el.textContent = 'HIGH RISK';
            else if (el.classList.contains('medium')) el.textContent = 'WATCH';
            else el.textContent = el.dataset.origLabel;
        } else {
            el.textContent = el.dataset.origLabel;
        }
    });

    document.querySelectorAll('.species-card.invasive .species-group').forEach(el => {
        if (el.dataset.origLabel === undefined) el.dataset.origLabel = el.textContent.trim();
        if (isSL) {
            const taxon = el.dataset.origLabel.split('•')[0].trim();
            el.textContent = taxon + ' • IMS — Sri Lanka concern';
        } else {
            el.textContent = el.dataset.origLabel;
        }
    });
}

// Select region from modal (first visit)
function selectRegionFromModal(region) {
    setRegion(region);
    localStorage.setItem('biofouling-region-selected', 'true');
    closeRegionModal();
}

// Region modal functions
function showRegionModal() {
    const modal = document.getElementById('region-modal');
    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeRegionModal() {
    const modal = document.getElementById('region-modal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Region dropdown functions
function toggleRegionDropdown() {
    const dropdown = document.getElementById('region-dropdown');
    if (dropdown) dropdown.classList.toggle('open');
}

function closeRegionDropdown() {
    const dropdown = document.getElementById('region-dropdown');
    if (dropdown) dropdown.classList.remove('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('region-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        closeRegionDropdown();
    }
});

// Initialize region
function initRegion() {
    const savedRegion = localStorage.getItem('biofouling-region') || 'sl';
    
    // Set the region
    setRegion(savedRegion);
    
}

// Run on page load
document.addEventListener('DOMContentLoaded', initRegion);

// =============================================
// Species Search Filter
// =============================================

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

// =============================================
// Smooth Scrolling for Navigation
// =============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// =============================================
// Image Error Handling with Placeholders
// =============================================

document.querySelectorAll('.species-image img').forEach(img => {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    const speciesName = img.alt || 'Species';
    placeholder.innerHTML = '<div class="placeholder-icon">🔍</div><div>' + speciesName + '</div><div style="font-size:0.75rem;margin-top:5px;">Image not available</div>';
    img.parentNode.appendChild(placeholder);
    
    img.addEventListener('error', function() {
        this.classList.add('error');
    });
    if (img.complete && img.naturalHeight === 0) {
        img.classList.add('error');
    }
});

// =============================================
// Species Gallery Modal
// =============================================

const galleryOverlay = document.getElementById('gallery-overlay');
const galleryHeader = document.getElementById('gallery-header');
const galleryTitle = document.getElementById('gallery-title');
const galleryScientific = document.getElementById('gallery-scientific');
const galleryImage = document.getElementById('gallery-image');
const galleryDescription = document.getElementById('gallery-description');
const galleryFeatures = document.getElementById('gallery-features');
const galleryLookalike = document.getElementById('gallery-lookalike');
const galleryThumbnails = document.getElementById('gallery-thumbnails');
const galleryClose = document.getElementById('gallery-close');

// Function to set main image and update active thumbnail
function setGalleryImage(src, alt, index) {
    galleryImage.src = src;
    galleryImage.alt = alt;
    // Update active thumbnail by index
    document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
        thumb.classList.remove('active');
        if (i === index) {
            thumb.classList.add('active');
        }
    });
}

// Open modal when clicking a species card
document.querySelectorAll('.species-card').forEach(card => {
    card.addEventListener('click', function() {
        // Get species info from card
        const name = this.querySelector('.species-name').textContent;
        const scientific = this.querySelector('.species-scientific').textContent;
        const descEl = this.querySelector('.species-description');
        const description = descEl ? descEl.textContent : '';
        const img = this.querySelector('.species-image img');
        const imgSrc = img ? img.src : '';
        const imgAlt = img ? img.alt : name;
        
        // Get multiple images if available
        const imagesData = this.getAttribute('data-images');
        const images = imagesData ? imagesData.split(',').map(s => s.trim()) : [];
        
        // Get features list
        const featuresList = this.querySelector('.species-features ul');
        const featuresHTML = featuresList ? '<h4>How to Spot It</h4>' + featuresList.outerHTML : '';
        
        // Get lookalike info if present
        const lookalikeBox = this.querySelector('.lookalike-box');
        const lookalikeHTML = lookalikeBox ? lookalikeBox.innerHTML : '';
        
        // Determine priority/type for header color
        galleryHeader.className = 'gallery-header';
        if (this.classList.contains('invasive')) {
            const priority = this.querySelector('.priority');
            if (priority && priority.classList.contains('high')) {
                galleryHeader.classList.add('high-priority');
            } else {
                galleryHeader.classList.add('medium-priority');
            }
        } else if (this.classList.contains('native')) {
            galleryHeader.classList.add('native');
        } else if (this.classList.contains('niche-species')) {
            galleryHeader.classList.add('niche');
        }
        
        // Populate modal
        galleryTitle.textContent = name;
        galleryScientific.textContent = scientific;
        galleryImage.src = imgSrc;
        galleryImage.alt = imgAlt;
        if (galleryDescription) galleryDescription.textContent = description;
        galleryFeatures.innerHTML = featuresHTML;
        
        // Handle multiple images - show thumbnails if 2+ images
        if (images.length > 1 && galleryThumbnails) {
            galleryThumbnails.innerHTML = '';
            images.forEach((imageSrc, index) => {
                const thumb = document.createElement('img');
                thumb.src = imageSrc;
                thumb.alt = imgAlt + ' - Photo ' + (index + 1);
                thumb.className = 'gallery-thumb' + (index === 0 ? ' active' : '');
                thumb.dataset.index = index;
                thumb.addEventListener('click', function() {
                    setGalleryImage(this.src, this.alt, parseInt(this.dataset.index));
                });
                galleryThumbnails.appendChild(thumb);
            });
            galleryThumbnails.style.display = 'flex';
            // Set main image to first in the array
            galleryImage.src = images[0];
        } else if (galleryThumbnails) {
            galleryThumbnails.style.display = 'none';
            galleryThumbnails.innerHTML = '';
        }
        
        if (lookalikeHTML && galleryLookalike) {
            galleryLookalike.innerHTML = lookalikeHTML;
            galleryLookalike.style.display = 'block';
        } else if (galleryLookalike) {
            galleryLookalike.style.display = 'none';
        }
        
        // Show modal
        galleryOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
});

// Close modal function
function closeGallery() {
    galleryOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Close button click
galleryClose.addEventListener('click', closeGallery);

// Click outside to close
galleryOverlay.addEventListener('click', function(e) {
    if (e.target === galleryOverlay) {
        closeGallery();
    }
});

// Escape key to close
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && galleryOverlay.classList.contains('active')) {
        closeGallery();
    }
});

