#!/bin/bash
# Insert imports at the top
sed -i 's|import { JobSelectModal } from '"'"'./components/JobSelectModal'"'"';|import { JobSelectModal } from '"'"'./components/JobSelectModal'"'"';\nimport { GuildRanking } from '"'"'./components/GuildRanking'"'"';\nimport { AuctionHouse } from '"'"'./components/AuctionHouse'"'"';|' src/App.tsx

# Insert state
sed -i 's|const \[showJobModal, setShowJobModal\] = useState(false);|const [showJobModal, setShowJobModal] = useState(false);\n  const [showGuildRanking, setShowGuildRanking] = useState(false);\n  const [showAuctionHouse, setShowAuctionHouse] = useState(false);|' src/App.tsx

# Insert buttons
sed -i 's|<button onClick={() => setShowInventory(!showInventory)} className="pixel-btn text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2.5">|<button onClick={() => setShowGuildRanking(true)} className="pixel-btn text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5" title="ギルドランキング">\n          🛡️\n        </button>\n        <button onClick={() => setShowAuctionHouse(true)} className="pixel-btn text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5" title="グローバルオークション">\n          ⚖️\n        </button>\n        <button onClick={() => setShowInventory(!showInventory)} className="pixel-btn text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-2.5">|' src/App.tsx

# Insert modal components near the bottom (before last </div>)
# We can search for {showSettings && (
# and place the new modals before it.
