<template>
    <div> 
        
        <MoonLoader v-if="is_sd_busy" class="moonloader1" color="var(--title-icon_color)" size="20px" style="position:fixed; margin-left:18px; margin-top:5px; z-index:20 ; pointer-events: none;"></MoonLoader>

        
        <b-dropdown right variant="link" offset="40"  size="sm" toggle-class="text-decoration-none" no-caret style="margin-right: -11px ;">
            <template #button-content>
               <span class="title_bar_icon" > 
                   <!--  <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg" style=" margin-top:-2px ">
                      <path :d="icon_library['share']" />
                    </svg> -->

                    
                    <font-awesome-icon   icon="inbox" style="zoom:1.15;" :style="{'opacity' :!(is_sd_busy)+0 }"/>
                    
                 </span>
            </template>
            
             <b-dropdown-form style=" width: 250px;max-height: calc(100vh - 300px); overflow-y: scroll;  " class="dropdown-bubble">
                <div v-if="app.is_mounted && !(app.stable_diffusion.is_input_avail)">
                    <h2>{{ app.app_state.isArabic ? 'الحالة : جارٍ توليد الصور' : 'Status : Generating Images' }}</h2>
                    <p  > {{ app.app_state.isArabic ? 'سرعة التوليد :' : 'Generation speed :' }} {{app.stable_diffusion.generation_state_msg || "--"}}</p>
                    <p  > {{ app.app_state.isArabic ? 'الوقت المتبقي للصورة الحالية :' : 'Current image ETA :' }} {{app.stable_diffusion.remaining_times || "--"}}</p>
                </div>
                <h2 v-else >{{ app.app_state.isArabic ? 'الحالة : خامل' : 'Status : Idle' }}</h2>
                <p>{{ app.app_state.isArabic ? 'الصور المتبقية :' : 'Images remaining :' }} {{n_jobs_left}} </p> 
                <div @click="stop_all" v-if="(!is_stopping) &&( n_jobs_left > 0 || (app.is_mounted && !(app.stable_diffusion.is_input_avail)))" class="l_button button_small button_colored">{{ app.app_state.isArabic ? 'إيقاف الكل' : 'Stop All' }}</div>
                 <div v-if="is_stopping && (n_jobs_left > 0 || (app.is_mounted && !(app.stable_diffusion.is_input_avail)))" class="l_button button_small button_colored">{{ app.app_state.isArabic ? 'جارٍ الإيقاف' : 'Stopping' }}</div>
             </b-dropdown-form>
            
        </b-dropdown>

       

     <!--    <span class="title_bar_icon"> 
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path :d="icon_library['share']"  />
            </svg>
        </span>

         <span class="title_bar_icon"> 
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path :d="icon_library['share']" />
            </svg>
         </span> -->

         <b-dropdown right variant="link" size="sm" toggle-class="text-decoration-none" no-caret>
                <template #button-content>
                   <span class="title_bar_icon" > 
                        <font-awesome-icon   icon="ellipsis-v" style="zoom:1.15"/>
                     </span>
                </template>
                
                <b-dropdown-item-button @click="show_help" >{{ app.app_state.isArabic ? 'مساعدة' : 'Help' }}</b-dropdown-item-button>
                <b-dropdown-item-button @click="open_url('https://discord.gg/t6rC5RaJQn')"  >{{ app.app_state.isArabic ? 'بدء محادثة Discord' : 'Start Discord Chat' }}</b-dropdown-item-button>
                <b-dropdown-item-button  @click="app.functions.switch_page('Logs')" >{{ app.app_state.isArabic ? 'عرض السجلات' : 'Show Logs' }}</b-dropdown-item-button>

                <b-dropdown-item-button @click="open_url('https://diffusionbee.com/MODEL_LICENSE.txt')" >{{ app.app_state.isArabic ? 'رخصة النموذج' : 'Model License' }}</b-dropdown-item-button>
                <b-dropdown-item-button @click="open_url('https://diffusionbee.com/OPEN_SOURCE_LICENSES.txt')" >{{ app.app_state.isArabic ? 'تراخيص المصادر المفتوحة' : 'Open-source Licences' }}</b-dropdown-item-button>

                <b-dropdown-item-button @click="show_about"  >{{ app.app_state.isArabic ? 'حول' : 'About' }}</b-dropdown-item-button>
                <b-dropdown-item-button  @click="app.functions.switch_page('ContactUs')" >{{ app.app_state.isArabic ? 'اتصل بنا' : 'Contact Us' }}</b-dropdown-item-button>
                <b-dropdown-item-button  @click="app.functions.switch_page('ContactUs')" >{{ app.app_state.isArabic ? 'الإبلاغ عن مشكلات' : 'Report Issues' }}</b-dropdown-item-button>


                <b-dropdown-item-button   @click="app.functions.switch_page('Settings')"  >{{ app.app_state.isArabic ? 'الإعدادات' : 'Settings' }}</b-dropdown-item-button>

                <b-dropdown-item-button @click="close_window"  >{{ app.app_state.isArabic ? 'إغلاق' : 'Close' }}</b-dropdown-item-button>
                <!-- #TODO set these menu items via python -->
                
         </b-dropdown>
    </div>
</template>
<script>

import { icon_library } from "../components_bare/icon_library.js"
import MoonLoader from 'vue-spinner/src/MoonLoader.vue'


export default {
    name: 'MainToolbar',
    props: { app:Object , asset_details:Object },
    components: {MoonLoader},
    mounted() {

    },
    data() {
        return {
            icon_library:icon_library
        };
    },
    methods: {
        stop_all(){
            this.app.stable_diffusion_manager.stop_all() 
        },

        show_about(){
            window.ipcRenderer.sendSync('show_about', '');
        },
        show_help(){
            window.ipcRenderer.sendSync('open_url', "https://diffusionbee.com");
        } ,

        open_url(url){
            window.ipcRenderer.sendSync('open_url', url);
        } ,

        close_window(){
            window.ipcRenderer.sendSync('close_window', '');
        }

    },

    computed: {

        is_sd_busy(){
            return this.app.is_mounted && !(this.app.stable_diffusion.is_input_avail)
        },

        n_jobs_left(){

            if(!this.app.is_mounted)
                return 0
            let n = 0
            if(this.app.stable_diffusion_manager.queue.current_group){
                for(let job of this.app.stable_diffusion_manager.queue.current_group.jobs)
                    if(job.job_state != 'done')
                        n += 1
            }

            if(this.app.stable_diffusion_manager.queue.groups_todo){
                for(let group of this.app.stable_diffusion_manager.queue.groups_todo)
                    n += group.jobs.length
            }

            return n;
        },

        is_stopping(){
            if(this.app.stable_diffusion_manager   )
                return this.app.stable_diffusion_manager.is_stopping
            return false
        }
    } 
}
</script>
<style>
</style>
<style scoped>
    .title_bar_icon{
        max-height: 50px;
    }
</style>