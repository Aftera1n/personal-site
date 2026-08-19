const cfg = window.SITE_CONFIG || {};


/* =====================================================
   Helpers
===================================================== */

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


function escapeHtml(value) {

  return String(
    value ?? ""
  ).replace(
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


function formatTime(value) {

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

    return escapeHtml(
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
===================================================== */

const avatar =
  document.querySelector("#avatar");

if (avatar) {

  const originalAvatar =
    avatar.getAttribute("src");

  let triedConfigAvatar = false;


  if (cfg.avatarUrl) {

    triedConfigAvatar = true;

    avatar.src =
      cfg.avatarUrl;

  }


  avatar.addEventListener(
    "error",
    () => {

      if (
        triedConfigAvatar &&
        originalAvatar
      ) {

        triedConfigAvatar = false;

        avatar.src =
          originalAvatar;

      }

    }
  );

}


/* =====================================================
   Navigation
===================================================== */

const navs =
  document.querySelectorAll(
    ".nav-item"
  );

const pages =
  document.querySelectorAll(
    ".page"
  );

const sidebar =
  document.querySelector(
    ".sidebar"
  );

const nav =
  sidebar
    ? sidebar.querySelector("nav")
    : null;


/* =====================================================
   Page Switching
===================================================== */

function showPage(id) {

  navs.forEach(
    (item) => {

      item.classList.toggle(
        "active",
        item.dataset.page === id
      );

    }
  );


  pages.forEach(
    (page) => {

      page.classList.toggle(
        "active",
        page.id === id
      );

    }
  );


  history.replaceState(
    null,
    "",
    "#" + id
  );

}


/* =====================================================
   Mobile Menu
===================================================== */

let menuOpen = false;


function isMobile() {

  return window.innerWidth <= 800;

}


function openMobileMenu() {

  if (
    !nav ||
    !isMobile()
  ) {
    return;
  }


  menuOpen = true;


  nav.style.maxHeight =
    "70px";

  nav.style.opacity =
    "1";

  nav.style.pointerEvents =
    "auto";

  nav.style.padding =
    "5px 0 2px";

}


function closeMobileMenu() {

  if (!nav) {
    return;
  }


  menuOpen = false;


  if (isMobile()) {

    nav.style.maxHeight =
      "0px";

    nav.style.opacity =
      "0";

    nav.style.pointerEvents =
      "none";

    nav.style.padding =
      "0";

  } else {

    nav.style.maxHeight =
      "";

    nav.style.opacity =
      "";

    nav.style.pointerEvents =
      "";

    nav.style.padding =
      "";

  }

}


function toggleMobileMenu() {

  if (
    !isMobile() ||
    !nav
  ) {
    return;
  }


  if (menuOpen) {

    closeMobileMenu();

  } else {

    openMobileMenu();

  }

}


/* =====================================================
   Mobile Menu Trigger
===================================================== */

if (sidebar) {

  sidebar.addEventListener(
    "pointerup",
    (event) => {

      if (!isMobile()) {
        return;
      }


      const navItem =
        event.target.closest &&
        event.target.closest(
          ".nav-item"
        );


      if (navItem) {
        return;
      }


      toggleMobileMenu();

    }
  );

}


/* =====================================================
   Navigation Click
===================================================== */

navs.forEach(
  (item) => {

    item.addEventListener(
      "click",
      (event) => {

        event.stopPropagation();


        const page =
          item.dataset.page;


        if (page) {

          showPage(page);

        }


        if (isMobile()) {

          closeMobileMenu();

        }


        /*
         * 每次进入页面重新读取
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


/* =====================================================
   Click Outside
===================================================== */

document.addEventListener(
  "pointerup",
  (event) => {

    if (!isMobile()) {
      return;
    }


    if (!menuOpen) {
      return;
    }


    if (
      sidebar &&
      !sidebar.contains(
        event.target
      )
    ) {

      closeMobileMenu();

    }

  }
);


/* =====================================================
   Resize
===================================================== */

window.addEventListener(
  "resize",
  () => {

    if (isMobile()) {

      if (!menuOpen) {

        closeMobileMenu();

      }

    } else {

      menuOpen = false;


      if (nav) {

        nav.style.maxHeight =
          "";

        nav.style.opacity =
          "";

        nav.style.pointerEvents =
          "";

        nav.style.padding =
          "";

      }

    }

  }
);


/* =====================================================
   Initial Page
===================================================== */

const initialPage =
  location.hash.slice(1);


if (
  initialPage &&
  document.getElementById(
    initialPage
  )
) {

  showPage(
    initialPage
  );

} else {

  showPage(
    "home"
  );

}


/* =====================================================
   Status
===================================================== */

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
===================================================== */

async function loadMoments() {

  const timeline =
    document.querySelector(
      "#timeline"
    );


  if (!timeline) {
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
        (moment) => {

          const date =
            escapeHtml(
              moment.date
            );


          const title =
            escapeHtml(
              moment.title
            );


          const description =
            escapeHtml(
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
                  src="${escapeAttr(
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
   Anonymous Letter
   只有这一处 submit listener
===================================================== */

const letterForm =
  document.querySelector(
    "#letter-form"
  );

const letterResult =
  document.querySelector(
    "#form-result"
  );


if (letterForm) {

  letterForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      /*
       * 防止机器人填写 Honeypot
       */

      const honeypot =
        document.querySelector(
          "#website"
        );


      if (
        honeypot &&
        honeypot.value
      ) {

        return;

      }


      const messageInput =
        document.querySelector(
          "#message"
        );

      const replyInput =
        document.querySelector(
          "#replyTo"
        );


      const message =
        messageInput
          ?.value
          .trim() || "";


      const replyTo =
        replyInput
          ?.value
          .trim() || "";


      if (!message) {

        if (letterResult) {

          letterResult.textContent =
            "请输入留言内容。";

        }

        return;

      }


      if (letterResult) {

        letterResult.textContent =
          "正在发送……";

      }


      /*
       * 防止用户连续点击发送按钮
       */

      const submitButton =
        letterForm.querySelector(
          'button[type="submit"]'
        );


      if (submitButton) {

        submitButton.disabled =
          true;

      }


      try {

        const data =
          await apiFetch(
            cfg.letterApi ||
              "/api/letter",
            {
              method:
                "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  message,
                  replyTo,
                }),
            }
          );


        if (letterResult) {

          letterResult.textContent =
            "已送达。谢谢你留下这封信。" +
            (
              data.remaining !==
              undefined
                ? ` 今天还可以发送 ${data.remaining} 次。`
                : ""
            );

        }


        letterForm.reset();


      } catch (error) {

        console.error(
          "匿名信发送失败:",
          error
        );


        if (letterResult) {

          letterResult.textContent =
            error.message ||
            "发送失败，请稍后再试。";

        }

      } finally {

        if (submitButton) {

          submitButton.disabled =
            false;

        }

      }

    }
  );

}


/* =====================================================
   Initial Data
===================================================== */

loadStatus();

loadMoments();