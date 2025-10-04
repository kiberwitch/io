document.addEventListener("DOMContentLoaded", function () {
  const sections = [
    "main-section",
    "advantages-section",
    "services-section",
    "model-section",
    "more-info-section",
  ];

  const animatedSections = new Set(["main-section"]);

  function animateSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    if (!animatedSections.has(sectionId)) {
      section.classList.add("animated");
      animatedSections.add(sectionId);

      setTimeout(() => {
        const lines = section.querySelectorAll(
          ".advantages-diagonal-line, .services-horizontal-line"
        );
        lines.forEach((line) => {
          line.classList.add("line-animated");
        });
      }, 100);
    }
  }

  animateSection("main-section");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            const sectionId = entry.target.id;
            animateSection(sectionId);
          }
        });
      },
      {
        threshold: [0.3],
        rootMargin: "0px 0px -100px 0px",
      }
    );

    sections.forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      if (section) {
        observer.observe(section);
      }
    });
  }

  const heavyElements = [
    ".advantages-line-container",
    ".services-line-container",
    ".glowing-line-wrapper",
  ];

  if ("IntersectionObserver" in window) {
    const heavyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const svg = entry.target.querySelector("svg");
            if (svg) {
              svg.style.animationPlayState = "running";
            }
            heavyObserver.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "50px 0px",
        threshold: 0.1,
      }
    );

    heavyElements.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const svg = el.querySelector("svg");
        if (svg) {
          svg.style.animationPlayState = "paused";
        }
        heavyObserver.observe(el);
      });
    });
  }
});
