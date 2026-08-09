@import '../assets/css/theme.css';
<template>
    <div id="app">
        <!-- <img alt="Vue logo" src="./assets/logo.png"> -->
        
        <StableDiffusion ref="stable_diffusion"> </StableDiffusion>
        <SDManager :app="app" ref="sd_manager"> </SDManager>
        <AssetsManager ref="assets_manager"> </AssetsManager>
        
        <div v-if="app_state.is_start_screen">
            <transition name="slide_show">
                <SplashScreen v-if="app_state.show_splash_screen" :progress="splashProgress" :status="splashStatus" :appVersion="appVersionLabel"></SplashScreen>
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

        <LoaderModal
            v-if="is_generating && !app_state.global_loader_modal_msg && !app_state.is_start_screen"
            mode="generation"
            :loading_percentage="generationModalProgress"
            :current_step="stable_diffusion && stable_diffusion.generation_current_step"
            :total_steps="stable_diffusion && stable_diffusion.generation_total_steps"
            :loading_title="generationModalTitle"
            :remaining_times="stable_diffusion && stable_diffusion.remaining_times"
            :appState="app_state"
            @cancel="cancelGeneration"
        />

        <!-- First-run Model Setup Dialog -->
        <div v-if="show_model_setup" class="model-setup-overlay">
            <div class="model-setup-dialog">
                <div class="model-setup-header">
                    <h2>{{ setupHeaderTitle }}</h2>
                    <p>{{ setupHeaderSubtitle }}</p>
                </div>

                <div v-if="!model_to_download && !is_downloading_model && !model_download_completed" class="model-setup-body">
                    <div class="model-setup-loading">
                        <div class="loading-spinner"></div>
                        <p>{{ app_state.isArabic ? 'جارٍ التحقق من النماذج المتاحة...' : 'Checking for available models...' }}</p>
                        <button @click="dismiss_model_setup" class="skip-btn" style="margin-top: 8px;">{{ app_state.isArabic ? 'تخطي الآن' : 'Skip for now' }}</button>
                    </div>
                </div>

                <div v-else-if="model_to_download && !is_downloading_model && !model_download_completed" class="model-setup-body">
                    <div class="model-card-setup">
                        <h3>{{ model_to_download.title || model_to_download.id }}</h3>
                        <p class="model-desc">{{ model_to_download.description || 'An image generation model for DiffusionBee.' }}</p>
                        <p class="model-meta">{{ format_model_meta(model_to_download) }}</p>
                    </div>
                    <button @click="start_model_download" class="download-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {{ app_state.isArabic ? 'تحميل وابدأ' : 'Download & Get Started' }}
                    </button>
                    <button @click="dismiss_model_setup" class="skip-btn" style="margin-top: 12px;">{{ app_state.isArabic ? 'تخطي' : 'Skip' }}</button>
                </div>

                <div v-else-if="is_downloading_model && !model_download_completed" class="model-setup-body">
                    <div class="model-setup-progress">
                        <h3>{{ app_state.isArabic ? 'جارٍ تحميل' : 'Downloading' }} {{ (model_to_download && (model_to_download.title || model_to_download.id)) || 'model' }}...</h3>
                        <div class="progress-bar-track">
                            <div class="progress-bar-fill" :style="{ width: Math.min(model_download_progress, 100) + '%' }"></div>
                        </div>
                        <p class="progress-text">{{ Math.round(model_download_progress) }}%</p>
                        <!-- Escape hatch: a stalled download (no Content-Length,
                             dead server) must never trap the user behind the
                             full-screen overlay with a forever-running poller.
                             dismiss_model_setup clears modelDownloadInterval. -->
                        <button @click="dismiss_model_setup" class="skip-btn" style="margin-top: 12px;">{{ app_state.isArabic ? 'إلغاء التحميل' : 'Cancel download' }}</button>
                    </div>
                </div>

                <div v-else-if="model_download_completed" class="model-setup-body">
                    <div class="model-setup-success">
                        <div class="success-checkmark">✓</div>
                        <h3>{{ app_state.isArabic ? 'النموذج جاهز!' : 'Model ready!' }}</h3>
                        <p>{{ app_state.isArabic ? 'أنت جاهز تمامًا لبدء توليد الصور.' : "You're all set to start generating images." }}</p>
                        <button v-if="!show_optional_model_downloads && !optional_downloads_in_progress && !optional_downloads_completed" @click="offerOptionalDownloads" class="download-btn small" style="margin-top: 16px;">
                            {{ app_state.isArabic ? 'تحميل نماذج إضافية (اختياري)' : 'Get more models (optional)' }}
                        </button>
                        <button v-if="!show_optional_model_downloads && !optional_downloads_in_progress && !optional_downloads_completed" @click="dismiss_model_setup" class="open-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {{ app_state.isArabic ? 'فتح التطبيق' : 'OPEN App' }}
                        </button>
                    </div>
                </div>

                <!-- Optional additional model downloads -->
                <div v-if="show_optional_model_downloads" class="model-setup-body optional-downloads-body">
                    <h3>{{ app_state.isArabic ? 'نماذج إضافية اختيارية' : 'Optional additional models' }}</h3>
                    <p class="optional-downloads-subtitle">
                        {{ app_state.isArabic ? 'اختر النماذج التي تريد تنزيلها. يمكنك دائمًا تنزيلها لاحقًا من متجر النماذج.' : 'Choose models to download now. You can always get more later from the Model Store.' }}
                    </p>

                    <div v-if="!optional_models.length && !optional_download_error" class="model-setup-loading" style="margin: 20px 0;">
                        <div class="loading-spinner"></div>
                        <p>{{ app_state.isArabic ? 'جارٍ تحميل القائمة...' : 'Loading model list...' }}</p>
                    </div>

                    <div v-else class="optional-model-list">
                        <label v-for="model in optional_models" :key="model.id" class="optional-model-item" :class="{ disabled: optional_downloads_in_progress }">
                            <input type="checkbox" v-model="selected_optional_models[model.id]" :disabled="optional_downloads_in_progress">
                            <div class="optional-model-info">
                                <div class="optional-model-title">{{ model.title || model.id }}</div>
                                <div class="optional-model-desc">{{ model.description || 'Image generation model' }}</div>
                                <div class="optional-model-meta">{{ format_model_meta(model) }} · {{ formatBytes(model.size_bytes || 0) }}</div>
                                <div v-if="optional_downloads_in_progress && optional_download_progress[model.id] !== undefined" class="optional-model-progress">
                                    <div class="progress-bar-track" style="height: 4px; margin: 6px 0 4px;">
                                        <div class="progress-bar-fill" :style="{ width: Math.min(optional_download_progress[model.id], 100) + '%' }"></div>
                                    </div>
                                    <span class="progress-text" style="font-size: 0.75rem;">{{ Math.round(optional_download_progress[model.id]) }}%</span>
                                </div>
                            </div>
                        </label>
                    </div>

                    <div v-if="optional_download_error" class="error-text" style="margin: 12px 0;">⚠ {{ optional_download_error }}</div>

                    <div class="btn-row" style="margin-top: 20px;">
                        <button v-if="!optional_downloads_in_progress && !optional_downloads_completed" @click="startOptionalDownloads" :disabled="!hasSelectedOptionalModels" class="download-btn small">
                            {{ app_state.isArabic ? 'تنزيل المحدد' : 'Download selected' }}
                        </button>
                        <button v-if="optional_downloads_completed" @click="dismiss_model_setup" class="download-btn small">
                            {{ app_state.isArabic ? 'ابدأ الآن' : 'Start creating' }}
                        </button>
                        <button v-if="!optional_downloads_in_progress" @click="dismiss_model_setup" class="skip-btn">
                            {{ app_state.isArabic ? (optional_downloads_completed ? 'لاحقًا' : 'تخطي') : (optional_downloads_completed ? 'Later' : 'Skip') }}
                        </button>
                    </div>
                </div>

                <div v-if="model_download_error" class="model-setup-footer">
                    <p class="error-text">⚠ {{ model_download_error }}</p>
                    <div class="btn-row">
                        <button @click="start_model_download" class="download-btn small">{{ app_state.isArabic ? 'إعادة المحاولة' : 'Retry' }}</button>
                        <button @click="dismiss_model_setup" class="skip-btn">{{ app_state.isArabic ? 'تخطي الآن' : 'Skip for now' }}</button>
                    </div>
                </div>

                <!-- Footer with attribution -->
                <div class="model-setup-attribution">
                    <p>{{ app_state.isArabic ? 'صُنع بحب ❤️ في البحرين 🇧🇭' : 'Made with Love ❤️ in Bahrain 🇧🇭' }}</p>
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
const { getMachineProfile, pickOptimalOnboardingModel, isSelectableOnboardingModel } = require("./utils/model_selection.js")
const { mergeFlux2IntoCatalog } = require("./utils/flux2_catalog.js")
const { getHfTokenSync } = require("./utils/hf_auth.js")

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

        // ── Splash screen progress updates ──
        this.updateSplashProgress('Initializing backend...', 5);

        // The splash screen is a full-window drag region that swallows every
        // click and keystroke, so it must NEVER be allowed to run forever.
        // The interval below only stops when the backend reports input-ready
        // (`sdbk inrd`); if the backend fails to start / hangs, the watchdog
        // deadline fires and we let the user into the app anyway (the Home
        // onboarding banner and Model Store still give a path forward).
        // 30s cap: on modest machines (8GB) model load can take ~10-20s, but
        // a full-window input block must never outlast that by much.
        const SPLASH_MAX_WAIT_MS = 30000; // 30s hard cap
        const splashDeadline = Date.now() + SPLASH_MAX_WAIT_MS;
        this.start_screen_interval = setInterval( function(){
            if(that.stable_diffusion && that.stable_diffusion.is_input_avail){
                that.updateSplashProgress('Starting services...', 15);
                clearInterval(that.start_screen_interval);
                that.start_screen_interval = null;
                that.app_state.is_start_screen = false;
            } else if (Date.now() >= splashDeadline) {
                // Backend never became ready — stop polling and unlock the UI.
                clearInterval(that.start_screen_interval);
                that.start_screen_interval = null;
                that.updateSplashProgress('Backend not responding — you can still browse.', 100);
                that.app_state.is_start_screen = false;
                console.warn('[splash] Backend did not become input-ready within ' + SPLASH_MAX_WAIT_MS + 'ms — unlocking the UI.');
            } else {
                that.updateSplashProgress('Waiting for backend...', 8);
            }
        }  , 1500)

        this.is_mounted = true;

        // Scan disk models and update splash progress
        try {
            let modelCount = this.assets_manager.scan_disk_models();
            console.log('Discovered ' + modelCount + ' models from disk');
            this.updateSplashProgress('Scanning models...', 25);
        } catch (e) {
            console.warn('Failed to scan disk for models:', e);
        }

        // Track model download progress during splash. This interval is
        // cleared when the start screen ends (see the is_start_screen watcher)
        // so it can never keep firing every 500ms for the whole app lifetime.
        this.splashBackendCheckInterval = setInterval(() => {
            if (this.assets_manager && this.assets_manager.downloading) {
                for (let id of Object.keys(this.assets_manager.downloading)) {
                    let dl = this.assets_manager.downloading[id];
                    if (dl && dl.status === 'downloading' && dl.progress !== undefined) {
                        const dlProgress = Number(dl.progress);
                        if (Number.isFinite(dlProgress) && dlProgress >= 0) {
                            // Map download progress (0-100) to splash progress range (30-85)
                            let p = 30 + Math.round(Math.min(dlProgress, 100) * 0.55);
                            this.updateSplashProgress('Downloading model...', p);
                            break;
                        }
                    }
                }
            }
        }, 500);

        // Seed bundled default models (Windows installer ships one so it's ready to generate).
        // Then check for models and automatically prompt download if none found.
        // Run immediately after scan and also re-attempt once the start screen finishes
        let seededBundledModels = [];
        try {
            seededBundledModels = window.ipcRenderer.sendSync('seed_bundled_models');
            if (seededBundledModels && seededBundledModels.length > 0) {
                console.log('Seeded bundled models:', seededBundledModels);
                // Reload persisted model registry so the onboarding check sees them.
                this.assets_manager.downloaded_assets = window.ipcRenderer.sendSync('load_data', 'downloaded_assets.json');
            }
        } catch (e) {
            console.warn('Failed to seed bundled models:', e);
        }
        this.check_and_prompt_model_download();
        this.modelSetupRetryTimer = setTimeout(() => {
            this.check_and_prompt_model_download();
        }, 5000);

        let data = window.ipcRenderer ? window.ipcRenderer.sendSync('load_data', 'app_data_2.json') : {};
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
                    // Stop the forever-running splash poller the moment the
                    // start screen ends (it was previously only cleared in
                    // beforeDestroy, so it fired every 500ms for the entire
                    // app lifetime).
                    if (this.splashBackendCheckInterval) {
                        clearInterval(this.splashBackendCheckInterval);
                        this.splashBackendCheckInterval = null;
                    }
                    if(this.is_screen_frozen){
                        console.log("Unfreeze win!")
                        if (window.ipcRenderer) window.ipcRenderer.sendSync('unfreeze_win', '');
                        this.is_screen_frozen = false;
                    }
                    
                }
                else{
                    if(!this.is_screen_frozen){
                        console.log("Freeze win!")
                        if (window.ipcRenderer) window.ipcRenderer.sendSync('freeze_win', '');
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
                if (window.ipcRenderer) window.ipcRenderer.sendSync('save_data', new_value , "app_data_2.json");
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
        },
        is_generating() {
            if (!this.is_mounted || !this.stable_diffusion) return false;
            if (this.app_state.is_start_screen) return false;

            const sd = this.stable_diffusion;
            if (!sd.is_backend_loaded || sd.is_input_avail) return false;

            // Backend warmup sets is_input_avail false before any job exists — don't treat that as generation.
            if (sd.attached_cbs) return true;
            if (typeof sd.generation_progress === 'number' && sd.generation_progress >= 0) return true;
            if (this.generationQueueCount > 0) return true;
            return false;
        },
        generationModalProgress() {
            if (!this.is_mounted) return 0;

            if (this.stable_diffusion && typeof this.stable_diffusion.generation_progress === 'number' && this.stable_diffusion.generation_progress >= 0) {
                return this.stable_diffusion.generation_progress;
            }

            if (this.stable_diffusion_manager && typeof this.stable_diffusion_manager.done_percentage === 'number' && this.stable_diffusion_manager.done_percentage >= 0) {
                return this.stable_diffusion_manager.done_percentage;
            }

            return 0;
        },
        generationModalTitle() {
            const queueCount = this.generationQueueCount;
            if (this.app_state.isArabic) {
                return queueCount > 1
                    ? `جارٍ توليد الصور (${queueCount} متبقية)`
                    : 'جارٍ توليد الصورة';
            }
            return queueCount > 1
                ? `Generating images (${queueCount} remaining)`
                : 'Generating image';
        },
        generationQueueCount() {
            if (!this.stable_diffusion_manager || !this.stable_diffusion_manager.queue) return 0;
            let count = 0;
            const current = this.stable_diffusion_manager.queue.current_group;
            if (current && current.jobs) {
                for (const job of current.jobs) {
                    if (job.job_state !== 'done') count += 1;
                }
            }
            if (this.stable_diffusion_manager.queue.groups_todo) {
                for (const group of this.stable_diffusion_manager.queue.groups_todo) {
                    count += (group.jobs || []).length;
                }
            }
            return count;
        },
        appVersionLabel(){
            try {
                let pkg = require('../package.json');
                return (pkg.version || '2.4.0') + ' build ' + (pkg.build_number || '0029');
            } catch(e) {
                return '2.4.0';
            }
        },
        setupHeaderTitle() {
            if (this.show_optional_model_downloads) {
                return this.app_state.isArabic ? 'نماذج إضافية' : 'More models';
            }
            return this.app_state.isArabic ? 'مرحبًا بك في واجهة DiffusionBee!' : 'Welcome to DiffusionBee GUI!';
        },
        setupHeaderSubtitle() {
            if (this.show_optional_model_downloads) {
                return this.app_state.isArabic ? 'اختر نماذج إضافية لتنزيلها الآن أو تخطَّها.' : 'Choose extra models to download now, or skip them.';
            }
            return this.app_state.isArabic ? 'انقر مرة واحدة وسنحمّل أفضل نموذج لجهازك — دون أي خطوات إضافية.' : "One click and we'll download the best model for your machine — no setup needed.";
        },
        hasSelectedOptionalModels() {
            return Object.values(this.selected_optional_models).some(Boolean);
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

        cancelGeneration() {
            console.log('Generation cancelled by user');
            if (this.stable_diffusion) {
                this.stable_diffusion.interupt();
            }
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
            let user_id = window.ipcRenderer ? window.ipcRenderer.sendSync('get_instance_id' , '') : '';
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
                            if (window.ipcRenderer) window.ipcRenderer.sendSync('open_url', require('../package.json').website);
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
                if (window.ipcRenderer) window.ipcRenderer.sendSync('show_dialog_on_quit', this.show_dialog_on_quit_msg);
            }
            else
            {
                this.should_show_dialog_on_quit = false;
                if (window.ipcRenderer) window.ipcRenderer.sendSync('dont_show_dialog_on_quit', '');
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

            let existing = Object.keys(this.assets_manager.all_avail_assets);
            const onboardingCompleted = this.app_state.app_data.settings && this.app_state.app_data.settings.onboarding_completed;

            // If models already exist: silently complete onboarding, validate compatibility, skip downloads.
            if (existing.length > 0) {
                console.log('Models already available (' + existing.length + ') — completing onboarding, verifying compatibility.');
                if (!onboardingCompleted) {
                    this.completeOnboarding();
                }
                this.verifyModelsHardwareCompatibility();
                return;
            }

            console.log('No models found — onboarding is available from the Home screen.');
        },

        async fetch_models_list() {
            try {
                let user_id = window.ipcRenderer ? window.ipcRenderer.sendSync('get_instance_id', '') : '';
                let models_url = 'https://models.diffusionbee.com/list_models?user_id=' + user_id;
                console.log('Fetching models from:', models_url);
                // Hard timeout so a hanging catalog request can never leave the
                // z-9999 setup overlay stuck on "Checking for available models..."
                // with no way out (the Skip button is the UI-level escape).
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000);
                let response;
                try {
                    response = await fetch(models_url, { cache: 'no-store', signal: controller.signal });
                } finally {
                    clearTimeout(timeout);
                }
                let models = await response.json();

                if (!models || models.length === 0) {
                    this.model_download_error = 'No models available from the server.';
                    return;
                }

                const machineProfile = getMachineProfile();
                const hfToken = getHfTokenSync();
                const mergedModels = mergeFlux2IntoCatalog(models, hfToken);
                const downloadableModels = mergedModels.filter((model) => model && model.id && model.url && isSelectableOnboardingModel(model, {
                    profile: machineProfile,
                    hasHfToken: Boolean(hfToken),
                }));
                // NOTE: `preferFlux2` is deliberately not passed — the active
                // backend has no FLUX inference, so onboarding must never
                // recommend a FLUX model (see GENERATABLE_MODEL_TYPES in
                // flux2_catalog.js — the single gate that flips when a real
                // FLUX backend ships).
                let default_model = pickOptimalOnboardingModel(downloadableModels, machineProfile, {
                    hasHfToken: Boolean(hfToken),
                });
                if (!default_model) {
                    // The gated list above should never be empty (SD models
                    // always qualify), but if it somehow is — a catalog hiccup,
                    // or a server listing only FLUX entries — fall back to a
                    // *generatable* entry only. The old fallback could hand the
                    // user a FLUX.2 model the backend can't run (the FLUX trap).
                    default_model = downloadableModels[0]
                        || mergedModels.find((m) => m && m.id && m.url && isSelectableOnboardingModel(m))
                        || null;
                }

                if (!default_model) {
                    this.model_download_error = 'No compatible models available from the server.';
                    return;
                }

                console.log('Found default model:', default_model.id);
                this.model_to_download = default_model;
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

                this.model_download_progress = Math.max(0, Math.min(100, Number(dl.progress) || 0));

                if (dl.status === 'done') {
                    this.model_download_completed = true;
                    this.is_downloading_model = false;
                    this.completeOnboarding();
                    clearInterval(this.modelDownloadInterval);
                    this.modelDownloadInterval = null;

                    // Success state remains visible so the user can optionally download more models.
                } else if (dl.status === 'error') {
                    this.is_downloading_model = false;
                    this.model_download_error = dl.error || 'Download failed';
                    clearInterval(this.modelDownloadInterval);
                    this.modelDownloadInterval = null;
                }
            }, 300);
        },

        launchOnboarding(force = false) {
            if (!this.assets_manager || !this.assets_manager.all_avail_assets) {
                console.log('assets_manager not ready for onboarding.');
                return;
            }

            let existing = Object.keys(this.assets_manager.all_avail_assets);
            if (!force && existing.length > 0) {
                console.log('Models already available, onboarding not required.');
                return;
            }

            this.show_model_setup = true;
            this.model_download_error = '';
            this.model_download_completed = false;
            this.is_downloading_model = false;

            if (!this.model_to_download) {
                this.fetch_models_list();
            }
        },

        completeOnboarding() {
            if (!this.app_state.app_data.settings) {
                Vue.set(this.app_state.app_data, 'settings', {});
            }
            Vue.set(this.app_state.app_data.settings, 'onboarding_completed', true);
        },

        dismiss_model_setup() {
            console.log('User dismissed model setup.');
            this.show_model_setup = false;
            this.model_download_error = '';
            this.completeOnboarding();
            this.markOptionalDownloadsOffered();
            this.stopOptionalDownloadPolling();
            if (this.modelDownloadInterval) {
                clearInterval(this.modelDownloadInterval);
                this.modelDownloadInterval = null;
            }
            if (this.modelSetupRetryTimer) {
                clearTimeout(this.modelSetupRetryTimer);
                this.modelSetupRetryTimer = null;
            }
        },

        markOptionalDownloadsOffered() {
            if (!this.app_state.app_data.settings) {
                Vue.set(this.app_state.app_data, 'settings', {});
            }
            Vue.set(this.app_state.app_data.settings, 'optional_downloads_offered', true);
        },

        optionalDownloadsAlreadyOffered() {
            return Boolean(this.app_state.app_data.settings && this.app_state.app_data.settings.optional_downloads_offered);
        },

        async offerOptionalDownloads() {
            if (!this.assets_manager || !this.assets_manager.all_avail_assets) {
                console.log('assets_manager not ready for optional downloads.');
                return;
            }

            this.show_model_setup = true;
            this.show_optional_model_downloads = true;
            this.optional_downloads_completed = false;
            this.optional_downloads_in_progress = false;
            this.optional_download_error = '';
            this.selected_optional_models = {};
            this.optional_download_progress = {};

            if (this.optional_models.length === 0) {
                await this.fetchOptionalModels();
            }
        },

        async fetchOptionalModels() {
            try {
                let user_id = window.ipcRenderer ? window.ipcRenderer.sendSync('get_instance_id', '') : '';
                let models_url = 'https://models.diffusionbee.com/list_models?user_id=' + user_id;
                // Same hard timeout as fetch_models_list — never let the
                // optional-downloads dialog hang without an escape.
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000);
                let response;
                try {
                    response = await fetch(models_url, { cache: 'no-store', signal: controller.signal });
                } finally {
                    clearTimeout(timeout);
                }
                let models = await response.json();

                if (!models || models.length === 0) {
                    this.optional_download_error = 'No models available from the server.';
                    return;
                }

                const machineProfile = getMachineProfile();
                const hfToken = getHfTokenSync();
                const mergedModels = mergeFlux2IntoCatalog(models, hfToken);
                const installedIds = new Set(Object.keys(this.assets_manager.all_avail_assets));

                // Curated list: high-quality SD/SDXL models only. FLUX.2 used
                // to be curated here, but the active backend can't run FLUX —
                // recommending the 7.75GB download was the "FLUX trap" (see
                // GENERATABLE_MODEL_TYPES in flux2_catalog.js).
                const candidateIds = [
                    'DreamShaper_6_baked_vae',
                    'CyberRealistic__v3.1',
                    'Juggernaut_X',
                ];

                const candidateSet = new Set(candidateIds);
                let candidates = mergedModels.filter((model) => {
                    if (!model || !model.id || !model.url) return false;
                    if (installedIds.has(model.id)) return false;
                    if (candidateSet.has(model.id)) return true;
                    return false;
                });

                // If curated list is empty, fall back to selectable onboarding models.
                if (candidates.length === 0) {
                    candidates = mergedModels.filter((model) =>
                        model && model.id && model.url &&
                        !installedIds.has(model.id) &&
                        isSelectableOnboardingModel(model, { profile: machineProfile, hasHfToken: Boolean(hfToken) })
                    );
                }

                // Sort by known quality/size heuristics and limit to avoid overwhelming the user.
                const { sortStableDiffusionModelsBestFirst } = require('./utils/model_selection.js');
                candidates = sortStableDiffusionModelsBestFirst(candidates, machineProfile).slice(0, 6);

                this.optional_models = candidates;
                // Pre-select the first non-FLUX model as a gentle default.
                for (const model of candidates) {
                    const isFlux = model.model_meta_data && model.model_meta_data.family === 'flux2';
                    this.$set(this.selected_optional_models, model.id, !isFlux && candidates.indexOf(model) === 0);
                }
            } catch (e) {
                console.error('Failed to fetch optional models:', e);
                this.optional_download_error = 'Could not reach the model server. Check your internet connection.';
            }
        },

        startOptionalDownloads() {
            const selected = this.optional_models.filter((m) => this.selected_optional_models[m.id]);
            if (selected.length === 0) return;

            this.optional_downloads_in_progress = true;
            this.optional_downloads_completed = false;
            this.optional_download_error = '';
            this.optional_download_progress = {};

            for (const model of selected) {
                this.$set(this.optional_download_progress, model.id, 0);
                this.assets_manager.download_asset(model);
            }

            this.optionalDownloadInterval = setInterval(() => {
                let allDone = true;
                let anyError = false;

                for (const model of selected) {
                    const dl = this.assets_manager.downloading[model.id];
                    if (!dl) {
                        // If not in downloading and not in downloaded_assets, it's still pending.
                        if (!this.assets_manager.downloaded_assets[model.id]) {
                            allDone = false;
                        }
                        continue;
                    }

                    this.$set(this.optional_download_progress, model.id, Math.max(0, Math.min(100, Number(dl.progress) || 0)));

                    if (dl.status === 'downloading' || dl.status === 'not_downloaded') {
                        allDone = false;
                    } else if (dl.status === 'error') {
                        anyError = true;
                        allDone = false;
                    }
                }

                if (anyError) {
                    this.optional_download_error = 'One or more model downloads failed.';
                }

                if (allDone && !anyError) {
                    this.optional_downloads_completed = true;
                    this.optional_downloads_in_progress = false;
                    this.stopOptionalDownloadPolling();
                    this.markOptionalDownloadsOffered();
                }
            }, 300);
        },

        stopOptionalDownloadPolling() {
            if (this.optionalDownloadInterval) {
                clearInterval(this.optionalDownloadInterval);
                this.optionalDownloadInterval = null;
            }
        },

        verifyModelsHardwareCompatibility() {
            try {
                const machineProfile = getMachineProfile();
                const assets = this.assets_manager.all_avail_assets || {};
                const modelIds = Object.keys(assets);

                const hwLabel = `${machineProfile.platform} ${machineProfile.arch}` +
                    (machineProfile.isAppleSilicon ? ' (Apple Silicon)' : '');

                console.log('');
                console.log('═'.repeat(50));
                console.log('  Hardware & Model Compatibility Report');
                console.log('═'.repeat(50));
                console.log(`  Host:         ${hwLabel}`);
                console.log(`  Total RAM:    ${machineProfile.totalMemGB.toFixed(1)} GB`);
                console.log(`  Models found: ${modelIds.length}`);
                console.log('');

                if (modelIds.length === 0) {
                    console.log('  No models registered. Onboarding will be required.');
                    console.log('═'.repeat(50));
                    return;
                }

                const compatibleModels = [];
                const incompatibleModels = [];

                for (const id of modelIds) {
                    const asset = assets[id];
                    const meta = (asset && asset.model_meta_data) || {};
                    const path = (asset && asset.asset_path) || '';

                    // Check file exists on disk. Done through IPC instead of a
                    // renderer-side require('fs') so the Node builtin never
                    // enters the renderer bundle (keeps the browser demo build
                    // compiling cleanly).
                    let existsOnDisk = false;
                    if (window.ipcRenderer && typeof window.ipcRenderer.sendSync === 'function') {
                        try {
                            existsOnDisk = !!window.ipcRenderer.sendSync('file_exists', path);
                        } catch (_) { /* ignore */ }
                    }
                    // Size comes from the asset catalog when known (no renderer fs access).
                    const fileSize = asset.size_bytes ? this.formatBytes(asset.size_bytes) : 'unknown';

                    const sdType = (meta.sd_type || 'unknown').toLowerCase();
                    const floatType = (meta.float_type || 'unknown').toLowerCase();

                    // Assess compatibility based on hardware
                    let compatible = true;
                    let notes = [];

                    // FLUX models need significant RAM
                    if (sdType.startsWith('flux2') || sdType.startsWith('flux')) {
                        if (machineProfile.totalMemGB < 16) {
                            compatible = false;
                            notes.push('FLUX requires ≥16GB RAM');
                        } else if (sdType.includes('dev') && machineProfile.totalMemGB < 28) {
                            compatible = false;
                            notes.push('FLUX.2-dev requires ≥28GB RAM');
                        } else {
                            notes.push('Great on Apple Silicon (MPS)');
                        }
                    }

                    // SDXL models: need more RAM
                    if (sdType.includes('sdxl')) {
                        if (machineProfile.totalMemGB < 12) {
                            compatible = false;
                            notes.push('SDXL needs ≥12GB RAM');
                        } else {
                            notes.push('SDXL compatible');
                        }
                    }

                    // SD 1.x models: broadly compatible
                    if (sdType.includes('sd_1x') || sdType === 'sd_1x') {
                        notes.push('Lightweight, broadly compatible');
                    }

                    // Float precision notes
                    if (floatType === 'float32' && machineProfile.isAppleSilicon) {
                        notes.push('float32 — consider float16 for better Apple Silicon perf');
                    } else if (floatType === 'float16' && machineProfile.isAppleSilicon) {
                        notes.push('Optimal float16 for Apple Silicon');
                    } else if (floatType === 'bfloat16' && machineProfile.isAppleSilicon) {
                        notes.push('bfloat16 — good Apple Silicon support');
                    }

                    if (!existsOnDisk) {
                        compatible = false;
                        notes.unshift('⚠️ File missing from disk');
                    }

                    const mark = compatible ? '✅' : '⚠️';
                    console.log(`  ${mark} ${id}`);
                    console.log(`      Type: ${meta.sd_type || 'unknown'}  |  Precision: ${meta.float_type || 'unknown'}  |  Size: ${fileSize}`);
                    if (notes.length > 0) {
                        console.log(`      ${notes.join(' | ')}`);
                    }

                    if (compatible) {
                        compatibleModels.push(id);
                    } else {
                        incompatibleModels.push(id);
                    }
                }

                console.log('');
                const label = `${machineProfile.platform} ${machineProfile.arch} (${machineProfile.totalMemGB.toFixed(0)} GB)`;
                if (incompatibleModels.length === 0) {
                    console.log(`  ✅ All ${compatibleModels.length} model(s) compatible with ${label}.`);
                } else {
                    console.log(`  ⚠️  ${incompatibleModels.length} model(s) may have compatibility issues on ${label}:`);
                    for (const id of incompatibleModels) {
                        console.log(`      - ${id}`);
                    }
                }
                console.log('═'.repeat(50));
                console.log('');
            } catch (e) {
                console.warn('Could not verify model hardware compatibility:', e);
            }
        },

        formatBytes(bytes) {
            if (!bytes || bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        updateSplashProgress(status, progress) {
            this.splashStatus = status;
            const p = Number(progress);
            // Reject NaN / Infinity / non-numeric values so the splash can
            // never render a "NaN%" label.
            if (Number.isFinite(p) && p >= 0) {
                this.splashProgress = Math.min(100, p);
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

    beforeDestroy() {
        if (this.splashBackendCheckInterval) {
            clearInterval(this.splashBackendCheckInterval);
        }
        if (this.start_screen_interval) {
            clearInterval(this.start_screen_interval);
        }
        if (this.optionalDownloadInterval) {
            clearInterval(this.optionalDownloadInterval);
        }
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
            current_build_number : require('./utils/app_version.js').getAppBuildNumber(),
            all_pages_ready: false, // set to true by PagesRouter
            is_mounted : false, // set when app is mounted
            functions: {},
            app_state: app_state,
            app: this , // will be set after mount
            current_selected_tab : "Homepage",
            current_applet_title: "Home",
            is_screen_frozen : true , 
            is_dev : require('../package.json').is_dev ||  require('../package.json').build_number.includes("dev") ,

            // Splash screen progress tracking
            splashProgress: -1, // -1 = indeterminate
            splashStatus: '',
            splashBackendCheckInterval: null,

            // First-run model setup state
            show_model_setup: false,
            model_to_download: null,
            is_downloading_model: false,
            model_download_progress: 0,
            model_download_completed: false,
            model_download_error: '',
            modelDownloadInterval: null,
            modelSetupRetryTimer: null,

            // Optional additional model downloads after onboarding
            show_optional_model_downloads: false,
            optional_models: [],
            selected_optional_models: {},
            optional_downloads_in_progress: false,
            optional_downloads_completed: false,
            optional_download_progress: {},
            optional_download_error: '',
            optionalDownloadInterval: null,
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
    background: rgba(28, 28, 30, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 40px;
    max-width: 460px;
    width: 90%;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08) inset;
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
    border-top-color: hsl(258 90% 65%);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    box-shadow: 0 0 15px hsl(258 90% 65% / 0.5);
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
    background: var(--brand-gradient);
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
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 8px 24px rgba(62, 123, 250, 0.3);
}

.download-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px var(--brand-glow);
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
    background: var(--brand-gradient);
    background-size: 200% 100%;
    animation: shimmer 2s linear infinite;
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

/* Optional additional model downloads */
.optional-downloads-body {
    align-items: stretch;
    width: 100%;
}

.optional-downloads-body h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 6px;
    color: #ffffff;
}

.optional-downloads-subtitle {
    color: rgba(255,255,255,0.5);
    font-size: 0.85rem;
    margin-bottom: 16px;
    text-align: center;
}

.optional-model-list {
    width: 100%;
    max-height: 260px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-right: 4px;
}

.optional-model-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
}

.optional-model-item:hover {
    background: rgba(255,255,255,0.08);
    border-color: rgba(62, 123, 250, 0.4);
}

.optional-model-item.disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.optional-model-item input[type="checkbox"] {
    margin-top: 3px;
    width: 18px;
    height: 18px;
    accent-color: #3E7BFA;
    cursor: pointer;
}

.optional-model-info {
    flex: 1;
    min-width: 0;
}

.optional-model-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 3px;
}

.optional-model-desc {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.45);
    line-height: 1.35;
    margin-bottom: 4px;
}

.optional-model-meta {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.35);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.optional-model-progress {
    margin-top: 6px;
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

/* Footer attribution for model setup dialog */
.model-setup-attribution {
    text-align: center;
    padding: 16px 0 4px;
    border-top: 1px solid var(--color-border, #262626);
    margin-top: 8px;
}

.model-setup-attribution p {
    font-size: 12px;
    color: var(--color-text-tertiary, #737373);
    font-weight: 500;
    letter-spacing: 0.02em;
    margin: 0;
}

.model-setup-attribution:hover p {
    color: var(--color-text-secondary, #a3a3a3);
}

/* Improved Open button for welcome screen */
.open-btn {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ffffff;
    border-radius: 14px;
    padding: 16px 40px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    width: 100%;
}

.open-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 36px rgba(62, 123, 250, 0.5), 0 4px 12px rgba(0, 0, 0, 0.2);
    filter: brightness(1.08);
}

.open-btn:active {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(62, 123, 250, 0.4);
}

.open-btn svg {
    transition: transform 0.3s ease;
}

.open-btn:hover svg {
    transform: scale(1.15) rotate(90deg);
}

/* RTL adjustments */
[dir="rtl"] .model-setup-attribution p {
    font-family: 'Tajawal', sans-serif;
}

[dir="rtl"] .open-btn {
    flex-direction: row-reverse;
}
</style>
