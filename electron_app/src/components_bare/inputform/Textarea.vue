<template>

   <div> 

        <textarea 
            :value="form_values[config.id]" 
            @input="onInput"
            style="border-radius: 5px 5px 5px 5px; width: calc(100%); resize: none; " 
            class="form-control"  
            :placeholder="config.placeholder || '' " 
            :rows="config.is_small? 3 : 7"></textarea>
         <br>
    
  </div> 

</template>
<script>

import FormInputMixin from "./FormInputMixin.vue"
import { icon_library } from "../icon_library.js"
import Vue from 'vue'

export default {
    name: 'TextareaComponent',
    mixins: [FormInputMixin],
    props: {
         config: Object , 
        form_values: Object,
    },
    components: {},
    mounted() {
        if(this.form_values[this.config.id] === undefined && this.config.default_value != undefined ){
            Vue.set( this.form_values  , this.config.id  , this.config.default_value  )
        } 
    },
    data() {
        return {
            icon_library:icon_library,
        };
    },
    methods: {
        onInput(event) {
            const val = event.target.value;
            this.$emit('update:value', val);
            this.on_input_changed();
        }
    },
}
</script>
<style>
</style>
<style scoped>

</style>