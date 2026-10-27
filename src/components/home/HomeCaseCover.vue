<template>
  <svg
    width="34"
    height="34"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fff"
    stroke-width="1.8"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <template v-if="kind === 'chart'">
      <path d="M3 20h18" />
      <path d="M6 20v-7M11 20V7M16 20v-11M21 20V4" />
    </template>
    <template v-else-if="kind === 'net'">
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M12 7v6M12 13l-6 3M12 13l6 3" />
    </template>
    <template v-else-if="kind === 'bar'">
      <rect x="3" y="12" width="4" height="8" />
      <rect x="9" y="7" width="4" height="13" />
      <rect x="15" y="4" width="4" height="16" />
    </template>
    <template v-else-if="kind === 'line'">
      <path d="M3 17c4 0 5-9 9-9s5 5 9 3" />
    </template>
    <template v-else-if="kind === 'map'">
      <path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z" />
      <path d="M9 4v13M15 7v13" />
    </template>
    <template v-else>
      <circle cx="6" cy="15" r="1.6" />
      <circle cx="10" cy="9" r="1.6" />
      <circle cx="14" cy="12" r="1.6" />
      <circle cx="18" cy="6" r="1.6" />
      <path d="M4 19c4-1 6-8 14-12" stroke-width="1.6" />
    </template>
  </svg>
</template>

<script setup lang="ts">
import type { CoverKind } from './home-cases'

/** 封面插画：图形取自原型 `COVER_ICON`，逐条对应，不另做设计。 */
defineProps<{ kind: CoverKind }>()
</script>
