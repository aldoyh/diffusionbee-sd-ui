<template>
    <section class="sample-strip" aria-labelledby="home-samples-title">
        <div class="sample-strip-head">
            <div class="sample-strip-heading">
                <h2 id="home-samples-title" class="section-title">{{ isArabic ? 'ابدأ من عيّنة' : 'Start from a sample' }}</h2>
                <p class="section-subtitle">
                    {{ isArabic ? 'اختر صورة لتحميل موجهها في المربع أعلاه.' : 'Pick one to load its prompt into the composer above.' }}
                </p>
            </div>
            <div class="sample-strip-nav" v-if="tiles.length > 1">
                <button
                    type="button"
                    class="btn btn-secondary btn-icon btn-sm"
                    @click="scrollByPage(-1)"
                    :aria-label="isArabic ? 'مرّر العينات لليسار' : 'Scroll samples left'"
                >
                    <AppIcon name="chevron-left" :size="16" />
                </button>
                <button
                    type="button"
                    class="btn btn-secondary btn-icon btn-sm"
                    @click="scrollByPage(1)"
                    :aria-label="isArabic ? 'مرّر العينات لليمين' : 'Scroll samples right'"
                >
                    <AppIcon name="chevron-right" :size="16" />
                </button>
            </div>
        </div>

        <div class="sample-strip-track" ref="track" dir="ltr" @wheel.prevent="onWheel">
            <button
                v-for="tile in tiles"
                :key="tile.key"
                type="button"
                class="sample-card"
                @click="$emit('select', tile.prompt)"
                :title="tile.prompt"
                :aria-label="(isArabic ? 'استخدم عينة: ' : 'Use sample: ') + tile.label"
            >
                <img
                    class="sample-card-img"
                    :src="tile.src"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                />
                <span class="sample-card-scrim" aria-hidden="true"></span>
                <span class="sample-card-label">{{ tile.label }}</span>
            </button>
        </div>
    </section>
</template>

<script>
import AppIcon from '../ui/AppIcon.vue'

export default {
    name: 'HomeSampleStrip',
    components: { AppIcon },
    props: {
        tiles: {
            type: Array,
            default: () => [],
        },
        isArabic: {
            type: Boolean,
            default: false,
        },
    },
    methods: {
        getTrack() {
            return this.$refs.track || null;
        },
        scrollByPage(direction) {
            const track = this.getTrack();
            if (!track) return;
            const page = Math.max(280, Math.round(track.clientWidth * 0.8));
            track.scrollBy({ left: page * direction, behavior: 'smooth' });
        },
        onWheel(event) {
            const track = this.getTrack();
            if (!track) return;
            // Trackpads send deltaX for horizontal gestures; mice only send
            // deltaY, so map vertical wheel input onto the horizontal strip.
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (!delta) return;
            track.scrollLeft += delta;
        },
    },
}
</script>

<style scoped>
.sample-strip {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
}

.sample-strip-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-md);
}

.sample-strip-heading {
    display: flex;
    flex-direction: column;
    gap: var(--space-xxs);
    min-width: 0;
}

.section-title {
    margin: 0;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
    letter-spacing: -0.01em;
    color: var(--color-text-primary);
}

.section-subtitle {
    margin: 0;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    color: var(--color-text-tertiary);
}

.sample-strip-nav {
    display: flex;
    gap: var(--space-xs);
    flex-shrink: 0;
}

.sample-strip-track {
    display: flex;
    gap: var(--space-sm);
    overflow-x: auto;
    overflow-y: hidden;
    padding: var(--space-xxs) var(--space-xxs) var(--space-sm);
    margin: calc(var(--space-xxs) * -1);
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
}

.sample-strip-track::-webkit-scrollbar {
    display: none;
}

.sample-card {
    position: relative;
    flex: 0 0 auto;
    width: 208px;
    aspect-ratio: 3 / 2;
    padding: 0;
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    background-color: var(--color-bg-elevated);
    overflow: hidden;
    cursor: pointer;
    scroll-snap-align: start;
    transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.sample-card:hover {
    border-color: var(--color-border-strong);
    transform: translateY(-2px);
}

.sample-card:active {
    transform: translateY(0);
}

.sample-card:focus-visible {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--color-primary-light);
}

.sample-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform var(--transition-slow);
}

.sample-card:hover .sample-card-img {
    transform: scale(1.05);
}

.sample-card-scrim {
    position: absolute;
    inset: auto 0 0 0;
    height: 60%;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0));
    pointer-events: none;
}

.sample-card-label {
    position: absolute;
    inset-inline-start: var(--space-sm);
    inset-inline-end: var(--space-sm);
    bottom: var(--space-xs);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: #ffffff;
    text-align: start;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

@media (max-width: 640px) {
    .sample-card {
        width: 168px;
    }
}
</style>
