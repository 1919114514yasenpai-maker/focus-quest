firebase login
mkdir casino
cd casino
unzip -o ../casino1.0.0.zip - .
unzip -o ../casino1.0.0.zip -d .
npm install
npm install -g  firebase-tools
npm run build
npm run deploy
firebase deploy --only hosting
firebase login
firebase use focus-quest-study
npm install -h firebase-tools
ls la
cd /
npx firebase deploy --only hosting --project focus-quest-study
npm install -g firebase-tools
firebase deploy --only hosting --project focus-quest-study
unzip focus-quest1.0.0.zip
npm install
npm run build
firebase deploy --only hosting --project focus-quest-study
gcloud auth print-acsess-token
gcloud auth print-access-token
gcloud auth print-access-token | xclip -selection clipboard 2>/dev/null || gcloud auth print-access-token
unzip -o focus-quest1.0.1.zip -d .
npm run build
npm run deploy
firebase deploy --only hosting
i
unzip -o focus-quest1.0.2.zip 
npm run build
firebase deploy --only hosting
npm install -g firebase-tools
unzip -o focus-quest1.0.2.1.zip 
npm run build
firebase deploy --only hosting
cd ~/focus-quest 2>/dev/null || cd ~
git config --global user.email "aimutsu0120@gmail.com"
git config --global user.name "1919114514yasenpai-maker"
# GitHub に送信
git remote remove origin 2>/dev/null
git remote add origin https://github.com/1919114514yasenpai-maker/focus-quest.git
git add .
git commit -m "Initial commit for auto deploy" 2>/dev/null
git branch -M main
git push -u origin main
ls -la
git init
mkdir -p .github/workflows
cat << 'EOF' > .github/workflows/firebase-hosting-merge.yml
name: Deploy to Firebase Hosting on merge
on:
  push:
    branches:
      - main
jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_FOCUS_QUEST_STUDY }}'
          channelId: live
          projectId: focus-quest-study
EOF

git add -A
git commit -m "Initial commit for Focus Quest auto-deploy"
git branch -M main
git remote add origin https://github.com/1919114514yasenpai-maker/focus-quest.git
git push -u origin main
git push -i origin main
git push -u origin main
cat << 'EOF' > .gitignore
node_modules
dist
.cache
.codeoss
.gemini
*.zip
.vscode
.docker
EOF

git rm -r --cached . 2>/dev/null
git add .
git commit -m "Focus Quest with clean auto deploy"
git push -u origin main --force
echo "alias up='unzip -o \$(ls -t focus-quest*.zip 2>/dev/null | head -1) 2>/dev/null; git add -A && git commit -m \"update\" && git push origin main'" >> ~/.bashrc && source ~/.bashrc
echo "alias up='unzip -o \$(ls -t *.zip | head -1) && git add -A && git commit -m \"update \$(ls -t *.zip | head -1)\" && git push origin main'" >> ~/.bashrc && source ~/.bashrc
