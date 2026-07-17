import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        lol: {
          void: '#010A13',
          navy: '#091428',
          steel: '#0A1428',
          gold: {
            1: '#F0E6D2',
            2: '#C8AA6E',
            3: '#C89B3C',
            4: '#785A28',
            5: '#463714',
            6: '#32281E',
          },
          blue: {
            1: '#CDFAFA',
            2: '#0AC8B9',
            3: '#0397AB',
            4: '#005A82',
            5: '#0A323C',
            6: '#091428',
            7: '#0A1428',
          },
          grey: {
            1: '#A09B8C',
            2: '#5B5A56',
            3: '#3C3C41',
            15: '#1E2328',
          },
          red: '#C8272C',
        },
        val: {
          red: '#FF4655',
          dark: '#0F1923',
          cream: '#ECE8E1',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        hex: '0 0 30px rgba(200,155,60,0.35)',
        'hex-strong': '0 0 60px rgba(200,155,60,0.55)',
      },
      keyframes: {
        shimmer: {
          '0%,100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
} satisfies Config
