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

            <div v-if="(!app.stable_diffusion_manager.is_ready) && !is_stopping"  @click="stop_all" class="l_button button_colored button_medium" style="float:right">{{ (app && app.app_state && app.app_state.isArabic) ? 'إيقاف الكل' : 'Stop all' }}</div>
            <div v-if="(!app.stable_diffusion_manager.is_ready) && is_stopping" class="l_button button_colored button_medium" style="float:right">{{ (app && app.app_state && app.app_state.isArabic) ? 'جارٍ الإيقاف...' : 'Stopping ...' }}</div>

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

export default {
    name: 'SDImageGenerationApplet.vue',
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
        } , 

    },

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

</style>
