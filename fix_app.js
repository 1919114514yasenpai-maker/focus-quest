const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The issue is around line 1083 to 1130. Let's fix the specific modal structure.
code = code.replace(/            <button onClick=\{\(\) => setShowInventory\(false\)\} className="pixel-btn w-full mt-4 py-2">\s*とじる\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>/g, 
            `            <button onClick={() => setShowInventory(false)} className="pixel-btn w-full mt-4 py-2">\n              とじる\n            </button>\n          </div>\n        </div>\n`);

// Also fix the main UI layout unclosed div if needed:
// But first let's see if we can just clean the whole bottom part up.
fs.writeFileSync('src/App.tsx', code);
