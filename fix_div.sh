#!/bin/bash
sed -i 's|        </button>\n      </div>|        </button>\n      </div>\n      </div>|' src/App.tsx
sed -i '1128,1131s|      </div>\n        </div>\n      </div>|      </div>|' src/App.tsx
