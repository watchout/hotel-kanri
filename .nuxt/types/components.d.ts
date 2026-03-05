
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T

interface _GlobalComponents {
  'NuxtWelcome': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/welcome.vue")['default']
  'NuxtLayout': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-layout")['default']
  'NuxtErrorBoundary': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
  'ClientOnly': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/client-only")['default']
  'DevOnly': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/dev-only")['default']
  'ServerPlaceholder': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/server-placeholder")['default']
  'NuxtLink': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-link")['default']
  'NuxtLoadingIndicator': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
  'NuxtTime': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
  'NuxtRouteAnnouncer': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
  'NuxtImg': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
  'NuxtPicture': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
  'Icon': typeof import("../../node_modules/.pnpm/@nuxt+icon@1.15.0_magicast@0.5.2_vite@7.3.1_@types+node@22.15.14_jiti@2.6.1_terser@5.46_408134713a795913125fb426e1fcbc85/node_modules/@nuxt/icon/dist/runtime/components/index")['default']
  'NuxtPage': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/pages/runtime/page-placeholder")['default']
  'NoScript': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['NoScript']
  'Link': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Link']
  'Base': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Base']
  'Title': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Title']
  'Meta': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Meta']
  'Style': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Style']
  'Head': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Head']
  'Html': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Html']
  'Body': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Body']
  'NuxtIsland': typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-island")['default']
  'LazyNuxtWelcome': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/welcome.vue")['default']>
  'LazyNuxtLayout': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
  'LazyNuxtErrorBoundary': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
  'LazyClientOnly': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/client-only")['default']>
  'LazyDevOnly': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/dev-only")['default']>
  'LazyServerPlaceholder': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/server-placeholder")['default']>
  'LazyNuxtLink': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-link")['default']>
  'LazyNuxtLoadingIndicator': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
  'LazyNuxtTime': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
  'LazyNuxtRouteAnnouncer': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
  'LazyNuxtImg': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
  'LazyNuxtPicture': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
  'LazyIcon': LazyComponent<typeof import("../../node_modules/.pnpm/@nuxt+icon@1.15.0_magicast@0.5.2_vite@7.3.1_@types+node@22.15.14_jiti@2.6.1_terser@5.46_408134713a795913125fb426e1fcbc85/node_modules/@nuxt/icon/dist/runtime/components/index")['default']>
  'LazyNuxtPage': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/pages/runtime/page-placeholder")['default']>
  'LazyNoScript': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['NoScript']>
  'LazyLink': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Link']>
  'LazyBase': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Base']>
  'LazyTitle': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Title']>
  'LazyMeta': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Meta']>
  'LazyStyle': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Style']>
  'LazyHead': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Head']>
  'LazyHtml': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Html']>
  'LazyBody': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/head/runtime/components")['Body']>
  'LazyNuxtIsland': LazyComponent<typeof import("../../node_modules/.pnpm/nuxt@3.19.3_@parcel+watcher@2.5.6_@types+node@22.15.14_@vue+compiler-sfc@3.5.29_cac@6.7_994b311f10c443168fa1b4fd2c511a75/node_modules/nuxt/dist/app/components/nuxt-island")['default']>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
