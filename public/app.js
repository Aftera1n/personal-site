const cfg = window.SITE_CONFIG || {};

// =====================================================
// 基础配置
// =====================================================

const avatar = document.querySelector("#avatar");

if (avatar && cfg.avatarUrl) {
  avatar.src = cfg.avatarUrl;
}

// =====================================================
// 页面导航
// =====================================================

const navs = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

function showPage(id) {
  navs.forEach((nav) => {
    nav.classList.toggle(
      "active",
      nav.dataset.page === id
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

// =====================================================
// 手机端菜单
// =====================================================

const sidebar =
  document.querySelector(".sidebar");

const brand =
  document.querySelector(".brand");

const menuToggle =
  document.querySelector(".menu-toggle");

const menuTrigger =
  menuToggle || brand;

let touchTriggered = false;

if (menuTrigger && sidebar) {
  menuTrigger.addEventListener(
    "touchstart",
    (event) => {
      if (window.innerWidth > 800) {
        return;
      }

      event.preventDefault();

      touchTriggered = true;

      sidebar.classList.toggle("open");
    },
    {
      passive: false,
    }
  );

  menuTrigger.addEventListener(
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
    (event) => {
      if (window.innerWidth > 800) {
        return;
      }

      if (
        !sidebar.classList.contains("open")
      ) {
        return;
      }

      if (
        !sidebar.contains(event.target) &&
        event.target !== menuTrigger
      ) {
        sidebar.classList.remove("open");
      }
    }
  );
}

navs.forEach((nav) => {
  nav.addEventListener("click", () => {
    showPage(nav.dataset.page);

    if (
      window.innerWidth <= 800 &&
      sidebar
    ) {
      sidebar.classList.remove("open");
    }
  });
});

// =====================================================
// 初始化页面
// =====================================================

const initial =
  location.hash.slice(1);

if (
  initial &&
  document.getElementById(initial)
) {
  showPage(initial);
}

// =====================================================
// HTML 安全处理
// =====================================================

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

// =====================================================
// 状态
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

  title.textContent = "正在加载……";
  detail.textContent = "稍等一下。";
  time.textContent = "";

  try {
    const response =
      await fetch(
        "/api/status",
        {
          method: "GET",
          cache: "no-store",
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "读取状态失败。"
      );
    }

    const status =
      data.status;

    if (!status) {
      title.textContent =
        "暂时没有状态";

      detail.textContent =
        "还没有设置当前状态。";

      return;
    }

    title.textContent =
      status.title || "";

    detail.textContent =
      status.detail || "";

    if (status.updatedAt) {
      time.textContent =
        `LAST UPDATED · ${status.updatedAt}`;
    } else {
      time.textContent = "";
    }
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
// 动态
// =====================================================

const timeline =
  document.querySelector(
    "#timeline"
  );

async function loadMoments() {
  if (!timeline) {
    return;
  }

  timeline.innerHTML = `
    <div class="glass mini-card">
      <h3>正在加载……</h3>
      <p>正在读取最近的动态。</p>
    </div>
  `;

  try {
    const response =
      await fetch(
        "/api/moments",
        {
          method: "GET",
          cache: "no-store",
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "读取动态失败。"
      );
    }

    const moments =
      Array.isArray(data.moments)
        ? data.moments
        : [];

    moments.sort(
      (a, b) =>
        String(
          b.date || ""
        ).localeCompare(
          String(
            a.date || ""
          )
        ) ||
        String(
          b.createdAt || ""
        ).localeCompare(
          String(
            a.createdAt || ""
          )
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
          (moment) => `
            <article class="moment">

              <div class="moment-date">
                ${escapeHtml(
                  moment.date || ""
                )}
              </div>

              <div class="moment-card glass">

                ${
                  moment.image
                    ? `
                      <img
                        class="moment-img"
                        loading="lazy"
                        src="${escapeAttr(
                          moment.image
                        )}"
                        alt="${escapeAttr(
                          moment.title ||
                            "照片"
                        )}"
                      >
                    `
                    : ""
                }

                <div class="moment-body">

                  <h3 class="moment-title">
                    ${escapeHtml(
                      moment.title ||
                        "未命名"
                    )}
                  </h3>

                  ${
                    moment.description
                      ? `
                        <p class="moment-desc">
                          ${escapeHtml(
                            moment.description
                          )}
                        </p>
                      `
                      : ""
                  }

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
        <h3>动态加载失败</h3>
        <p>请稍后刷新页面再试。</p>
      </div>
    `;
  }
}

// =====================================================
// 匿名信
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
    async (event) => {
      event.preventDefault();

      // Honeypot
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
          .value.trim();

      const replyTo =
        document
          .querySelector("#replyTo")
          .value.trim();

      if (!message) {
        return;
      }

      result.textContent =
        "正在发送……";

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

        result.textContent =
          "已送达。谢谢你留下这封信。";

        form.reset();
      } catch (error) {
        console.error(
          "Letter error:",
          error
        );

        result.textContent =
          error.message ||
          "发送失败，请稍后再试。";
      }
    }
  );
}

// =====================================================
// 启动
// =====================================================

loadStatus();
loadMoments();