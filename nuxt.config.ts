export default defineNuxtConfig({
  compatibilityDate: '2025-07-16',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // The app is a static SPA, so these ship in the client bundle. The PAT must
      // therefore be data-only and scoped to this single base — see AIRTABLE.md.
      airtable: {
        pat: process.env.NUXT_PUBLIC_AIRTABLE_PAT || '',
        baseId: process.env.NUXT_PUBLIC_AIRTABLE_BASE_ID || '',
        playersTable: process.env.NUXT_PUBLIC_AIRTABLE_PLAYERS_TABLE || 'Players',
        matchesTable: process.env.NUXT_PUBLIC_AIRTABLE_MATCHES_TABLE || 'Matches',
      },
    },
  },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'Factory Arena',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap',
        },
      ],
    },
  },
})
