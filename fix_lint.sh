#!/bin/bash
# Export ItemIcon from Inventory.tsx
sed -i 's|const ItemIcon:|export const ItemIcon:|' src/components/Inventory.tsx

# Fix imports in AuctionHouse
sed -i 's|import { generateUid } from '"'"'../utils'"'"';|import { generateUid } from '"'"'../gameData'"'"';|' src/components/AuctionHouse.tsx
sed -i 's|import { ItemIcon } from '"'"'./ItemIcon'"'"';|import { ItemIcon } from '"'"'./Inventory'"'"';|' src/components/AuctionHouse.tsx

# Fix imports in GuildRanking
sed -i 's|import { generateUid } from '"'"'../utils'"'"';|import { generateUid } from '"'"'../gameData'"'"';|' src/components/GuildRanking.tsx

# Add createdAt to Guild interface
sed -i '/weekId: string;/a \  createdAt?: string;' src/components/GuildRanking.tsx
