const { ipcMain, dialog, app } = require('electron')

var win;
var python;

var py_buffer = "";
var is_app_closing = false;

var last_few_err = ""

let RESTART_BACKEND_ON_CLOSE = false

function start_bridge() {

    console.log("starting bridge")
    const fs = require('fs')
    const path = require('path')

    // Helper: if a .venv or venv dir exists next to a Python script, use its Python binary
    function resolvePythonBin(scriptDir) {
        let isWin = process.platform === 'win32';
        let venvCandidates = isWin ? [
            path.join(scriptDir, 'venv311', 'Scripts', 'python.exe'),
            path.join(scriptDir, 'venv', 'Scripts', 'python.exe'),
            path.join(scriptDir, '.venv', 'Scripts', 'python.exe'),
        ] : [
            path.join(scriptDir, 'venv311', 'bin', 'python3'),
            path.join(scriptDir, 'venv', 'bin', 'python3'),
            path.join(scriptDir, '.venv', 'bin', 'python3'),
        ];
        for (let candidate of venvCandidates) {
            if (fs.existsSync(candidate)) {
                console.log('Using venv Python:', candidate);
                return candidate;
            }
        }
        return isWin ? 'python' : 'python3'; // fallback to system interpreter
    }

    let bin_path = process.env.BIN_PATH;
    let core_root = path.join(path.dirname(__dirname), 'core');
    let isWin = process.platform === 'win32';
    let backend_names = isWin ? ['diffusionbee_backend.exe', 'diffusionbee_backend'] : ['diffusionbee_backend'];
    let backend_path = backend_names.map(n => path.join(core_root, n)).find(p => fs.existsSync(p))
        || path.join(core_root, backend_names[0]);
    let backend_path_nested = backend_names.map(n => path.join(core_root, 'stable_diffusion', n)).find(p => fs.existsSync(p))
        || path.join(core_root, 'stable_diffusion', backend_names[0]);
    let backend_script_path = path.join(core_root, 'stable_diffusion', 'diffusionbee_backend.py');
    let dev_script_path = process.env.PY_SCRIPT
        || path.resolve(__dirname, '..', '..', 'backends', 'stable_diffusion', 'diffusionbee_backend.py');

    if (bin_path && fs.existsSync(bin_path)) {
        python = require('child_process').spawn(bin_path);
    } else if (app.isPackaged) {
        if (fs.existsSync(backend_path)) {
            python = require('child_process').spawn(backend_path);
        } else if (fs.existsSync(backend_path_nested)) {
            python = require('child_process').spawn(backend_path_nested);
        } else if (fs.existsSync(backend_script_path)) {
            let pythonBin = resolvePythonBin(path.dirname(backend_script_path));
            python = require('child_process').spawn(pythonBin, [backend_script_path]);
        } else {
            console.error("Backend not found in packaged core at: " + backend_path);
        }
    } else if (fs.existsSync(dev_script_path)) {
        let pythonBin = resolvePythonBin(path.dirname(dev_script_path));
        python = require('child_process').spawn(pythonBin, [dev_script_path]);
    } else if (fs.existsSync(backend_path)) {
        python = require('child_process').spawn(backend_path);
    } else {
        console.error("Backend not found at: " + dev_script_path);
    }
    
   
    python.stdin.setEncoding('utf-8');

    python.stdout.on('data', function(data) {
        console.log("Python response: ", data.toString('utf8'));


        if(! data.toString().includes("sdbk ")){
            if(win && !is_app_closing )
                win.webContents.send('to_renderer', 'adlg ' + data.toString('utf8'));
        }
           
        

        if (win) {

            py_buffer += data.toString('utf8');

            let splitted = py_buffer.split("\n")

            if( splitted.length > 1 ){
                for (var i = 0; i < splitted.length -1 ; i++) {
                    if (splitted[i].length > 0)
                        if(win && !is_app_closing )
                            win.webContents.send('to_renderer', 'py2b ' + splitted[i]);
                }
            }

            py_buffer = splitted[ splitted.length - 1  ];

        } else {
            console.log("window not binded yet, got from py : " + data.toString('utf8'))
        }

    });

    python.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        last_few_err = last_few_err + data.toString();
        last_few_err = last_few_err.slice(-300);
        if(win && !is_app_closing )
             win.webContents.send('to_renderer', 'adlg ' + data.toString('utf8') );
    });

    // A failed spawn (missing binary, broken venv, ENOENT) only emits an
    // 'error' event — 'close' may never fire. Without this handler the
    // renderer never receives `sdbk inrd`, the splash screen (a full-window
    // drag region) would stay up forever, and the user could neither click
    // nor type. Surface the error immediately so the app can fail loudly
    // instead of hanging silently.
    python.on('error', (err) => {
        console.error('Backend process failed to start:', err);
        last_few_err = last_few_err + String(err && err.message ? err.message : err);
        last_few_err = last_few_err.slice(-300);
        if(win && !is_app_closing)
            win.webContents.send('to_renderer', 'alrt Backend failed to start: ' + (err && err.message ? err.message : err));
    });

    python.on('close', () => {
        // if( code != 0 )
        // {
        // 	dialog.showMessageBox("Backend quit unexpectedly")
        // }

        if(is_app_closing){
            if (win){
                 app.exit(1);
            }
            return;
        }

        


        if(RESTART_BACKEND_ON_CLOSE){
            // dialog.showMessageBox( win , { message: "Error in backend : " + last_few_err }); // this is non blocking 
            // if(!(last_few_err.includes("leaked semaphore objects to clean up at shutdown"))){
            //     // this leaked semaphore issue just happens sometimes. so for now lets just silently restart 
            //     dialog.showMessageBox( { message: "Error in backend : " + last_few_err });
            // }
            dialog.showMessageBox( { message: "Error in backend : " + last_few_err });
            return start_bridge()
        }
        else{

            dialog.showMessageBox({ message: "Backend quit unexpectedly. " + last_few_err });

            if (win)
            {
                is_app_closing = true;
                app.exit(1);
            }
        }
        
            

    });

}


ipcMain.on('to_python_sync', (event, arg) => {
    if (python) {
        event.returnValue = "ok";
        // console("sending to py from  main " + arg )
        python.stdin.write("b2py " + arg.toString() + "\n")

    } else {
        console.log("Python not binded yet!");
        event.returnValue = "not_ok";
    }
})


ipcMain.on('to_python_async', (event, arg) => {
    if (python) {
        python.stdin.write("b2py " + arg.toString() + "\n")
    }
})







app.on('window-all-closed', () => {
    if(python){
        is_app_closing = true;
        python.kill();
    }
 
})



function bind_window_bridge(w) {
    console.log("browser object binded")
    win = w;
}


export { start_bridge, bind_window_bridge }
