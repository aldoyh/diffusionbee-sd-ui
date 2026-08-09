<template>

    <BasicSDApplet
        :app=app 
        :input_form=form_data
        :sd_options=sd_options
        :name=name
        :form_tags=form_tags
        :required_assets=required_assets
        ref="basic_sd_applet"
    >   
        
        <template v-slot:input_buttons>
            <div @click="randomPromptAndGenerate" class="l_button button_medium" style="float:right; margin-right:6px;" :class="{ 'disabled-action': is_random_prompt_generating }" :title="is_random_prompt_generating ? ((app && app.app_state && app.app_state.isArabic) ? 'جارٍ إنشاء موجه...' : 'Generating prompt...') : ((app && app.app_state && app.app_state.isArabic) ? 'توليد موجه عشوائي' : 'Generate a random creative prompt and auto-generate')">{{ is_random_prompt_generating ? ((app && app.app_state && app.app_state.isArabic) ? '⏳' : '⏳') : ((app && app.app_state && app.app_state.isArabic) ? '🎲 عشوائي' : '🎲 Random') }}</div>

            <div v-if="app.stable_diffusion_manager.is_ready" @click="generate" class="l_button button_colored button_medium" style="float:right">{{ (app && app.app_state && app.app_state.isArabic) ? 'توليد' : 'Generate' }}</div>

            <div v-else-if="is_input_changed_after_last_run " @click="generate" class="l_button button_colored button_medium" style="float:right">{{ (app && app.app_state && app.app_state.isArabic) ? 'إضافة إلى قائمة الانتظار' : 'Add to Queue' }}</div>

            <!-- Batch queue: snapshot the current request without generating -->
            <div @click="addToBatch" class="l_button button_medium" style="float:right; margin-right:6px;" :title="(app && app.app_state && app.app_state.isArabic) ? 'أضف الطلب الحالي إلى قائمة الدفعة (بدون توليد)' : 'Add the current request to the batch queue (no generation yet)'">{{ (app && app.app_state && app.app_state.isArabic) ? '📋 دفعة' : '📋 Batch' }}</div>
            <div v-if="batch_queue.length > 0" @click="runBatch" class="l_button button_colored button_medium" style="float:right; margin-right:6px;" :class="{ 'disabled-action': batchPendingCount === 0 }" :title="(app && app.app_state && app.app_state.isArabic) ? 'نفّذ طلبات الدفعة بالتسلسل' : 'Execute the pending batch requests sequentially'">{{ batchHasActive ? ((app && app.app_state && app.app_state.isArabic) ? 'جارٍ التنفيذ...' : 'Running...') : ((app && app.app_state && app.app_state.isArabic) ? '▶ تشغيل الدفعة (' + batchPendingCount + ')' : '▶ Run Batch (' + batchPendingCount + ')') }}</div>
            <div v-if="batch_queue.length > 0" @click="clearBatch" class="l_button button_medium" style="float:right; margin-right:6px;" :title="(app && app.app_state && app.app_state.isArabic) ? 'مسح قائمة الدفعة' : 'Clear the batch queue'">🗑</div>

            <div v-if="(!app.stable_diffusion_manager.is_ready) && !is_stopping"  @click="stop_all" class="l_button button_colored button_medium" style="float:right">{{ (app && app.app_state && app.app_state.isArabic) ? 'إيقاف الكل' : 'Stop all' }}</div>
            <div v-if="(!app.stable_diffusion_manager.is_ready) && is_stopping" class="l_button button_colored button_medium" style="float:right">{{ (app && app.app_state && app.app_state.isArabic) ? 'جارٍ الإيقاف...' : 'Stopping ...' }}</div>

            <!-- Batch queue list (requests collected without generating) -->
            <div v-if="batch_queue.length > 0" class="batch-panel">
                <div class="batch-panel-head">
                    <span class="batch-panel-title">{{ (app && app.app_state && app.app_state.isArabic) ? 'قائمة الدفعة' : 'Batch queue' }}</span>
                    <span class="batch-panel-count">{{ batch_queue.length }} {{ (app && app.app_state && app.app_state.isArabic) ? 'طلب' : 'request(s)' }}</span>
                </div>
                <div v-for="(item, idx) in batch_queue" :key="item.id" class="batch-item" :class="{ 'rtl-text': app && app.app_state && app.app_state.isArabic }">
                    <span class="batch-item-index">{{ idx + 1 }}</span>
                    <span class="batch-item-prompt" :title="item.gen_options && item.gen_options.prompt">{{ item.promptLabel }}</span>
                    <span class="batch-item-meta">{{ item.sizeLabel }} · {{ item.countLabel }}</span>
                    <span class="batch-item-status" :class="'batch-item-status--' + (item.state || 'pending')">{{ stateLabel(item.state) }}</span>
                    <button type="button" class="batch-item-remove" @click="removeFromBatch(item.id)" :disabled="item.state === 'queued' || item.state === 'running'" :title="(app && app.app_state && app.app_state.isArabic) ? 'إزالة من الدفعة' : 'Remove from batch'">✕</button>
                </div>
            </div>

        </template>

        <template v-slot:output_workpace>
            
            
            
            
            <GenerationGallery  :app="app" ref="gallery"> </GenerationGallery>
        </template>

    </BasicSDApplet>

</template>
<script>

import GenerationGallery from "./GenerationGallery.vue"
import BasicSDApplet from "../components/BasicSDApplet.vue"
import { controlnet_check_inputs , controlnet_proc_form_outputs , controlnet_required_assets } from "../utils/controlnet_frontend_utils.js"
import { getRandomPrompt, rememberPrompt } from "../prompt_library.js"
const { generatePromptWithOllama, normalizeGeneratedPrompt } = require("../utils/ollama_prompt_service.js")
import Vue from 'vue'
import { loadAppletBatch, saveAppletBatch } from "../batch_queue_store.js"
import batchQueueMixin from "../batch_queue_mixin.js"

export default {
    name: 'SDImageGenerationApplet.vue',
    mixins: [batchQueueMixin],
    props: {
        app:Object, 
        form_data: Array,
        name:String,
        form_tags: Array,
        postprocess_form_options_fn: Function, // if you want to append   modify the input options valus from form 
        check_options_input_fn : Function, // if you want to add checks to the inpus 
    },
    components: { GenerationGallery , BasicSDApplet  },
    mounted() {
        this.is_mounted = true
        // Restore any previously collected batch (survives app restarts).
        this.batch_queue = loadAppletBatch()
        this.startBatchPolling()
    },
    beforeDestroy() {
        this.stopBatchPolling()
    },
    data() {
        return {
            sd_options : {},
            is_input_changed_after_last_run : false, 
            is_mounted : false,
            is_random_prompt_generating: false,
        };
    },
    methods: {
        generate(){

            this.is_input_changed_after_last_run = false

            if(!this.$refs.basic_sd_applet.check_input_form_n_show_error()){
                return
            }

            if(this.check_options_input_fn){
                if(!(this.check_options_input_fn()))
                    return
            }

            if(!controlnet_check_inputs(this, Vue)){
                return
            }
            
            let sd_options_object = this.get_sd_form_outputs()
            this.app.stable_diffusion_manager.add_job(sd_options_object, this.sd_options  ,  this.$refs.gallery)
        }, 

        get_sd_form_outputs(){
            let options =  this.$refs.basic_sd_applet.get_sd_form_outputs()
            if(this.postprocess_form_options_fn)
                options = this.postprocess_form_options_fn(options)

            controlnet_proc_form_outputs(this , options)

            return options
        },

        stop_all(){
            this.app.stable_diffusion_manager.stop_all() 
        },

        // --- Batch queue (collect requests without generating, then run sequentially) ---

        addToBatch(){
            if (this.is_batch_running) return;

            if(!this.$refs.basic_sd_applet.check_input_form_n_show_error()){
                return
            }

            if(this.check_options_input_fn){
                if(!(this.check_options_input_fn()))
                    return
            }

            if(!controlnet_check_inputs(this, Vue)){
                return
            }

            const options = this.get_sd_form_outputs()
            const raw_form_options = JSON.parse(JSON.stringify(this.sd_options || {}))

            const item = {
                id: Math.random().toString(),
                gen_options: options,
                raw_form_options: raw_form_options,
                promptLabel: this.truncateLabel(options.prompt || ''),
                sizeLabel: (options.img_width || '?') + '×' + (options.img_height || '?'),
                countLabel: '×' + (options.num_imgs || 1),
                state: 'pending',
                group_id: null,
            }

            this.batch_queue.push(item)

            const n = this.batch_queue.length
            if (this.app && this.app.show_toast) {
                const countLabel = this.batchCountLabel(n)
                this.app.show_toast(this.app.app_state && this.app.app_state.isArabic
                    ? ('أُضيف إلى الدفعة (' + countLabel + '). اضغط "تشغيل الدفعة" لبدء التوليد بالتسلسل.')
                    : ('Added to batch (' + countLabel + '). Press "Run Batch" to generate them sequentially.'))
            }
        },

        // Hooks for the shared batch mixin (single source of truth for the
        // queue state machine — see batch_queue_mixin.js).

        submitBatchItem(item, groupId){
            this.app.stable_diffusion_manager.add_job(
                JSON.parse(JSON.stringify(item.gen_options)),
                JSON.parse(JSON.stringify(item.raw_form_options)),
                this.$refs.gallery,
                groupId
            )
        },

        getBatchGallery(){
            return this.$refs.gallery || null
        },

        persistBatchQueue(queue){
            saveAppletBatch(queue)
        },

        truncateLabel(text){
            if (!text) return ''
            const clean = String(text).replace(/\s+/g, ' ').trim()
            return clean.length > 70 ? clean.substring(0, 70) + '…' : clean
        },
        load_options(options){
            this.$refs.basic_sd_applet.load_options(options)
        } , 

        waitForRequiredModelDownloads() {
            return new Promise((resolve, reject) => {
                let timer = null;
                const cleanup = () => {
                    if (timer) {
                        clearInterval(timer);
                        timer = null;
                    }
                };

                const ensureActiveDownload = () => {
                    if (!this.$refs.basic_sd_applet || !this.app || !this.app.assets_manager) {
                        return true;
                    }

                    const pending = this.$refs.basic_sd_applet.to_download_left || [];
                    if (pending.length === 0) {
                        return true;
                    }

                    const downloading = this.app.assets_manager.downloading || {};
                    const downloadedAssets = this.app.assets_manager.downloaded_assets || {};
                    const selectedModelId = this.sd_options.selected_sd_model;
                    const targetAsset = pending.find((asset) => asset.id === selectedModelId) || pending[0];
                    if (targetAsset && !downloadedAssets[targetAsset.id] && !downloading[targetAsset.id]) {
                        this.app.assets_manager.download_asset(targetAsset);
                    }

                    const activeDownload = downloading[targetAsset.id];
                    if (activeDownload && activeDownload.status === 'error') {
                        cleanup();
                        reject(new Error(activeDownload.error || 'Failed to download model.'));
                        return false;
                    }

                    return pending.length === 0;
                };

                timer = setInterval(() => {
                    if (ensureActiveDownload()) {
                        cleanup();
                        resolve();
                    }
                }, 450);

                if (ensureActiveDownload()) {
                    cleanup();
                    resolve();
                }
            });
        },

        async randomPromptAndGenerate() {
            if (this.is_random_prompt_generating) return;
            this.is_random_prompt_generating = true;

            const fallbackPrompt = getRandomPrompt();

            try {
                const generated = await generatePromptWithOllama({
                    sourcePrompt: fallbackPrompt,
                    locale: this.app && this.app.app_state && this.app.app_state.isArabic ? 'ar' : 'en',
                });
                const prompt = normalizeGeneratedPrompt(generated.prompt) || fallbackPrompt;
                rememberPrompt(prompt);
                this.$refs.basic_sd_applet.load_options({ prompt });
            } catch (error) {
                console.warn('Ollama prompt generation failed, using the local prompt library instead:', error);
                rememberPrompt(fallbackPrompt);
                this.$refs.basic_sd_applet.load_options({ prompt: fallbackPrompt });
            }

            try {
                await this.$nextTick();
                await this.waitForRequiredModelDownloads();
                this.generate();
            } catch (error) {
                console.warn('Model preparation failed before random generation:', error);
                this.app.show_toast((this.app && this.app.app_state && this.app.app_state.isArabic)
                    ? 'تعذر تجهيز النموذج للتوليد.'
                    : 'Unable to prepare the model for generation.');
            } finally {
                this.is_random_prompt_generating = false;
            }
        },

        generate_similar_images(options){
            options = JSON.parse(JSON.stringify(options))
            if(!this.is_sd_ready){
                this.app.show_toast('Currently some images are already being generated. Please wait for them to finish.')
                return false
            }
            this.$refs.basic_sd_applet.$refs.form.reset_to_default()
            options.raw_form_options.is_adv_mode = true
            options.raw_form_options.small_mod_seed = Math.floor(Math.random()*1000) + 1 
            options.is_adv_mode = true
            options.small_mod_seed = Math.floor(Math.random()*1000)+ 1 
            options.num_imgs = 4
            options.raw_form_options.num_imgs = 4
            this.load_options(options)
            Vue.nextTick(this.generate)
            return true;
        } ,

    },  

    computed:{
        all_tags(){
            let l = this.form_tags.concat( this.sd_options.is_adv_mode ? ['advanced']:[]  )
            return l
        } , 
        required_assets(){
            // what is left to download
            let to_download = []

            controlnet_required_assets(this , to_download)
            return to_download;
        } , 
        is_sd_ready(){
            if(this.app.stable_diffusion_manager)
                return this.app.stable_diffusion_manager.is_ready
            return false
        } , 

        is_stopping(){
            if(this.app.stable_diffusion_manager   )
                return this.app.stable_diffusion_manager.is_stopping
            return false
        }
    },

    watch : {
       
        'sd_options': {
            handler: function() {
                this.is_input_changed_after_last_run = true
            },
            deep: true
        } ,    },

}
</script>
<style>
</style>
<style scoped>

.disabled-action {
    opacity: 0.55;
    pointer-events: none;
    filter: saturate(0.8);
}

/* --- Batch queue panel --- */
.batch-panel {
    clear: both;
    margin: 12px 4px 4px;
    padding: 10px 12px;
    border: 1px solid var(--thin-border-color, var(--color-border));
    border-radius: 12px;
    background: var(--color-bg-elevated);
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 220px;
    overflow-y: auto;
}

.batch-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 2px;
}

.batch-panel-title {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-color-solid, var(--color-text-primary));
}

.batch-panel-count {
    font-size: 0.72rem;
    color: var(--color-text-secondary);
    background: rgba(62, 123, 250, 0.12);
    padding: 2px 8px;
    border-radius: 10px;
}

.batch-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    background: var(--color-bg-hover);
    border: 1px solid transparent;
    transition: border-color 0.15s ease;
}

.batch-item:hover {
    border-color: var(--color-border-hover);
}

.batch-item-index {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(62, 123, 250, 0.18);
    color: var(--color-text-secondary);
    font-size: 0.7rem;
    font-weight: 700;
}

.batch-item-prompt {
    flex: 1;
    min-width: 0;
    font-size: 0.78rem;
    line-height: 1.35;
    color: var(--text-color-solid, var(--color-text-primary));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.batch-item-meta {
    flex-shrink: 0;
    font-size: 0.7rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
}

.batch-item-remove {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 0.7rem;
    transition: background 0.15s ease, color 0.15s ease;
}

.batch-item-remove:hover {
    background: var(--color-error-light, rgba(255, 69, 58, 0.15));
    color: var(--color-error, #ff453a);
}

.batch-item-remove:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.batch-item-status {
    flex-shrink: 0;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    padding: 2px 8px;
    border-radius: 10px;
    white-space: nowrap;
}

.batch-item-status--pending {
    color: var(--color-text-secondary);
    background: rgba(128, 128, 128, 0.14);
}

.batch-item-status--queued {
    color: var(--color-warning, #ff9500);
    background: rgba(255, 149, 0, 0.14);
}

.batch-item-status--running {
    color: var(--color-primary, #3e7bfa);
    background: rgba(62, 123, 250, 0.16);
}

.batch-item-status--done {
    color: var(--color-success, #34c759);
    background: rgba(52, 199, 89, 0.14);
}

.batch-item-status--error {
    color: var(--color-error, #ff453a);
    background: rgba(255, 69, 58, 0.16);
}

</style>
