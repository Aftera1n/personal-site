(function () {
  "use strict";

  var CONFIG = window.SITE_CONFIG || {};

  /* ---------------------------------------------------------
     Rain canvas — ambient background animation
  --------------------------------------------------------- */
  function initRain() {
    var canvas = document.getElementById("rain-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var drops = [];
    var W, H;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      var count = Math.min(140, Math.floor((W * H) / 14000));
      drops = [];
      for (var i = 0; i < count; i++) drops.push(makeDrop());
    }

    function makeDrop() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        len: 10 + Math.random() * 22,
        speed: 3 + Math.random() * 6,
        drift: 0.3 + Math.random() * 0.5,
        opacity: 0.05 + Math.random() * 0.18,
      };
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "#9FD8D3";
      ctx.lineCap = "round";
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        ctx.globalAlpha = d.opacity;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.drift * 2, d.y + d.len);
        ctx.stroke();
        d.y += d.speed;
        d.x -= d.drift;
        if (d.y > H) { d.y = -d.len; d.x = Math.random() * W; }
      }
      ctx.globalAlpha = 1;
      if (!reduceMotion) requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();
    tick();
  }

  /* ---------------------------------------------------------
     Scroll-spy sidebar nav
  --------------------------------------------------------- */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));
    var sections = links
      .map(function (l) { return document.getElementById(l.dataset.target); })
      .filter(Boolean);

    if (!sections.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = links.find(function (l) { return l.dataset.target === entry.target.id; });
          if (!link) return;
          if (entry.isIntersecting) {
            links.forEach(function (l) { l.classList.remove("active"); });
            link.classList.add("active");
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sections.forEach(function (s) { observer.observe(s); });

    // 移动端：点导航链接后自动收起侧边栏
    links.forEach(function (l) {
      l.addEventListener("click", function () { closeSidebar(); });
    });
  }

  /* ---------------------------------------------------------
     Mobile sidebar drawer
  --------------------------------------------------------- */
  function openSidebar() {
    var sidebar = document.getElementById("sidebar");
    var backdrop = document.getElementById("sidebar-backdrop");
    var toggle = document.getElementById("sidebar-toggle");
    sidebar.classList.add("open");
    backdrop.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    var sidebar = document.getElementById("sidebar");
    var backdrop = document.getElementById("sidebar-backdrop");
    var toggle = document.getElementById("sidebar-toggle");
    sidebar.classList.remove("open");
    backdrop.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  function initSidebarToggle() {
    var toggle = document.getElementById("sidebar-toggle");
    var backdrop = document.getElementById("sidebar-backdrop");
    if (!toggle) return;

    toggle.addEventListener("click", function () {
      var isOpen = document.getElementById("sidebar").classList.contains("open");
      if (isOpen) closeSidebar(); else openSidebar();
    });
    backdrop.addEventListener("click", closeSidebar);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSidebar();
    });
  }

  /* ---------------------------------------------------------
     Intro: avatar + bio + links
  --------------------------------------------------------- */
  function initIntro() {
    var img = document.getElementById("avatar-img");
    var placeholder = document.getElementById("avatar-placeholder");

    if (CONFIG.avatarUrl) {
      img.src = CONFIG.avatarUrl;
      img.hidden = false;
      placeholder.hidden = true;
      img.addEventListener("error", function () {
        img.hidden = true;
        placeholder.hidden = false;
      });
    } else {
      var name = CONFIG.name || "A";
      placeholder.textContent = name.trim().charAt(0).toUpperCase() || "雨";
    }

    var bioEl = document.getElementById("intro-bio");
    if (CONFIG.bio) bioEl.textContent = CONFIG.bio;

    var nameEl = document.getElementById("sidebar-name");
    if (CONFIG.name && nameEl) nameEl.textContent = CONFIG.name;

    var linksEl = document.getElementById("sidebar-links");
    if (Array.isArray(CONFIG.links) && CONFIG.links.length) {
      CONFIG.links.forEach(function (l) {
        var a = document.createElement("a");
        a.href = l.url;
        a.target = l.url.indexOf("mailto:") === 0 ? "_self" : "_blank";
        a.rel = "noopener noreferrer";
        a.innerHTML = '<span aria-hidden="true">' + (l.icon || "•") + "</span><span>" + l.label + "</span>";
        linksEl.appendChild(a);
      });
    }

    document.title = (CONFIG.name || "Afterain") + " · 雨后";
  }

  /* ---------------------------------------------------------
     Photo timeline
  --------------------------------------------------------- */
  function formatDate(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
      return y + "." + m + "." + day;
    } catch (e) {
      return iso;
    }
  }

  function renderTimeline(photos) {
    var list = document.getElementById("timeline-list");
    list.innerHTML = "";

    if (!photos || !photos.length) {
      list.innerHTML = '<div class="timeline-empty">还没有照片。上传到 R2，或编辑 photos.json 试试。</div>';
      return;
    }

    photos
      .slice()
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); })
      .forEach(function (p) {
        var item = document.createElement("div");
        item.className = "timeline-item";

        var dateEl = document.createElement("div");
        dateEl.className = "timeline-date";
        dateEl.textContent = formatDate(p.date);

        var card = document.createElement("div");
        card.className = "timeline-card";

        var btn = document.createElement("button");
        btn.className = "photo-trigger";
        btn.type = "button";
        btn.setAttribute("aria-label", "查看大图：" + (p.caption || ""));

        var img = document.createElement("img");
        img.src = p.url;
        img.alt = p.caption || "";
        img.loading = "lazy";
        btn.appendChild(img);

        btn.addEventListener("click", function () { openLightbox(p.url, p.caption || ""); });

        var caption = document.createElement("div");
        caption.className = "timeline-caption";
        caption.textContent = p.caption || "";

        card.appendChild(btn);
        card.appendChild(caption);
        item.appendChild(dateEl);
        item.appendChild(card);
        list.appendChild(item);
      });

    revealOnScroll();
  }

  function loadTimeline() {
    var list = document.getElementById("timeline-list");

    function fallback() {
      fetch("photos.json")
        .then(function (r) { return r.json(); })
        .then(renderTimeline)
        .catch(function () {
          list.innerHTML = '<div class="timeline-empty">照片列表加载失败。</div>';
        });
    }

    if (CONFIG.usePhotoApi) {
      fetch("/api/photos")
        .then(function (r) {
          if (!r.ok) throw new Error("api not ready");
          return r.json();
        })
        .then(renderTimeline)
        .catch(fallback);
    } else {
      fallback();
    }
  }

  function revealOnScroll() {
    var items = document.querySelectorAll(".timeline-item:not(.in-view)");
    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach(function (el) { observer.observe(el); });
  }

  /* ---------------------------------------------------------
     Lightbox
  --------------------------------------------------------- */
  function openLightbox(src, caption) {
    var lb = document.getElementById("lightbox");
    var img = document.getElementById("lightbox-img");
    var cap = document.getElementById("lightbox-caption");
    img.src = src;
    img.alt = caption;
    cap.textContent = caption;
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    var lb = document.getElementById("lightbox");
    lb.hidden = true;
    document.body.style.overflow = "";
  }

  function initLightbox() {
    document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
    document.getElementById("lightbox").addEventListener("click", function (e) {
      if (e.target.id === "lightbox") closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLightbox();
    });
  }

  /* ---------------------------------------------------------
     Anonymous letter form
  --------------------------------------------------------- */
  function initLetter() {
    var form = document.getElementById("letter-form");
    var textarea = document.getElementById("letter-message");
    var counter = document.getElementById("letter-count");
    var statusEl = document.getElementById("letter-status");
    var submitBtn = document.getElementById("letter-submit");

    textarea.addEventListener("input", function () {
      counter.textContent = textarea.value.length + " / 4000";
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!CONFIG.enableLetter) {
        statusEl.textContent = "寄信功能尚未开启。";
        statusEl.className = "letter-status is-error";
        return;
      }

      var message = textarea.value.trim();
      if (!message) {
        statusEl.textContent = "写点什么再寄出吧。";
        statusEl.className = "letter-status is-error";
        return;
      }

      var payload = {
        subject: document.getElementById("letter-subject").value.trim(),
        message: message,
        website: document.getElementById("letter-website").value, // honeypot
      };

      submitBtn.disabled = true;
      statusEl.textContent = "正在寄出…";
      statusEl.className = "letter-status";

      fetch("/api/send-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("send failed");
          return r.json().catch(function () { return {}; });
        })
        .then(function () {
          statusEl.textContent = "已经寄出，谢谢你愿意说出来。";
          statusEl.className = "letter-status is-success";
          form.reset();
          counter.textContent = "0 / 4000";
        })
        .catch(function () {
          statusEl.textContent = "寄出失败，请稍后再试一次。";
          statusEl.className = "letter-status is-error";
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
    });
  }

  /* ---------------------------------------------------------
     Current status
  --------------------------------------------------------- */
  function initStatus() {
    var source = CONFIG.statusSource || "status.json";
    fetch(source)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        document.getElementById("status-text").textContent = data.text || "暂时没有更新。";
        document.getElementById("status-detail").textContent = data.detail || "";
        if (data.updatedAt) {
          var d = new Date(data.updatedAt);
          var label = isNaN(d.getTime()) ? data.updatedAt : d.toLocaleString("zh-CN", { hour12: false });
          document.getElementById("status-updated").textContent = "更新于 " + label;
        }
      })
      .catch(function () {
        document.getElementById("status-text").textContent = "状态加载失败。";
      });
  }

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("year").textContent = new Date().getFullYear();
    initRain();
    initSidebarToggle();
    initScrollSpy();
    initIntro();
    loadTimeline();
    initLightbox();
    initLetter();
    initStatus();
  });
})();
