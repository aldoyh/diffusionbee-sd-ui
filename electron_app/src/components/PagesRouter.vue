<template>
    
    <div style=" width: 100%; height: 100%;">
        
        <!-- always open pages -->
        <div v-for="page_id in Object.keys(always_on_pages)"  :key="page_id" style="display:none" class="tpage"   :class="{ bl_display : current_open_page_id ===  page_id }">
             <component  :app="app" :is="page_id" :ref="page_id"></component>
        </div>

        <!-- applets -->
        <div v-for="applet_id in Object.keys(app.app_state.registered_ext_applets)"  :key="applet_id" style="display:none" class="tpage"   :class="{ bl_display : current_open_page_id ===  applet_id }">
             <AppletPage 
                :app="app" 
                :applet_id="applet_id" 
                :ref="applet_id" 
                :input_form="app.app_state.registered_ext_applets[applet_id].inputs" 
                :output_form="app.app_state.registered_ext_applets[applet_id].outputs" 
                :is_stop_avail="app.app_state.registered_ext_applets[applet_id].is_stop_avail"
            > </AppletPage>
        </div>


    </div>

</template>
<script>

import { pageMeta } from "../pages/pageMeta.js"
import AppletPage from "../components/AppletPage.vue"
import { t } from "../i18n.js"

import Vue from 'vue'

// Eagerly loaded so welcome assets and history persistence are ready on first paint.
import Homepage from "../pages/Homepage.vue"
import History from "../pages/History.vue"

// Async components for code-splitting — other pages lazy-load on first visit
const Txt2Img = () => import("../pages/Txt2Img.vue")
const Img2Img = () => import("../pages/Img2Img.vue")
const Inpainting = () => import("../pages/Inpainting.vue")
const Training = () => import("../pages/Training.vue")
const ModelStore = () => import("../pages/ModelStore.vue")
const Logs = () => import("../pages/Logs.vue")
const ContactUs = () => import("../pages/ContactUs.vue")
const Settings = () => import("../pages/Settings.vue")
const PostProcessImage = () => import("../pages/PostProcessImage.vue")

export default {
    name: 'PagerRouter',
    props: {
        app:Object, 
    },
    components: {
        Homepage, Txt2Img, Img2Img, Inpainting, AppletPage, History, ModelStore, 
        Logs, ContactUs, Settings, PostProcessImage, Training
    },
    mounted() {
        this.app.functions.switch_page = this.switch_page; 
        this.app.all_pages_ready = true;
    },
    data() {
        let last_opened_timmings = {}

        let v =  window.localStorage.getItem( 'last_opened_times_7768' )
        if(v){
            last_opened_timmings = JSON.parse(v)
        }

        return {
            current_open_page_id : 'Homepage',
            last_opened_timmings : last_opened_timmings,
            always_on_pages : pageMeta         };
    },
    methods: {
         switch_page(page_id){
            this.current_open_page_id = page_id;
            this.app.current_selected_tab = page_id
            this.app.current_applet_title = this.current_applet_title()

            Vue.set(this.last_opened_timmings , page_id , Date.now()  )

            window.localStorage.setItem('last_opened_times_7768', JSON.stringify(this.last_opened_timmings));

        }, 

        current_applet_title(){
            for( let el of this.all_applet_items){
                if( el.id == this.current_open_page_id ){
                    return el.text;
                }
            }
            return ""
        },
    },
    computed: {

        all_applet_items(){
            let items = []
            for(let page_id of Object.keys(this.always_on_pages) ){
                const meta = this.always_on_pages[page_id]
                items.push( { id: page_id , 
                    text : (page_id === 'Homepage') ? t('page.home') : t('page.' + page_id.toLowerCase()) || meta.title, 
                    description: t('page.' + page_id.toLowerCase() + '_desc') || meta.description, 
                    icon : meta.icon, 
                    img_icon: meta.img_icon, 
                    sidebar_show: meta.sidebar_show,  
                    home_category: meta.home_category } )
            }

            // todo : in future count the last used N applets, and then show them on sidebar, and sort them alphabetically
            for(let applet_id of Object.keys(this.app.app_state.registered_ext_applets)){
                let applet = this.app.app_state.registered_ext_applets[applet_id]
                items.push( { id: applet.id  , 
                    text : applet.title , 
                    icon : applet.icon , 
                    description : applet.description , 
                    home_category: applet.home_category,
                    sidebar_show: applet.sidebar_show,
                    img_icon:( applet.img_icon ? require(("../assets/imgs/page_icon_imgs/").concat(applet.img_icon) ) : undefined )
                } )
            }

            return items
        },

        all_sidebar_items(){
            let always_on_items =  this.all_applet_items.filter(x => x.sidebar_show == "always");

            let always_on_items_dict = {}
            for(let a of always_on_items)
                always_on_items_dict[a.id] = a 

            let never_on_items =  this.all_applet_items.filter(x => x.sidebar_show == "never");

            let never_on_items_dict = {}
            for(let a of never_on_items)
                never_on_items_dict[a.id] = a 

            let llist = []
            for(let k in this.last_opened_timmings){
                if(always_on_items_dict[k] == undefined && never_on_items_dict[k] == undefined)
                    llist.push([k , this.last_opened_timmings[k] ])
            }
            

            llist = llist.sort((a, b) => b[1] - a[1]) // sort from large time to small time
            llist = llist.slice(0,5)
            llist = llist.map( x => x[0])            

            let last_5_opened_items =  this.all_applet_items.filter(x => llist.includes(x.id) );

            return always_on_items.concat(last_5_opened_items);

        }
    }
}
</script>
<style>
</style>
<style scoped>

.tpage{
    width: 100%;
    height: 100%;
}

.bl_display{
    display:block !important;
}
</style>
