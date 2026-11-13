<template>
    <section class="tool-grid-section">
        <div v-for="group in visibleGroups" :key="group.id" class="tool-group">
            <div class="tool-group-head">
                <h2 class="section-title">{{ group.title }}</h2>
                <span class="section-count">{{ group.items.length }}</span>
            </div>
            <div class="tool-grid">
                <button
                    v-for="item in group.items"
                    :key="item.id"
                    type="button"
                    class="tool-card"
                    @click="$emit('open', item.id)"
                >
                    <span class="tool-card-icon" aria-hidden="true">
                        <img v-if="item.img_icon" :src="item.img_icon" alt="" loading="lazy" decoding="async" />
                        <AppIcon v-else name="grid" :size="22" />
                    </span>
                    <span class="tool-card-copy">
                        <span class="tool-card-title">{{ item.title }}</span>
                        <span class="tool-card-desc" v-if="item.description">{{ item.description }}</span>
                    </span>
                    <AppIcon class="tool-card-arrow" name="arrow-right" :size="16" />
                </button>
            </div>
        </div>
    </section>
</template>

<script>
import AppIcon from '../ui/AppIcon.vue'

export default {
    name: 'HomeToolGrid',
    components: { AppIcon },
    props: {
        groups: {
            type: Array,
            default: () => [],
        },
    },
    computed: {
        visibleGroups() {
            return this.groups.filter((group) => group.items && group.items.length > 0);
        },
    },
}
</script>

<style scoped>
.tool-grid-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
}

.tool-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.tool-group-head {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
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

.section-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: var(--radius-full);
    background-color: var(--color-bg-hover);
    color: var(--color-text-tertiary);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    font-variant-numeric: tabular-nums;
}

.tool-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
    gap: var(--space-sm);
}

.tool-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    padding: var(--space-md);
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    text-align: start;
    cursor: pointer;
    transition: border-color var(--transition-fast), background-color var(--transition-fast), transform var(--transition-fast);
}

.tool-card:hover {
    border-color: var(--color-border-strong);
    background-color: var(--color-bg-elevated);
    transform: translateY(-1px);
}

.tool-card:focus-visible {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--color-primary-light);
}

.tool-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: var(--radius-md);
    background-color: var(--color-bg-hover);
    color: var(--color-text-secondary);
    overflow: hidden;
}

.tool-card-icon img {
    width: 28px;
    height: 28px;
    object-fit: contain;
}

.tool-card-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
}

.tool-card-title {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);
}

.tool-card-desc {
    font-size: var(--font-size-sm);
    color: var(--color-text-tertiary);
    line-height: var(--line-height-normal);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.tool-card-arrow {
    margin-top: 2px;
    color: var(--color-text-placeholder);
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity var(--transition-fast), transform var(--transition-fast), color var(--transition-fast);
}

.tool-card:hover .tool-card-arrow,
.tool-card:focus-visible .tool-card-arrow {
    opacity: 1;
    transform: translateX(0);
    color: var(--color-text-secondary);
}

[dir='rtl'] .tool-card-arrow {
    transform: scaleX(-1) translateX(4px);
}

[dir='rtl'] .tool-card:hover .tool-card-arrow,
[dir='rtl'] .tool-card:focus-visible .tool-card-arrow {
    transform: scaleX(-1) translateX(0);
}

@media (prefers-reduced-motion: reduce) {
    .tool-card,
    .tool-card-arrow {
        transition: none;
    }
}
</style>
