/* Rick's Blog — 交互：深浅色切换、主题色相、移动菜单、回到顶部、TOC、建站天数 */
(function () {
  "use strict";
  var root = document.documentElement;
  var KEY_THEME = "rick-blog-theme";
  var KEY_HUE = "rick-blog-hue";
  var SITE_START = (window.RICK_SITE && window.RICK_SITE.since) || "2026-06-03"; // 建站日期（由服务端 SITE.since 注入）

  /* —— 深 / 浅色切换 —— */
  var themeBtn = document.getElementById("themeBtn");
  function setTheme(t) {
    root.dataset.theme = t;
    try { localStorage.setItem(KEY_THEME, t); } catch (e) {}
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      setTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });
  }

  /* —— 主题色相滑块 —— */
  var hueBtn = document.getElementById("hueBtn");
  var huePanel = document.getElementById("huePanel");
  var hueSlider = document.getElementById("hueSlider");
  var hueValue = document.getElementById("hueValue");

  var current = (getComputedStyle(root).getPropertyValue("--hue").trim()) || "250";
  if (hueSlider) {
    hueSlider.value = parseInt(current, 10) || 250;
    if (hueValue) hueValue.textContent = hueSlider.value;
    hueSlider.addEventListener("input", function () {
      root.style.setProperty("--hue", hueSlider.value);
      if (hueValue) hueValue.textContent = hueSlider.value;
      try { localStorage.setItem(KEY_HUE, hueSlider.value); } catch (e) {}
    });
  }
  if (hueBtn && huePanel) {
    hueBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      huePanel.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (!huePanel.contains(e.target) && e.target !== hueBtn) {
        huePanel.classList.remove("open");
      }
    });
  }

  /* —— 移动端菜单 —— */
  var menuBtn = document.getElementById("menuBtn");
  var navbar = document.getElementById("navbar");
  if (menuBtn && navbar) {
    menuBtn.addEventListener("click", function () {
      navbar.classList.toggle("menu-open");
    });
  }

  /* —— 回到顶部 —— */
  var toTop = document.getElementById("toTop");
  if (toTop) {
    window.addEventListener("scroll", function () {
      toTop.classList.toggle("show", window.scrollY > 320);
    }, { passive: true });
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* —— 建站天数 —— */
  var runDays = document.getElementById("runDays");
  if (runDays) {
    var diff = Date.now() - new Date(SITE_START).getTime();
    var days = Math.max(1, Math.floor(diff / 86400000));
    runDays.textContent = days + " 天";
  }

  /* —— 文章页自动生成目录 —— */
  var toc = document.getElementById("toc");
  var prose = document.querySelector(".prose");
  if (toc && prose) {
    var heads = prose.querySelectorAll("h2, h3");
    if (!heads.length) {
      var widget = toc.closest(".widget");
      if (widget) widget.remove();
    } else {
      heads.forEach(function (h, i) {
        if (!h.id) h.id = "heading-" + i;
        var a = document.createElement("a");
        a.href = "#" + h.id;
        a.textContent = h.textContent;
        a.className = "toc-link toc-" + h.tagName.toLowerCase();
        toc.appendChild(a);
      });
    }
  }

  /* —— 代码块一键复制（http 局域网下自动降级到 execCommand） —— */
  function copyText(text, done) {
    function fallback() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        done(ok);
      } catch (e) { done(false); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    } else {
      fallback();
    }
  }
  var codeBlocks = document.querySelectorAll(".prose pre");
  codeBlocks.forEach(function (pre) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "复制";
    btn.addEventListener("click", function () {
      var code = pre.querySelector("code");
      copyText(code ? code.innerText : pre.innerText, function (ok) {
        btn.textContent = ok ? "已复制" : "复制失败";
        setTimeout(function () { btn.textContent = "复制"; }, 1500);
      });
    });
    pre.appendChild(btn);
  });
})();
