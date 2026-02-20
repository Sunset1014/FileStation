/**
 * File Station — Core JavaScript
 *
 * Features:
 *   - Parse Nginx autoindex <pre> output into structured data
 *   - Render file table with icons, preview links, download buttons
 *   - Breadcrumb navigation
 *   - Real-time search with debounce
 *   - Column sorting (name / size / date)
 *   - File preview modal (image / video / audio / PDF / text)
 *   - Text preview truncation for large files (100 KB limit)
 *   - Theme toggle (light / dark / auto)
 *   - Announcement bar toggle
 *   - Loading state management
 *   - Keyboard accessibility (Escape to close, focus trap)
 */
(function () {
  'use strict';

  // ===========================================================
  //  Constants — SVG Icons
  // ===========================================================
  var ICONS = {
    folder:   '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    parent:   '<svg viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    archive:  '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="10" x2="12" y2="16"/><path d="M10 10h4v2h-4z"/></svg>',
    image:    '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    video:    '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    audio:    '<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    code:     '<svg viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    pdf:      '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
    document: '<svg viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    file:     '<svg viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
  };

  // ===========================================================
  //  Constants — File extension categories
  // ===========================================================
  var EXT_MAP = {
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'zst', 'lz4', 'cab', 'iso', 'dmg'],
    image:   ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff', 'tif', 'avif', 'heic'],
    video:   ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', 'ts', '3gp'],
    audio:   ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'ape', 'alac'],
    code:    ['html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx', 'json', 'xml', 'yml', 'yaml',
              'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'sh',
              'bash', 'bat', 'ps1', 'sql', 'md', 'vue', 'svelte', 'toml', 'ini', 'cfg',
              'conf', 'lua', 'r', 'swift', 'kt', 'scala', 'dart'],
    pdf:     ['pdf'],
    doc:     ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'csv', 'txt', 'rtf', 'log']
  };

  // Preview-capable extensions
  var PREVIEW_IMAGE = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'avif'];
  var PREVIEW_VIDEO = ['mp4', 'webm', 'ogg'];
  var PREVIEW_AUDIO = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'opus'];
  var PREVIEW_PDF   = ['pdf'];
  var PREVIEW_TEXT  = [
    'txt', 'log', 'md', 'json', 'xml', 'yml', 'yaml', 'csv', 'ini', 'cfg', 'conf', 'toml',
    'py', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'htm', 'java', 'c', 'cpp', 'h', 'hpp',
    'cs', 'go', 'rs', 'rb', 'php', 'sh', 'bash', 'bat', 'ps1', 'sql', 'vue', 'svelte',
    'lua', 'r', 'swift', 'kt', 'scala', 'dart', 'rtf'
  ];

  // Text preview max size (100 KB)
  var TEXT_PREVIEW_MAX_BYTES = 100 * 1024;

  // ===========================================================
  //  State
  // ===========================================================
  var allItems = [];       // Parsed file list
  var sortKey = 'name';    // Current sort column
  var sortAsc = true;      // Sort direction
  var searchTimer = null;  // Debounce timer for search

  // ===========================================================
  //  Utility Functions
  // ===========================================================

  /** Get file extension (lowercase) */
  function getExtension(filename) {
    return (filename.split('.').pop() || '').toLowerCase();
  }

  /** HTML-escape a string (pure string replacement, no DOM creation) */
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Determine preview type for a file */
  function getPreviewType(filename) {
    var ext = getExtension(filename);
    if (PREVIEW_IMAGE.indexOf(ext) > -1) return 'image';
    if (PREVIEW_VIDEO.indexOf(ext) > -1) return 'video';
    if (PREVIEW_AUDIO.indexOf(ext) > -1) return 'audio';
    if (PREVIEW_PDF.indexOf(ext) > -1)   return 'pdf';
    if (PREVIEW_TEXT.indexOf(ext) > -1)   return 'text';
    return null;
  }

  /** Get SVG icon for a file */
  function getFileIcon(filename, isDir) {
    if (isDir) return ICONS.folder;
    var ext = getExtension(filename);
    if (EXT_MAP.archive.indexOf(ext) > -1) return ICONS.archive;
    if (EXT_MAP.image.indexOf(ext) > -1)   return ICONS.image;
    if (EXT_MAP.video.indexOf(ext) > -1)   return ICONS.video;
    if (EXT_MAP.audio.indexOf(ext) > -1)   return ICONS.audio;
    if (EXT_MAP.code.indexOf(ext) > -1)    return ICONS.code;
    if (EXT_MAP.pdf.indexOf(ext) > -1)     return ICONS.pdf;
    if (EXT_MAP.doc.indexOf(ext) > -1)     return ICONS.document;
    return ICONS.file;
  }

  /**
   * Parse Nginx autoindex size string into bytes (for sorting).
   * Examples: "1.2K", "3.5M", "2.1G", "512", "-"
   */
  function parseSizeToBytes(sizeStr) {
    if (!sizeStr || sizeStr === '-') return -1;
    var match = sizeStr.match(/^([\d.]+)\s*([KMGT]?)$/i);
    if (!match) return 0;
    var num = parseFloat(match[1]);
    var unit = (match[2] || '').toUpperCase();
    var multipliers = { '': 1, 'K': 1024, 'M': 1048576, 'G': 1073741824, 'T': 1099511627776 };
    return num * (multipliers[unit] || 1);
  }

  /**
   * Parse date string into timestamp (for sorting).
   * Nginx format: "dd-Mon-yyyy HH:mm" or locale-dependent
   */
  function parseDateToTimestamp(dateStr) {
    if (!dateStr || dateStr === '-') return 0;
    var d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  // ===========================================================
  //  Parse Nginx Autoindex Output
  // ===========================================================
  function parseAutoindex() {
    var pre = document.querySelector('body > pre');
    if (!pre) return [];

    var lines = pre.innerHTML.split('\n');
    var items = [];
    var re = /<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>\s+(\S+\s+\S+)\s+([\S]+)/;

    for (var i = 0; i < lines.length; i++) {
      var match = lines[i].match(re);
      if (!match) continue;

      var href = match[1];
      var name = match[2];
      var date = match[3];
      var size = match[4].trim();
      var isDir = href.charAt(href.length - 1) === '/';
      var isParent = (name === '../' || href === '../');

      items.push({
        href: href,
        name: isDir ? name.replace(/\/$/, '') : name,
        date: date,
        size: isDir ? '-' : size,
        sizeBytes: isDir ? -1 : parseSizeToBytes(size),
        dateTs: parseDateToTimestamp(date),
        isDir: isDir,
        isParent: isParent
      });
    }

    return items;
  }

  // ===========================================================
  //  Breadcrumb
  // ===========================================================
  function buildBreadcrumb() {
    var path = decodeURIComponent(location.pathname);
    var parts = path.split('/').filter(Boolean);
    var nav = document.getElementById('jBC');
    var html = '<a href="/">根目录</a>';
    var accumulated = '/';

    for (var i = 0; i < parts.length; i++) {
      accumulated += parts[i] + '/';
      html += '<span class="fs-sep">/</span>';
      if (i === parts.length - 1) {
        html += '<span class="fs-cur">' + escapeHtml(parts[i]) + '</span>';
      } else {
        html += '<a href="' + accumulated + '">' + escapeHtml(parts[i]) + '</a>';
      }
    }

    nav.innerHTML = html;
  }

  // ===========================================================
  //  Sorting
  // ===========================================================
  function sortItems(items) {
    // Separate parent, directories, and files
    var parents = [];
    var dirs = [];
    var files = [];

    for (var i = 0; i < items.length; i++) {
      if (items[i].isParent) parents.push(items[i]);
      else if (items[i].isDir) dirs.push(items[i]);
      else files.push(items[i]);
    }

    var comparator;
    if (sortKey === 'size') {
      comparator = function (a, b) {
        var diff = a.sizeBytes - b.sizeBytes;
        return sortAsc ? diff : -diff;
      };
    } else if (sortKey === 'date') {
      comparator = function (a, b) {
        var diff = a.dateTs - b.dateTs;
        return sortAsc ? diff : -diff;
      };
    } else {
      // name (default)
      comparator = function (a, b) {
        var an = a.name.toLowerCase();
        var bn = b.name.toLowerCase();
        var cmp = an < bn ? -1 : (an > bn ? 1 : 0);
        return sortAsc ? cmp : -cmp;
      };
    }

    dirs.sort(comparator);
    files.sort(comparator);

    return parents.concat(dirs).concat(files);
  }

  function updateSortUI() {
    var headers = document.querySelectorAll('.fs-t th[data-sort]');
    for (var i = 0; i < headers.length; i++) {
      var th = headers[i];
      var icon = th.querySelector('.fs-sort-icon');
      if (th.getAttribute('data-sort') === sortKey) {
        th.classList.add('fs-sorted');
        icon.textContent = sortAsc ? '▲' : '▼';
      } else {
        th.classList.remove('fs-sorted');
        icon.textContent = '';
      }
    }
  }

  // ===========================================================
  //  Render Table
  // ===========================================================
  function render(items) {
    var tbody = document.getElementById('jFL');
    var emptyMsg = document.getElementById('jEM');

    // Check for truly empty directory (only parent link, no real items)
    var realItems = [];
    for (var k = 0; k < items.length; k++) {
      if (!items[k].isParent) realItems.push(items[k]);
    }

    if (!items.length || (realItems.length === 0 && items.length <= 1)) {
      // Show empty state
      var hasParent = items.length === 1 && items[0].isParent;
      if (hasParent) {
        // Render parent row + empty message
        var parentItem = items[0];
        tbody.innerHTML =
          '<tr class="fs-pr"><td><div class="fs-n">' + ICONS.parent +
          '<a href="' + escapeHtml(parentItem.href) + '">返回上级</a></div></td>' +
          '<td class="fs-sz">' + escapeHtml(parentItem.size) + '</td>' +
          '<td class="fs-tm">' + escapeHtml(parentItem.date) + '</td><td></td></tr>';
        emptyMsg.textContent = '此目录为空';
        emptyMsg.classList.remove('fs-hid');
      } else {
        tbody.innerHTML = '';
        emptyMsg.textContent = '没有找到匹配的文件';
        emptyMsg.classList.remove('fs-hid');
      }
      return;
    }

    emptyMsg.classList.add('fs-hid');

    var sorted = sortItems(items);
    var html = '';

    for (var i = 0; i < sorted.length; i++) {
      var item = sorted[i];
      var rowClass = item.isParent ? ' class="fs-pr"' : '';
      var icon = item.isParent ? ICONS.parent : getFileIcon(item.name, item.isDir);
      var displayName = item.isParent ? '返回上级' : escapeHtml(item.name);
      var previewType = (!item.isDir && !item.isParent) ? getPreviewType(item.name) : null;

      // Download column
      var dlCol;
      if (!item.isDir && !item.isParent) {
        dlCol = '<td><a class="fs-dl" href="' + escapeHtml(item.href) + '" download title="下载" aria-label="下载 ' + escapeHtml(item.name) + '">' + ICONS.download + '</a></td>';
      } else {
        dlCol = '<td></td>';
      }

      // Name column — preview-capable files get special click handler
      var nameCell;
      if (previewType && !item.isParent) {
        nameCell =
          '<a class="fs-pv" href="javascript:void(0)"' +
          ' data-href="' + escapeHtml(item.href) + '"' +
          ' data-name="' + escapeHtml(item.name) + '"' +
          ' data-pv="' + previewType + '"' +
          ' onclick="window._fsPV(this)">' +
          displayName + '</a>';
      } else {
        nameCell = '<a href="' + escapeHtml(item.href) + '">' + displayName + '</a>';
      }

      html +=
        '<tr' + rowClass + '>' +
        '<td><div class="fs-n">' + icon + nameCell + '</div></td>' +
        '<td class="fs-sz">' + escapeHtml(item.size) + '</td>' +
        '<td class="fs-tm">' + escapeHtml(item.date) + '</td>' +
        dlCol +
        '</tr>';
    }

    tbody.innerHTML = html;
  }

  // ===========================================================
  //  Search (with debounce)
  // ===========================================================
  function initSearch() {
    var searchInput = document.getElementById('jS');
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var self = this;
      searchTimer = setTimeout(function () {
        var query = self.value.trim().toLowerCase();
        if (!query) {
          render(allItems);
          return;
        }
        var filtered = [];
        for (var i = 0; i < allItems.length; i++) {
          if (!allItems[i].isParent && allItems[i].name.toLowerCase().indexOf(query) > -1) {
            filtered.push(allItems[i]);
          }
        }
        render(filtered);
      }, 150); // 150ms debounce
    });
  }

  // ===========================================================
  //  Column Sorting
  // ===========================================================
  function initSort() {
    var headers = document.querySelectorAll('.fs-t th[data-sort]');
    for (var i = 0; i < headers.length; i++) {
      headers[i].addEventListener('click', (function (th) {
        return function () {
          var key = th.getAttribute('data-sort');
          if (sortKey === key) {
            sortAsc = !sortAsc;
          } else {
            sortKey = key;
            sortAsc = true;
          }
          updateSortUI();

          // Re-render with current search filter
          var query = document.getElementById('jS').value.trim().toLowerCase();
          if (!query) {
            render(allItems);
          } else {
            var filtered = [];
            for (var j = 0; j < allItems.length; j++) {
              if (!allItems[j].isParent && allItems[j].name.toLowerCase().indexOf(query) > -1) {
                filtered.push(allItems[j]);
              }
            }
            render(filtered);
          }
        };
      })(headers[i]));
    }
    updateSortUI();
  }

  // ===========================================================
  //  Announcement Bar
  // ===========================================================
  function initAnnounce() {
    var bar = document.getElementById('jAB');
    var toggleBtn = document.getElementById('jAT');
    var closeBtn = document.getElementById('jAC');

    toggleBtn.addEventListener('click', function () {
      var isOpen = bar.classList.toggle('fs-show');
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    closeBtn.addEventListener('click', function () {
      bar.classList.remove('fs-show');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  }

  // ===========================================================
  //  Theme Toggle
  // ===========================================================
  function initTheme() {
    var btn = document.getElementById('jTH');
    var sunIcon = btn.querySelector('.fs-icon-sun');
    var moonIcon = btn.querySelector('.fs-icon-moon');

    // Determine initial state
    var saved = null;
    try { saved = localStorage.getItem('fs-theme'); } catch (e) { /* ignore */ }

    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }

    function updateIcons() {
      var theme = document.documentElement.getAttribute('data-theme');
      var isDark;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'light') {
        isDark = false;
      } else {
        // Auto — check system preference
        isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      sunIcon.style.display = isDark ? 'block' : 'none';
      moonIcon.style.display = isDark ? 'none' : 'block';
    }

    updateIcons();

    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var isDarkNow;

      if (current === 'dark') {
        isDarkNow = true;
      } else if (current === 'light') {
        isDarkNow = false;
      } else {
        isDarkNow = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      var newTheme = isDarkNow ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      try { localStorage.setItem('fs-theme', newTheme); } catch (e) { /* ignore */ }
      updateIcons();
    });

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateIcons);
    }
  }

  // ===========================================================
  //  Preview Modal (DOM-safe, no innerHTML injection for media)
  // ===========================================================
  function closeModal() {
    var overlay = document.getElementById('jMO');
    var body = document.getElementById('jMB');
    overlay.classList.remove('fs-show');
    body.innerHTML = '';
  }

  window._fsPV = function (el) {
    var href = el.getAttribute('data-href');
    var name = el.getAttribute('data-name');
    var pvType = el.getAttribute('data-pv');
    var overlay = document.getElementById('jMO');
    var body = document.getElementById('jMB');
    var title = document.getElementById('jMT');
    var dlBtn = document.getElementById('jMD');

    title.textContent = decodeURIComponent(name);
    dlBtn.href = href;
    dlBtn.setAttribute('download', '');

    // Clear previous content
    body.innerHTML = '';

    if (pvType === 'image') {
      var img = document.createElement('img');
      img.src = href;
      img.alt = 'preview';
      body.appendChild(img);

    } else if (pvType === 'video') {
      var video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      var vsrc = document.createElement('source');
      vsrc.src = href;
      video.appendChild(vsrc);
      body.appendChild(video);

    } else if (pvType === 'audio') {
      var audio = document.createElement('audio');
      audio.controls = true;
      audio.autoplay = true;
      var asrc = document.createElement('source');
      asrc.src = href;
      audio.appendChild(asrc);
      body.appendChild(audio);

    } else if (pvType === 'pdf') {
      var iframe = document.createElement('iframe');
      iframe.src = href;
      iframe.title = 'PDF Preview';
      body.appendChild(iframe);

    } else if (pvType === 'text') {
      var pre = document.createElement('pre');
      pre.className = 'fs-tp';
      pre.textContent = 'Loading...';
      body.appendChild(pre);
      overlay.classList.add('fs-show');

      var xhr = new XMLHttpRequest();
      xhr.open('GET', href, true);
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 400) {
          var text = xhr.responseText;
          var truncated = false;
          if (text.length > TEXT_PREVIEW_MAX_BYTES) {
            text = text.substring(0, TEXT_PREVIEW_MAX_BYTES);
            truncated = true;
          }
          pre.textContent = text;
          if (truncated) {
            var notice = document.createElement('span');
            notice.className = 'fs-truncated';
            notice.textContent = '⚠ 文件较大，仅显示前 100 KB 内容。请下载查看完整文件。';
            body.appendChild(notice);
          }
        } else {
          pre.textContent = 'Failed to load file (HTTP ' + xhr.status + ')';
        }
      };
      xhr.onerror = function () {
        pre.textContent = 'Network error';
      };
      xhr.send();
      return; // Already showed overlay
    }

    overlay.classList.add('fs-show');
  };

  function initModal() {
    var overlay = document.getElementById('jMO');
    var closeBtn = document.getElementById('jMC');

    closeBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ===========================================================
  //  Loading State Management
  // ===========================================================
  function hideLoading() {
    var loader = document.getElementById('jLD');
    var header = document.getElementById('jHD');
    var breadcrumb = document.getElementById('jBC');
    var search = document.getElementById('jSW');
    var table = document.getElementById('jTW');

    if (loader) loader.style.display = 'none';
    if (header) header.style.display = '';
    if (breadcrumb) breadcrumb.style.display = '';
    if (search) search.style.display = '';
    if (table) table.style.display = '';
  }

  // ===========================================================
  //  Initialization
  // ===========================================================
  function init() {
    allItems = parseAutoindex();
    buildBreadcrumb();
    render(allItems);
    initSearch();
    initSort();
    initAnnounce();
    initModal();
    initTheme();
    hideLoading();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
