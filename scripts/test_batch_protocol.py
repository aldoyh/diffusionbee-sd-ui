#!/usr/bin/env python3
"""Batch protocol smoke test against the fake backend.

Spawns electron_app/src/fake_backend.py and drives the exact line protocol
the Electron renderer uses (bridge.js: 'b2py t2im <json>' in, 'sdbk nwim' /
'sdbk errr' out). These are the two signals the batch queue maps to
item states:

  - seed >= 20  -> 'sdbk nwim' (new image emitted)  => UI marks item 'done'
  - seed <  20  -> 'sdbk errr'  (backend error)      => UI marks item 'error'

Run with: venv311/bin/python3 scripts/test_batch_protocol.py
"""
import json
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAKE_BACKEND = os.path.join(ROOT, "electron_app", "src", "fake_backend.py")
PYTHON = os.path.join(ROOT, "backends", "stable_diffusion", "venv311", "bin", "python3")


def main():
    if not os.path.exists(PYTHON):
        print("SKIP: venv311 python not found at", PYTHON)
        return 0
    if not os.path.exists(FAKE_BACKEND):
        print("SKIP: fake backend not found at", FAKE_BACKEND)
        return 0

    proc = subprocess.Popen(
        [PYTHON, FAKE_BACKEND],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    def wait_for(prefix, timeout=20):
        deadline = time.time() + timeout
        while time.time() < deadline:
            line = proc.stdout.readline()
            if not line:
                break
            line = line.strip()
            if line.startswith(prefix):
                return line
        return None

    def send_job(seed):
        payload = json.dumps({"seed": seed, "num_imgs": 1, "img_width": 64, "img_height": 64})
        proc.stdin.write("b2py t2im " + payload + "\n")
        proc.stdin.flush()

    try:
        # 1) startup handshake the app waits for
        assert wait_for("sdbk mdld"), "backend must report the model loaded"
        assert wait_for("sdbk inrd"), "backend must signal input ready"

        # 2) successful generation -> nwim (UI: done)
        send_job(seed=100)
        assert wait_for("sdbk inwk"), "backend must accept the job"
        nwim = wait_for("sdbk nwim")
        assert nwim, "successful job must emit 'sdbk nwim' -> UI marks item done"
        print("PASS success path:", nwim[:100])
        assert wait_for("sdbk inrd"), "backend must return to input-ready after a job"

        # 3) failing generation -> errr (UI: error)
        send_job(seed=5)
        assert wait_for("sdbk inwk"), "backend must accept the failing job"
        errr = wait_for("sdbk errr")
        assert errr, "failing job must emit 'sdbk errr' -> UI marks item error"
        print("PASS error path:", errr[:100])
    finally:
        try:
            proc.stdin.write("\n")
            proc.stdin.flush()
        except Exception:
            pass
        proc.kill()

    print("ALL PASS")


if __name__ == "__main__":
    sys.exit(main())
