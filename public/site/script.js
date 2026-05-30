// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Counter animation
function animateCounter(element, target, suffix = '+') {
    let current = 0;
    const increment = target / 60;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 25);
}

// Intersection Observer for scroll animations
const observerOptions = { threshold: 0.15, rootMargin: '0px' };

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeInUp');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Stats counter observer
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounter(document.getElementById('stat-users'), 5000);
            animateCounter(document.getElementById('stat-tournaments'), 200);
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

// Initialize animations on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transition = `all 0.6s ease ${i * 0.1}s`;
        observer.observe(el);
    });

    // Observe steps
    document.querySelectorAll('.step').forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transition = `all 0.6s ease ${i * 0.15}s`;
        observer.observe(el);
    });

    // Observe testimonials
    document.querySelectorAll('.testimonial-card').forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transition = `all 0.6s ease ${i * 0.1}s`;
        observer.observe(el);
    });

    // Observe stats section for counter animation
    const statsSection = document.querySelector('.stats');
    if (statsSection) statsObserver.observe(statsSection);

    // Hero elements initial animation
    document.querySelectorAll('.hero-badge, .hero h1, .hero p, .hero-buttons, .hero-visual').forEach(el => {
        el.style.opacity = '0';
    });
    setTimeout(() => {
        document.querySelector('.hero-badge').style.opacity = '1';
        document.querySelector('.hero-badge').classList.add('animate-fadeIn');
        setTimeout(() => {
            document.querySelector('.hero h1').style.opacity = '1';
            document.querySelector('.hero h1').classList.add('animate-fadeInUp');
        }, 200);
        setTimeout(() => {
            document.querySelector('.hero p').style.opacity = '1';
            document.querySelector('.hero p').classList.add('animate-fadeInUp');
        }, 400);
        setTimeout(() => {
            document.querySelector('.hero-buttons').style.opacity = '1';
            document.querySelector('.hero-buttons').classList.add('animate-fadeInUp');
        }, 600);
        setTimeout(() => {
            document.querySelector('.hero-visual').style.opacity = '1';
            document.querySelector('.hero-visual').classList.add('animate-slideInRight');
        }, 400);
    }, 100);
});
