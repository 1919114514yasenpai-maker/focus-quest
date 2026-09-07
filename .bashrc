alias up='unzip -o $(ls -t *.zip | head -1) && npm run build && firebase deploy --only hosting && git add -u && git add src/ && git commit -m "update $(ls -t *.zip | head -1)" && git push origin main'
alias up='unzip -o $(ls -t *.zip | head -1) && npm run build && firebase deploy --only hosting && git add src/ index.html package.json vite.config.ts tsconfig*.json metadata.json firebase.json .firebaserc firestore.rules .gitignore && git commit -m "update $(ls -t *.zip | head -1)" && git push origin main'
if [ -f "/google/devshell/bashrc.google" ]; then
  source "/google/devshell/bashrc.google"
fi
