/**
 * Hull Biofouling ID Guide - JavaScript
 * MarineStream — Sri Lanka edition
 */

const regionData = {
    sl: {
        name: 'Sri Lanka',
        shortName: 'SL',
        icon: '🇱🇰'
    }
};

function setRegion() {
    const region = 'sl';
    document.body.setAttribute('data-region', region);

    document.querySelectorAll('.region-text').forEach(span => {
        span.textContent = regionData.sl.name;
    });

    applyRegionLabels();
    localStorage.setItem('biofouling-region', region);
}

function applyRegionLabels() {
    document.querySelectorAll('.species-card.invasive .priority').forEach(el => {
        if (el.dataset.origLabel === undefined) el.dataset.origLabel = el.textContent.trim();
        if (el.classList.contains('high')) el.textContent = 'HIGH RISK';
        else if (el.classList.contains('medium')) el.textContent = 'WATCH';
        else el.textContent = el.dataset.origLabel;
    });

    document.querySelectorAll('.species-card.invasive .species-group').forEach(el => {
        if (el.dataset.origLabel === undefined) el.dataset.origLabel = el.textContent.trim();
        const taxon = el.dataset.origLabel.split('•')[0].trim();
        el.textContent = taxon + ' • IMS — Sri Lanka concern';
    });
}

function initRegion() {
    localStorage.setItem('biofouling-region', 'sl');
    setRegion();
}

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

function setGalleryImage(src, alt, index) {
    galleryImage.src = src;
    galleryImage.alt = alt;
    document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
        thumb.classList.remove('active');
        if (i === index) {
            thumb.classList.add('active');
        }
    });
}

document.querySelectorAll('.species-card').forEach(card => {
    card.addEventListener('click', function() {
        const name = this.querySelector('.species-name').textContent;
        const scientific = this.querySelector('.species-scientific').textContent;
        const descEl = this.querySelector('.species-description');
        const description = descEl ? descEl.textContent : '';
        const img = this.querySelector('.species-image img');
        const imgSrc = img ? img.src : '';
        const imgAlt = img ? img.alt : name;

        const imagesData = this.getAttribute('data-images');
        const images = imagesData ? imagesData.split(',').map(s => s.trim()) : [];

        const featuresList = this.querySelector('.species-features ul');
        const featuresHTML = featuresList ? '<h4>How to Spot It</h4>' + featuresList.outerHTML : '';

        const lookalikeBox = this.querySelector('.lookalike-box');
        const lookalikeHTML = lookalikeBox ? lookalikeBox.innerHTML : '';

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

        galleryTitle.textContent = name;
        galleryScientific.textContent = scientific;
        galleryImage.src = imgSrc;
        galleryImage.alt = imgAlt;
        if (galleryDescription) galleryDescription.textContent = description;
        galleryFeatures.innerHTML = featuresHTML;

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

        galleryOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
});

function closeGallery() {
    galleryOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

galleryClose.addEventListener('click', closeGallery);

galleryOverlay.addEventListener('click', function(e) {
    if (e.target === galleryOverlay) {
        closeGallery();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && galleryOverlay.classList.contains('active')) {
        closeGallery();
    }
});
