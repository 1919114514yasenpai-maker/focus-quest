const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// We can add a useEffect to fetch the guild name whenever user is logged in
code = code.replace(
/  useEffect\(\(\) => \{\n    if \(timerMode === 'focus'\) \{/g,
`  useEffect(() => {
    if (user) {
      import('firebase/firestore').then(({ doc, getDoc }) => {
        getDoc(doc(db, 'users', user.uid)).then(profileDoc => {
          if (profileDoc.exists()) {
            const profile = profileDoc.data();
            if (profile.guildId) {
              getDoc(doc(db, 'guilds', profile.guildId)).then(gDoc => {
                if (gDoc.exists()) {
                  setMyGuildName(gDoc.data().name);
                } else setMyGuildName(undefined);
              });
            } else setMyGuildName(undefined);
          } else setMyGuildName(undefined);
        });
      });
    } else setMyGuildName(undefined);
  }, [user]);

  useEffect(() => {
    if (timerMode === 'focus') {`
);

// add handler
code = code.replace(
/  const handleInsertGem = /g,
`  const handleEngraveItem = (uid: string, guildName: string) => {
    setInventory(prev => prev.map(item => item.uid === uid ? { ...item, engraving: guildName } : item));
    showToast('✨ ギルド名を刻印しました！');
  };

  const handleInsertGem = `
);

// update Inventory props
code = code.replace(
/              onTransferEnhancements=\{handleTransferEnhancements\}\n              isQuestActive=\{timerMode === 'focus'\}/g,
`              onTransferEnhancements={handleTransferEnhancements}
              isQuestActive={timerMode === 'focus'}
              guildName={myGuildName}
              onEngraveItem={handleEngraveItem}`
);

fs.writeFileSync('src/App.tsx', code);
