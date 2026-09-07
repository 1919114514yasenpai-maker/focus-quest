const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The file should end with 
//     </div>
//   );
// }
// If it's missing a div, let's just insert one before the last `</div>`
code = code.replace(/    <\/div>\n  \);\n\}/, "    </div>\n    </div>\n  );\n}");

fs.writeFileSync('src/App.tsx', code);
