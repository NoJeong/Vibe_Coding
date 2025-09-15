Place a Vosk offline speech recognition model directory here, named exactly:

  vosk-model

For Korean, download a small model such as 'vosk-model-small-ko' from the Vosk
project releases, then rename the extracted folder to 'vosk-model' and put it
in this directory so the path becomes:

  android/app/src/main/assets/vosk-model

The plugin will unpack this model to app storage on first run.
