alias up='unzip -o $(ls -t *.zip | head -1) && git add -u && git add src/ && git commit -m "update $(ls -t *.zip | head -1)" && git push origin main'
