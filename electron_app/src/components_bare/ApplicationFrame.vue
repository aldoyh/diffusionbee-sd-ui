<template>
    <div class="main_frame">


        <div class="sidebar" v-show="is_sidebar_open">
           <div class="sidebar_drag"> 
                 <button
                    type="button"
                    class="sidebar-toggle-btn sidebar-toggle-btn--in-sidebar"
                    @click="toggle_sidebar"
                    :title="sidebarToggleTitle"
                    :aria-label="sidebarToggleTitle"
                 >
                    <transition name="icon-fade" mode="out-in">
                        <svg :key="sidebarToggleIcon" class="sidebar-toggle-icon" width="100%" height="100%" v-html="icon_library[sidebarToggleIcon]"></svg>
                    </transition>
                 </button>

           </div>

           <p class="sidebar_cat"> Tools </p>

           <div v-for="sidebar_item in sidebar_items" :key="sidebar_item.id" class="sidebar_item "  :class="{ sidebar_item_selected : sidebar_item.id ===  selected_sidebar_item_id }" @click="sidebar_item_on_click(sidebar_item.id)"> 

              <svg v-if="icon_library[sidebar_item.icon]" class="sidebar_icon" width="15px" height="15px"  style="height: 15px; width: 15px; margin-top:-3px; margin-right:3px;"  v-html="icon_library[sidebar_item.icon]"> </svg>

              <font-awesome-icon v-else class="sidebar_icon" :icon="sidebar_item.icon" />

                 {{sidebar_item.text}}
             </div>

       
        </div>

        <div class="title_bar">
            <div class="app_title_sidebar_collapsed" v-if="(!is_sidebar_open)"  v-bind:class="{'app_title_sidebar_collapsed_mac':is_mac}"> 
                 <button
                    type="button"
                    class="sidebar-toggle-btn"
                    @click="toggle_sidebar"
                    :title="sidebarToggleTitle"
                    :aria-label="sidebarToggleTitle"
                 >
                    <transition name="icon-fade" mode="out-in">
                        <svg :key="sidebarToggleIcon" class="sidebar-toggle-icon" width="100%" height="100%" v-html="icon_library[sidebarToggleIcon]"></svg>
                    </transition>
                 </button>

                 <button type="button" class="title_bar_icon-btn" @click="on_home_click" :title="'Home'" aria-label="Home">
                   <font-awesome-icon icon="home" style="zoom:1.15; margin-bottom: -2px;" />
                 </button>

            </div>
            <div class="app_title" >
                <span @click="$emit('on_title_click',{})"> {{title}} </span>
            </div>
             <div class="title_bar_icons">
                <!-- <font-awesome-icon  class="title_bar_icon" icon="file-image" />  -->

                <slot name="main_toolbar"></slot>
            </div>

        </div>
        
        <div class="tab_content_frame">
            <div class="tab_content">
                <slot name="main_content"></slot>
            </div>

            


        </div>
    </div>
</template>
<script>

import { icon_library } from "./icon_library.js"

export default {
    name: 'ApplicationFrame',
    components: {},
    props: {
        title: String,
        sidebar_items: Array,
        selected_sidebar_item_id: String,
        sidebar_item_on_click: Function, 
        on_home_click : Function

    },

    data: function() {
        return {
            icon_library : icon_library , 

            selected_tab: 'txt2img' ,
            is_fullscreen: false ,
            is_sidebar_open: false,
            sidebar_peek_completed: false, // tracks whether the initial peek has run
        }
    },

    watch: {
        'is_sidebar_open': {

            handler: function(is_open) {
                this.sync_sidebar_width(is_open)
            },
            immediate: true
        },
    },

    mounted() {
        window.addEventListener('resize', this.detect_fullscreen);
        this.sync_sidebar_width(this.is_sidebar_open)

        // Enable CSS transitions after initial render settles
        // Trigger the sidebar peek animation a moment after the frame appears
        setTimeout(() => {
            this.trigger_sidebar_peek()
        }, 500)
    },
    unmounted() {
        window.removeEventListener('resize', this.detect_fullscreen);
        if (this._sidebar_peek_timeout) {
            clearTimeout(this._sidebar_peek_timeout)
        }
    },

    computed: {
        is_mac(){
            return !(this.detect_windows_os())
        },
        sidebarToggleTitle() {
            return this.is_sidebar_open ? 'Hide sidebar' : 'Show sidebar';
        },
        sidebarToggleIcon() {
            return this.is_sidebar_open ? 'sidebar_collapse' : 'sidebar_expand';
        },
    },

    methods: {
        toggle_sidebar() {
            this.is_sidebar_open = !this.is_sidebar_open;
        },
        sync_sidebar_width(is_open){
            document.querySelector(':root').style.setProperty("--sidebar-width" , is_open ? "200px" : "0px")
        },

        trigger_sidebar_peek(){
            // Only peek if sidebar hasn't been peeked before and is currently collapsed
            if (this.sidebar_peek_completed) return
            if (this.is_sidebar_open) return

            // Expand
            this.is_sidebar_open = true

            // Hold for 3.5 seconds then contract
            this._sidebar_peek_timeout = setTimeout(() => {
                // Guard: only close if still open (user may have manually toggled)
                if (this.is_sidebar_open) {
                    this.is_sidebar_open = false
                }
                this.sidebar_peek_completed = true
            }, 3500)
        },

        selectTab(tab) {
            this.selected_tab = tab;
        },

        detect_windows_os(){
            return window.navigator.platform.toLowerCase().startsWith('win');
        },

        detect_fullscreen(){
            let that = this;
            setTimeout(function(){
                if ( window.innerWidth == screen.width && window.innerHeight == screen.height && (!window.screenTop && !window.screenY) )
                    that.is_fullscreen = true ;
                else
                    that.is_fullscreen = false; 
            } , 100)

            
        }
    },


}
</script>
<style>
@import '../assets/css/theme.css';
:root {
    --main-font: -apple-system, BlinkMacSystemFont, sans-serif;
    --main-font-text: -apple-system, BlinkMacSystemFont, sans-serif;
    /*SF Pro Text;*/

     --sidebar-width: 200px;
     --titlebar-height: 55px;
    
}


html {
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
}

body {
    font-family: var(--main-font);
}


.bl_display{
    display:block !important;
}


.sidebar_icon > path{
    fill:#0A84FF;
}

.sidebar_icon > svg > path{
    fill:#0A84FF;
}

.l_button {
    display: inline-block;
    margin: 0px;
    padding: 3px 10px;
    height: 22px;
    border-radius: 5px;
    font-family: var(--main-font-text);
    font-style: normal;
    font-weight: 600;
    font-size: 13px;
    line-height: 16px;

    text-align: center;
    letter-spacing: -0.08px;

    margin-right: 9px;

    transition: background-color 150ms ease-out 10ms, color 150ms ease-out 10ms;
}

.no_hover_bg:hover{
    background-color: transparent !important;
}


.button_white {
    background-color: white;
    box-shadow: 0px 1px 0px 1px rgba(96, 97, 112, 0.1);
}

.button_white:hover {
    background-color: #E0E0E0;
}

.rounded_button {
    border-radius: 23.3711px;
}

.button_colored {
    background: #3E7BFA;
    color: #FFFFFF;
}

.button_grey {
    background: rgba(0, 0, 0, 0.25);
    color: #FFFFFF;
}

.button_grey:hover {
    background: rgba(0, 0, 0, 0.4);
}

.button_colored:hover {
    background: #3d6ffa;
}

.button_medium {
    height: 30px;
    padding-top: 7px;
    padding-left: 15px;
    padding-right: 15px;
}

.button_color_fancy {

    background: #3E7BFA;
    color: #FFFFFF;
    height: 30px;
    box-shadow: 0px 4px 4px #CCDDFF;
}

.button_color_fancy:hover {

    background: #3E7BFA;
    color: #FFFFFF;
    box-shadow: 1px 1px 4px #CCDDFF;
    ;
}


p {
    font-family: var(--main-font);
    font-style: normal;
    font-weight: 274;
    font-size: 13px;
    line-height: 16px;
    align-items: center;
    letter-spacing: -0.08px;
}

.p_light{
    color: rgba(0, 0, 0, 0.5);
}

h1 {
    font-family: var(--main-font);
    font-style: normal;
    font-weight: 334;
    font-size: 30px;
    line-height: 38px;
    /* identical to box height, or 53% */

    display: flex;
    align-items: center;
    letter-spacing: -0.08px;
}

h2 {

    font-family: var(--main-font-text);
    font-style: normal;
    font-weight: 600;
    font-size: 15px;
    line-height: 16px;
    letter-spacing: -0.08px;
}

h3 {
    font-family: var(--main-font);
    font-style: normal;
    font-weight: 274;
    font-size: 15px;
    line-height: 22px;
    /* or 107% */

    display: flex;
    align-items: center;
    letter-spacing: -0.08px;

}


h4{
    font-family: var(--main-font-text);
    font-style: normal;
    font-weight: 600;
    font-size: 13px;
    line-height: 16px;
}

img {
    user-drag: none;
    -webkit-user-drag: none;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
}



/*overriding some styles of bootstrap dropdown*/
.dropdown-item {
    font-size: 13px;
}

.dropdown-menu {
    box-shadow: 0px 5px 10px rgba(0, 0, 0, 0.16);
    border-radius: 5px;
    border: 0.5px solid rgba(0, 0, 0, 0.1);
    /*background: #F4F5F5;*/
}

.opaciy_half{
    opacity: 0.5;
}

/*overriding the bootstraps dropdown highlighting*/
.btn-check:focus, .btn:focus {
    box-shadow: none !important;
}


.content_toolbox{
    margin-bottom: 23px; 
    display: inline-block;
    height: 22px; 
    width: 100%;
}


.bottom_float{
    position: fixed ;
    bottom: 1px;
}


.title_bar_icon{
    color : var(--title-icon_color);
    padding : 8px 6px;

    margin-right: 1px;
    margin-left: 1px;
    
    height: calc(100% - 24px);
    min-width: 32px;
    border-radius: 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;

/*    background: rgba(0, 0, 0, 0.05);*/
    -webkit-app-region: none;
    
}

.title_bar_icon svg{
    fill : var(--title-icon_color);
}

.title_bar_icon:hover{
    background-color: var(--button-highlight-one);
}



::-webkit-scrollbar {
    appearance: none;
    width: 7px;
    padding-right: 7px;
}
::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: var(--border-color-invert);
}



</style>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>


.title_bar {
    height: var(--titlebar-height);
    width: calc( 100vw - var(--sidebar-width) );
    /*background: red;*/
    margin-left : var(--sidebar-width);
    -webkit-user-select: none;
    -webkit-app-region: drag;
    border-width: 0px;
    border-bottom-width: 1px;
    border-style: solid;
    border-color: var( --thin-border-color);

    transition: margin-left 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.title_bar_icons{
    float: right;
    margin-right: 20px; 
    height: var(--titlebar-height);
    margin-top: 16px;
}





.sidebar_drag{
    -webkit-user-select: none;
    -webkit-app-region: drag;
    height: var(--titlebar-height);
}

.app_title_sidebar_collapsed{
    float:left;
    height: var(--titlebar-height);
    margin-top: 16px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding-left: 8px;
}

.sidebar-toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    color: var(--title-icon_color, rgba(255, 255, 255, 0.85));
    cursor: pointer;
    -webkit-app-region: no-drag;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
}

.sidebar-toggle-btn:hover {
    background: rgba(62, 123, 250, 0.14);
    border-color: rgba(62, 123, 250, 0.35);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
}

.sidebar-toggle-btn:active {
    transform: translateY(0);
}

.sidebar-toggle-btn--in-sidebar {
    float: right;
    margin-top: 11px;
    margin-right: 10px;
}

.sidebar-toggle-icon {
    width: 17px;
    height: 17px;
    display: block;
    opacity: 0.92;
}

.icon-fade-enter-active,
.icon-fade-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
}

.icon-fade-enter,
.icon-fade-leave-to {
    opacity: 0;
    transform: scale(0.75) rotate(-8deg);
}

.title_bar_icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--title-icon_color, rgba(255, 255, 255, 0.85));
    cursor: pointer;
    -webkit-app-region: no-drag;
    transition: background 0.2s ease;
}

.title_bar_icon-btn:hover {
    background: var(--button-highlight-one);
}

.app_title_sidebar_collapsed_mac{
    margin-left: 72px;
}

.app_title {
    float: left;
    padding-left: 22px;
    padding-top: 20px;

    font-family: var(--main-font-text);
    font-style: normal;
    font-weight: 600;
    font-size: 15px;
    line-height: 16px;

    letter-spacing: -0.08px;

    color: #000000;
}






.sidebar{
    position: fixed;
    top:0 ;
    left: 0 ;
    bottom: 0 ;
    background-color: var(--sidebar-color);
 
    width: var(--sidebar-width) ;

    transition: width 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.sidebar_cat{
   
    color: rgba(0, 0, 0, 0.27);
    font-family: var(--main-font-text);
    font-style: normal;
    font-weight: 600;
    font-size: 12px;
    line-height: 13px;
    /* identical to box height, or 130% */

    letter-spacing: 0.12px;
    margin-left: 15px ;
    margin-top: 15px ;
    margin-bottom: 7px;
}


.sidebar_item{

    font-family: var(--main-font-text);
    font-style: normal;
    font-weight: 400;
    font-size: 14px;
    line-height: 14px;
    /* identical to box height, or 127% */

    letter-spacing: 0.06px;

    /* Dark/Text */

    color: var(--text-color-solid);;
    margin-left: 15px ;
    margin-right: 15px ;
    margin-bottom: 4px ;

    padding-right: 15px;
    padding-left: 15px;
    padding-bottom: 7px;
    padding-top: 7px;

    border-radius: 5px;

    
}

.sidebar_icon{
    margin-right: 5px;
    color: #0A84FF;
}

.sidebar_item_selected{
     background: rgba(0, 0, 0, 0.1);
}

.sidebar_item:hover{
    background-color: var(--button-highlight-one);
}


.tab_content_frame{
    position: absolute;
    margin-left: var(--sidebar-width);
    height: calc( 100vh - var(--titlebar-height) );
    width: calc(100% - var(--sidebar-width) );

    transition: margin-left 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.tab_content{
    height:100%; 
    width:100%; 
}

@media (prefers-color-scheme: dark) {
    .sidebar_item_selected{
        background: rgba(255, 255, 255, 0.1);
    }

    .sidebar_cat{
         color: rgba(255, 255, 255, 0.40);
    }
}




/*DROPDOWN buggle */

.dropdown-bubble {
  margin-top: 10em;
}

.dropdown-bubble:before,
.dropdown-bubble:after{
  content: ' ';
  display: block;
  border-style: solid;
  border-width: 0 7px 7px 7px;
  border-color: transparent;
  position: absolute;
  left: 193px;
}

.dropdown-bubble:before {
  top: -2px;
  border-bottom-color: rgba(255,255,255,0.5);
}

.dropdown-bubble:after {
  top: -2px;
    border-bottom-color: rgb(34, 34, 34) ;
}





</style>
