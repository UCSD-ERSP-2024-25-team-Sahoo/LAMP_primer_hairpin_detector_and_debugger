/* ================================================================
   UI.JS - User Interface Components
   
   This module handles all user interface interactions including:
   - Primer table rendering with interactive controls
   - Real-time position adjustment with live updates
   - Overlap detection and warning system
   - Tooltip initialization
   
   Dependencies: hairpin.js (for hairpin detection functions)
   ================================================================ */

/* -----------------------
   Primer Table Rendering with Interactive Edit Controls
   
   Generates the visual table showing all primer information:
   - Name (color-coded)
   - Sequence (with split display for FIP/BIP)
   - Length in base pairs
   - Orientation (forward/reverse)
   - Hairpin detection status (3', 5', or both)
   - Position adjustment controls (input fields)
------------------------ */
function populatePrimerTable(gene, primers) {
  const body = document.querySelector("#primer-table tbody");
  body.innerHTML = "";

  primers.forEach((p, index) => {
    let nameDisplay = p.name;
    let seqDisplay = p.seq;
    let lengthDisplay = "-";
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
        const leftLength = p.leftEnd - p.leftStart;
        const rightLength = p.rightEnd - p.rightStart;
        lengthDisplay = `${p.leftType}:${leftLength}bp, ${p.rightType}:${rightLength}bp`;
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
        const length = p.end - p.start;
        lengthDisplay = `${length}bp`;
        
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
        lengthDisplay = "-";
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
      <td style="font-size: 11px;">${lengthDisplay}</td>
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
   Interactive Position Adjustment System
   
   Allows users to modify primer positions in real-time:
   1. Attach event listeners to all position input fields
   2. When changed, extract new sequence from gene
   3. Recalculate hairpin detection
   4. Check for primer overlaps
   5. Re-render visualization and table
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
  
  // Check for overlaps with other primers
  checkPrimerOverlaps(primers, primerIdx);
  
  // Validate primer length against recommended ranges
  validatePrimerLength(primer);
  
  // Re-render everything
  displaySequence(gene, primers);
  populatePrimerTable(gene, primers);
}

/* -----------------------
   Overlap Detection and Warning System
   
   Detects when primers overlap on the gene sequence:
   - Checks all primer pairs for position overlaps
   - Handles both regular primers and FIP/BIP components
   - Displays persistent warning popup until overlap is resolved
   - Auto-clears when positions are adjusted to remove overlap
------------------------ */
function checkPrimerOverlaps(primers, changedIdx) {
  const changedPrimer = primers[changedIdx];
  let overlaps = [];
  
  // Compare changed primer against all other primers
  primers.forEach((p, idx) => {
    if (idx === changedIdx) return; // Skip comparing primer to itself
    
    // Extract position ranges for the changed primer
    // (FIP/BIP primers have two ranges: left and right components)
    let changedRanges = [];
    if (changedPrimer.isInner) {
      // FIP/BIP: Add both components if they're bound to gene
      if (changedPrimer.leftStart !== -1) {
        changedRanges.push({ start: changedPrimer.leftStart, end: changedPrimer.leftEnd, part: changedPrimer.leftType });
      }
      if (changedPrimer.rightStart !== -1) {
        changedRanges.push({ start: changedPrimer.rightStart, end: changedPrimer.rightEnd, part: changedPrimer.rightType });
      }
    } else if (changedPrimer.start !== -1) {
      // Regular primer: Single range
      changedRanges.push({ start: changedPrimer.start, end: changedPrimer.end, part: null });
    }
    
    // Extract position ranges for the comparison primer
    let compRanges = [];
    if (p.isInner) {
      // FIP/BIP: Add both components if they're bound to gene
      if (p.leftStart !== -1) {
        compRanges.push({ start: p.leftStart, end: p.leftEnd, part: p.leftType });
      }
      if (p.rightStart !== -1) {
        compRanges.push({ start: p.rightStart, end: p.rightEnd, part: p.rightType });
      }
    } else if (p.start !== -1) {
      // Regular primer: Single range
      compRanges.push({ start: p.start, end: p.end, part: null });
    }
    
    // Check all range combinations for overlap
    // (e.g., F3 vs F1c, F3 vs F2, B3 vs B1c, etc.)
    changedRanges.forEach(r1 => {
      compRanges.forEach(r2 => {
        if (rangesOverlap(r1.start, r1.end, r2.start, r2.end)) {
          // Build descriptive overlap message
          const changedName = r1.part ? `${changedPrimer.name} (${r1.part})` : changedPrimer.name;
          const compName = r2.part ? `${p.name} (${r2.part})` : p.name;
          overlaps.push(`${changedName} overlaps with ${compName}`);
        }
      });
    });
  });
  
  // Display or clear warning based on overlap status
  if (overlaps.length > 0) {
    showOverlapWarning(overlaps);
  } else {
    clearOverlapWarning();
  }
}

// Helper function: Check if two ranges overlap
// Returns true if ranges [start1, end1) and [start2, end2) overlap
function rangesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

// Display overlap warning popup with list of conflicts
function showOverlapWarning(messages) {
  // Remove any existing warning first
  clearOverlapWarning();
  
  // Create warning popup element (styled via inline CSS + style.css animations)
  const warning = document.createElement('div');
  warning.id = 'overlap-warning';
  warning.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4444;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 350px;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;
  
  
  // Build warning content with close button and overlap list
  warning.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
      <strong style="font-size: 15px;">⚠️ Primer Overlap Detected</strong>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; margin-left: 10px;">&times;</button>
    </div>
    <div style="font-size: 13px; line-height: 1.5;">
      ${messages.map(m => `• ${m}`).join('<br>')}
    </div>
  `;
  
  // Append to page (stays until overlap is resolved or manually closed)
  document.body.appendChild(warning);
}

// Remove overlap warning popup from page
function clearOverlapWarning() {
  const existing = document.getElementById('overlap-warning');
  if (existing) {
    existing.remove();
  }
}

/* -----------------------
   Primer Length Validation System
   
   Validates primer lengths against LAMP recommended ranges:
   - F3/B3: 18-22 bp
   - F2/B2: 18-22 bp
   - F1c/B1c: 18-25 bp
   - LoopF/LoopB: 15-22 bp
   - FIP/BIP total: 38-45 bp
   
   Displays warning popup for out-of-range lengths
------------------------ */

// Recommended length ranges for each primer type
const PRIMER_LENGTH_RANGES = {
  'F3': { min: 18, max: 22 },
  'B3': { min: 18, max: 22 },
  'F2': { min: 18, max: 22 },
  'B2': { min: 18, max: 22 },
  'F1c': { min: 18, max: 25 },
  'B1c': { min: 18, max: 25 },
  'LoopF': { min: 15, max: 22 },
  'LF': { min: 15, max: 22 },
  'LoopB': { min: 15, max: 22 },
  'LB': { min: 15, max: 22 },
  'FIP': { min: 38, max: 45 },  // Total length (F1c + F2)
  'BIP': { min: 38, max: 45 }   // Total length (B1c + B2)
};

// Get primer length warnings without displaying (for batch validation)
function getPrimerLengthWarnings(primer) {
  let warnings = [];
  
  if (primer.isInner) {
    // FIP/BIP: Check total length and individual components
    const totalLength = primer.seq.length;
    const range = PRIMER_LENGTH_RANGES[primer.name];
    
    if (range) {
      if (totalLength < range.min || totalLength > range.max) {
        warnings.push(`${primer.name} total length ${totalLength}bp is outside recommended ${range.min}-${range.max}bp`);
      }
    }
    
    // Check individual components (F1c/B1c and F2/B2)
    if (primer.leftStart !== -1) {
      const leftLength = primer.leftEnd - primer.leftStart;
      const leftRange = PRIMER_LENGTH_RANGES[primer.leftType];
      if (leftRange && (leftLength < leftRange.min || leftLength > leftRange.max)) {
        warnings.push(`${primer.leftType} length ${leftLength}bp is outside recommended ${leftRange.min}-${leftRange.max}bp`);
      }
    }
    
    if (primer.rightStart !== -1) {
      const rightLength = primer.rightEnd - primer.rightStart;
      const rightRange = PRIMER_LENGTH_RANGES[primer.rightType];
      if (rightRange && (rightLength < rightRange.min || rightLength > rightRange.max)) {
        warnings.push(`${primer.rightType} length ${rightLength}bp is outside recommended ${rightRange.min}-${rightRange.max}bp`);
      }
    }
  } else {
    // Regular primer: Check single length
    if (primer.start !== -1) {
      const length = primer.end - primer.start;
      const range = PRIMER_LENGTH_RANGES[primer.name];
      
      if (range) {
        if (length < range.min || length > range.max) {
          warnings.push(`${primer.name} length ${length}bp is outside recommended ${range.min}-${range.max}bp`);
        }
      }
    }
  }
  
  return warnings;
}

// Validate primer length and show warning if out of range (for single primer)
function validatePrimerLength(primer) {
  const warnings = getPrimerLengthWarnings(primer);
  
  // Display or clear warning
  if (warnings.length > 0) {
    showLengthWarning(warnings);
  } else {
    clearLengthWarning();
  }
}

// Display length validation warning popup (orange/amber color)
function showLengthWarning(messages) {
  // Remove any existing warning first
  clearLengthWarning();
  
  // Create warning popup element
  const warning = document.createElement('div');
  warning.id = 'length-warning';
  warning.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff9800;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 9999;
    max-width: 350px;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Build warning content with close button and validation messages
  warning.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
      <strong style="font-size: 15px;">⚠️ Length Validation Warning</strong>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; margin-left: 10px;">&times;</button>
    </div>
    <div style="font-size: 13px; line-height: 1.5;">
      ${messages.map(m => `• ${m}`).join('<br>')}
    </div>
  `;
  
  // Append to page (stays until length is corrected or manually closed)
  document.body.appendChild(warning);
}

// Remove length validation warning popup from page
function clearLengthWarning() {
  const existing = document.getElementById('length-warning');
  if (existing) {
    existing.remove();
  }
}

/* -----------------------
   Tooltip Setup (CSS is now in style.css)
------------------------ */
// Note: Tooltip styles have been moved to style.css for better organization
// This function is kept for future extensibility
function setupTooltips() {
  // All CSS now in style.css
  // This function can be extended for dynamic tooltip features if needed
}

// Initialize tooltips on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTooltips);
} else {
  setupTooltips();
}
