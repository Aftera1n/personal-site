const cfg = window.SITE_CONFIG || {};

/* =====================================================
   Avatar
===================================================== */

const avatar = document.querySelector("#avatar");

if (avatar) {
  // HTML 中原本的头像地址，例如：
  // /assets/avatar.jpeg
  const originalAvatar = avatar.getAttribute("src");

  // 防止 cfg.avatarUrl 覆盖正确的 HTML 地址后无法恢复
  let triedConfigAvatar = false;

  if (cfg.avatarUrl) {
    triedConfigAvatar = true;
    avatar.src = cfg.avatarUrl;
  }

  avatar.addEventListener("error", () => {
    // config.js 头像加载失败
    // 自动恢复 HTML 中原来的头像
    if (triedConfigAvatar && originalAvatar) {
      triedConfigAvatar = false;
      avatar.src = originalAvatar;
    }
  });
}


/* =====================================================
   Navigation
===================================================== */

const navs = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

const sidebar = document.querySelector(".sidebar");
const brand = document.querySelector(".brand");
const nav = sidebar
  ? sidebar.querySelector("nav")
  : null;


/* =====================================================
   Page Switching
===================================================== */

function showPage(id) {
  navs.forEach((item) => {
    item.classList.toggle(
      "active",
      item.dataset.page === id
    );
  });

  pages.forEach((page) => {
    page.classList.toggle(
      "active",
      page.id === id
    );
  });

  history.replaceState(
    null,
    "",
    "#" + id
  );
}

/* =====================================================
   Mobile Menu
===================================================== */

const sidebar = document.querySelector(".sidebar");
const brand = document.querySelector(".brand");
const nav = sidebar ? sidebar.querySelector("nav") : null;

let menuOpen = false;

function isMobile() {
  return window.innerWidth <= 800;
}

function openMobileMenu() {
  if (!nav || !isMobile()) return;

  menuOpen = true;

  nav.style.maxHeight = "70px";
  nav.style.opacity = "1";
  nav.style.pointerEvents = "auto";
  nav.style.padding = "5px 0 2px";
}

function closeMobileMenu() {
  if (!nav) return;

  menuOpen = false;

  if (isMobile()) {
    nav.style.maxHeight = "0";
    nav.style.opacity = "0";
    nav.style.pointerEvents = "none";
    nav.style.padding = "0";
  } else {
    nav.style.maxHeight = "";
    nav.style.opacity = "";
    nav.style.pointerEvents = "";
    nav.style.padding = "";
  }
}

function toggleMobileMenu() {
  if (!isMobile()) return;

  if (menuOpen) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}


/* -----------------------------------------------------
   Brand
   点击原来的 Afterain 品牌区域打开菜单
----------------------------------------------------- */

if (brand && nav) {

  brand.style.cursor = "pointer";

  brand.addEventListener("click", function (event) {

    if (!isMobile()) return;

    event.preventDefault();
    event.stopPropagation();

    toggleMobileMenu();

  });

}


/* -----------------------------------------------------
   Navigation
----------------------------------------------------- */

navs.forEach(function (item) {

  item.addEventListener("click", function (event) {

    event.stopPropagation();

    showPage(item.dataset.page);

    if (isMobile()) {
      closeMobileMenu();
    }

  });

});


/* -----------------------------------------------------
   点击外部关闭
----------------------------------------------------- */

document.addEventListener("click", function (event) {

  if (!isMobile()) return;

  if (!menuOpen) return;

  if (
    sidebar &&
    !sidebar.contains(event.target)
  ) {
    closeMobileMenu();
  }

});


/* -----------------------------------------------------
   屏幕尺寸变化
----------------------------------------------------- */

window.addEventListener("resize", function () {

  if (!isMobile()) {

    menuOpen = false;

    if (nav) {
      nav.style.maxHeight = "";
      nav.style.opacity = "";
      nav.style.pointerEvents = "";
      nav.style.padding = "";
    }

  } else if (!menuOpen) {

    closeMobileMenu();

  }

});


/* =====================================================
   Click Outside
===================================================== */

document.addEventListener("click", (event) => {
  if (!isMobile()) {
    return;
  }

  if (!menuOpen) {
    return;
  }

  if (
    sidebar &&
    !sidebar.contains(event.target)
  ) {
    closeMobileMenu();
  }
});


/* =====================================================
   Resize
===================================================== */

window.addEventListener("resize", () => {
  if (!isMobile()) {
    // 回到桌面端
    menuOpen = false;

    if (nav) {
      nav.style.maxHeight = "";
      nav.style.opacity = "";
      nav.style.pointerEvents = "";
      nav.style.padding = "";
    }

    return;
  }

  // 手机端保持当前菜单状态
  if (!menuOpen) {
    closeMobileMenu();
  }
});


/* =====================================================
   Initial Page
===================================================== */

const initialPage =
  location.hash.slice(1);

if (
  initialPage &&
  document.getElementById(initialPage)
) {
  showPage(initialPage);
} else {
  showPage("home");
}


/* =====================================================
   Moments
===================================================== */

const timeline =
  document.querySelector("#timeline");

const moments =
  [...(cfg.moments || [])].sort(
    (a, b) =>
      String(b.date || "").localeCompare(
        String(a.date || "")
      )
  );

if (timeline) {
  if (!moments.length) {
    timeline.innerHTML = `
      <div class="glass mini-card">
        <h3>还没有动态</h3>
        <p>暂时还没有值得记录的片段。</p>
      </div>
    `;
  } else {
    timeline.innerHTML =
      moments
        .map(
          (moment) => `
            <article class="moment">

              <div class="moment-date">
                ${escapeHtml(moment.date || "")}
              </div>

              <div class="moment-card glass">

                ${
                  moment.image
                    ? `
                      <img
                        class="moment-img"
                        loading="lazy"
                        src="${escapeAttr(moment.image)}"
                        alt="${escapeAttr(
                          moment.title || "照片"
                        )}"
                      >
                    `
                    : ""
                }

                <div class="moment-body">

                  <h3 class="moment-title">
                    ${escapeHtml(
                      moment.title || "未命名"
                    )}
                  </h3>

                  <p class="moment-desc">
                    ${escapeHtml(
                      moment.description || ""
                    )}
                  </p>

                </div>
              </div>

            </article>
          `
        )
        .join("");
  }
}


/* =====================================================
   Status
===================================================== */

const statusTitle =
  document.querySelector("#status-title");

const statusDetail =
  document.querySelector("#status-detail");

const statusTime =
  document.querySelector("#status-time");

const status =
  cfg.status || {};

if (statusTitle) {
  statusTitle.textContent =
    status.title ||
    "正在加载……";
}

if (statusDetail) {
  statusDetail.textContent =
    status.detail ||
    "稍等一下。";
}

if (statusTime) {
  statusTime.textContent =
    status.updatedAt
      ? `LAST UPDATED · ${status.updatedAt}`
      : "";
}


/* =====================================================
   Anonymous Letter
===================================================== */

const form =
  document.querySelector("#letter-form");

const result =
  document.querySelector("#form-result");

if (form) {
  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const honeypot =
        document.querySelector("#website");

      if (
        honeypot &&
        honeypot.value
      ) {
        return;
      }

      const message =
        document
          .querySelector("#message")
          ?.value
          .trim() || "";

      const replyTo =
        document
          .querySelector("#replyTo")
          ?.value
          .trim() || "";

      if (!message) {
        return;
      }

      if (result) {
        result.textContent =
          "正在发送……";
      }

      try {
        const response =
          await fetch(
            cfg.letterApi ||
              "/api/letter",
            {
              method: "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body: JSON.stringify({
                message,
                replyTo,
              }),
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              "发送失败"
          );
        }

        if (result) {
          result.textContent =
            "已送达。谢谢你留下这封信。";
        }

        form.reset();

      } catch (error) {
        if (result) {
          result.textContent =
            error.message ||
            "发送失败，请稍后再试。";
        }
      }
    }
  );
}


/* =====================================================
   Escape Helpers
===================================================== */

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char]
  );
}

function escapeAttr(value) {
  return escapeHtml(value);
}