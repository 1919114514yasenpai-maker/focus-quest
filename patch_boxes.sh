#!/bin/bash
sed -i -e '/c_transfer_scroll/i\
  '\''c_empty_box_c'\'': {\
    id: '\''c_empty_box_c'\'',\
    name: '\''空の段ボール箱 (Cランク)'\'',\
    type: '\''consumable'\'',\
    power: 0,\
    price: 500,\
    color: '\''#8b5a2b'\'',\
    effect: { description: '\''中にアイテムを詰めてギルドショップやオークションで売れる。Cランク以下のアイテムを3個まで詰められる。'\'' }\
  },\
  '\''c_empty_box_b'\'': {\
    id: '\''c_empty_box_b'\'',\
    name: '\''空の木箱 (Bランク)'\'',\
    type: '\''consumable'\'',\
    power: 0,\
    price: 5000,\
    color: '\''#cd853f'\'',\
    effect: { description: '\''中にアイテムを詰めてギルドショップやオークションで売れる。Bランク以下のアイテムを3個まで詰められる。'\'' }\
  },\
  '\''c_empty_box_a'\'': {\
    id: '\''c_empty_box_a'\'',\
    name: '\''空の宝箱 (Aランク)'\'',\
    type: '\''consumable'\'',\
    power: 0,\
    price: 50000,\
    color: '\''#ffd700'\'',\
    effect: { description: '\''中にアイテムを詰めてギルドショップやオークションで売れる。Aランク以下のアイテムを3個まで詰められる。'\'' }\
  },\
' src/gameData.ts
