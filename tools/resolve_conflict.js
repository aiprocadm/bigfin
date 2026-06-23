// Additive conflict resolver for the feature-branch registry/lang cascade.
// Modes by filename:
//   lang/{en,ru}/index.json  -> union of JSON keys (theirs + ours, comma-safe)
//   sidebarMenu/dashboard    -> split into separate array objects (ours },{ theirs)
//   other (Features/App.module/features) -> verbatim union (ours then theirs)
const fs = require('fs');
const p = process.argv[2];
const u = p.split('\\').join('/');
const isLang = /lang\/(en|ru)\/index\.json$/.test(u);
const isSidebar = /sidebarMenu\.tsx$/.test(u);
const isDashboard = /routes\/dashboard\.tsx$/.test(u);
const lines = fs.readFileSync(p, 'utf8').split('\n');
const out = [];
let i = 0, n = 0;
const ensureComma = (a) => {
  for (let j = a.length - 1; j >= 0; j--) {
    if (a[j].trim()) {
      if (!a[j].trimEnd().endsWith(',')) a[j] = a[j].replace(/\s*$/, '') + ',';
      break;
    }
  }
  return a;
};
while (i < lines.length) {
  if (lines[i].startsWith('<<<<<<<')) {
    n++;
    const ours = [], theirs = [];
    i++;
    while (!lines[i].startsWith('=======')) ours.push(lines[i++]);
    i++;
    while (!lines[i].startsWith('>>>>>>>')) theirs.push(lines[i++]);
    i++;
    if (isLang) out.push(...ensureComma(theirs.slice()), ...ours);
    else if (isSidebar) out.push(...ours, '  },', '  {', ...theirs);
    else if (isDashboard) out.push(...ours, '    subscriptionActive: [SUBSCRIPTION_TYPE.MAIN],', '  },', ...theirs);
    else out.push(...ours, ...theirs);
  } else {
    out.push(lines[i++]);
  }
}
fs.writeFileSync(p, out.join('\n'));
console.error(u + ': ' + n + ' block [' + (isLang ? 'lang' : isObjArray ? 'objarray' : 'verbatim') + ']');
