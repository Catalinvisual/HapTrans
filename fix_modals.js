const fs = require('fs');

function wrapModal(filePath, patterns) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('import { createPortal }')) {
        content = content.replace(/import { useState/, "import { createPortal } from 'react-dom';\nimport { useState");
    }
    
    let changed = false;
    for (const p of patterns) {
        if (content.includes(p.start) && !content.includes('createPortal(' + p.start)) {
            content = content.replace(p.start, '{typeof document !== "undefined" && createPortal(' + p.inner + ',');
            content = content.replace(p.end, '</div>, document.body)}');
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed', filePath);
    }
}

// InvoicesPage
let invContent = fs.readFileSync('client/src/pages/InvoicesPage.tsx', 'utf8');
if (!invContent.includes('import { createPortal }')) {
    invContent = invContent.replace('import { useState', "import { createPortal } from 'react-dom';\nimport { useState");
}
// Fix showForm
invContent = invContent.replace(/\{showForm && <div className="fixed inset-0/g, '{showForm && typeof document !== "undefined" && createPortal(<div className="fixed inset-0');
// Need to find the end of showForm. It's too hard with regex.
