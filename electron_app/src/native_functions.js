const { ipcMain, dialog, clipboard, app, screen } = require('electron')
const { seedBundledModels } = require('./seed_bundled_models');
import settings from 'electron-settings';

var win;


function bind_window_native_functions(w) {
    console.log("browser object binded")
    win = w;
}


let is_windows = process.platform.startsWith('win');



console.log(require('os').freemem()/(1000000000) + " Is the free memory")
console.log(require('os').totalmem()/(1000000000) + " Is the total memory")


ipcMain.on('save_dialog', (event, ...args) => {

    const filename = args[0] ? args[0] : "Untitled"
    const ext = args[1] ? args[1] : "png"
   
    let trimmedFilename = filename.substring(0, 254) // filename size limit
     let save_path = dialog.showSaveDialogSync({
            title: 'Save Image',
            defaultPath: trimmedFilename,
            filters: [{
              name: 'Image',
              extensions: [ext]
            }]
          })

     event.returnValue = save_path;
} )

console.log(require('os').release() + " ohoho")



ipcMain.on('file_dialog', (event, arg) => {
    console.log("file dialog request recieved" + arg) // prints "ping"
    let properties;
    let options;

    if (arg == "folder") // single folder 
    {
        properties = ['openDirectory'];
        options = { properties: properties } ;
    }
    else if(arg == 'img_file') // single image file 
    {
        properties = ['openFile' ]
        options = { filters :[ {name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp']}] , properties: properties } ;
    }
    else if(arg == 'weights_file') // single image file 
    {
        properties = ['openFile' ]
        options = { filters :[ {name: 'Checkpoints', extensions: ['ckpt' , 'safetensors' ]}] , properties: properties } ;
    }
    else if(arg == 'img_files') // multi image files
    {
        properties = ['multiSelections' , 'openFile' ]
        options = { filters :[ {name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp']}] , properties: properties } ;
    }
    else if(arg == 'text_files') // multi image files
    {
        properties = ['multiSelections' , 'openFile' ]
        options = { filters :[ {name: 'Images', extensions: ['txt']}] , properties: properties } ;
    }
    else if(arg == 'audio_files') // multi image files
    {
        properties = ['multiSelections' , 'openFile' ]
        options = { filters :[ {name: 'Images', extensions: ['mp3', 'wav']}] , properties: properties } ;
    }
    else if(arg == 'video_files') // multi image files
    {
        properties = ['multiSelections' , 'openFile' ]
        options = { filters :[ {name: 'Images', extensions: ["mp4", "mov", "avi", "flv", "wmv", "mkv"]}] , properties: properties } ;
    }
    else if(arg == 'any_files') // multi image files
    {
        properties = ['multiSelections' , 'openFile' ]
        options = {  properties: properties } ;
    }
    else
    {
        properties = ['openFile'];
        options = { properties: properties } ;
    }

    // let options = {
    //     See place holder 1 in above image
    //     title : "Custom title bar", 
    //     message : "Custom title bar",

    //     buttonLabel : "Custom button",

    //     See place holder 4 in above image
    //     filters :[
    //      {name: 'Images', extensions: ['jpg', 'png', 'gif']},
    //      {name: 'Movies', extensions: ['mkv', 'avi', 'mp4']},
    //      {name: 'Custom File Type', extensions: ['as']},
    //      {name: 'All Files', extensions: ['*']}
    //     ],
    //     properties: properties
    // }

    // //Synchronous
    let filePaths = dialog.showOpenDialogSync(options)

    if (filePaths && filePaths.length > 0)
        event.returnValue = filePaths.join(";;;");
    else
        event.returnValue = "NULL";
})




ipcMain.on('open_url', (event, url) => {
    let website_domain = require('../package.json').website ; 
    url = url.replace("__domain__" , website_domain );
    require('electron').shell.openExternal(url);
    event.returnValue = '';
})


// Open a local file with the OS default app (e.g. Preview on macOS).
// Used by the image preview lightbox's "Open in default viewer" action.
ipcMain.on('open_path', (event, fpath) => {
    let cleanPath = String(fpath || '');
    if (cleanPath.startsWith('file://')) {
        // fileURLToPath correctly handles Windows drive letters
        // (file:///C:/... -> C:\...) and percent-encoding; fall back to a
        // plain prefix strip if it can't parse the URL.
        try {
            cleanPath = require('url').fileURLToPath(cleanPath);
        } catch (err) {
            cleanPath = cleanPath.slice(7);
        }
    }
    if (cleanPath) {
        // shell.openPath resolves with an error-message string on failure
        // (it does not reject), so check the resolved value.
        require('electron').shell.openPath(cleanPath).then((err) => {
            if (err) console.error('[open_path] Failed to open:', cleanPath, err);
        });
    }
    event.returnValue = '';
})



ipcMain.on('save_file', (event, arg) => {
    let p1 = arg.split("||")[0];
    let p2 = arg.split("||")[1];
    require('fs').copyFileSync(p1, p2);
    event.returnValue = '';
})


ipcMain.on('copy_to_clipboard', (event, arg) => {
    clipboard.writeText(arg)
    event.returnValue = '';
})


ipcMain.on('get_from_clipboard', (event) => {
    event.returnValue = clipboard.readText();
})


ipcMain.on('show_dialog_on_quit', (event, msg) => {
    if(win)
    {
        win.show_dialog_on_quit = true;
        win.dialog_on_msg = msg;
    }
    event.returnValue = 'ok';

})


ipcMain.on('dont_show_dialog_on_quit', (event) => {
    if(win)
        win.show_dialog_on_quit = false;
    event.returnValue = 'ok';

})


ipcMain.on('get_instance_id', (event) => {
    if (settings.hasSync('instance_id')){
        event.returnValue =  settings.getSync('instance_id')
        return;
    }
    let instance_id =  (Math.random() + 1).toString(36);
    settings.set('instance_id', instance_id);
    event.returnValue =   instance_id;

})


ipcMain.on('unfreeze_win', (event) => {

    if (win) {
	win.savable=true;
        const primaryDisplay = screen.getPrimaryDisplay()
        const { width, height } = primaryDisplay.workAreaSize

        if (settings.hasSync('windowPosState')) {
            let windowState = settings.getSync('windowPosState');
            console.log("stateeee")
            console.log(windowState)

            if( windowState.x  >  0.8*width ||  windowState.y  >  0.8*height ||  windowState.x  < -0.2*width || windowState.y  < -0.2*height    ){
                win.setSize(850, 650, false);
            } else {
               win.setPosition( windowState.x  ,  windowState.y  , false);
               win.setMinimumSize(1070, 700);
                win.setSize(windowState.width, windowState.height , false); 
            }

            
        }
        else{
            win.setMinimumSize(1070, 700);
            win.setSize(850, 650, false);
        }

        win.setMinimumSize(1070, 700);
        // win.setResizable(true);
        win.setMaximizable(true);


        
        
    }

    event.returnValue = 'ok';

})



ipcMain.on('freeze_win', (event) => {

    if (win) {
	win.savable=false;
	win.restore()
        win.setMinimumSize(770, 550)
        win.setSize(770, 550, false); 
        // win.setResizable(false);
        win.setMaximizable(false);

        const primaryDisplay = screen.getPrimaryDisplay()
        const { width, height } = primaryDisplay.workAreaSize;

        console.log( width +" " +  height)

        win.setPosition( parseInt((width-770)/2)  , parseInt((height-550)/2), false);

              

    }

    event.returnValue = 'ok';

})



ipcMain.on('show_about', (event) => {

    if (win) {

        if(is_windows)
        {
            let about_content = require('../package.json').name + "\n" + "Version " + require('../package.json').version + " (" + require('../package.json').build_number + ")\n" + require('../package.json').description;
            require('electron').dialog.showMessageBoxSync(this, {
                buttons: ['Okay'],
                title: require('../package.json').name ,
                message: about_content
            });
        }
        else{
            app.showAboutPanel()
        }

        
    }

    event.returnValue = 'ok';

})




ipcMain.on('native_confirm', (event, arg) => {

    if (win) {
        
        const choice = require('electron').dialog.showMessageBoxSync(this, {
            type: 'question',
            buttons: ['Yes', 'No'],
            title: require('../package.json').name ,
            message: arg
        });
        if (choice === 1) {
            event.returnValue = false ;
        }
        else{
            event.returnValue = true ;
        }

    }
    else{
        event.returnValue = false ;
    }

})



ipcMain.on('close_window', (event) => {

    if (win) {

        win.close()
        event.returnValue = true ;
    }
    else{
        event.returnValue = false ;
    }

})




ipcMain.on('native_alert', (event, arg) => {

    if (win) {

        require('electron').dialog.showMessageBoxSync(this, {
            buttons: ['Okay'],
            title: require('../package.json').name ,
            message: arg
        });

    }

    event.returnValue = true ;

})




ipcMain.on('save_b64_image', (event, b64_str, save_to_tmp ) => {

    const path = require('path');
    const fs = require('fs');

    let base64Data = b64_str.replace(/^data:image\/png;base64,/, "");
    
    const homedir = require('os').homedir();
    let save_dir = path.join(homedir , ".diffusionbee")


    if (!fs.existsSync(save_dir)){
        fs.mkdirSync(save_dir, { recursive: true });
    }

    if(save_to_tmp){
        save_dir = require('os').tmpdir()
    } else {
        save_dir = path.join(save_dir , "inp_images")
    }

    

    if (!fs.existsSync(save_dir)){
        fs.mkdirSync(save_dir, { recursive: true });
    }

    let p = require('path').join(save_dir,  Math.random().toString()+".png");

    require("fs").writeFileSync(p , base64Data, 'base64'); 
    
    event.returnValue = p ;

})



function save_json(data , fname ){
    const path = require('path');
    const fs = require('fs');
    const homedir = require('os').homedir();
    let save_dir = path.join(homedir , ".diffusionbee")


    if (!fs.existsSync(save_dir)){
        fs.mkdirSync(save_dir, { recursive: true });
    }

    let data_path = path.join(homedir , ".diffusionbee" , fname )
    fs.writeFileSync( data_path, JSON.stringify(data) );
}



function load_data(fname){
    const path = require('path');
    const fs = require('fs');
    const homedir = require('os').homedir();
    let data_path = path.join(homedir , ".diffusionbee" , fname );

    if (fs.existsSync(data_path)){
        let json_str = fs.readFileSync( data_path );
        try {
            return JSON.parse(json_str);
          } catch (error) {
            return {} ;
          }
    }
    else{
        return {} ;
    }       
}

ipcMain.on('save_data', (event, arg , fname ) => {
    if(fname)
        save_json(arg, fname)
    else
        save_json(arg, "data.json")
    event.returnValue = true ;
})


ipcMain.on('load_data', (event, fname) => {
    if(fname)
        event.returnValue = load_data(fname)
    else
        event.returnValue = load_data("data.json")
})


ipcMain.on('delete_file', (event, fpath) => {
    const fs = require('fs');
    try{
        fs.unlinkSync(fpath);
        console.log("deleted")
        event.returnValue = true;
    } catch {
        console.log("err in deleting")
        event.returnValue = false;
    }
    
})


function run_realesrgan(input_path , cb ){
    const path = require('path');
    const os = require('os');
    let out_path = path.join(os.tmpdir(), Math.random()+".png");
    const fs = require('fs');
    let default_bin_name = process.platform === 'win32' ? 'realesrgan_ncnn_windows.exe' : 'realesrgan_ncnn_macos';
    let bin_path =  process.env.REALESRGAN_BIN || path.join(path.dirname(__dirname), 'core' , default_bin_name );
    let weights_path = path.join(path.dirname(bin_path), 'models');
    let proc = require('child_process').spawn( bin_path  , ['-m' , weights_path , '-i' , input_path , '-o' , out_path ]);

    console.log([bin_path , '-m' , weights_path , '-i' , input_path , '-o' , out_path ])

    proc.stderr.on('data', (data) => {
        console.error(`sr stderr: ${data}`);
    });

    proc.stdout.on('data', (data) => {
        console.error(`sr stderr: ${data}`);
    });

    proc.on('close', () => {
        if (fs.existsSync(out_path)) {
            cb(out_path);
        }
        else
        {
            cb('');
        }
    });
}



function add_custom_pytorch_models(pytorch_model_path, model_name, convert_params , cb ){
    
    const path = require('path');
    const fs = require('fs');
    const homedir = require('os').homedir();
    let models_path = path.join(homedir , ".diffusionbee" , "imported_models");

    if (!fs.existsSync(models_path)){
        fs.mkdirSync(models_path, { recursive: true });
    }


    let script_path = process.env.PY_SCRIPT || "../backends/stable_diffusion/diffusionbee_backend.py"; 
    
    let out_path =  path.join(homedir , ".diffusionbee" , "imported_models" , model_name+".tdict" );
    let proc;
    if (fs.existsSync(script_path)) {
        let python_cmd = process.platform === 'win32' ? 'python' : 'python3';
        proc = require('child_process').spawn( python_cmd  , [ script_path ,  "convert_model" ,  pytorch_model_path , out_path ]);
    } else {
        let backend_bin_name = process.platform === 'win32' ? 'diffusionbee_backend.exe' : 'diffusionbee_backend';
        let bin_path =  path.join(path.dirname(__dirname), 'core' , backend_bin_name );
        proc = require('child_process').spawn( bin_path  , [ "convert_model" ,  pytorch_model_path , out_path ]);
    }
    

    
    let errors = ""
    let std_out_all = ""

    proc.stderr.on('data', (data) => {
        console.error(`sr stderr: ${data}`);
        errors += data
    });

    proc.stdout.on('data', (data) => {
        console.error(`sr sdtout: ${data}`);
        std_out_all += data
    });

    proc.on('close', (code) => {

        if(convert_params.delete_origional_always){
            try{
                fs.unlinkSync(pytorch_model_path);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }

        if(code != 0){
            cb({success:false , error:errors  })
            try{
                fs.unlinkSync(out_path);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }
        else{
            if(convert_params.delete_origional_on_success){
                try{
                    fs.unlinkSync(pytorch_model_path);
                } catch (err) {
                    console.error('Error deleting file:', err);
                }
            }

            let converted_model_data = {}
            for(let l of std_out_all.split("\n")){
                if(l.includes("__converted_model_data__")){
                    converted_model_data = JSON.parse(l.replace( "__converted_model_data__", "") )
                }
            }

            cb({success:true, model_path:out_path , metadata : converted_model_data })
        }
       
    });
}


ipcMain.handle('add_custom_pytorch_models', async (event, pytorch_model_path, model_name, convert_params ) => {
    const result = await new Promise(resolve => add_custom_pytorch_models( pytorch_model_path, model_name , convert_params , resolve));
    return result
})



ipcMain.handle('run_realesrgan', async (event, arg) => {
    const result = await new Promise(resolve => run_realesrgan( arg , resolve));
    return result
})

// ipcRenderer.invoke('run_realesrgan', '/Users/divamgupta/Downloads/333.png' ).then((result) => {
//     alert(result)
//   })



ipcMain.on('list_imported_models', (event) => {
    const path = require('path');
    const fs = require('fs');
    const homedir = require('os').homedir();
    let models_path = path.join(homedir , ".diffusionbee" , "imported_models");

    if (!fs.existsSync(models_path)){
        fs.mkdirSync(models_path, { recursive: true });
    }

    event.returnValue = fs.readdirSync(models_path, {withFileTypes: true}).filter(item => !item.isDirectory()).map(item => item.name).filter(item => item.endsWith('.tdict'))

})






ipcMain.on('scan_disk_for_models', (event) => {
    const path = require('path');
    const fs = require('fs');
    const homedir = require('os').homedir();

    let results = [];
    let dirs = [
        { dir: path.join(homedir, '.diffusionbee', 'imported_models'), source: 'imported_models' },
        { dir: path.join(homedir, '.diffusionbee', 'downloaded_assets'), source: 'downloaded_assets' },
    ];

    for (let { dir: dirPath, source } of dirs) {
        if (fs.existsSync(dirPath)) {
            let files = fs.readdirSync(dirPath, { withFileTypes: true });
            for (let item of files) {
                if (!item.isDirectory() && item.name.endsWith('.tdict')) {
                    let fullPath = path.join(dirPath, item.name);
                    let stat = fs.statSync(fullPath);

                    // Derive a readable id from the filename (keep underscores for consistency)
                    let id = item.name
                        .replace(/\.(safetensors\.)?tdict$/i, '')
                        .trim();
                    let title = id
                        .replace(/_/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();

                    results.push({
                        id: id,
                        title: title,
                        filename: item.name,
                        asset_path: fullPath,
                        source: source,
                        size_bytes: stat.size,
                        model_meta_data: { type: 'sd_model' },
                    });
                }
            }
        }
    }

    event.returnValue = results;
});


ipcMain.on('seed_bundled_models', (event) => {
    try {
        event.returnValue = seedBundledModels();
    } catch (err) {
        console.error('[seed-bundled] Error seeding bundled models:', err);
        event.returnValue = [];
    }
});


ipcMain.on('get_homedir', (event) => {
    const homedir = require('os').homedir();
    event.returnValue = homedir;
});

ipcMain.on('file_exists', (event, fpath) => {
    const fs = require('fs');
    try {
        event.returnValue = !!(fpath && fs.existsSync(fpath));
    } catch {
        event.returnValue = false;
    }
});

ipcMain.handle('read_file_base64', async (event, fpath) => {
    const fs = require('fs');
    if (!fpath) return '';
    let cleanPath = fpath;
    if (cleanPath.startsWith('file://')) {
        cleanPath = cleanPath.slice(7);
    }
    try {
        const data = fs.readFileSync(cleanPath);
        return data.toString('base64');
    } catch (err) {
        console.error('read_file_base64 error:', err);
        return '';
    }
});

ipcMain.on('to_file_url', (event, fpath) => {
    const { pathToFileURL } = require('url');
    try {
        event.returnValue = fpath ? pathToFileURL(fpath).href : '';
    } catch {
        event.returnValue = '';
    }
});


function resolve_hf_token() {
    const candidates = [
        process.env.HF_TOKEN,
        process.env.HUGGINGFACE_API_KEY,
        process.env.HF_API_KEY,
    ];

    for (const value of candidates) {
        const token = String(value || '').trim();
        if (token) {
            return token;
        }
    }

    return '';
}

ipcMain.on('get_hf_token', (event) => {
    event.returnValue = resolve_hf_token();
});

ipcMain.on('get_assets_dir', (event) => {
    const path = require('path');
    const fs = require('fs');
    const homedir = require('os').homedir();
    let assets_path = path.join(homedir , ".diffusionbee" , "downloaded_assets");

    if (!fs.existsSync(assets_path)) {
        fs.mkdirSync(assets_path, { recursive: true });
    }

    event.returnValue = assets_path;
});



// ─────────────────────────────────────────────────────────────────────────────
// Model downloads: Range-resume + integrity + real cancel
//
// Downloads stream to a sibling `<dest>.partial` file, then atomically rename
// to the final name on success. A dropped connection keeps the partial, so the
// next attempt resumes via `Range: bytes=<size>-` instead of restarting a
// multi-GB download from zero. An LFS/Xet `etag` is recorded in a tiny sidecar
// (`<dest>.partial.json`) and cross-checked on resume — if the server is now
// serving a different revision, the partial is discarded and the download
// restarts. Integrity: fresh downloads keep the incremental MD5 (catalog
// models); resumed downloads re-read the whole file when an MD5 is expected
// (incremental hashing of only the tail would be wrong).
// ─────────────────────────────────────────────────────────────────────────────

// downloadId -> { request, partialPath, sidecarPath, cancelled }
const activeDownloads = new Map();

function normalize_etag(value) {
  return String(value || '')
    .replace(/^W\//, '')
    .replace(/^"|"$/g, '')
    .trim()
    .toLowerCase();
}

ipcMain.on('download-cancel', (event, downloadId) => {
  const dl = activeDownloads.get(downloadId);
  if (dl) {
    const fs = require('fs');
    dl.cancelled = true;
    try { dl.request.abort(); } catch (err) { /* ignore */ }
    // The abort can surface as a stream error, a request error, or nothing at
    // all — don't depend on that path. Notify + clean up here directly.
    activeDownloads.delete(downloadId);
    try { if (fs.existsSync(dl.partialPath)) fs.unlinkSync(dl.partialPath); } catch (err) { /* ignore */ }
    try { if (fs.existsSync(dl.sidecarPath)) fs.unlinkSync(dl.sidecarPath); } catch (err) { /* ignore */ }
    try {
      event.sender.send('to_download', { fn: 'cancelled', download_id: downloadId, msg: { message: 'cancelled' } });
    } catch (err) {
      console.log(err);
    }
  }
  event.returnValue = true;
});

// Orphaned `.partial` files (crashed/quitted sessions) waste disk and are
// invisible to the model scanner. Call once at app startup.
ipcMain.on('cleanup_partial_downloads', (event) => {
  const path = require('path');
  const fs = require('fs');
  const homedir = require('os').homedir();
  const dir = path.join(homedir, '.diffusionbee', 'downloaded_assets');
  let removed = 0;
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith('.partial') || name.endsWith('.partial.json')) {
        try {
          fs.unlinkSync(path.join(dir, name));
          removed += 1;
        } catch (err) { /* ignore */ }
      }
    }
  }
  event.returnValue = removed;
});

ipcMain.on('download-file', (event, url, dest, downloadId, options) => {

  const fs = require('fs');
  const crypto = require('crypto');

  const downloadOptions = options && typeof options === 'object' ? options : {};
  const expectedMd5 = String(downloadOptions.expected_md5 || '').toLowerCase();
  const requestHeaders = { ...(downloadOptions.headers || {}) };

  if (downloadOptions.hf_auth && !requestHeaders.Authorization) {
    const hfToken = resolve_hf_token();
    if (hfToken) {
      requestHeaders.Authorization = `Bearer ${hfToken}`;
    }
  }

  const timeoutMs = Number.isFinite(downloadOptions.timeout_ms)
    ? Number(downloadOptions.timeout_ms)
    : (downloadOptions.hf_auth ? 0 : 20000);

  // Resume bookkeeping: existing partial size + recorded etag sidecar.
  const partialPath = dest + '.partial';
  const sidecarPath = dest + '.partial.json';
  let existingSize = 0;
  let sidecar = {};
  try {
    if (fs.existsSync(partialPath)) {
      existingSize = fs.statSync(partialPath).size;
    }
  } catch (err) { existingSize = 0; }
  try {
    if (fs.existsSync(sidecarPath)) {
      sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf8')) || {};
    }
  } catch (err) { sidecar = {}; }

  if (existingSize > 0) {
    requestHeaders.Range = `bytes=${existingSize}-`;
    // ETag precondition (M5): only append when the server still serves the
    // revision the partial came from. If-Range makes the server answer 200
    // (full) instead of 206 (tail) on mismatch, so we never download a
    // wrong-revision tail. If no etag was recorded we still resume, but the
    // 206 handler below verifies continuity before appending.
    if (sidecar.etag) {
      requestHeaders['If-Range'] = `"${sidecar.etag}"`;
    }
  }

  // Dedup by destination (M5): a second download to the same file would open a
  // second writer and interleave the .partial. activeDownloads is keyed by
  // downloadId, so scan for an existing partialPath match.
  for (const existing of activeDownloads.values()) {
    if (existing.partialPath === partialPath) {
      console.log('[download] already in progress for', dest);
      try {
        event.sender.send('to_download', { fn: 'error', download_id: downloadId, msg: { message: 'Download already in progress' } });
      } catch (err) { /* ignore */ }
      return;
    }
  }

  const request = require('request');
  const state = { request: null, partialPath, sidecarPath, cancelled: false };
  activeDownloads.set(downloadId, state);

  let hash = crypto.createHash('md5');
  let resumed = false;
  let stream = null;
  let downloadedBytes = 0;
  let totalBytes = 0;
  let responseEtag = '';

  const send = (fn, msg) => {
    try {
      event.sender.send('to_download', { fn, download_id: downloadId, msg });
    } catch (err) {
      console.log(err);
    }
  };

  const dropPartial = () => {
    activeDownloads.delete(downloadId);
    try { if (stream && !stream.destroyed) stream.destroy(); } catch (err) { /* ignore */ }
    try { if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath); } catch (err) { /* ignore */ }
    try { if (fs.existsSync(sidecarPath)) fs.unlinkSync(sidecarPath); } catch (err) { /* ignore */ }
  };

  const finishPartial = (finalHash) => {
    // A racing cancel already cleaned up + notified — never emit success
    // for a download the user aborted (and whose partial is likely gone).
    if (state.cancelled || !activeDownloads.has(downloadId)) return;
    activeDownloads.delete(downloadId);
    try {
      if (fs.existsSync(partialPath)) {
        fs.renameSync(partialPath, dest); // atomic-ish finalize
      }
      if (fs.existsSync(sidecarPath)) fs.unlinkSync(sidecarPath);
    } catch (err) {
      console.error('[download] finalize failed:', err);
      send('error', { message: 'Download finalize failed: ' + (err.message || '') });
      return;
    }
    // Only claim success when the final file actually exists — otherwise the
    // renderer would mark the model as downloaded with nothing on disk.
    if (!fs.existsSync(dest)) {
      send('error', { message: 'Download finalize failed: output file missing' });
      return;
    }
    send('success', { hash: finalHash, resumed, etag: responseEtag });
  };

  // The download can restart itself (etag mismatch) — each attempt gets its
  // own request and its error handler ignores itself once superseded.
  function beginDownload(headers, resumeBase, isResumed) {
    downloadedBytes = resumeBase;
    totalBytes = resumeBase;
    hash = crypto.createHash('md5');
    resumed = isResumed;
    responseEtag = '';

    const req = request.get({
      url,
      headers,
      followRedirect: true,
      rejectUnauthorized: false, // ignore SSL certificate errors,
      timeout: timeoutMs,
    });
    state.request = req;

    req.on('response', response => {
      responseEtag = normalize_etag(response.headers['etag'] || response.headers['x-linked-etag']);

      // 416 Range Not Satisfiable → the partial already contains the whole file.
      if (response.statusCode === 416) {
        if (resumeBase > 0) {
          if (expectedMd5) {
            try {
              const full = crypto.createHash('md5');
              const rd = fs.createReadStream(partialPath);
              rd.on('data', (c) => full.update(c));
              rd.on('end', () => finishPartial(full.digest('hex')));
              rd.on('error', () => dropPartial());
            } catch (err) {
              dropPartial();
            }
          } else {
            finishPartial(null);
          }
        } else {
          send('error', { message: 'Download failed: ' + response.statusCode });
        }
        return;
      }

      if (response.statusCode === 206) {
        // Blind-append protection: refuse to append a resumed tail unless the
        // recorded etag still matches. A missing/mismatched etag means we can't
        // prove the bytes are contiguous — discard the partial and restart.
        const etagMismatch = Boolean(sidecar.etag) && (!responseEtag || sidecar.etag !== responseEtag);
        if (resumeBase > 0 && etagMismatch) {
          // The partial belongs to a different revision (or the server stopped
          // sending etags) — discard it and start over with a fresh (no-Range)
          // request. The 206 body is only the tail, so it can't be reused.
          try { if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath); } catch (err) { /* ignore */ }
          try { if (fs.existsSync(sidecarPath)) fs.unlinkSync(sidecarPath); } catch (err) { /* ignore */ }
          existingSize = 0;
          sidecar = {};
          req.abort();
          beginDownload(cleanHeaders, 0, false);
          return;
        }
        stream = fs.createWriteStream(partialPath, { flags: 'a' });
      } else if (response.statusCode === 200) {
        // Server ignored Range (or no partial) → full download, overwrite partial.
        existingSize = 0;
        sidecar = {};
        resumed = false;
        stream = fs.createWriteStream(partialPath, { flags: 'w' });
      } else {
        req.abort();
        dropPartial();
        send('error', { message: 'Unexpected HTTP ' + response.statusCode });
        return;
      }

      // Record the etag once, from the first real response, for future resumes.
      if (responseEtag && !sidecar.etag) {
        sidecar.etag = responseEtag;
        try { fs.writeFileSync(sidecarPath, JSON.stringify(sidecar)); } catch (err) { /* ignore */ }
      }

      const contentLength = parseInt(response.headers['content-length'], 10);
      const rangeMatch = /bytes (\d+)-(\d+)\/(\d+)/.exec(String(response.headers['content-range'] || ''));
      const rangeTotal = rangeMatch ? parseInt(rangeMatch[3], 10) : NaN;
      totalBytes = Number.isFinite(rangeTotal)
        ? rangeTotal
        : (Number.isFinite(contentLength) && contentLength >= 0 ? resumeBase + contentLength : -1);
      const hasKnownTotal = Number.isFinite(totalBytes) && totalBytes > 0;

      response.on('data', chunk => {
        downloadedBytes += chunk.length;
        // Fresh downloads hash the whole stream; resumed ones re-verify below.
        if (!resumed) hash.update(chunk);
        // Some servers (HF LFS, chunked/streaming responses) omit Content-Length.
        // Guard against NaN progress, which used to surface as "NaN%" in the UI.
        const progress = hasKnownTotal
          ? Math.round(Math.min(100, (downloadedBytes / totalBytes) * 100))
          : -1;
        send('progress', progress);
      });

      stream.on('finish', () => {
        if (expectedMd5 && resumed) {
          // Incremental md5 over only the tail is meaningless — re-read the
          // whole file and verify before finalizing.
          try {
            const full = crypto.createHash('md5');
            const rd = fs.createReadStream(partialPath);
            rd.on('data', (c) => full.update(c));
            rd.on('end', () => finishPartial(full.digest('hex')));
            rd.on('error', () => dropPartial());
          } catch (err) {
            dropPartial();
          }
        } else {
          finishPartial(expectedMd5 ? hash.digest('hex') : null);
        }
      });

      stream.on('error', () => {
        if (!activeDownloads.has(downloadId)) return; // already handled
        if (state.cancelled) {
          dropPartial();
          send('cancelled', { message: 'cancelled' });
          return;
        }
        send('error', { message: 'Failed to write download' });
        dropPartial();
      });

      response.pipe(stream);
    });

    req.on('error', err => {
      // Superseded by an internal restart (etag mismatch) — a newer request
      // owns the download now.
      if (state.request !== req) return;
      // Already handled (e.g. download-cancel cleaned up and notified).
      if (!activeDownloads.has(downloadId)) return;
      if (state.cancelled) {
        // User cancelled: remove the partial so the next attempt starts clean.
        dropPartial();
        send('cancelled', { message: 'cancelled' });
        return;
      }
      // Transient failure: KEEP the partial so a retry resumes instead of
      // restarting from zero. If nothing was written yet, drop the empty file.
      let curSize = 0;
      try { curSize = fs.statSync(partialPath).size; } catch (err) { curSize = 0; }
      activeDownloads.delete(downloadId);
      if (curSize > 0) {
        send('error', { message: err.message || 'Download failed' });
      } else {
        dropPartial();
        send('error', { message: err.message || 'Download failed' });
      }
    });
  }

  // Headers used for a fresh (no-Range) attempt.
  const cleanHeaders = Object.assign({}, requestHeaders);
  delete cleanHeaders.Range;

  if (existingSize > 0) {
    beginDownload(Object.assign({}, requestHeaders, { Range: `bytes=${existingSize}-` }), existingSize, true);
  } else {
    beginDownload(cleanHeaders, 0, false);
  }
});


console.log("native functions imported")


export { bind_window_native_functions }
