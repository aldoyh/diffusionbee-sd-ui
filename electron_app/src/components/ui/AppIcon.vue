<template>
    <svg
        class="app-icon"
        :width="size"
        :height="size"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
    >
        <g v-if="name === 'sparkles'">
            <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
            <path d="M20 3v4" />
            <path d="M22 5h-4" />
        </g>

        <g v-else-if="name === 'clock'">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15.5 14" />
        </g>

        <g v-else-if="name === 'circle-slash'">
            <circle cx="12" cy="12" r="9" />
            <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
        </g>

        <g v-else-if="name === 'shuffle'">
            <path d="M18 3h4v4" />
            <path d="m22 3-6.5 6.5" />
            <path d="M18 21h4v-4" />
            <path d="m22 21-6.5-6.5" />
            <path d="M2 3h4l4 4" />
            <path d="M2 21h4l4-4" />
        </g>

        <g v-else-if="name === 'braces'">
            <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
            <path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
        </g>

        <g v-else-if="name === 'send'">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
        </g>

        <g v-else-if="name === 'list-plus'">
            <path d="M11 12H3" />
            <path d="M16 6H3" />
            <path d="M16 18H3" />
            <path d="M18 9v6" />
            <path d="M21 12h-6" />
        </g>

        <g v-else-if="name === 'play'">
            <polygon points="7 4 20 12 7 20 7 4" />
        </g>

        <g v-else-if="name === 'trash'">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </g>

        <g v-else-if="name === 'x'">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </g>

        <g v-else-if="name === 'chevron-left'">
            <polyline points="15 18 9 12 15 6" />
        </g>

        <g v-else-if="name === 'chevron-right'">
            <polyline points="9 18 15 12 9 6" />
        </g>

        <g v-else-if="name === 'chevron-up'">
            <polyline points="18 15 12 9 6 15" />
        </g>

        <g v-else-if="name === 'arrow-right'">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </g>

        <g v-else-if="name === 'image'">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-4.6-4.6a2 2 0 0 0-2.8 0L4 21" />
        </g>

        <g v-else-if="name === 'library'">
            <path d="m16 6 4 14" />
            <path d="M12 6v14" />
            <path d="M8 8v12" />
            <path d="M4 4v16" />
        </g>

        <g v-else-if="name === 'film'">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 3v18" />
            <path d="M17 3v18" />
            <path d="M3 12h18" />
            <path d="M3 7.5h4" />
            <path d="M17 7.5h4" />
            <path d="M3 16.5h4" />
            <path d="M17 16.5h4" />
        </g>

        <g v-else-if="name === 'zap'">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </g>

        <g v-else-if="name === 'brush'">
            <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
            <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
        </g>

        <g v-else-if="name === 'camera'">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
        </g>

        <g v-else-if="name === 'box'">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
        </g>

        <g v-else-if="name === 'pencil'">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
        </g>

        <g v-else-if="name === 'moon'">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </g>

        <g v-else-if="name === 'plus'">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </g>

        <g v-else-if="name === 'check'">
            <polyline points="20 6 9 17 4 12" />
        </g>

        <g v-else-if="name === 'download'">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </g>

        <g v-else-if="name === 'wand'">
            <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
            <path d="m14 7 3 3" />
            <path d="M5 6v4" />
            <path d="M19 14v4" />
            <path d="M10 2v2" />
            <path d="M7 8H3" />
            <path d="M21 16h-4" />
        </g>

        <g v-else-if="name === 'grid'">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </g>

        <g v-else-if="name === 'alert'">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </g>

        <g v-else>
            <circle cx="12" cy="12" r="9" />
        </g>
    </svg>
</template>

<script>
/**
 * Inline Lucide-style icon set.
 *
 * One icon system for the whole app instead of emoji: icons inherit
 * `currentColor`, scale crisply, and stay visually consistent in both the
 * Latin and Arabic (RTL) layouts.
 */
export default {
    name: 'AppIcon',
    props: {
        name: {
            type: String,
            required: true,
        },
        size: {
            type: [Number, String],
            default: 18,
        },
        strokeWidth: {
            type: [Number, String],
            default: 1.8,
        },
    },
}
</script>

<style scoped>
.app-icon {
    display: block;
    flex-shrink: 0;
}
</style>
