const cfg = window.SITE_CONFIG || {};

// =====================================================
// Avatar
// =====================================================

const avatar = document.querySelector("#avatar");

if (avatar && cfg.avatarUrl) {
  avatar.src = cfg.avatarUrl;
}

// =====================================================
// Navigation
// =====================================================

const navs = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

function showPage(id) {
  navs.forEach((n) =>
    n.classList.toggle(
      "active",
      n.dataset.page === id
    )
  );

  pages.forEach((p) =>
    p.classList.toggle(
      "active",
      p.id === id
    )
  );

  history.replaceState(
    null,
    "",
    "#" + id
  );
}

// =====================================================
// Mobile menu
// =====================================================

const sidebar =
  document.querySelector(".sidebar");

const brand =
  document.querySelector(".brand");

const menuToggle =
  document.querySelector(".menu-toggle");

const _menuTrigger =
  menuToggle || brand;

let touchTriggered = false;

if (_menuTrigger && sidebar) {

  _menuTrigger.addEventListener(
    "touchstart",
    (e) => {
      if (window.innerWidth > 800) {
        return;
      }

      e.preventDefault();

      touchTriggered = true;

      sidebar.classList.toggle("open");
    },
    {
      passive: false
    }
  );

  _menuTrigger.addEventListener(
    "click",
    () => {
      if (window.innerWidth > 800) {
        return;
      }

      if (touchTriggered) {
        touchTriggered = false;
        return;
      }

      sidebar.classList.toggle("open");
    }
  );

  document.addEventListener(
    "click",
    (e) => {
      if (window.innerWidth > 800) {
        return;
      }

      if (!sidebar.classList.contains("open")) {
        return;
      }

      if (
        !sidebar.contains(e.target) &&
        e.target !== _menuTrigger
      ) {
        sidebar.classList.remove("open");
      }
    }
  );
}

navs.forEach((n) => {
  n.addEventListener("click", () => {

    showPage(n.dataset.page);

    if (
      window.innerWidth <= 800 &&
      sidebar
    ) {
      sidebar.classList.remove("open");
    }
  });
});

const initial =
  location.hash.slice(1);

if (
  initial &&
  document.getElementById(initial)
) {
  showPage(initial);
}

// =====================================================
// HTML escaping
// =====================================================

function escapeHtml(v) {
  return String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[c]
  );
}

function escapeAttr(v) {
  return escapeHtml(v);
}

// =====================================================
// Moments
// =====================================================

const timeline =
  document.querySelector("#timeline");

async function loadMoments() {

  if (!timeline) {
    return;
  }

  try {

    const response =
      await fetch(
        "/api/moments",
        {
          method: "GET",
          cache: "no-store"
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "读取动态失败"
      );
    }

    const moments =
      Array.isArray(data.moments)
        ? data.moments
        : [];

    moments.sort(
      (a, b) =>
        String(b.date || "")
          .localeCompare(
            String(a.date || "")
          ) ||
        String(b.createdAt || "")
          .localeCompare(
            String(a.createdAt || "")
          )
    );

    if (!moments.length) {

      timeline.innerHTML = `
        <div class="glass mini-card">
          <h3>还没有动态</h3>
          <p>之后发布的内容会显示在这里。</p>
        </div>
      `;

      return;
    }

    timeline.innerHTML =
      moments
        .map(
          (m) => `
            <article class="moment">

              <div class="moment-date">
                ${escapeHtml(
                  m.date || ""
                )}
              </div>

              <div class="moment-card glass">

                ${
                  m.image
                    ? `
                      <img
                        class="moment-img"
                        loading="lazy"
                        src="${escapeAttr(
                          m.image
                        )}"
                        alt="${escapeAttr(
                          m.title ||
                          "照片"
                        )}"
                      >
                    `
                    : ""
                }

                <div class="moment-body">

                  <h3 class="moment-title">
                    ${escapeHtml(
                      m.title ||
                      "未命名"
                    )}
                  </h3>

                  <p class="moment-desc">
                    ${escapeHtml(
                      m.description ||
                      ""
                    )}
                  </p>

                </div>

              </div>

            </article>
          `
        )
        .join("");

  } catch (error) {

    console.error(
      "Load moments error:",
      error
    );

    timeline.innerHTML = `
      <div class="glass mini-card">
        <h3>动态暂时无法加载</h3>
        <p>请稍后刷新页面再试。</p>
      </div>
    `;
  }
}

// =====================================================
// Status
// =====================================================

async function loadStatus() {

  const title =
    document.querySelector(
      "#status-title"
    );

  const detail =
    document.querySelector(
      "#status-detail"
    );

  const time =
    document.querySelector(
      "#status-time"
    );

  if (!title || !detail || !time) {
    return;
  }

  try {

    const response =
      await fetch(
        "/api/status",
        {
          method: "GET",
          cache: "no-store"
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "读取状态失败"
      );
    }

    const status =
      data.status;

    if (!status) {

      title.textContent =
        "暂时没有状态";

      detail.textContent =
        "还没有设置当前状态。";

      time.textContent = "";

      return;
    }

    title.textContent =
      status.title || "";

    detail.textContent =
      status.detail || "";

    time.textContent =
      status.updatedAt
        ? `LAST UPDATED · ${status.updatedAt}`
        : "";

  } catch (error) {

    console.error(
      "Load status error:",
      error
    );

    title.textContent =
      "状态暂时无法加载";

    detail.textContent =
      "请稍后再试。";

    time.textContent = "";
  }
}

// =====================================================
// Anonymous letter
// =====================================================

const form =
  document.querySelector(
    "#letter-form"
  );

const result =
  document.querySelector(
    "#form-result"
  );

if (form && result) {

  form.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();

      const website =
        document.querySelector(
          "#website"
        );

      if (
        website &&
        website.value
      ) {
        return;
      }

      const message =
        document
          .querySelector("#message")
          .value
          .trim();

      const replyTo =
        document
          .querySelector("#replyTo")
          .value
          .trim();

      if (!message) {
        return;
      }

      result.textContent =
        "正在发送……";

      try {

        const r =
          await fetch(
            cfg.letterApi ||
            "/api/letter",
            {
              method: "POST",

              headers: {
                "content-type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  message,
                  replyTo
                })
            }
          );

        const data =
          await r
            .json()
            .catch(
              () => ({})
            );

        if (!r.ok) {
          throw new Error(
            data.error ||
            "发送失败"
          );
        }

        result.textContent =
          "已送达。谢谢你留下这封信。";

        form.reset();

      } catch (err) {

        console.error(
          "Letter error:",
          err
        );

        result.textContent =
          err.message ||
          "发送失败，请稍后再试。";
      }
    }
  );
}

// =====================================================
// Load remote content
// =====================================================

loadMoments();
loadStatus();