import { vReveal } from '~/composables/useReveal'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', vReveal)
})
