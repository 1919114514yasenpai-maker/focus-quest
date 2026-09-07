const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/      \)}\n      \)}\n      \{pendingChestReward && \(/g, 
`      )}
      {pendingChestReward && (`);

// And we need to check if the main div is closed.
// I'll count the divs in the AST or manually.
fs.writeFileSync('src/App.tsx', code);
