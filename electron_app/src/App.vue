@import '../assets/css/theme.css';
<template>
    <div id="app">
        <!-- <img alt="Vue logo" src="./assets/logo.png"> -->
        
        <StableDiffusion ref="stable_diffusion"> </StableDiffusion>
        <SDManager :app="app" ref="sd_manager"> </SDManager>
        <AssetsManager ref="assets_manager"> </AssetsManager>
        
        <div v-if="app_state.is_start_screen">
            <transition name="slide_show">
                <SplashScreen v-if="app_state.show_splash_screen"></SplashScreen>
            </transition>
        </div>
        <ApplicationFrame ref="app_frame" v-else :title="current_applet_title + ' - ' + 'DiffusionBee GUI'" :sidebar_item_on_click="sidebar_item_on_click"
        :sidebar_items="
            (all_pages_ready ) ?  $refs.router.all_sidebar_items : []
        " :selected_sidebar_item_id="current_selected_tab"
        :on_home_click="on_home_click"
        > 
            
            <template v-slot:main_content>
                <PagesRouter  v-if="is_mounted && stable_diffusion.is_ready()"  :app="app" ref="router" > </PagesRouter>
            </template>

            <template v-slot:main_toolbar>
                <MainToolbar  v-if="is_mounted"  :app="app" ref="toolbar" > </MainToolbar>
            </template>


        </ApplicationFrame>

        <LoaderModal v-if="app_state.global_loader_modal_msg" :loading_percentage="-1"  :loading_title="app_state.global_loader_modal_msg"> </LoaderModal>

        <!-- First-run Model Setup Dialog -->
        <div v-if="show_model_setup" class="model-setup-overlay">
            <div class="model-setup-dialog">
                <div class="model-setup-header">
                    <h2>{{ app_state.isArabic ? 'مرحبًا بك في واجهة DiffusionBee!' : 'Welcome to DiffusionBee GUI!' }}</h2>
                    <p>{{ app_state.isArabic ? 'دعنا نثبت نموذجًا حتى تتمكن من البدء في الإنشاء.' : "Let's get a model installed so you can start creating." }}</p>
                </div>

                <div v-if="!model_to_download && !is_downloading_model && !model_download_completed" class="model-setup-body">
                    <div class="model-setup-loading">
                        <div class="loading-spinner"></div>
                        <p>{{ app_state.isArabic ? 'جارٍ التحقق من النماذج المتاحة...' : 'Checking for available models...' }}</p>
                    </div>
                </div>

                <div v-else-if="model_to_download && !is_downloading_model && !model_download_completed" class="model-setup-body">
                    <div class="model-card-setup">
                        <h3>{{ model_to_download.title || model_to_download.id }}</h3>
                        <p class="model-desc">{{ model_to_download.description || 'A Stable Diffusion model for image generation.' }}</p>
                        <p class="model-meta">{{ format_model_meta(model_to_download) }}</p>
                    </div>
                    <button @click="start_model_download" class="download-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {{ app_state.isArabic ? 'تحميل وابدأ' : 'Download & Get Started' }}
                    </button>
                </div>

                <div v-else-if="is_downloading_model && !model_download_completed" class="model-setup-body">
                    <div class="model-setup-progress">
                        <h3>{{ app_state.isArabic ? 'جارٍ تحميل' : 'Downloading' }} {{ (model_to_download && (model_to_download.title || model_to_download.id)) || 'model' }}...</h3>
                        <div class="progress-bar-track">
                            <div class="progress-bar-fill" :style="{ width: Math.min(model_download_progress, 100) + '%' }"></div>
                        </div>
                        <p class="progress-text">{{ Math.round(model_download_progress) }}%</p>
                    </div>
                </div>

                <div v-else-if="model_download_completed" class="model-setup-body">
                    <div class="model-setup-success">
                        <div class="success-checkmark">✓</div>
                        <h3>{{ app_state.isArabic ? 'النموذج جاهز!' : 'Model ready!' }}</h3>
                        <p>{{ app_state.isArabic ? 'أنت جاهز تمامًا لبدء توليد الصور.' : "You're all set to start generating images." }}</p>
                    </div>
                </div>

                <div v-if="model_download_error" class="model-setup-footer">
                    <p class="error-text">⚠ {{ model_download_error }}</p>
                    <div class="btn-row">
                        <button @click="start_model_download" class="download-btn small">{{ app_state.isArabic ? 'إعادة المحاولة' : 'Retry' }}</button>
                        <button @click="dismiss_model_setup" class="skip-btn">{{ app_state.isArabic ? 'تخطي الآن' : 'Skip for now' }}</button>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>
<script>

import { bind_app_component } from "./py_vue_bridge.js"
import { send_to_py } from "./py_vue_bridge.js"
import {native_confirm, native_alert } from "./native_functions_vue_bridge.js"
import StableDiffusion from "./StableDiffusion.vue"
import SDManager from "./SDManager.vue"
import AssetsManager from "./AssetsManager.vue"

import SplashScreen from './components_bare/SplashScreen.vue'
import ApplicationFrame from './components_bare/ApplicationFrame.vue'

import PagesRouter from "./components/PagesRouter.vue"
import MainToolbar from "./components/MainToolbar.vue"

import LoaderModal from './components_bare/LoaderModal.vue'
import Vue from "vue"
import { setLocale, getLocale } from "./i18n.js"
import { bindHistoryToApp } from "./history_service.js"

native_alert;

export default 

{
    name: 'App',
    components: {
        SplashScreen,
        ApplicationFrame,
        AssetsManager,
        StableDiffusion,
        SDManager,
        LoaderModal,
        PagesRouter,
        MainToolbar
       
    },

    mounted() {
        this.app = this;
        window.app = this.app; // so that we can access from console
        this.stable_diffusion = this.$refs.stable_diffusion;
        this.stable_diffusion_manager = this.$refs.sd_manager;
        this.stable_diffusion_manager.stable_diffusion = this.stable_diffusion;
        this.assets_manager = this.$refs.assets_manager;

        // Initialize locale from i18n's localStorage read
        const locale = getLocale();
        this.app_state.isArabic = (locale === 'ar');
        this.applyLocaleAttributes();

        bind_app_component(this);
        bindHistoryToApp(this);
        const { registerGenerationBroadcast } = require('./generation_broadcast.js');
        registerGenerationBroadcast(this);
        send_to_py("strt");

        if( require('../package.json').is_dev || require('../package.json').build_number.includes("dev") )
            alert("Not checking for updates.")
        else
            this.check_for_updates()

        let that = this;

        this.start_screen_interval = setInterval( function(){
            console.log(that.stable_diffusion.is_input_avai)
            if(that.stable_diffusion && that.stable_diffusion.is_input_avail){
                that.app_state.is_start_screen = false;
                clearInterval(that.start_screen_interval)
            }
            
        }  , 1500)

        this.is_mounted = true;

        // Scan disk for existing model files so they appear in the UI
        try {
            let count = this.assets_manager.scan_disk_models();
            console.log('Discovered ' + count + ' models from disk');
        } catch (e) {
            console.warn('Failed to scan disk for models:', e);
        }

        // On first run, check for models and automatically prompt download if none found
        // Run immediately after scan and also re-attempt once the start screen finishes
        this.check_and_prompt_model_download();
        this.modelSetupRetryTimer = setTimeout(() => {
            this.check_and_prompt_model_download();
        }, 5000);

        let data = window.ipcRenderer.sendSync('load_data', 'app_data_2.json');
        if(!data.history){
            data.history = {}
        }
        if(!data.settings){
            data.settings = {}
        }
        if(data.settings.notification_sound == undefined)
            data.settings.notification_sound = true

        if(!data.custom_models){
            data.custom_models = {}
        }
        if( data ){
            Vue.set(this.app_state , 'app_data' , data)
        }
     
    },

    watch: {
        'app_state.is_start_screen': {

            handler: function(new_value) {
                if (new_value == false) {
                    if(this.is_screen_frozen){
                        console.log("Unfreeze win!")
                        window.ipcRenderer.sendSync('unfreeze_win', '');
                        this.is_screen_frozen = false;
                    }
                    
                }
                else{
                    if(!this.is_screen_frozen){
                        console.log("Freeze win!")
                        window.ipcRenderer.sendSync('freeze_win', '');
                        this.is_screen_frozen = true;
                    }
                }
            },
            deep: true
        } , 

        'app_state.isArabic': {
            handler: function(new_value) {
                setLocale(new_value ? 'ar' : 'en');
                this.applyLocaleAttributes();
            },
        },

        'app_state.app_data': {

            handler: function(new_value) {
                window.ipcRenderer.sendSync('save_data', new_value , "app_data_2.json");
            },
            deep: true
        } , 

        'is_sd_avail' : {
            handler: function() {
                this.set_show_dialog_on_quit()
            },
            deep: true
        }
        
    },

    computed : {
        is_sd_avail(){
            if(!this.is_mounted)
                return false
            return this.$refs.stable_diffusion.is_input_avail 
        }
    },

    methods: {

        applyLocaleAttributes() {
            const isAr = this.app_state.isArabic;
            document.documentElement.dir = isAr ? 'rtl' : 'ltr';
            document.documentElement.lang = isAr ? 'ar' : 'en';
        },

        main_screen() {

        },

        show_toast(msg){
            Vue.$toast.default(msg)
        },

        sidebar_item_on_click(t){
            this.current_selected_tab = t;
            this.functions.switch_page(t);
        }, 

        on_home_click(){
            this.functions.switch_page("Homepage")
        },
       
        check_for_updates(){
            
            let xmlHttp = new XMLHttpRequest();
            let user_id = window.ipcRenderer.sendSync('get_instance_id' , '');
            let updates_url = "https://checkupdates.diffusionbee.com/check_diffusionbee_updates?user_id="+user_id;
            xmlHttp.onreadystatechange = function() { 
                if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                {

                    let latest_app_version = xmlHttp.responseText.split("|")[0];
                    console.log("Latest app version" + latest_app_version+ " " + user_id)
                    let current_versoin = require('../package.json').version + "_" + require('../package.json').build_number
                    let latest_build_no = Number(latest_app_version.split("_")[1])
                    let current_build_no = Number(require('../package.json').build_number)
                    if( latest_app_version != current_versoin && latest_build_no > current_build_no ){
                        if(native_confirm("A new version of " + require('../package.json').name +" is available. Do you want to visit " +require('../package.json').website+ " to update?"  ))
                            window.ipcRenderer.sendSync('open_url', require('../package.json').website);
                    }
                }
            }
            xmlHttp.open("GET", updates_url, true); // true for asynchronous 
            xmlHttp.send(null);
        },

        set_show_dialog_on_quit(){
            // determine whether electron process should show a confirmation message while closing or not 
            if( ! this.$refs.stable_diffusion.is_input_avail )
            {
                this.should_show_dialog_on_quit = true;
                this.show_dialog_on_quit_msg = 'Images are still being generated. Are you sure you want to quit?';
                window.ipcRenderer.sendSync('show_dialog_on_quit', this.show_dialog_on_quit_msg);
            }
            else
            {
                this.should_show_dialog_on_quit = false;
                window.ipcRenderer.sendSync('dont_show_dialog_on_quit', '');
            }
        } ,

        check_and_prompt_model_download() {
            // Guard: assets_manager might not be ready yet
            if (!this.assets_manager || !this.assets_manager.all_avail_assets) {
                console.log('assets_manager not ready yet, will retry.');
                return;
            }

            // Skip if dialog already showing or already dismissed
            if (this.show_model_setup) {
                console.log('Model setup already showing.');
                return;
            }

            // Only run if there are no models available
            let existing = Object.keys(this.assets_manager.all_avail_assets);
            if (existing.length > 0) {
                console.log('Models already available (' + existing.length + '), skipping first-run setup.');
                return;
            }

            console.log('No models found — prompting first-run model download.');
            this.show_model_setup = true;

            // Fetch model list from server (fire-and-forget async)
            this.fetch_models_list();
        },

        async fetch_models_list() {
            try {
                let user_id = window.ipcRenderer.sendSync('get_instance_id', '');
                let models_url = 'https://models.diffusionbee.com/list_models?user_id=' + user_id;
                console.log('Fetching models from:', models_url);
                let response = await fetch(models_url, { cache: 'no-store' });
                let models = await response.json();

                if (!models || models.length === 0) {
                    this.model_download_error = 'No models available from the server.';
                    return;
                }

                // Pick a good default: prefer a base SD model (not inpainting, not XL for first use)
                let default_model = models.find(m =>
                    m.id &&
                    m.url &&
                    !m.id.toLowerCase().includes('inpainting') &&
                    !m.id.toLowerCase().includes('xl') &&
                    !m.id.toLowerCase().includes('v2')
                );
                if (!default_model) {
                    // Fallback to the first downloadable model
                    default_model = models.find(m => m.id && m.url) || models[0];
                }

                console.log('Found default model:', default_model ? default_model.id : 'none');
                this.model_to_download = default_model;

                if (this.show_model_setup && this.model_to_download && !this.is_downloading_model && !this.model_download_completed) {
                    this.start_model_download();
                }
            } catch (e) {
                console.error('Failed to fetch model list:', e);
                this.model_download_error = 'Could not reach the model server. Check your internet connection.';
            }
        },

        start_model_download() {
            if (!this.model_to_download) return;
            if (this.is_downloading_model || this.model_download_completed) return;

            this.is_downloading_model = true;
            this.model_download_error = '';
            this.model_download_progress = 0;
            this.model_download_completed = false;

            let asset_id = this.model_to_download.id;
            this.assets_manager.download_asset(this.model_to_download);

            // Track progress via polling
            this.modelDownloadInterval = setInterval(() => {
                let dl = this.assets_manager.downloading[asset_id];
                if (!dl) return;

                this.model_download_progress = dl.progress || 0;

                if (dl.status === 'done') {
                    this.model_download_completed = true;
                    this.is_downloading_model = false;
                    clearInterval(this.modelDownloadInterval);
                    this.modelDownloadInterval = null;

                    // Auto-dismiss after a short delay so the user sees the success state
                    setTimeout(() => {
                        this.show_model_setup = false;
                    }, 2000);
                } else if (dl.status === 'error') {
                    this.is_downloading_model = false;
                    this.model_download_error = dl.error || 'Download failed';
                    clearInterval(this.modelDownloadInterval);
                    this.modelDownloadInterval = null;
                }
            }, 300);
        },

        dismiss_model_setup() {
            console.log('User dismissed model setup.');
            this.show_model_setup = false;
            this.model_download_error = '';
            if (this.modelDownloadInterval) {
                clearInterval(this.modelDownloadInterval);
                this.modelDownloadInterval = null;
            }
            if (this.modelSetupRetryTimer) {
                clearTimeout(this.modelSetupRetryTimer);
                this.modelSetupRetryTimer = null;
            }
        },

        format_model_meta(model) {
            if (!model || !model.model_meta_data) return '';
            let parts = [];
            if (model.model_meta_data.sd_type) parts.push(model.model_meta_data.sd_type);
            if (model.model_meta_data.float_type) parts.push(model.model_meta_data.float_type);
            return parts.join(' · ');
        },
 

        
    },

    data() {
        let app_state = {
            is_start_screen: true, // if the start screen is showing or not
            app_object : this , 
            should_show_dialog_on_quit : false ,  // should ask "do you wanna quit" on closing
            show_dialog_on_quit_msg : "" ,  // the message to show while quiting 
            show_splash_screen : true , // is showing the loading splash screen
            logs : "",
            isArabic : false, // global locale state, synced with i18n.js

            global_loader_modal_msg : "",
            registered_ext_applets : {}, // {id, title, desc, icon, inputs, outputs }
            app_data: {history : {}},
        };

        return {
            current_build_number : Number(require('../package.json').build_number), 
            all_pages_ready: false, // set to true by PagesRouter
            is_mounted : false, // set when app is mounted
            functions: {},
            app_state: app_state,
            app: this , // will be set after mount
            current_selected_tab : "Homepage",
            current_applet_title: "Home",
            is_screen_frozen : true , 
            is_dev : require('../package.json').is_dev ||  require('../package.json').build_number.includes("dev") ,

            // First-run model setup state
            show_model_setup: false,
            model_to_download: null,
            is_downloading_model: false,
            model_download_progress: 0,
            model_download_completed: false,
            model_download_error: '',
            modelDownloadInterval: null,
            modelSetupRetryTimer: null,
        }
    },



}
</script>
<style>
/* First-run model setup overlay */
.model-setup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.model-setup-dialog {
    background: #1c1c1e;
    border-radius: 20px;
    padding: 40px;
    max-width: 460px;
    width: 90%;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    border: 1px solid rgba(255,255,255,0.08);
    animation: slideUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    color: #ffffff;
    text-align: center;
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(40px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}

.model-setup-header {
    margin-bottom: 24px;
}

.model-setup-header h2 {
    font-size: 1.6rem;
    font-weight: 700;
    margin-bottom: 8px;
    color: #ffffff;
}

.model-setup-header p {
    color: rgba(255,255,255,0.5);
    font-size: 0.95rem;
}

.model-setup-body {
    min-height: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.model-setup-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: #3E7BFA;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.model-card-setup {
    margin-bottom: 20px;
    text-align: center;
}

.model-card-setup h3 {
    font-size: 1.15rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: #ffffff;
}

.model-desc {
    color: rgba(255,255,255,0.5);
    font-size: 0.85rem;
    line-height: 1.4;
    margin-bottom: 6px;
}

.model-meta {
    color: rgba(255,255,255,0.35);
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.download-btn {
    background: #3E7BFA;
    color: #ffffff;
    border: none;
    border-radius: 14px;
    padding: 14px 32px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    box-shadow: 0 8px 24px rgba(62, 123, 250, 0.3);
}

.download-btn:hover {
    background: #2d6ae8;
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(62, 123, 250, 0.4);
}

.download-btn.small {
    padding: 10px 20px;
    font-size: 0.85rem;
}

.model-setup-progress {
    width: 100%;
    text-align: center;
}

.model-setup-progress h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 20px;
    color: rgba(255,255,255,0.8);
}

.progress-bar-track {
    width: 100%;
    height: 8px;
    background: rgba(255,255,255,0.08);
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 12px;
}

.progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #3E7BFA, #6c5ce7);
    border-radius: 10px;
    transition: width 0.3s ease;
}

.progress-text {
    color: rgba(255,255,255,0.5);
    font-size: 0.85rem;
    font-weight: 600;
}

.model-setup-success {
    text-align: center;
    animation: successFadeIn 0.5s ease;
}

@keyframes successFadeIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}

.success-checkmark {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(52, 199, 89, 0.2);
    color: #34c759;
    font-size: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    animation: checkPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes checkPop {
    0% { transform: scale(0); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
}

.model-setup-success h3 {
    font-size: 1.2rem;
    font-weight: 600;
    color: #34c759;
    margin-bottom: 6px;
}

.model-setup-success p {
    color: rgba(255,255,255,0.5);
    font-size: 0.9rem;
}

.model-setup-footer {
    margin-top: 16px;
}

.btn-row {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
}

.skip-btn {
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.5);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 10px 20px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
}

.skip-btn:hover {
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.8);
}

.error-text {
    color: #ff453a;
    font-size: 0.85rem;
    margin-bottom: 12px;
}

#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
    /*margin-top: 60px;*/
}

body {
    margin: 0;
    padding: 0;
}

/* Global Arabic text styling with Tajawal font */
.arabic-text {
    font-family: 'Tajawal', sans-serif !important;
    line-height: 1.4;
}

[dir="rtl"] {
    text-align: right;
}
</style>
