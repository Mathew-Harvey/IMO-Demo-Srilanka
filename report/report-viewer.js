(function () {
    'use strict';

    var PDF_URL = '../SriLanka%20Demo%20Biofouling%20Hull%20Inspection%20Report_compressed%20(2).pdf';
    var REPORT_URL = window.location.href.split('#')[0];

    var loadingEl = document.getElementById('loading');
    var pagesWrap = document.getElementById('pages-wrap');
    var errorEl = document.getElementById('error-state');
    var scrollEl = document.getElementById('viewer-scroll');
    var pageIndicator = document.getElementById('page-indicator');
    var btnPrev = document.getElementById('btn-prev');
    var btnNext = document.getElementById('btn-next');
    var btnZoomIn = document.getElementById('btn-zoom-in');
    var btnZoomOut = document.getElementById('btn-zoom-out');
    var btnFit = document.getElementById('btn-fit');

    var qrModal = document.getElementById('qr-modal');
    var qrCanvas = document.getElementById('qr-canvas');
    var qrUrl = document.getElementById('qr-url');
    var qrToast = document.getElementById('qr-toast');
    var qrReady = false;

    var pdfDoc = null;
    var totalPages = 0;
    var scale = 1;
    var baseScale = 1;
    var pageShells = [];
    var currentPage = 1;
    var renderTasks = [];
    var scrollingProgrammatically = false;

    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    function showToast(msg) {
        qrToast.textContent = msg;
        qrToast.classList.add('show');
        setTimeout(function () { qrToast.classList.remove('show'); }, 2200);
    }

    function showError() {
        loadingEl.hidden = true;
        pagesWrap.hidden = true;
        errorEl.hidden = false;
    }

    function getContainerWidth() {
        return Math.min(920, scrollEl.clientWidth * 0.94);
    }

    function updatePageIndicator() {
        pageIndicator.textContent = totalPages ? currentPage + ' / ' + totalPages : '—';
        btnPrev.disabled = currentPage <= 1;
        btnNext.disabled = currentPage >= totalPages;
    }

    function scrollToPage(num) {
        var shell = pageShells[num - 1];
        if (!shell) return;
        currentPage = num;
        updatePageIndicator();

        var top = scrollEl.scrollTop
            + shell.getBoundingClientRect().top
            - scrollEl.getBoundingClientRect().top
            - 8;

        scrollingProgrammatically = true;
        scrollEl.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        window.setTimeout(function () { scrollingProgrammatically = false; }, 450);
    }

    function detectCurrentPage() {
        if (!pageShells.length || scrollingProgrammatically) return;

        var marker = scrollEl.getBoundingClientRect().top + scrollEl.clientHeight * 0.35;
        for (var i = pageShells.length - 1; i >= 0; i--) {
            if (pageShells[i].getBoundingClientRect().top <= marker) {
                if (currentPage !== i + 1) {
                    currentPage = i + 1;
                    updatePageIndicator();
                }
                break;
            }
        }
    }

    function renderPage(pageNum) {
        return pdfDoc.getPage(pageNum).then(function (page) {
            var viewport = page.getViewport({ scale: scale * baseScale });
            var shell = document.createElement('div');
            shell.className = 'page-shell';
            shell.dataset.page = String(pageNum);
            shell.id = 'page-' + pageNum;

            var badge = document.createElement('span');
            badge.className = 'page-num';
            badge.textContent = pageNum + ' / ' + totalPages;

            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = '100%';
            canvas.style.height = 'auto';

            shell.appendChild(canvas);
            shell.appendChild(badge);
            pagesWrap.appendChild(shell);
            pageShells.push(shell);

            var task = page.render({ canvasContext: ctx, viewport: viewport });
            renderTasks.push(task);
            return task.promise;
        });
    }

    function renderAllPages() {
        pagesWrap.innerHTML = '';
        pageShells = [];
        renderTasks.forEach(function (t) { try { t.cancel(); } catch (e) {} });
        renderTasks = [];

        var chain = Promise.resolve();
        for (var p = 1; p <= totalPages; p++) {
            (function (n) {
                chain = chain.then(function () { return renderPage(n); });
            })(p);
        }
        return chain.then(function () {
            loadingEl.hidden = true;
            pagesWrap.hidden = false;
            updatePageIndicator();
        });
    }

    function loadPdf(url) {
        return pdfjsLib.getDocument(url).promise.then(function (doc) {
            pdfDoc = doc;
            totalPages = doc.numPages;
            return doc.getPage(1).then(function (page) {
                var viewport = page.getViewport({ scale: 1 });
                baseScale = getContainerWidth() / viewport.width;
                scale = 1;
                return renderAllPages();
            });
        });
    }

    function openQrModal() {
        qrUrl.textContent = REPORT_URL;
        qrModal.hidden = false;
        document.body.style.overflow = 'hidden';

        if (typeof QRCode === 'undefined') {
            showToast('QR library failed to load');
            return;
        }

        if (!qrReady) {
            QRCode.toCanvas(qrCanvas, REPORT_URL, {
                width: 240,
                margin: 2,
                color: { dark: '#0b2e4f', light: '#ffffff' }
            }, function (err) {
                if (err) {
                    showToast('Could not generate QR code');
                    return;
                }
                qrReady = true;
            });
        }
    }

    function closeQrModal() {
        qrModal.hidden = true;
        document.body.style.overflow = '';
    }

    btnPrev.addEventListener('click', function () {
        if (currentPage > 1) scrollToPage(currentPage - 1);
    });
    btnNext.addEventListener('click', function () {
        if (currentPage < totalPages) scrollToPage(currentPage + 1);
    });
    btnZoomIn.addEventListener('click', function () {
        scale = Math.min(scale + 0.25, 3);
        renderAllPages().then(function () { scrollToPage(currentPage); });
    });
    btnZoomOut.addEventListener('click', function () {
        scale = Math.max(scale - 0.25, 0.5);
        renderAllPages().then(function () { scrollToPage(currentPage); });
    });
    btnFit.addEventListener('click', function () {
        scale = 1;
        if (!pdfDoc) return;
        pdfDoc.getPage(1).then(function (page) {
            var viewport = page.getViewport({ scale: 1 });
            baseScale = getContainerWidth() / viewport.width;
            return renderAllPages();
        }).then(function () { scrollToPage(currentPage); });
    });

    var scrollTicking = false;
    scrollEl.addEventListener('scroll', function () {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(function () {
            detectCurrentPage();
            scrollTicking = false;
        });
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (!pdfDoc) return;
            pdfDoc.getPage(1).then(function (page) {
                var viewport = page.getViewport({ scale: 1 });
                baseScale = getContainerWidth() / viewport.width;
                return renderAllPages();
            }).then(function () { scrollToPage(currentPage); });
        }, 200);
    });

    document.getElementById('btn-qr').addEventListener('click', openQrModal);
    document.getElementById('qr-close').addEventListener('click', closeQrModal);
    qrModal.addEventListener('click', function (e) {
        if (e.target === qrModal) closeQrModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !qrModal.hidden) closeQrModal();
    });
    document.getElementById('qr-copy').addEventListener('click', function () {
        navigator.clipboard.writeText(REPORT_URL).then(function () {
            showToast('Link copied');
        }).catch(function () {
            prompt('Copy this link:', REPORT_URL);
        });
    });
    document.getElementById('qr-download').addEventListener('click', function () {
        if (!qrReady) {
            showToast('Generate the QR code first');
            return;
        }
        var link = document.createElement('a');
        link.download = 'inspection-report-qr.png';
        link.href = qrCanvas.toDataURL('image/png');
        link.click();
    });

    loadPdf(PDF_URL).catch(showError);
})();
