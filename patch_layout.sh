#!/bin/bash
sed -i 's|<div className="mt-auto relative z-10 p-2 sm:p-4 pb-3 sm:pb-5 flex flex-wrap justify-center items-center gap-2 sm:gap-3 pointer-events-auto max-w-full">|<div className="mt-auto relative z-10 p-2 pb-3 flex flex-col items-center gap-2 pointer-events-auto w-full">\n        <div className="flex flex-wrap justify-center items-center gap-2 w-full">|' src/App.tsx

sed -i 's|{(() => {|</div>\n        <div className="flex flex-wrap justify-center items-center gap-2 w-full">\n        {(() => {|' src/App.tsx

# Also, make sure to add the closing div for the new structure at the end before modals.
# But `patch_layout.sh` approach can be brittle if we rely on exact lines.
