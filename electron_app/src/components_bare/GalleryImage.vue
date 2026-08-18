<template>
    <div class="gal_item">
        <div class="gal_item_inner">

            <div v-if="image_url == 'ERROR'" class="gal_error">
                <p>Error: {{ description }}</p>
            </div>

            <div v-else class="gal_image_wrap" :class="{ 'gal_image_wrap--selected': selected, 'gal_image_wrap--dimmed': dimmed }">

                <!-- Clipped media layer: the zoom-on-hover stays inside the
                     rounded tile. The actions popup lives OUTSIDE this layer
                     (as a sibling) so the dropdown is never clipped. -->
                <div class="gal_media">

                    <img
                        v-if="aux_img_url"
                        class="aux_img"
                        :src="toFileUrl(aux_img_url)"
                        alt=""
                    >

                    <div
                        v-if="!image_url && done_percentage !== undefined"
                        class="gal_progress"
                    >
                        <CircleProgress :done_percentage="done_percentage" />
                    </div>

                    <img
                        v-if="image_url"
                        class="gal_main_img"
                        :src="toFileUrl(image_url)"
                        :alt="description || 'Generated image'"
                        :title="selectable ? (is_arabic ? 'اضغط مع Ctrl/Cmd لتحديد الصورة' : 'Ctrl/Cmd+Click to select') : undefined"
                        @click="on_image_clicked($event)"
                    >
                    <div
                        v-else
                        class="gal_placeholder"
                        :class="{ 'animate-flicker': done_percentage === undefined }"
                        :style="placeholderStyle"
                    ></div>

                </div>

                <div
                    v-if="description && image_url"
                    class="gal_caption"
                    @click="on_image_clicked($event)"
                >
                    <span class="gal_caption_text">{{ description }}</span>
                </div>

                <div v-if="selected" class="gal_sel_badge" aria-hidden="true">
                    <font-awesome-icon icon="check" fixed-width />
                </div>

                <div v-if="image_url" class="gal_actions">
                    <b-dropdown
                        right
                        variant="link"
                        size="sm"
                        toggle-class="gal-actions-toggle"
                        no-caret
                        boundary="viewport"
                    >
                        <template #button-content>
                            <font-awesome-icon icon="ellipsis-v" aria-hidden="true" />
                            <span class="sr-only">{{ is_arabic ? 'إجراءات الصورة' : 'Image actions' }}</span>
                        </template>
                        <template v-for="(group, gi) in menu_items">
                            <b-dropdown-header
                                v-if="group && group.items && group.items.length"
                                :key="'gal-h-' + gi"
                            >
                                {{ group.label }}
                            </b-dropdown-header>
                            <b-dropdown-item-button
                                v-for="item in (group && group.items) || []"
                                :key="'gal-i-' + item.id"
                                @click="on_menu_item_click(item.id, self)"
                            >
                                <font-awesome-icon
                                    v-if="item.icon"
                                    class="gal-menu-icon"
                                    :icon="item.icon"
                                    fixed-width
                                />
                                <span class="gal-menu-text">{{ item.text }}</span>
                            </b-dropdown-item-button>
                            <b-dropdown-divider
                                v-if="gi < menu_items.length - 1"
                                :key="'gal-d-' + gi"
                            />
                        </template>
                    </b-dropdown>
                </div>

            </div>

        </div>
    </div>
</template>
<script>

import CircleProgress from "./CircleProgress.vue"
import { toFileUrl } from "../utils.js"


export default {
    name: 'GalleryImage',
    props: {
        image_url : String,
        aux_img_url: String,
        img_w:Number,
        img_h:Number,
        description: String,
        menu_items : Array,
        params: Object,
        done_percentage: Number,
        on_menu_item_click : Function,
        on_image_click: Function,
        // ── multi-select (Ctrl/Cmd+Click) ─────────────────────────────────
        group_id: String,
        image_key: String,
        selected: Boolean,
        selectable: Boolean,
        dimmed: Boolean,
        on_image_select: Function,
    },
    components: {CircleProgress},
    data() {
        return {
            self : this,
        };
    },
    computed: {
        // Intrinsic size for pending-slot placeholders (a plain <div> has none
        // by itself, which would collapse fixed-column rows to zero height).
        placeholderStyle() {
            const w = Number(this.img_w);
            const h = Number(this.img_h);
            return (w > 0 && h > 0) ? { aspectRatio: w + ' / ' + h } : {};
        },
        // Locale for the sr-only toggle label. Reads the html[lang] attribute
        // that App.vue keeps in sync with isArabic; the `menu_items` reference
        // is the reactive signal — the parent rebuilds it whenever the language
        // flips, which re-triggers this computed (document attrs aren't reactive).
        is_arabic() {
            void this.menu_items; // reactive dep — rebuilds with locale
            return (document.documentElement && document.documentElement.lang) === 'ar';
        },
    },
    methods: {
        toFileUrl(path) {
            return toFileUrl(path)
        },
        // Ctrl/Cmd+Click toggles selection (when the gallery has selection
        // enabled); a plain click keeps opening the lightbox as before.
        on_image_clicked(event) {
            if (this.selectable && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                event.stopPropagation();
                if (this.on_image_select) {
                    this.on_image_select(this.self);
                }
                return;
            }
            if (this.on_image_click) {
                this.on_image_click(this.self);
            }
        },
    },
}
</script>

<style scoped>

/* ── tile ───────────────────────────────────────────────── */
.gal_item{
    position: relative;
    padding: 5px;
    /* Ctrl/Cmd+Click must not start a text drag across tiles. */
    user-select: none;
    -webkit-user-select: none;
}

.gal_item_inner{
    height: 100%;
    width: 100%;
}

.gal_image_wrap{
    position: relative;
    height: 100%;
    width: 100%;
    border-radius: var(--radius-lg);
    background-color: var(--color-bg-elevated);
    box-shadow: inset 0 0 0 1px var(--color-border);
    transition: box-shadow var(--transition-normal);
}

.gal_item:hover .gal_image_wrap{
    box-shadow:
        inset 0 0 0 1px var(--color-border-hover),
        0 10px 32px rgba(0, 0, 0, 0.45);
}

/* Clipped media layer — rounds the image and contains the hover zoom.
   Stays IN FLOW (relative) so the tile keeps its height in fixed-column
   mode (auto-sized grid rows rely on this layer's intrinsic content).
   isolation: isolate traps the zooming <img> (a transform creates its own
   stacking context) inside this layer — it can never paint above the
   actions button, no matter what global rules inject. */
.gal_media{
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    overflow: hidden;
    isolation: isolate;
}

.gal_main_img{
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    cursor: zoom-in;
    transition: transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Neutralize the pane-level hover rules from theme.css on the raw <img> —
   the zoom belongs inside the clipped tile, not the whole pane. */
.gal_media .gal_main_img,
.gal_media .gal_main_img:hover{
    transform: none;
    filter: none;
    box-shadow: none;
    position: static;
    z-index: auto;
}

.gal_image_wrap:hover .gal_main_img{
    transform: scale(1.05);
}

/* ── multi-select states ───────────────────────────────── */
/* Higher specificity than the hover rule above so the ring
   survives while the cursor is over the tile. */
.gal_item .gal_image_wrap--selected{
    box-shadow:
        inset 0 0 0 1px var(--color-primary),
        0 0 0 3px var(--color-primary),
        0 10px 32px rgba(0, 0, 0, 0.45);
}

/* While any image is selected, unselected tiles dim so the
   selection set reads as a group. */
.gal_image_wrap--dimmed .gal_media{
    opacity: 0.55;
}

.gal_image_wrap--dimmed .gal_media .gal_main_img{
    filter: saturate(0.65);
}

.gal_sel_badge{
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 12;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--color-primary);
    color: #fff;
    font-size: 11px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
    pointer-events: none;
}

/* ── placeholder / error states ────────────────────────── */
.gal_placeholder{
    width: 100%;
    height: 100%;
    background-color: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
}

.gal_error{
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 20px;
    border: 1px dashed var(--color-error);
    border-radius: var(--radius-lg);
    color: var(--color-text-secondary);
    font-size: 12px;
}

.gal_error p{
    margin: 0;
}

/* ── controlnet aux preview ────────────────────────────── */
.aux_img{
    position: absolute;
    top: 8px;
    left: 8px;
    width: 30%;
    height: auto;
    max-height: 30%;
    object-fit: cover;
    opacity: 0.9;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 3;
    pointer-events: none;
    transition: opacity var(--transition-normal);
}

.gal_image_wrap:hover .aux_img{
    opacity: 0.15;
}

/* ── progress ──────────────────────────────────────────── */
.gal_progress{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

/* ── caption overlay ───────────────────────────────────── */
.gal_caption{
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 20px 12px 10px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0));
    color: #fff;
    cursor: zoom-in;
    /* Clicks pass through to the image beneath, which opens the lightbox. */
    pointer-events: none;
}

.gal_caption_text{
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    line-height: 1.35;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

/* ── actions menu ──────────────────────────────────────── */
.gal_actions{
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
}

/* NOTE: no backdrop-filter here. Chromium/Electron drops an element with
   backdrop-filter out of the paint while a sibling runs a transform
   animation — the button vanished every time the image zoomed beneath it.
   A more opaque background keeps it crisp over any image content instead. */
.gal-actions-toggle{
    width: 32px !important;
    height: 32px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center;
    justify-content: center;
    color: #fff !important;
    font-size: 14px !important;
    background: rgba(16, 16, 16, 0.78) !important;
    border: 1px solid rgba(255, 255, 255, 0.28) !important;
    border-radius: 50% !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    transition: background var(--transition-fast), transform var(--transition-fast);
}

/* While the image zooms on hover, keep the button clearly on top — it
   brightens instead of fading, so the interaction reads as intentional. */
.gal_item:hover .gal-actions-toggle,
.gal-actions-toggle:hover{
    background: rgba(0, 0, 0, 0.88) !important;
    border-color: rgba(255, 255, 255, 0.42) !important;
    transform: scale(1.06);
}

.gal_actions >>> .dropdown-menu{
    min-width: 224px;
    max-width: 264px;
    padding: 6px;
    max-height: min(420px, 70vh);
    overflow-y: auto;
}

.gal_actions >>> .dropdown-header{
    padding: 8px 12px 4px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
}

.gal_actions >>> .dropdown-divider{
    margin: 4px 6px;
    border-color: var(--color-border);
}

.gal_actions >>> .dropdown-item{
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    font-size: 13px;
    border-radius: 8px;
    cursor: pointer;
}

.gal-menu-icon{
    width: 14px;
    opacity: 0.7;
    flex-shrink: 0;
}

.gal-menu-text{
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ── RTL: Bootstrap's .dropdown-menu pins text-align:left, and the deep-scoped
       selectors above stay direction-agnostic — mirror alignment explicitly. */
[dir="rtl"] .gal_actions >>> .dropdown-menu{
    text-align: right;
}

[dir="rtl"] .gal_actions >>> .dropdown-item{
    flex-direction: row-reverse;
}

[dir="rtl"] .gal_actions >>> .dropdown-header{
    text-align: right;
}

/* ── pending-slot flicker ──────────────────────────────── */
@keyframes flickerAnimation {
  0%   { background-color: rgba(255, 255, 255, 0.06); }
  50%  { background-color: rgba(0, 0, 0, 0.0); }
  100% { background-color: rgba(255, 255, 255, 0.06); }
}

.animate-flicker {
   -webkit-animation: flickerAnimation 1s infinite;
   -moz-animation: flickerAnimation 1s infinite;
   -o-animation: flickerAnimation 1s infinite;
    animation: flickerAnimation 1s infinite;
}

</style>
