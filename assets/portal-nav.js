(function () {
    var mount = document.getElementById('portal-chrome') || document.getElementById('portal-nav');
    if (!mount) return;

    document.body.classList.add('has-portal-chrome');

    var active = mount.dataset.active || 'portal';
    var base = mount.dataset.base || '';

    var tabs = [
        { id: 'portal', href: base + 'index.html', icon: '🏠', label: 'Portal' },
        { id: 'guide', href: base + 'guide/index.html', icon: '🦪', label: 'ID Guide' },
        { id: 'calculator', href: base + 'calculator/index.html', icon: '📊', label: 'Calculator' },
        { id: 'report', href: base + 'report/index.html', icon: '📋', label: 'Inspection Report' }
    ];

    var chrome = document.createElement('div');
    chrome.className = 'portal-chrome';

    var topbar = document.createElement('div');
    topbar.className = 'portal-topbar';
    topbar.innerHTML =
        '<div class="container">' +
            '<span><strong>IMO–Norad TEST Biofouling Project</strong> · National Demonstration &amp; Training</span>' +
            '<span class="tag">Participant Portal — no login required</span>' +
        '</div>';

    var nav = document.createElement('nav');
    nav.className = 'portal-tabs';
    nav.setAttribute('aria-label', 'Workshop resources');

    var inner = document.createElement('div');
    inner.className = 'container';

    tabs.forEach(function (tab) {
        var link = document.createElement('a');
        link.className = 'portal-tab' + (tab.id === active ? ' active' : '');
        link.href = tab.href;
        if (tab.id === active) link.setAttribute('aria-current', 'page');
        link.innerHTML = '<span class="ic">' + tab.icon + '</span> ' + tab.label;
        inner.appendChild(link);
    });

    nav.appendChild(inner);
    chrome.appendChild(topbar);
    chrome.appendChild(nav);
    mount.replaceWith(chrome);
})();
