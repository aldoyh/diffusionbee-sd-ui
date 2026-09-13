<template>
    <div class="model-selector" v-click-outside="close">
        <button
            type="button"
            ref="trigger"
            class="model-selector-trigger"
            :class="{ 'model-selector-trigger--open': isOpen }"
            @click="toggle"
            @keydown.down.prevent="open"
            @keydown.up.prevent="open"
            :aria-expanded="isOpen ? 'true' : 'false'"
            aria-haspopup="listbox"
            :aria-label="isArabic ? 'اختر النموذج' : 'Choose model'"
        >
            <span class="badge badge-primary model-selector-trigger-badge" v-if="selectedModel && typeLabel(selectedModel)">
                {{ typeLabel(selectedModel) }}
            </span>
            <span class="model-selector-trigger-title">
                {{ selectedModel ? (selectedModel.title || selectedModel.id) : (isArabic ? 'اختر نموذجًا' : 'Select a model') }}
            </span>
            <span class="model-selector-trigger-meta" v-if="selectedMetaLabel">{{ selectedMetaLabel }}</span>
            <svg class="model-selector-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </button>

        <ul
            v-if="isOpen"
            class="dropdown-menu model-selector-menu"
            role="listbox"
            :aria-label="isArabic ? 'النماذج المتاحة' : 'Available models'"
        >
            <li
                v-for="(model, i) in models"
                :key="model.id"
                :ref="'option-' + i"
                role="option"
                :aria-selected="model.id === value ? 'true' : 'false'"
                :tabindex="i === activeIndex ? 0 : -1"
                class="dropdown-item model-selector-option"
                :class="{ 'model-selector-option--selected': model.id === value }"
                @click="select(model)"
                @keydown.enter.prevent="select(model)"
                @keydown.space.prevent="select(model)"
                @keydown.esc="close(true)"
                @keydown.down.prevent="moveActive(1)"
                @keydown.up.prevent="moveActive(-1)"
            >
                <span class="badge badge-primary model-selector-option-badge" v-if="typeLabel(model)">{{ typeLabel(model) }}</span>
                <span class="model-selector-option-text">
                    <span class="model-selector-option-title">{{ model.title || model.id }}</span>
                    <span class="model-selector-option-meta" v-if="metaLabel(model)">{{ metaLabel(model) }}</span>
                </span>
                <svg v-if="model.id === value" class="model-selector-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </li>
        </ul>
    </div>
</template>

<script>
// Visual replacement for the native <select> model picker. Shows each
// downloaded model as a card (type badge + title + precision/type meta)
// instead of a bare text option, while keeping v-model compatibility
// (emits 'input' with the model id) and full keyboard operability
// (WAI-ARIA listbox pattern with roving tabindex).
export default {
    name: 'ModelSelector',
    props: {
        models: {
            type: Array,
            default: () => [],
        },
        value: {
            type: String,
            default: null,
        },
        isArabic: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            isOpen: false,
            activeIndex: 0,
        };
    },
    computed: {
        selectedModel() {
            return this.models.find((m) => m.id === this.value) || null;
        },
        selectedMetaLabel() {
            return this.metaLabel(this.selectedModel);
        },
    },
    methods: {
        typeLabel(model) {
            return (model && model.model_meta_data && model.model_meta_data.sd_type) || '';
        },
        metaLabel(model) {
            if (!model || !model.model_meta_data) return '';
            return model.model_meta_data.float_type || '';
        },
        toggle() {
            this.isOpen ? this.close() : this.open();
        },
        open() {
            if (this.isOpen) return;
            const currentIndex = this.models.findIndex((m) => m.id === this.value);
            this.activeIndex = currentIndex >= 0 ? currentIndex : 0;
            this.isOpen = true;
            this.$nextTick(() => this.focusActiveOption());
        },
        close(refocusTrigger) {
            this.isOpen = false;
            if (refocusTrigger && this.$refs.trigger) {
                this.$refs.trigger.focus();
            }
        },
        select(model) {
            this.$emit('input', model.id);
            this.$emit('change', model.id);
            this.close(true);
        },
        moveActive(delta) {
            if (!this.models.length) return;
            this.activeIndex = (this.activeIndex + delta + this.models.length) % this.models.length;
            this.$nextTick(() => this.focusActiveOption());
        },
        focusActiveOption() {
            const refKey = 'option-' + this.activeIndex;
            const el = this.$refs[refKey] && this.$refs[refKey][0];
            if (el) el.focus();
        },
    },
};
</script>

<style scoped>
.model-selector {
    position: relative;
    width: 100%;
}

.model-selector-trigger {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    padding: var(--space-xs) var(--space-md);
    background-color: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-family: inherit;
    font-size: var(--font-size-base);
    cursor: pointer;
    text-align: left;
    transition: all var(--transition-fast);
}

.model-selector-trigger:hover {
    border-color: var(--color-border-hover);
}

.model-selector-trigger--open,
.model-selector-trigger:focus-visible {
    outline: none;
    border-color: var(--input-border-focus);
    box-shadow: 0 0 0 3px var(--color-primary-light);
}

.model-selector-trigger-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.model-selector-trigger-meta {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    white-space: nowrap;
}

.model-selector-chevron {
    flex-shrink: 0;
    color: var(--color-text-tertiary);
    transition: transform var(--transition-fast);
}

.model-selector-trigger--open .model-selector-chevron {
    transform: rotate(180deg);
}

.model-selector-menu {
    position: absolute;
    top: calc(100% + var(--space-xs));
    left: 0;
    right: 0;
    max-height: 280px;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    /* The element also carries Bootstrap's .dropdown-menu class, whose base
       rule is `display: none` (shown only via a .show class that Bootstrap's
       JS adds). This component toggles visibility with v-if instead, so the
       Bootstrap rule would keep the menu permanently hidden. Re-assert the
       flex/block display here so v-if is the single source of truth. */
    display: block;
}

.model-selector-option {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
}

.model-selector-option:focus-visible,
.model-selector-option:hover {
    background-color: var(--color-bg-hover);
    outline: none;
}

.model-selector-option--selected {
    color: var(--color-primary);
}

.model-selector-option-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.model-selector-option-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.model-selector-option-meta {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
}

.model-selector-check {
    flex-shrink: 0;
    color: var(--color-primary);
}

/* RTL */
[dir="rtl"] .model-selector-trigger {
    text-align: right;
}

[dir="rtl"] .model-selector-menu {
    left: 0;
    right: 0;
}
</style>
