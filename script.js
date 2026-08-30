(function () {
  const header = document.querySelector('header');
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('header nav ul');

  if (header) {
    const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
      navMenu.classList.toggle('is-open', !isOpen);
    });

    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open navigation');
        navMenu.classList.remove('is-open');
      });
    });
  }

  const navLinks = document.querySelectorAll('header nav a');
  const sections = document.querySelectorAll('[data-section]');

  const setActiveSection = (sectionId) => {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${sectionId}`;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  if (sections.length > 0) {
    const requestedSection = window.location.hash.slice(1);
    const hasRequestedSection = Array.from(sections).some((section) => section.id === requestedSection);
    setActiveSection(hasRequestedSection ? requestedSection : 'home');
  }

  if (sections.length > 0 && 'IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    sections.forEach((section) => sectionObserver.observe(section));
  } else {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach((link) => {
      if (link.getAttribute('href').split('/').pop() === currentPage) link.classList.add('active');
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.project-container, .blog-container').forEach((carousel) => {
    const cards = Array.from(carousel.querySelectorAll('.project-card, .blog-card'));
    let paused = reduceMotion;
    let animationFrame;
    let previousTime = 0;

    const setPaused = (nextPaused) => {
      paused = nextPaused;
      carousel.classList.toggle('is-paused', paused);
    };

    if (cards.length > 1 && !reduceMotion) {
      cards.forEach((card) => {
        const clone = card.cloneNode(true);
        clone.dataset.clone = 'true';
        clone.setAttribute('aria-hidden', 'true');
        clone.removeAttribute('tabindex');
        clone.classList.remove('reveal');
        clone.classList.add('is-visible');
        clone.querySelectorAll('[tabindex]').forEach((element) => element.removeAttribute('tabindex'));
        clone.querySelectorAll('a').forEach((link) => link.setAttribute('tabindex', '-1'));
        carousel.appendChild(clone);
      });
    }

    const animate = (time) => {
      if (!previousTime) previousTime = time;
      const elapsed = Math.min(time - previousTime, 40);
      previousTime = time;
      if (!paused && carousel.scrollWidth > carousel.clientWidth * 1.05) {
        carousel.scrollLeft += elapsed * 0.028;
        if (carousel.scrollLeft >= carousel.scrollWidth / 2) carousel.scrollLeft -= carousel.scrollWidth / 2;
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    if (!reduceMotion) animationFrame = window.requestAnimationFrame(animate);

    carousel.addEventListener('mouseenter', () => setPaused(true));
    carousel.addEventListener('mouseleave', () => {
      if (!carousel.querySelector('.is-selected')) setPaused(false);
    });
    carousel.addEventListener('pointerdown', () => setPaused(true));
    carousel.addEventListener('pointerup', () => {
      if (!carousel.querySelector('.is-selected')) window.setTimeout(() => setPaused(false), 900);
    });
    carousel.addEventListener('focusin', () => setPaused(true));
    carousel.addEventListener('focusout', (event) => {
      if (!carousel.contains(event.relatedTarget) && !carousel.querySelector('.is-selected')) setPaused(false);
    });

    cards.forEach((card) => {
      const toggleCard = () => {
        const shouldPause = !card.classList.contains('is-selected');
        carousel.querySelectorAll('.is-selected').forEach((selected) => {
          selected.classList.remove('is-selected');
          selected.setAttribute('aria-pressed', 'false');
        });
        card.classList.toggle('is-selected', shouldPause);
        card.setAttribute('aria-pressed', String(shouldPause));
        setPaused(shouldPause);
      };

      card.addEventListener('click', (event) => {
        if (event.target.closest('a')) return;
        toggleCard();
      });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleCard();
        }
      });
    });

    window.addEventListener('pagehide', () => window.cancelAnimationFrame(animationFrame), { once: true });
  });

  const contactForm = document.querySelector('.contact-form form');
  if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const button = contactForm.querySelector('button');
      const status = contactForm.querySelector('.form-status');
      const originalLabel = button.textContent;
      button.textContent = 'Message noted';
      button.disabled = true;
      if (status) status.textContent = 'Thanks for reaching out — I’ll get back to you soon.';
      window.setTimeout(() => {
        button.textContent = originalLabel;
        button.disabled = false;
        contactForm.reset();
      }, 3000);
    });
  }

  document.querySelectorAll('[data-year]').forEach((year) => {
    year.textContent = new Date().getFullYear();
  });

  const hero = document.querySelector('.hero');
  if (hero && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hero.addEventListener('pointermove', (event) => {
      const bounds = hero.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 10;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 10;
      hero.style.setProperty('--pointer-x', `${x}px`);
      hero.style.setProperty('--pointer-y', `${y}px`);
    });
    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--pointer-x', '0px');
      hero.style.setProperty('--pointer-y', '0px');
    });
  }
})();

function openBlog(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}