<template>
    <div class="model-selector-input">
        <ModelSelector
            :models="models"
            :value="form_values[config.id]"
            :is-arabic="isArabic"
            @input="onModelInput"
        />
    </div>
</template>

<script>
// Schema-driven replacement for the native <select> model picker on the
// applet pages (Txt2Img / Img2Img / Inpainting / Upscaler). Exposes the
// same `config` / `form_values` interface as `Dropdown.vue` so Form.vue /
// ResolveInputComponent can dispatch to it with zero changes, but renders
// the visual ModelSelector (card-style list with type badge + meta) instead
// of a bare b-form-select. BasicSDApplet points the `selected_sd_model`
// form element at this component and attaches the resolved asset objects as
// `config.model_assets`.
import ModelSelector from "../../components/ModelSelector.vue"
import FormInputMixin from "./FormInputMixin.vue"

export default {
    name: 'ModelSelectorInput',
    mixins: [FormInputMixin],
    components: { ModelSelector },
    props: {
        config: Object,
        form_values: Object,
    },
    computed: {
        // Resolved asset objects are attached to the config by BasicSDApplet
        // (el.model_assets) when it fills the options list. Fall back to bare
        // id stubs so the selector still renders in any other context.
        models() {
            const assets = this.config.model_assets;
            if (Array.isArray(assets) && assets.length > 0) return assets;
            return (this.config.options || []).map(id => ({ id, title: id }));
        },
        isArabic() {
            // Form inputs only receive config + form_values, so reach the app
            // instance (which carries app_state) by walking up the parent chain.
            let node = this.$parent;
            while (node) {
                if (node.app && node.app.app_state) return !!node.app.app_state.isArabic;
                node = node.$parent;
            }
            return false;
        },
    },
    methods: {
        onModelInput(modelId) {
            this.$set(this.form_values, this.config.id, modelId);
            this.on_input_changed();
        },
        // If the selected option is not in the options list then reset it
        // (mirrors Dropdown.reset_selected_if_invalid).
        reset_selected_if_invalid() {
            const options = this.config.options || [];
            const current = this.form_values[this.config.id];
            if (options.length > 0 && !options.includes(current)) {
                const def = this.config.default_value;
                this.$set(this.form_values, this.config.id,
                    (def !== undefined && options.includes(def)) ? def : options[0]);
            }
        },
    },
    mounted() {
        if (this.form_values[this.config.id] === undefined) {
            this.$set(this.form_values, this.config.id,
                this.config.default_value || (this.config.options || [])[0]);
        }
        this.reset_selected_if_invalid();
    },
    watch: {
        'config.options': {
            handler() {
                this.reset_selected_if_invalid();
            },
            deep: true,
        },
    },
}
</script>

<style>
</style>
<style scoped>
.model-selector-input {
    flex: 1;
    min-width: 220px;
    max-width: 340px;
    margin-left: 6px;
}
</style>
