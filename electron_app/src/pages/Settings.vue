<template>
    <div style="width:100%; height:100%; overflow: auto; padding: 20px;">
        
     <h1>{{ app.app_state.isArabic ? 'الإعدادات' : 'Settings' }}</h1>
        <br>
       <h2>{{ app.app_state.isArabic ? 'الإعدادات العامة' : 'General Settings' }}</h2>
        <br>
        <div class="setting_box">
        <div class="settings_left">
        <h3>{{ app.app_state.isArabic ? 'صوت الإشعار' : 'Notification sound' }}</h3>
        <p>{{ app.app_state.isArabic ? 'تشغيل صوت إشعار عند اكتمال توليد الصورة' : 'To play a notification sound when generation of an image is completed' }}</p>
        </div>
        
        <div style="float:right;margin-right: 9px;align-self: center;" >
            <label class="switch">
                <input type="checkbox" v-model="app.app_state.app_data.settings.notification_sound" checked>
                <span class="toggle round"></span>
            </label>
        </div>
        </div>
        <hr>

        <h2>{{ app.app_state.isArabic ? 'خدمات التحميل' : 'Upload Services' }}</h2>
        <br>
        <div class="setting_box">
        <div class="settings_left">
        <h3>imgbb.com {{ app.app_state.isArabic ? 'مفتاح API' : 'API Key' }}</h3>
        <p>{{ app.app_state.isArabic ? 'مفتاح API لرفع الصور إلى imgbb.com. احصل على المفتاح من' : 'API key for uploading images to imgbb.com. Get your key at' }}
            <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" style="color: #3E7BFA;">https://api.imgbb.com/</a>
        </p>
        </div>

        <div style="float:right;margin-right: 9px;align-self: center; min-width: 200px;">
            <div class="settings-input-row">
                <input
                    :type="showImgbbKey ? 'text' : 'password'"
                    v-model="imgbbApiKey"
                    :placeholder="app.app_state.isArabic ? 'أدخل مفتاح API' : 'Enter your API key'"
                    class="settings-text-input"
                    autocomplete="off"
                    spellcheck="false"
                />
                <button
                    type="button"
                    class="settings-eye-btn"
                    @click="showImgbbKey = !showImgbbKey"
                    :title="showImgbbKey ? (app.app_state.isArabic ? 'إخفاء' : 'Hide') : (app.app_state.isArabic ? 'إظهار' : 'Show')"
                    tabindex="-1"
                >
                    <svg v-if="showImgbbKey" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
            </div>
        </div>
        </div>
        <hr>


    </div>
</template>
<script>
const Settings ={
    name: 'Settings',
    props: {app:Object, },
    components: {},
    mounted() {

    },
    data() {
        return {
            showImgbbKey: false,
        };
    },
    methods: {

    },
    computed: {
        imgbbApiKey: {
            get() {
                if (this.app && this.app.app_state && this.app.app_state.app_data && this.app.app_state.app_data.settings) {
                    return this.app.app_state.app_data.settings.imgbb_api_key || '';
                }
                return '';
            },
            set(val) {
                if (this.app && this.app.app_state && this.app.app_state.app_data && this.app.app_state.app_data.settings) {
                    this.app.app_state.app_data.settings.imgbb_api_key = val;
                }
            }
        }
    }
}

export default Settings;
Settings.title = "Settings"
Settings.icon = "tools"
Settings.img_icon = require("../assets/imgs/page_icon_imgs/settings.png")
Settings.home_category = "pages"
Settings.hide_in_sidebar = true

// add this to the always_on_pages to the PagesRouter

</script>
<style>
</style>
<style scoped>

.setting_box{
    display: flex;
    flex-direction: row;
}

.settings_left{
    flex: 1 1 auto;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 30px;
}

.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.toggle:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 23px;
  left: 5px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .toggle {
  background-color: #3E7BFA;
}


input:checked + .toggle:before {
  transform: translateX(27px);
}

.toggle.round {
  border-radius: 34px;
}

.toggle.round:before {
  border-radius: 50%;
}

.settings-text-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--thin-border-color);
  background: var(--options-input-bg);
  color: var(--text-color-solid);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.settings-text-input:focus {
  border-color: #3E7BFA;
}

.settings-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.settings-input-row .settings-text-input {
  flex: 1;
  min-width: 0;
}

.settings-eye-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 1px solid var(--thin-border-color);
  border-radius: 10px;
  background: var(--options-input-bg);
  color: var(--text-color-solid);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.settings-eye-btn:hover {
  border-color: #3E7BFA;
  background: rgba(62, 123, 250, 0.08);
}

/* Responsive: stack on narrow screens */
@media (max-width: 600px) {
    .setting_box {
        flex-direction: column;
        gap: 12px;
    }

    .setting_box > div:last-child {
        float: none !important;
        width: 100%;
        min-width: unset;
    }
}


</style>
