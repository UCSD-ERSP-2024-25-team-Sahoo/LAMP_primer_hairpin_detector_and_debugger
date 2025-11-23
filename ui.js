/* ================================================================
   UI.JS - User Interface Components
   Contains: table rendering, tooltips, interactive controls
   ================================================================ */

/* -----------------------
   Primer Table Rendering with Edit Controls
------------------------ */
function populatePrimerTable(gene, primers) {
  const body = document.querySelector("#primer-table tbody");
  body.innerHTML = "";

  primers.forEach((p, index) => {
    let nameDisplay = p.name;
    let seqDisplay = p.seq;
    let startDisplay = "-";
    let endDisplay = "-";
    let orientDisplay = p.orientation || "-";
    let hairpinDisplay = "No"; // Default
    let controlsDisplay = "";

    if (p.isInner) {
      // Show split format for FIP/BIP with color-coded parts
      const leftColor = getPrimerColor(p.leftType);
      const rightColor = getPrimerColor(p.rightType);
      
      nameDisplay = `<span style="background:${leftColor}; padding:1px 3px; border-radius:2px; font-weight:bold;">${p.name}</span>`;
      seqDisplay = `<span style="background:${leftColor}; padding:2px 4px; border-radius:3px;">${p.leftType}=${p.left}</span> ⊕ <span style="background:${rightColor}; padding:2px 4px; border-radius:3px;">${p.rightType}=${p.right}</span>`;
      
      if (p.leftStart !== undefined && p.leftStart !== -1 && 
          p.rightStart !== undefined && p.rightStart !== -1) {
        startDisplay = `${p.leftType}:${p.leftStart + 1}, ${p.rightType}:${p.rightStart + 1}`;
        endDisplay = `${p.leftType}:${p.leftEnd}, ${p.rightType}:${p.rightEnd}`;
        orientDisplay = `${p.leftType}:RC, ${p.rightType}:Fwd`;
        
        // Add controls for FIP/BIP parts
        controlsDisplay = `
          <div style="display: flex; gap: 5px; flex-direction: column; font-size: 10px;">
            <div>
              <strong>${p.leftType}:</strong>
              <input type="number" class="pos-input" data-primer-idx="${index}" data-part="left" data-pos="start" 
                     value="${p.leftStart + 1}" min="1" max="${gene.length}" style="width: 50px;">
              -
              <input type="number" class="pos-input" data-primer-idx="${index}" data-part="left" data-pos="end" 
                     value="${p.leftEnd}" min="1" max="${gene.length}" style="width: 50px;">
            </div>
            <div>
              <strong>${p.rightType}:</strong>
              <input type="number" class="pos-input" data-primer-idx="${index}" data-part="right" data-pos="start" 
                     value="${p.rightStart + 1}" min="1" max="${gene.length}" style="width: 50px;">
              -
              <input type="number" class="pos-input" data-primer-idx="${index}" data-part="right" data-pos="end" 
                     value="${p.rightEnd}" min="1" max="${gene.length}" style="width: 50px;">
            </div>
          </div>
        `;
      } else {
        orientDisplay = "split not found";
      }
    } else {
      const color = getPrimerColor(p.name);
      nameDisplay = `<span style="background:${color}; padding:1px 3px; border-radius:2px; font-weight:bold;">${p.name}</span>`;
      seqDisplay = `<span style="background:${color}; padding:2px 4px; border-radius:3px;">${p.seq}</span>`;
      
      if (p.start !== -1) {
        startDisplay = p.start + 1;
        endDisplay = p.end;
        
        // Add interactive controls for regular primers
        controlsDisplay = `
          <div style="display: flex; gap: 5px; align-items: center;">
            <input type="number" class="pos-input" data-primer-idx="${index}" data-pos="start" 
                   value="${p.start + 1}" min="1" max="${gene.length}" style="width: 60px;">
            <span>to</span>
            <input type="number" class="pos-input" data-primer-idx="${index}" data-pos="end" 
                   value="${p.end}" min="1" max="${gene.length}" style="width: 60px;">
          </div>
        `;
      } else {
        startDisplay = "-";
        endDisplay = "-";
      }
    }

    // Hairpin display with color-coded warnings
    if (p.hairpin3 && p.hairpin5) {
      hairpinDisplay = `<span style="color:#FF1493; font-weight:bold; border:2px solid #FF1493; padding:2px 4px; border-radius:3px;">3′</span> + <span style="color:#1E90FF; font-weight:bold; border:2px solid #1E90FF; padding:2px 4px; border-radius:3px;">5′</span>`;
    } else if (p.hairpin3) {
      hairpinDisplay = `<span style="color:#FF1493; font-weight:bold; border:2px solid #FF1493; padding:2px 4px; border-radius:3px;">3′ hairpin</span>`;
    } else if (p.hairpin5) {
      hairpinDisplay = `<span style="color:#1E90FF; font-weight:bold; border:2px solid #1E90FF; padding:2px 4px; border-radius:3px;">5′ hairpin</span>`;
    } else {
      hairpinDisplay = `<span style="color:green; font-weight:bold;">No</span>`;
    }

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${nameDisplay}</td>
      <td style="font-family: monospace; font-size: 12px;">${seqDisplay}</td>
      <td style="font-size: 11px;">${startDisplay}</td>
      <td style="font-size: 11px;">${endDisplay}</td>
      <td style="font-size: 11px;">${orientDisplay}</td>
      <td style="font-size: 11px; text-align: center;">${hairpinDisplay}</td>
      <td style="font-size: 11px;">${controlsDisplay}</td>
    `;

    body.appendChild(row);
  });

  // Attach event listeners to position inputs
  attachPositionInputListeners();
}

/* -----------------------
   Interactive Position Adjustment
------------------------ */
function attachPositionInputListeners() {
  const inputs = document.querySelectorAll(".pos-input");
  
  inputs.forEach(input => {
    input.addEventListener("change", (e) => {
      handlePositionChange(e.target);
    });
  });
}

function handlePositionChange(input) {
  const primerIdx = parseInt(input.dataset.primerIdx);
  const pos = input.dataset.pos; // 'start' or 'end'
  const part = input.dataset.part; // 'left' or 'right' (for FIP/BIP) or undefined
  const newValue = parseInt(input.value);
  
  // Get current state
  const gene = window.currentGene;
  const primers = window.currentPrimers;
  
  if (!gene || !primers || !primers[primerIdx]) {
    console.error("No gene/primer data available");
    return;
  }
  
  const primer = primers[primerIdx];
  
  // Update position
  if (primer.isInner) {
    // FIP/BIP - update specific part
    if (part === 'left') {
      if (pos === 'start') {
        primer.leftStart = newValue - 1; // Convert to 0-indexed
      } else {
        primer.leftEnd = newValue;
      }
      // Extract new sequence for left part
      primer.left = gene.substring(primer.leftStart, primer.leftEnd);
      // Reverse complement since left part binds as RC
      primer.left = revcomp(primer.left);
    } else if (part === 'right') {
      if (pos === 'start') {
        primer.rightStart = newValue - 1;
      } else {
        primer.rightEnd = newValue;
      }
      // Extract new sequence for right part (binds forward)
      primer.right = gene.substring(primer.rightStart, primer.rightEnd);
    }
    
    // Recombine full FIP/BIP sequence
    primer.seq = primer.left + primer.right;
    
  } else {
    // Regular primer
    if (pos === 'start') {
      primer.start = newValue - 1; // Convert to 0-indexed
    } else {
      primer.end = newValue;
    }
    
    // Extract new sequence based on orientation
    if (primer.orientation === "forward") {
      primer.seq = gene.substring(primer.start, primer.end);
    } else if (primer.orientation === "reverse (RC)") {
      const extracted = gene.substring(primer.start, primer.end);
      primer.seq = revcomp(extracted);
    }
  }
  
  // Re-run hairpin detection on the updated primer
  const hp3 = checkHairpin3Prime(primer.seq);
  const hp5 = checkHairpin5Prime(primer.seq);
  
  primer.hairpin3 = hp3;
  primer.hairpin5 = hp5;
  primer.hasHairpin = !!(hp3 || hp5);
  
  console.log(`Updated ${primer.name}:`, primer);
  
  // Re-render everything
  displaySequence(gene, primers);
  populatePrimerTable(gene, primers);
}

/* -----------------------
   Tooltip Setup
------------------------ */
function setupTooltips() {
  // Add CSS for tooltips
  const style = document.createElement('style');
  style.textContent = `
    .sequence-base {
      position: relative;
      cursor: help;
    }
    
    .sequence-base:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 1000;
      pointer-events: none;
      margin-bottom: 5px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    
    .sequence-base:hover::before {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: rgba(0, 0, 0, 0.9);
      z-index: 1000;
      pointer-events: none;
    }
    
    .pos-input {
      padding: 2px 4px;
      border: 1px solid #ccc;
      border-radius: 3px;
      font-size: 11px;
    }
    
    .pos-input:focus {
      outline: 2px solid #4A90E2;
      border-color: #4A90E2;
    }
  `;
  document.head.appendChild(style);
}

// Initialize tooltips on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTooltips);
} else {
  setupTooltips();
}
