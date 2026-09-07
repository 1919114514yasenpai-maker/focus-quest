const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// replace the broken div structure
// In the inventory modal, it is:
//          </div>
//      </div>
//        </div>
code = code.replace(/            <button onClick=\{\(\) => setShowInventory\(false\)\} className="pixel-btn w-full mt-4 py-2">\s*とじる\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>/g, 
`            <button onClick={() => setShowInventory(false)} className="pixel-btn w-full mt-4 py-2">
              とじる
            </button>
          </div>
        </div>
`);

fs.writeFileSync('src/App.tsx', code);
