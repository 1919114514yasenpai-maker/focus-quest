fetch('http://localhost:3000/src/components/Inventory.tsx').then(r => r.text()).then(t => require('fs').writeFileSync('Inventory_downloaded.tsx', t))
