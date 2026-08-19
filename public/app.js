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
   保持原有 HTML / CSS / 样式
   不增加菜单按钮
===================================================== */

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
    nav.style.maxHeight = "0px";
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
  if (!isMobile() || !nav) return;

  if (menuOpen) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}


/* =====================================================
   Mobile Menu Trigger
   点击原来的顶部区域即可打开
   不增加任何按钮
===================================================== */

if (sidebar) {

  sidebar.addEventListener(
    "pointerup",
    (event) => {

      if (!isMobile()) return;

      /*
       * 如果点击的是导航项目，
       * 不要再次切换菜单。
       */
      const navItem =
        event.target.closest &&
        event.target.closest(".nav-item");

      if (navItem) {
        return;
      }

      /*
       * 点击 sidebar 顶部区域：
       * 打开 / 关闭菜单
       */
      toggleMobileMenu();
    }
  );

}


/* =====================================================
   Navigation
===================================================== */

navs.forEach((item) => {

  item.addEventListener("click", (event) => {

    event.stopPropagation();

    const page = item.dataset.page;

    if (page) {
      showPage(page);
    }

    /*
     * 手机端切换页面后自动关闭菜单
     */
    if (isMobile()) {
      closeMobileMenu();
    }

  });

});


/* =====================================================
   Click Outside
===================================================== */

document.addEventListener(
  "pointerup",
  (event) => {

    if (!isMobile()) return;
    if (!menuOpen) return;

    if (
      sidebar &&
      !sidebar.contains(event.target)
    ) {
      closeMobileMenu();
    }

  }
);


/* =====================================================
   Resize
===================================================== */

window.addEventListener("resize", () => {

  if (isMobile()) {

    if (!menuOpen) {
      closeMobileMenu();
    }

  } else {

    menuOpen = false;

    if (nav) {
      nav.style.maxHeight = "";
      nav.style.opacity = "";
      nav.style.pointerEvents = "";
      nav.style.padding = "";
    }

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



    async function apiFetch(
      url,
      options = {}
    ) {

      const response =
        await fetch(
          url,
          {
            ...options,

            cache:
              "no-store",
          }
        );


      let data = null;

      try {

        data =
          await response.json();

      } catch {

        throw new Error(
          "服务器返回了无效数据。"
        );

      }


      if (!response.ok) {

        throw new Error(
          data?.error ||
          `请求失败 (${response.status})`
        );

      }


      return data;

    }



    function escapeHTML(
      value
    ) {

      return String(
        value ?? ""
      ).replace(
        /[&<>"']/g,
        char => ({
          "&":
            "&amp;",
          "<":
            "&lt;",
          ">":
            "&gt;",
          '"':
            "&quot;",
          "'":
            "&#039;"
        }[char])
      );

    }



    function formatTime(
      value
    ) {

      if (!value) {
        return "";
      }


      const date =
        new Date(value);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return escapeHTML(
          value
        );

      }


      return date.toLocaleString(
        "zh-CN",
        {
          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit",

          hour:
            "2-digit",

          minute:
            "2-digit"
        }
      );

    }



    /* =====================================================
       Avatar
    ====================================================== */

    function loadAvatar() {

      const avatar =
        document.getElementById(
          "avatar"
        );


      if (
        !avatar
      ) {
        return;
      }


      const config =
        window.SITE_CONFIG;


      if (
        config &&
        config.avatarUrl
      ) {

        avatar.src =
          config.avatarUrl;

      }

    }



    /* =====================================================
       Status
    ====================================================== */

    async function loadStatus() {

      const title =
        document.getElementById(
          "status-title"
        );


      const detail =
        document.getElementById(
          "status-detail"
        );


      const time =
        document.getElementById(
          "status-time"
        );


      if (
        !title ||
        !detail
      ) {
        return;
      }


      try {

        const data =
          await apiFetch(
            "/api/status"
          );


        const status =
          data.status;


        if (!status) {

          title.textContent =
            "还没有设置状态";

          detail.textContent =
            "";

          if (time) {
            time.textContent =
              "";
          }

          return;

        }


        title.textContent =
          status.title ||
          "";


        detail.textContent =
          status.detail ||
          "";


        if (time) {

          if (
            status.updatedAt
          ) {

            time.textContent =
              "更新于 " +
              formatTime(
                status.updatedAt
              );

          } else {

            time.textContent =
              "";

          }

        }

      } catch (error) {

        console.error(
          "加载状态失败:",
          error
        );


        title.textContent =
          "暂时无法获取状态";


        detail.textContent =
          "请稍后再试。";


        if (time) {

          time.textContent =
            "";

        }

      }

    }



    /* =====================================================
       Moments
    ====================================================== */

    async function loadMoments() {

      const timeline =
        document.getElementById(
          "timeline"
        );


      if (
        !timeline
      ) {
        return;
      }


      try {

        const data =
          await apiFetch(
            "/api/moments"
          );


        const moments =
          Array.isArray(
            data.moments
          )
            ? data.moments
            : [];


        renderMoments(
          timeline,
          moments
        );

      } catch (error) {

        console.error(
          "加载动态失败:",
          error
        );


        timeline.innerHTML = `
          <div class="glass mini-card">
            <p class="muted">
              动态加载失败，请稍后再试。
            </p>
          </div>
        `;

      }

    }



    function renderMoments(
      container,
      moments
    ) {

      if (
        !moments.length
      ) {

        container.innerHTML = `
          <div class="glass mini-card">
            <p class="muted">
              这里还没有动态。
            </p>
          </div>
        `;

        return;

      }


      container.innerHTML =
        moments
          .map(
            moment => {

              const date =
                escapeHTML(
                  moment.date
                );


              const title =
                escapeHTML(
                  moment.title
                );


              const description =
                escapeHTML(
                  moment.description
                );


              let imageHTML =
                "";


              if (
                moment.image
              ) {

                imageHTML = `
                  <div class="moment-image">
                    <img
                      src="${escapeHTML(
                        moment.image
                      )}"
                      alt="${title}"
                      loading="lazy"
                    >
                  </div>
                `;

              }


              return `
                <article class="timeline-item">

                  <div class="timeline-dot"></div>

                  <div class="timeline-date">
                    ${date}
                  </div>

                  <div class="glass moment-card">

                    ${imageHTML}

                    <div class="moment-body">

                      <h3>
                        ${title}
                      </h3>

                      ${
                        description
                          ? `
                            <p>
                              ${description}
                            </p>
                          `
                          : ""
                      }

                    </div>

                  </div>

                </article>
              `;

            }
          )
          .join("");

    }



    /* =====================================================
       Navigation
    ====================================================== */

    function initNavigation() {

      const buttons =
        document.querySelectorAll(
          ".nav-item"
        );


      const pages =
        document.querySelectorAll(
          ".page"
        );


      buttons.forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              const page =
                button.dataset.page;


              buttons.forEach(
                item => {

                  item.classList.toggle(
                    "active",
                    item === button
                  );

                }
              );


              pages.forEach(
                section => {

                  section.classList.toggle(
                    "active",
                    section.id === page
                  );

                }
              );


              /*
               * 每次进入页面都重新读取，
               * 防止后台刚修改后前台还是旧数据。
               */

              if (
                page === "status"
              ) {

                loadStatus();

              }


              if (
                page === "moments"
              ) {

                loadMoments();

              }

            }
          );

        }
      );

    }



    /* =====================================================
       Anonymous Letter
    ====================================================== */

    function initLetter() {

      const form =
        document.getElementById(
          "letter-form"
        );


      if (!form) {
        return;
      }


      const message =
        document.getElementById(
          "message"
        );


      const replyTo =
        document.getElementById(
          "replyTo"
        );


      const website =
        document.getElementById(
          "website"
        );


      const result =
        document.getElementById(
          "form-result"
        );


      form.addEventListener(
        "submit",
        async event => {

          event.preventDefault();


          /*
           * Honeypot
           */

          if (
            website &&
            website.value
          ) {

            return;

          }


          result.textContent =
            "正在发送……";


          try {

            const config =
              window.SITE_CONFIG ||
              {};


            const api =
              config.letterApi ||
              "/api/letter";


            const data =
              await apiFetch(
                api,
                {
                  method:
                    "POST",

                  headers: {
                    "content-type":
                      "application/json"
                  },

                  body:
                    JSON.stringify({
                      message:
                        message.value,

                      replyTo:
                        replyTo.value
                    })
                }
              );


            result.textContent =
              "发送成功。" +
              (
                data.remaining !==
                undefined
                  ? ` 今天还可以发送 ${data.remaining} 次。`
                  : ""
              );


            message.value =
              "";


            replyTo.value =
              "";

          } catch (
            error
          ) {

            console.error(
              "匿名信发送失败:",
              error
            );


            result.textContent =
              error.message ||
              "发送失败，请稍后再试。";

          }

        }
      );

    }



    /* =====================================================
       Init
    ====================================================== */

    document.addEventListener(
      "DOMContentLoaded",
      () => {

        loadAvatar();

        initNavigation();

        initLetter();

        /*
         * 页面打开时直接读取最新数据。
         */

        loadStatus();

        loadMoments();

      }
    );
