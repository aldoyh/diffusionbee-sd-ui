<template>
    <div class="main_container">

        <div class="l_button button_colored button_medium" style="float:right;" @click="import_model_locally">{{ app.app_state.isArabic ? 'استيراد من الكمبيوتر' : 'Import From Computer' }}</div>
        <br><br>
        <hr>

        <h2 v-if="downloaded_models_list.length > 0 || is_local_model_importing">{{ app.app_state.isArabic ? 'نماذجي' : 'My Models' }}</h2>
        <div v-if="downloaded_models_list.length > 0 || is_local_model_importing" class="icon_container">

            <div v-if="is_local_model_importing"  class="model_card" style="padding:20px">
                <h2>{{ app.app_state.isArabic ? 'جارٍ استيراد النموذج' : 'Importing model' }}</h2>
                <br>
                 <MoonLoader class="moonloader" color="#000000" size="50px" style="zoom:0.4"></MoonLoader>
            </div>

            <div v-for="model in downloaded_models_list" :key="model.id" class="model_card" v-bind:style="{ 'background-image': 'url(' + (model.img_url || default_img_url )+ ')' }" @click="previewModelImage(model, $event)">
                 <div class="card_desc"> 
                    <h2> {{model.title || model.id}} </h2> 
                    <p> {{model.description}} </p> 
                    <p style="zoom:0.7"> {{ model_metadata_to_str(model) }}</p>
                    <p v-if="!isRunnableModel(model)" class="model-not-runnable-msg">{{ modelNotRunnableMessage() }}</p>
                    <DownloadButton :app=app  :asset_details="model"> </DownloadButton>
                </div> 
            </div>

        </div>

        <br>


        <h2>{{ app.app_state.isArabic ? 'النماذج المتاحة' : 'Available Models' }}</h2>
        <div class="icon_container">

            <div v-for="model in not_downloaded_models_list" :key="model.id" class="model_card" v-bind:style="{ 'background-image': 'url(' + (model.img_url || default_img_url) + ')' }" @click="previewModelImage(model, $event)">
                 <div class="card_desc"> 
                    <h2> {{model.title || model.id}} </h2> 
                    <p> {{model.description}} </p> 
                    <p style="zoom:0.7"> {{ model_metadata_to_str(model) }}</p>
                    <p v-if="!isRunnableModel(model)" class="model-not-runnable-msg">{{ modelNotRunnableMessage() }}</p>
                    <DownloadButton v-if="canDownloadModel(model)" :app=app  :asset_details="model"> </DownloadButton>
                    <p v-if="!canDownloadModel(model)" class="model-unavailable-msg">{{ modelDownloadBlockMessage(model) }}</p>
                </div> 
            </div>

        </div>

        <br> <hr> 
        <div @click="load_models_list_from_web" class="l_button">{{ app.app_state.isArabic ? 'تحديث' : 'Refresh' }}</div>

        

    </div>
</template>
<script>

import Vue from 'vue'

import { open_popup } from '../utils.js'
import DownloadButton from "../components/DownloadButton.vue"
import MoonLoader from 'vue-spinner/src/MoonLoader.vue'
const { isModelDownloadAllowed, getModelDownloadBlockMessage } = require("../utils/app_version.js")
const { mergeFlux2IntoCatalog, isGeneratableModelType } = require("../utils/flux2_catalog.js")
const { getHfTokenSync } = require("../utils/hf_auth.js")

const ModelStore ={
    name: 'ModelStore',
    props: {app:Object, },
    components: {DownloadButton, MoonLoader},
    mounted() {
        this.load_models_list_local_storage()
        this.load_models_list_from_web()
    },
    data() {
        return {
            is_local_model_importing : false, 
            default_img_url : require("../assets/imgs/page_icon_imgs/default.png"),
            models_list : [], 
        };
    },
    computed: {
        downloaded_models_list(){
            if(!this.app.is_mounted)
                return []

            let ret = []
            for(let k in this.app.assets_manager.all_avail_assets){
                ret.unshift(this.app.assets_manager.all_avail_assets[k])
            }
            return ret;
        } , 
        not_downloaded_models_list(){
            let that = this
            return this.models_list.filter(model  => !(that.app.is_mounted && that.app.assets_manager.downloaded_assets[model.id]))
        }
    },
    methods: {
        canDownloadModel(model) {
            return isModelDownloadAllowed(model);
        },
        // The active backend can't run every catalog model (FLUX.1/FLUX.2 need
        // a FLUX engine this build doesn't ship). Show those as download-only
        // rather than pretending they're generatable — the "🔵" pattern.
        isRunnableModel(model) {
            return Boolean(model && model.model_meta_data && isGeneratableModelType(model.model_meta_data.type));
        },
        modelNotRunnableMessage() {
            return this.app.app_state.isArabic
                ? '🔵 للتحميل فقط — لا يعمل في هذا الإصدار (يتطلب محرك توليد غير متوفر بعد).'
                : '🔵 Download only — not runnable on this build (needs a generation engine not shipped yet).';
        },
        previewModelImage(model, event) {
            // Don't hijack clicks on the description/download overlay.
            if (event && event.target && event.target.closest && event.target.closest('.card_desc')) return;
            const url = model.img_url || this.default_img_url;
            if (!url) return;
            open_popup(url, model.title || model.id);
        },
        modelDownloadBlockMessage(model) {
            return getModelDownloadBlockMessage(model, this.app.app_state.isArabic);
        },
        load_models_list_from_web(){
            let that = this;

            let user_id = window.ipcRenderer && typeof window.ipcRenderer.sendSync === 'function'
                ? window.ipcRenderer.sendSync('get_instance_id' , '')
                : 'local';
            let models_url = "https://models.diffusionbee.com/list_models?user_id="+user_id;
            
            fetch(models_url, {cache: "no-store"})
                .then(response => response.json())
                .then(data => mergeFlux2IntoCatalog(data || [], getHfTokenSync()))
                .then(data =>  that.models_list = (Array.isArray(data) ? data : (that.models_list || [])) )
                .then(() => console.log(that.models_list))
                .then(() =>  that.save_models_list_local_storage() )
                .catch((err) => console.warn('Failed to load models from web:', err))

            
        } ,     

        load_models_list_local_storage(){
            let models = window.localStorage.getItem("models_store")
            if(models){
                models = JSON.parse(models)
            }
            // Guard: JSON.parse can yield null/undefined when the key is absent
            // or empty. `not_downloaded_models_list` filters `models_list`, so it
            // must stay an array or the page crashes with
            // "Cannot read properties of null (reading 'filter')".
            Vue.set(this , 'models_list' , Array.isArray(models) ? models : [])
        } , 

        save_models_list_local_storage(){
             window.localStorage.setItem('models_store' , JSON.stringify(this.models_list));
        } , 

        model_metadata_to_str(asset_details){
            if(!asset_details.model_meta_data)
                return ""

            let r = ""

            if(asset_details.model_meta_data.sd_type)
                r += " " + asset_details.model_meta_data.sd_type

            if(asset_details.model_meta_data.float_type)
                r += " " + asset_details.model_meta_data.float_type
            
            return r
        },

        import_model_locally(){

            if(this.is_local_model_importing)
            {
                this.app.show_toast(this.app.app_state.isArabic ? "النموذج قيد الاستيراد بالفعل. يرجى الانتظار" : "Model is already importing. Please wait")
                return;
            }

            let that = this;
            //TODO maybe ask for stuff like v-prediction , ckip_slip, image_size, trigger word,  before importing
            let pytorch_model_path = window.ipcRenderer.sendSync('file_dialog',  "weights_file" );
            if(!pytorch_model_path)
                return;

            if(pytorch_model_path == "NULL")
                return;

            let model_name = pytorch_model_path.replaceAll("\\" , "/").split("/");
            model_name = model_name[model_name.length - 1].split(".")[0]


            if(model_name.trim() == ""){
                this.app.show_toast(this.app.app_state.isArabic ? "أدخل اسم نموذج غير فارغ" : "Put non empty model name");
                return;
            }

            if(this.app.assets_manager.all_avail_assets[model_name]){
                this.app.show_toast(this.app.app_state.isArabic ? "يوجد نموذج بهذا الاسم بالفعل" : "A model with this name already exists");
                return;
            }

            let asset_details = {
                id : model_name ,
                filename: model_name , 
                asset_path_raw: pytorch_model_path, 
                post_process : "convert_sd_to_tdict", 
                is_locally_imported : true, 
                model_meta_data : {"type" : "sd_model" }
            }

            this.is_local_model_importing = true;

            this.app.assets_manager.add_local_asset(asset_details , function(result, err ){
                if(result == "success" ){
                    that.is_local_model_importing = false;
                } else {
                    that.is_local_model_importing = false;
                    that.app.show_toast((that.app.app_state.isArabic ? "خطأ أثناء الاستيراد " : "Error while importing ") + err )
                }

            })
        }
    },
}

export default ModelStore;
ModelStore.title = "Models"
ModelStore.icon = "cubes"
ModelStore.description = "Download, imoport and manage models"
ModelStore.img_icon = require("../assets/imgs/page_icon_imgs/models.png")
ModelStore.home_category = "pages"
ModelStore.sidebar_show = "always"
// add this to the always_on_pages to the PagesRouter

</script>
<style>
</style>
<style scoped>

.main_container{
    padding: 20px;
    width: 100%;
    height: 100%;
    overflow: auto;
}

.icon_container{
    display: flex;
   flex-wrap: wrap;
}

.model_card{
    width:230px;
    height: 170px;
    margin: 5px;
    background-size: contain;
    background-color: var(--sidebar-color);
    position: relative;
    cursor: pointer;
}


@media only screen and (max-width: 1730px) {
  .model_card {
    width : calc(20% - 10px)
  }
}



@media only screen and (max-width: 1430px) {
  .model_card {
    width : calc(25% - 10px)
  }
}


@media only screen and (max-width: 1200px) {
  .model_card {
    width : calc(33% - 10px)
  }
}



.card_desc{
    background-color: var(--sidebar-color); ;
    padding: 5px;
    position: absolute;
    bottom: 0;
    width: 100%;
}

.card_desc > p{
    margin-bottom: 3px;
}

.model-unavailable-msg {
    color: rgba(255, 180, 120, 0.95);
    font-size: 0.78rem;
    margin-top: 4px;
}

.model-not-runnable-msg {
    color: rgba(140, 170, 255, 0.95);
    font-size: 0.74rem;
    line-height: 1.3;
    margin-top: 4px;
}



</style>