<template>
    <div class="generation_gallery_div" :class="{ 'generation_gallery_div--compact': compact, 'generation_gallery_div--carousel': compact }" :id="div_id">

        <div v-if="groups_with_non_zero_imgs.length == 0 " class="gallery-empty" style="width:30% ; height: 30% ; margin-left:35%; top:50% ; transform: translateY(50%);">
            <!-- <img src="../assets/imgs/blank_illus4_dark.png" style="opacity:0.3; width: 100%; height: 100%;  object-fit: contain;">  -->

            <picture >
                <source srcset="../assets/imgs/blank_illus4_dark.png" media="(prefers-color-scheme: dark)">
                <img  style="opacity:0.3; width: 100%; height: 100%;  object-fit: contain;" src="../assets/imgs/blank_illus4.png">
            </picture>

            <center style="opacity: 0.5">
                <h2 style="margin-top: 20px;">{{ app.app_state.isArabic ? 'لا توجد صور للعرض' : 'No images to display' }}</h2>
                <p >{{ app.app_state.isArabic ? 'أدخل موجهًا لتوليد الصور باستخدام الذكاء الاصطناعي.' : 'Enter a prompt to generate images using AI.' }}</p>
            </center>
            
        </div>

        <template v-else>

            <!-- Multi-select action bar: shown while Ctrl/Cmd+Click selection is active.
                 Sits ABOVE the panes (never inside the carousel scroller) so it stays
                 put while the strip scrolls horizontally. -->
            <div v-if="enable_selection && selected_keys.length > 0" class="gal_selection_bar" :class="{ 'rtl-text': app.app_state.isArabic }">
                <span class="gal_sel_count">{{ app.app_state.isArabic ? (selected_keys.length + ' محدد') : (selected_keys.length + ' selected') }}</span>
                <button
                    type="button"
                    class="gal_sel_btn gal_sel_btn--run"
                    @click="emit_selection_action('rerun')"
                    :title="app.app_state.isArabic ? 'أضف موجهات الصور المحددة إلى قائمة الدفعة' : 'Add the selected images\u2019 prompts to the batch queue'">
                    <font-awesome-icon icon="play" fixed-width />
                    {{ app.app_state.isArabic ? 'إعادة التوليد' : 'Re-run' }}
                </button>
                <button
                    type="button"
                    class="gal_sel_btn"
                    @click="emit_selection_action('export')"
                    :title="app.app_state.isArabic ? 'حفظ الصور المحددة في مجلد' : 'Save the selected images to a folder'">
                    <font-awesome-icon icon="download" fixed-width />
                    {{ app.app_state.isArabic ? 'تصدير' : 'Export' }}
                </button>
                <button
                    type="button"
                    class="gal_sel_btn gal_sel_btn--danger"
                    @click="emit_selection_action('delete')"
                    :title="app.app_state.isArabic ? 'حذف الصور المحددة من المعرض والسجل' : 'Remove the selected images from the gallery and history'">
                    <font-awesome-icon icon="trash" fixed-width />
                    {{ app.app_state.isArabic ? 'حذف' : 'Delete' }}
                </button>
                <button
                    type="button"
                    class="gal_sel_btn gal_sel_btn--ghost gal_sel_clear"
                    @click="clear_selection()"
                    :title="app.app_state.isArabic ? 'إلغاء التحديد' : 'Clear selection'">
                    <font-awesome-icon icon="times" fixed-width />
                </button>
            </div>

            <div class="gal_panes_wrap">
                <GalleryPane v-for="group in groups_with_non_zero_imgs"  :key="group.group_id" :n_imgs="group.num_imgs" :img_w="group.img_width" :img_h="group.img_height" :image_data="group.imgs" :menu_items="menu_items" :on_menu_item_click="on_image_menu_item_click" :on_image_click="on_image_click" :always_fixed_col_size="fixed_col_size" :group_id="group.group_id" :enable_selection="enable_selection" :selected_keys="selected_keys" :on_image_select="toggle_select"> </GalleryPane>
            </div>

        </template>
    </div>
</template>
<script>

import GalleryPane from "../components_bare/GalleryPane.vue"
import Vue from 'vue'
import {image_manu_functions, build_image_menu_items} from "./image_menu_functions.js"
import {open_popup, gallery_item_context} from "../utils"

export default {
    name: 'GenerationGallery',
    props: {
        app: Object,
        n_to_keep: Number,
        menu_items_skip: Array,
        compact: Boolean,
        fixed_col_size: Number,
        // ── multi-select (Ctrl/Cmd+Click) ─────────────────────────────────
        // Opt-in: pages that own a batch panel (Homepage, applet forms) turn
        // this on and handle `on_selection_action(action, images)`.
        enable_selection: Boolean,
        on_selection_action: Function,
    },
    components: {GalleryPane},
    mounted() {
        if (this.app.functions.register_gallery) {
            this.app.functions.register_gallery(this)
        }
    },
    beforeDestroy() {
        if (this.app.functions.unregister_gallery) {
            this.app.functions.unregister_gallery(this)
        }
    },
    data() {
        return {
            groups : [],
            div_id: Math.random().toString(),
            // Composite keys "<group_id>::<job_id>" of the currently selected
            // images. Keys survive update_group deep-copies (job ids are
            // stable); stale keys are pruned when groups churn.
            selected_keys: [],
        };
    },
    computed: {
        // Reactive (re-evaluates when app_state.isArabic flips) so menu labels
        // follow the current UI language without prop-drilling into each tile.
        // Returns a sectioned menu ({ label, items: [{ id, icon, text }] }).
        menu_items(){
            const isArabic = Boolean(this.app && this.app.app_state && this.app.app_state.isArabic)
            return build_image_menu_items(this.menu_items_skip, isArabic)
        },
        groups_with_non_zero_imgs(){
            let ret = []
            for(let group of this.groups){
                const imgs = group.imgs || []
                const hasFinishedImage = imgs.some((im) => im.image_url && im.image_url !== 'ERROR')
                const hasPendingSlots = (group.num_imgs > 0) && imgs.length > 0
                if (hasFinishedImage || hasPendingSlots) {
                    ret.push(group)
                }
            }
            return ret;
        },
        // Resolves the current selection against live groups. Enriched with
        // group_id / image_key so action handlers (batch re-run, export,
        // delete) have everything they need without walking the DOM.
        selected_images(){
            const keys = this.selected_keys || []
            if (keys.length === 0) return []
            const out = []
            for (let group of this.groups) {
                for (let img of (group.imgs || [])) {
                    const key = group.group_id + '::' + img.job_id
                    if (keys.indexOf(key) !== -1) {
                        out.push(Object.assign({}, img, { group_id: group.group_id, image_key: key }))
                    }
                }
            }
            return out
        }
    },
    methods: {

        getScrollContainer(){
            const root = document.getElementById(this.div_id)
            if (!root) return null

            // Compact/carousel mode scrolls the inner panes wrap (the root is
            // now a plain column: bar above, scroller below).
            if (this.compact) {
                const wrap = root.querySelector('.gal_panes_wrap')
                if (wrap) {
                    const overflowX = window.getComputedStyle(wrap).overflowX
                    if (/(auto|scroll|overlay)/.test(overflowX)) {
                        return wrap
                    }
                }
            }

            let el = root
            while (el && el !== document.body) {
                const style = window.getComputedStyle(el)
                const overflowY = style.overflowY
                const overflowX = style.overflowX
                if (/(auto|scroll|overlay)/.test(overflowY) || /(auto|scroll|overlay)/.test(overflowX)) {
                    return el
                }
                el = el.parentElement
            }

            return window
        },

        scroll_to_top(){
            const container = this.getScrollContainer()
            if (!container) return

            if (container === window) {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
                return
            }

            container.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        },

        scroll_by(deltaX){
            const container = this.getScrollContainer()
            if (!container) return

            const amount = Number(deltaX) || 0
            if (!amount) return

            if (container === window) {
                window.scrollBy({ left: amount, top: 0, behavior: 'smooth' })
                return
            }

            container.scrollBy({ left: amount, top: 0, behavior: 'smooth' })
        },

        scroll_previous(){
            const container = this.getScrollContainer()
            if (!container || container === window) {
                this.scroll_by(-480)
                return
            }

            this.scroll_by(-Math.max(320, Math.floor(container.clientWidth * 0.9)))
        },

        scroll_next(){
            const container = this.getScrollContainer()
            if (!container || container === window) {
                this.scroll_by(480)
                return
            }

            this.scroll_by(Math.max(320, Math.floor(container.clientWidth * 0.9)))
        },

        on_image_menu_item_click(menu_item_id , image_item_data){
            image_manu_functions[menu_item_id](this.app , image_item_data )
        },

        on_image_click(image_item_data){
            // Preview inside the app (full-screen lightbox), with prev/next
            // across the other images of the same generation group.
            open_popup('file://' + image_item_data.image_url, undefined, gallery_item_context(image_item_data))
        },

        // ── multi-select (Ctrl/Cmd+Click) ─────────────────────────────────

        // `image_item_data` is the GalleryImage component instance (the
        // codebase's existing convention); the composite key travels as a prop.
        toggle_select(image_item_data){
            const key = image_item_data && image_item_data.image_key
            if (!key) return
            const idx = this.selected_keys.indexOf(key)
            if (idx === -1) {
                this.selected_keys.push(key)
            } else {
                this.selected_keys.splice(idx, 1)
            }
        },

        clear_selection(){
            this.selected_keys = []
        },

        emit_selection_action(action){
            if (this.on_selection_action) {
                this.on_selection_action(action, this.selected_images)
            }
        },

        // Drop selection keys that no longer resolve to a live image (groups
        // pruned by clear_old_groups, images removed, etc.).
        prune_selected_keys(){
            if (!this.selected_keys || this.selected_keys.length === 0) return
            const live = new Set()
            for (let group of this.groups) {
                for (let img of (group.imgs || [])) {
                    live.add(group.group_id + '::' + img.job_id)
                }
            }
            this.selected_keys = this.selected_keys.filter(k => live.has(k))
        },

        // How many of the given keys remove_images() would actually remove
        // (groups still generating are skipped, so the delete confirm can ask
        // with an honest count).
        count_removable(keys){
            keys = keys || []
            let n = 0
            for (let group of this.groups) {
                const imgs = group.imgs || []
                if (imgs.some(im => !im.image_url)) continue
                for (let img of imgs) {
                    if (keys.indexOf(group.group_id + '::' + img.job_id) !== -1) n += 1
                }
            }
            return n
        },

        // Removes the given image keys from the gallery. Groups that are still
        // generating are skipped — the running job addresses slots by index
        // (image_no), so splicing would corrupt the in-flight mapping. Returns
        // { removed, removedKeys, emptyGroupIds, skippedKeys }.
        remove_images(keys){
            keys = keys || []
            const removed = []
            const removedKeys = []
            const emptyGroupIds = []
            const skippedKeys = []
            for (let i = this.groups.length - 1; i >= 0; i--) {
                const group = this.groups[i]
                const imgs = group.imgs || []
                if (imgs.some(im => !im.image_url)) {
                    // Still generating — cannot safely remove.
                    for (let img of imgs) {
                        const key = group.group_id + '::' + img.job_id
                        if (keys.indexOf(key) !== -1) skippedKeys.push(key)
                    }
                    continue
                }
                const kept = []
                for (let img of imgs) {
                    const key = group.group_id + '::' + img.job_id
                    if (keys.indexOf(key) !== -1) {
                        removed.push(Object.assign({}, img, { group_id: group.group_id, image_key: key }))
                        removedKeys.push(key)
                    } else {
                        kept.push(img)
                    }
                }
                if (kept.length !== imgs.length) {
                    if (kept.length === 0) {
                        emptyGroupIds.push(group.group_id)
                        this.groups.splice(i, 1)
                    } else {
                        Vue.set(group, 'imgs', kept)
                        Vue.set(group, 'num_imgs', kept.length)
                    }
                }
            }
            if (removedKeys.length) {
                this.selected_keys = this.selected_keys.filter(k => removedKeys.indexOf(k) === -1)
            }
            return { removed, removedKeys, emptyGroupIds, skippedKeys }
        },

        add_group(group){
            this.groups.unshift(group);

            this.clear_old_groups( this.n_to_keep || 10)

            this.$nextTick(() => {
                this.scroll_to_top()
            })
        }, 

        clear_old_groups(n_to_keep){

            n_to_keep = n_to_keep||0

            let idx_to_rm = []
            let n_finish = 0

            // delete groups beyond last 10 finished and the ones with zero imgs 
            for(let i = 0 ; i < this.groups.length ; i++){
                let group = this.groups[i]
                let is_group_finished = true 
                
                for(let im of group.imgs){
                    if(!im.image_url){
                        is_group_finished = false
                    }
                }

                if(is_group_finished && group.imgs.length > 0 ){
                    n_finish += 1
                }

                if(group.imgs.length == 0)
                    idx_to_rm.push(i)
                else if(n_finish > n_to_keep)
                    idx_to_rm.push(i)

            }


            for (let i = idx_to_rm.length -1; i >= 0; i--)
                this.groups.splice(idx_to_rm[i],1);

            this.prune_selected_keys()
        },

        delete_group(group_id){
            for(let i=0; i <   this.groups.length ; i++){
                if(this.groups[i].group_id == group_id){
                    this.groups.splice(i, 1);
                    break
                }
            }
            this.prune_selected_keys()
        } , 

        update_group(new_group_data){
            for(let i=0 ; i < this.groups.length ; i++ ){
                if(this.groups[i].group_id == new_group_data.group_id){
                    new_group_data = JSON.parse(JSON.stringify(new_group_data))
                    Vue.set(this.groups , i , new_group_data ) 
                }
            }
            this.prune_selected_keys()
        },

        get_group(group_id){
            for(let i=0 ; i < this.groups.length ; i++ ){
                if(this.groups[i].group_id == group_id){
                    return this.groups[i]
                }
            }
        }, 

        clear_all(){
            Vue.set(this, "groups" , [])
        }

    },
}
</script>
<style>
</style>
<style scoped>

.generation_gallery_div--compact {
    width: 100%;
    min-height: 320px;
}

/* Non-compact: the panes wrap is layout-transparent, so panes stack exactly
   as they did before (plain block flow inside the gallery root). */
.gal_panes_wrap {
    display: contents;
}

/* Compact/carousel: the wrap is the horizontal scroller. The selection bar
   is a sibling ABOVE it (the root is now a column), so it never rides along
   with the strip or gets clipped by its overflow. */
.generation_gallery_div--carousel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
}

.generation_gallery_div--carousel .gal_panes_wrap {
    display: flex;
    flex-direction: row;
    gap: 16px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding-bottom: 10px;
    -webkit-overflow-scrolling: touch;
}

.generation_gallery_div--carousel .gal_panes_wrap >>> .gallery_pane {
    flex: 0 0 100%;
    scroll-snap-align: start;
    margin: 15px 0;
    width: calc(100% - 30px);
}

.generation_gallery_div--compact .gal_panes_wrap >>> .gallery_pane {
    height: auto !important;
    min-height: 280px;
    max-height: 520px;
    width: calc(100% - 16px);
    margin: 8px;
}

/* ── multi-select action bar ───────────────────────────── */
.gal_selection_bar {
    position: sticky;
    top: 8px;
    z-index: 50;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 16px 0;
    padding: 8px 10px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg-elevated);
    box-shadow: var(--shadow-lg);
}

.gal_sel_count {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-primary);
    background: rgba(62, 123, 250, 0.16);
    padding: 3px 10px;
    border-radius: 999px;
    white-space: nowrap;
}

.gal_sel_btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}

.gal_sel_btn:hover {
    border-color: var(--color-border-hover);
    background: var(--color-bg-elevated);
    transform: translateY(-1px);
}

.gal_sel_btn--run {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
}

.gal_sel_btn--run:hover {
    background: var(--color-primary);
    filter: brightness(1.12);
}

.gal_sel_btn--danger {
    color: var(--color-error);
    border-color: rgba(255, 69, 58, 0.4);
}

.gal_sel_btn--danger:hover {
    background: var(--color-error-light, rgba(255, 69, 58, 0.12));
}

.gal_sel_btn--ghost {
    background: transparent;
}

.gal_sel_clear {
    margin-left: auto;
    padding: 6px 9px;
}

/* RTL: flex row auto-mirrors in [dir=rtl], but the clear button needs the
   mirrored auto margin. */
[dir="rtl"] .gal_sel_clear {
    margin-left: 0;
    margin-right: auto;
}

</style>
