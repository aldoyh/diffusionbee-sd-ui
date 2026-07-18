
import { uploadToImgbb, getImgbbApiKey } from "../utils/imgbb_upload.js"

let image_manu_functions = {}

image_manu_functions['save_image'] =  function (app, image_item_data){
	app;
	image_item_data;

	if(!image_item_data.image_url)
        return;
    let im_path = image_item_data.image_url.split("?")[0];

    let seed = (image_item_data.params || {}).seed || ""

    let suggested_fname = (image_item_data.description || "Image").substring(0, 100) + "_" + seed
    let out_path = window.ipcRenderer.sendSync('save_dialog', suggested_fname);
    if(!out_path)
        return
    let org_path = im_path.replaceAll("file://" , "")
    window.ipcRenderer.sendSync('save_file', org_path+"||" +out_path);

}
image_manu_functions['save_image'] .text = "Save Image"

image_manu_functions['send_img_2_img'] =  function (app, image_item_data){
	app.functions.send_to_img2img( image_item_data.image_url )
	
}
image_manu_functions['send_img_2_img'].text = "Send to Img2Img"

image_manu_functions['send_outpaint'] =  function (app, image_item_data){

	app.functions.send_to_outpaint( image_item_data.image_url )
	
}
image_manu_functions['send_outpaint'].text = "Send to AI Canvas"



image_manu_functions['send_inpaint'] =  function (app, image_item_data){

	app.functions.send_to_inpaint( image_item_data.image_url )
	
}
image_manu_functions['send_inpaint'].text = "Send to Inpainting"



image_manu_functions['send_img_2_img_with_params'] =  function (app, image_item_data){

	let image_params = JSON.parse(JSON.stringify(image_item_data.params))
	app.functions.send_to_img2img( image_item_data.image_url , image_params )
	
}
image_manu_functions['send_img_2_img_with_params'].text = "Send to Img2Img with params"



image_manu_functions['use_params_current_page'] =  function (app, image_item_data){
	
	let image_params = JSON.parse(JSON.stringify(image_item_data.params))

	let router = app.$refs.router 
	let cur_page_id = router.current_open_page_id 

	router.$refs[ cur_page_id ][0].$refs.sd_applet.load_options(image_params)
	
}
image_manu_functions['use_params_current_page'].text = "Use parameters"



image_manu_functions['copy_params'] =  function (app, image_item_data){
	app;
	image_item_data;
	const remove_keys = ['generated_img', 'done_percentage', 'prompt_tokens' , 
	'job_state', 'job_id', "raw_form_options" ,  'negative_prompt_tokens' ,"input_image_with_mask" , "model_tdict_path" ,
	"controlnet_tdict_path" , "controlnet_inp_img_preprocesser_model_path" , "aux_output_img" ]
	let image_params = JSON.parse(JSON.stringify(image_item_data.params))
	for(let k of remove_keys)
		image_params[k] = undefined;
	window.ipcRenderer.sendSync('copy_to_clipboard' ,  JSON.stringify(image_params , null, 4))
	
}
image_manu_functions['copy_params'].text = "Copy all parameters"



image_manu_functions['send_to_postprocess'] =  function (app, image_item_data){

	app.functions.send_to_postprocess( image_item_data.image_url )
	
}
image_manu_functions['send_to_postprocess'].text = "Send to Upscaler"

image_manu_functions['generate_similar_images'] =  function (app, image_item_data){

	if( (!image_item_data.params) || image_item_data.params.applet_name != "txt2img"){
		app.show_toast("Only available for images generated using TextToImage")
		return
	}

	let router = app.$refs.router 

	if(router.$refs[ "Txt2Img" ][0].$refs.sd_applet.generate_similar_images( image_item_data.params)) {
		// Generation queued on Txt2Img page — no navigation needed
		app.show_toast(app.app_state && app.app_state.isArabic
			? 'جارٍ توليد صور مشابهة — تفقّد معرض الصور'
			: 'Generating similar images — check the gallery')
	}
	
}
image_manu_functions['generate_similar_images'].text = "Generate similar images"

image_manu_functions['upload_imgbb'] =  async function (app, image_item_data){
	if(!image_item_data.image_url)
        return;

    const apiKey = getImgbbApiKey(app);
    if (!apiKey) {
        app.show_toast(app.app_state && app.app_state.isArabic
            ? 'يرجى إضافة مفتاح API لـ imgbb في الإعدادات أولاً.'
            : 'Please add an imgbb API key in Settings first.');
        return;
    }

    let im_path = image_item_data.image_url.split("?")[0];

    try {
        const result = await uploadToImgbb(im_path, apiKey);
        if (result.url) {
            window.ipcRenderer.sendSync('copy_to_clipboard', result.url);
            app.show_toast(app.app_state && app.app_state.isArabic
                ? 'تم رفع الصورة إلى imgbb ونسخ الرابط إلى الحافظة!'
                : 'Image uploaded to imgbb — URL copied to clipboard!');
        }
    } catch (error) {
        console.error('imgbb upload failed:', error);
        app.show_toast(app.app_state && app.app_state.isArabic
            ? 'فشل رفع الصورة إلى imgbb: ' + (error.message || 'خطأ غير معروف')
            : 'Failed to upload image to imgbb: ' + (error.message || 'Unknown error'));
    }
}
image_manu_functions['upload_imgbb'].text = "Upload to imgbb.com"


export {image_manu_functions}
