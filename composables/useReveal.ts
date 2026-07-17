import type { Directive } from 'vue'

export const vReveal: Directive<HTMLElement, string | number | undefined> = {
  mounted(el, binding) {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
      return
    }
    el.style.opacity = '0'
    el.style.transform = 'translateY(24px)'
    el.style.transition = 'opacity 0.7s ease, transform 0.7s ease'
    const delay = binding.value ? Number(binding.value) : 0
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              el.style.opacity = '1'
              el.style.transform = 'translateY(0)'
            }, delay)
            io.unobserve(el)
          }
        })
      },
      { threshold: 0.12 },
    )
    io.observe(el)
  },
  getSSRProps() {
    return {}
  },
}
