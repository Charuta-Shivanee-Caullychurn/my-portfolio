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

  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if (finePointer && !reduceMotion) {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<span class="custom-cursor-pointer"></span><span class="custom-cursor-ring"></span>';
    document.body.appendChild(cursor);
    document.documentElement.classList.add('has-custom-cursor');

    let targetX = -100;
    let targetY = -100;
    let currentX = targetX;
    let currentY = targetY;

    const moveCursor = (event) => {
      targetX = event.clientX - 10;
      targetY = event.clientY - 10;
      cursor.classList.add('is-visible');
      const interactive = event.target.closest('a, button, [role="button"], input, textarea, select');
      cursor.classList.toggle('is-interactive', Boolean(interactive));
    };

    const animateCursor = () => {
      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      window.requestAnimationFrame(animateCursor);
    };

    document.addEventListener('pointermove', moveCursor, { passive: true });
    document.addEventListener('pointerdown', () => cursor.classList.add('is-active'));
    document.addEventListener('pointerup', () => cursor.classList.remove('is-active'));
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
    window.requestAnimationFrame(animateCursor);
  }

  document.querySelectorAll('.project-container, .blog-container').forEach((carousel) => {
    const cards = Array.from(carousel.querySelectorAll('.project-card, .blog-card'));
    let paused = reduceMotion;
    let animationFrame;
    let previousTime = 0;
    let scrollOffset = carousel.scrollLeft;

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
        const loopWidth = carousel.scrollWidth / 2;
        scrollOffset += elapsed * 0.04;
        if (scrollOffset >= loopWidth) scrollOffset -= loopWidth;
        carousel.scrollLeft = scrollOffset;
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    if (!reduceMotion) animationFrame = window.requestAnimationFrame(animate);

    carousel.addEventListener('pointerdown', () => {
      scrollOffset = carousel.scrollLeft;
      setPaused(true);
    });
    carousel.addEventListener('pointerup', () => {
      if (!carousel.querySelector('.is-selected')) window.setTimeout(() => setPaused(false), 900);
    });
    carousel.addEventListener('focusin', () => {
      scrollOffset = carousel.scrollLeft;
      setPaused(true);
    });
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
    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = contactForm.querySelector('button');
      const status = contactForm.querySelector('.form-status');
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending…';
      if (status) status.textContent = 'Sending your message securely…';

      const formData = new FormData(contactForm);
      const payload = {
        name: formData.get('visitor-name'),
        email: formData.get('visitor-email'),
        reason: formData.get('contact-reason'),
        message: formData.get('visitor-message'),
        website: formData.get('website'),
      };

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || 'Message could not be sent.');

        button.textContent = 'Message sent';
        if (status) status.textContent = 'Thanks for reaching out — I’ll get back to you soon.';
        contactForm.reset();
      } catch (error) {
        button.textContent = 'Try again';
        if (status) status.textContent = error.message || 'Something went wrong. Please try again.';
      } finally {
        window.setTimeout(() => {
          button.textContent = originalLabel;
          button.disabled = false;
        }, 3000);
      }
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