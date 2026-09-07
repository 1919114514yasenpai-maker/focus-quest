const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// I will write a simple balancer to find missing tags
let openDivs = 0;
let pos = 0;
while ((pos = code.indexOf('<div', pos)) !== -1) {
  openDivs++;
  pos += 4;
}
pos = 0;
while ((pos = code.indexOf('</div', pos)) !== -1) {
  openDivs--;
  pos += 5;
}
console.log('Open div mismatch:', openDivs);
