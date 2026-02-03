/* ================================================================
   SEQUENCE.JS - Sequence Visualization
   Contains: sequence display, highlighting, tooltips
   ================================================================ */

/* -----------------------
   Primer Colors
------------------------ */
const primerColors = {
  // Forward primers
  F3: "#90EE90",      // Light green
  F2: "#87CEEB",      // Sky blue
  F1c: "#FFD700",     // Gold
  FIP: "#DDA0DD",     // Plum
  
  // Backward primers
  B3: "#FFB6C1",      // Light pink
  B2: "#FFA500",      // Orange
  B1c: "#E0BBE4",     // Lavender
  BIP: "#B0E0E6",     // Powder blue
  
  // Loop primers
  LoopF: "#6f8e6fff",   // Pale green
  LF: "#6f8e6fff",      // Same as LoopF
  LoopB: "#FFDAB9",   // Peach
  LB: "#FFDAB9",      // Same as LoopB
};

function getPrimerColor(type) {
  // Normalize the type (case-insensitive matching)
  const normalizedType = type ? type.toUpperCase() : '';
  
  // Direct match
  if (primerColors[type]) {
    return primerColors[type];
  }
  
  // Case-insensitive match
  const matchedKey = Object.keys(primerColors).find(
    key => key.toUpperCase() === normalizedType
  );
  
  if (matchedKey) {
    return primerColors[matchedKey];
  }
  
  // Generate unique color for unknown primers based on hash
  // This ensures even unknown primers get distinct colors
  const hash = type.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 75%)`; // HSL for consistent brightness/saturation
}

/* -----------------------
   Sequence Visualization with Tooltips
------------------------ */
function displaySequence(gene, primers, exonJunctions = []) {
  const viewer = document.getElementById("sequence-viewer");
  viewer.innerHTML = "";

  let chars = gene.split("").map((base, idx) => ({
    base: base,
    index: idx,
    highlights: []  // Will store all highlighting info for this position
  }));

  primers.forEach(p => {
    if (!p.isInner) {
      // Regular primer - highlight the whole thing
      addHighlight(chars, p.start, p.end, {
        color: getPrimerColor(p.name),
        type: 'primer',
        primer: p
      });
      
      // Hairpin highlights for regular primers - show BOTH bonding regions
      if (p.hairpin3 && p.start !== -1) {
        const hp = p.hairpin3;
        
        if (p.orientation === "forward") {
          const tail3Start = p.start + hp.pos3PrimeStart;
          const tail3End = p.start + hp.pos3PrimeEnd;
          const compStart = p.start + hp.posUpstreamStart;
          const compEnd = p.start + hp.posUpstreamEnd;
          
          addHighlight(chars, tail3Start, tail3End, {
            color: "#FF1493",
            borderColor: "#FF1493",
            type: 'hairpin3_tail',
            primer: p,
            hairpin: hp
          });
          addHighlight(chars, compStart, compEnd, {
            color: "#C71585",
            borderColor: "#FF1493",
            type: 'hairpin3_comp',
            primer: p,
            hairpin: hp
          });
        } else if (p.orientation === "reverse (RC)") {
          const primerLen = p.seq.length;
          const tail3Start = p.start + (primerLen - hp.pos3PrimeEnd);
          const tail3End = p.start + (primerLen - hp.pos3PrimeStart);
          const compStart = p.start + (primerLen - hp.posUpstreamEnd);
          const compEnd = p.start + (primerLen - hp.posUpstreamStart);
          
          addHighlight(chars, tail3Start, tail3End, {
            color: "#FF1493",
            borderColor: "#FF1493",
            type: 'hairpin3_tail',
            primer: p,
            hairpin: hp
          });
          addHighlight(chars, compStart, compEnd, {
            color: "#C71585",
            borderColor: "#FF1493",
            type: 'hairpin3_comp',
            primer: p,
            hairpin: hp
          });
        }
      }
      
      if (p.hairpin5 && p.start !== -1) {
        const hp = p.hairpin5;
        
        if (p.orientation === "forward") {
          const head5Start = p.start + hp.pos5PrimeStart;
          const head5End = p.start + hp.pos5PrimeEnd;
          const compStart = p.start + hp.posDownstreamStart;
          const compEnd = p.start + hp.posDownstreamEnd;
          
          addHighlight(chars, head5Start, head5End, {
            color: "#1E90FF",
            borderColor: "#1E90FF",
            type: 'hairpin5_head',
            primer: p,
            hairpin: hp
          });
          addHighlight(chars, compStart, compEnd, {
            color: "#4169E1",
            borderColor: "#1E90FF",
            type: 'hairpin5_comp',
            primer: p,
            hairpin: hp
          });
        } else if (p.orientation === "reverse (RC)") {
          const primerLen = p.seq.length;
          const head5Start = p.start + (primerLen - hp.pos5PrimeEnd);
          const head5End = p.start + (primerLen - hp.pos5PrimeStart);
          const compStart = p.start + (primerLen - hp.posDownstreamEnd);
          const compEnd = p.start + (primerLen - hp.posDownstreamStart);
          
          addHighlight(chars, head5Start, head5End, {
            color: "#1E90FF",
            borderColor: "#1E90FF",
            type: 'hairpin5_head',
            primer: p,
            hairpin: hp
          });
          addHighlight(chars, compStart, compEnd, {
            color: "#4169E1",
            borderColor: "#1E90FF",
            type: 'hairpin5_comp',
            primer: p,
            hairpin: hp
          });
        }
      }
    } else {
      // FIP/BIP - highlight both parts
      if (p.rightStart !== undefined && p.rightStart !== -1) {
        addHighlight(chars, p.rightStart, p.rightEnd, {
          color: getPrimerColor(p.rightType),
          type: 'fip_bip_part',
          primer: p,
          partType: p.rightType
        });
      }

      if (p.leftStart !== undefined && p.leftStart !== -1) {
        addHighlight(chars, p.leftStart, p.leftEnd, {
          color: getPrimerColor(p.leftType),
          type: 'fip_bip_part',
          primer: p,
          partType: p.leftType
        });
      }
      
      // Hairpin highlights for FIP/BIP
      if (p.hairpin3) {
        const hp = p.hairpin3;
        const leftPartLen = p.left.length;
        const rightPartStartInSeq = leftPartLen;
        const isBIP = p.name && p.name.toUpperCase() === 'BIP';
        const tail3StartInSeq = hp.pos3PrimeStart;
        const tail3EndInSeq = hp.pos3PrimeEnd;
        const compStartInSeq = hp.posUpstreamStart;
        const compEndInSeq = hp.posUpstreamEnd;
        
        if (p.rightStart !== undefined && p.rightStart !== -1) {
          if (tail3StartInSeq >= rightPartStartInSeq) {
            const rightLen = p.right.length;
            const offsetStart = tail3StartInSeq - rightPartStartInSeq;
            const offsetEnd = tail3EndInSeq - rightPartStartInSeq;
            let tail3Start, tail3End;
            if (isBIP) {
              // Right is RC in testing mode: reverse mapping
              tail3Start = p.rightStart + (rightLen - offsetEnd);
              tail3End = p.rightStart + (rightLen - offsetStart);
            } else {
              // Right is forward
              tail3Start = p.rightStart + offsetStart;
              tail3End = p.rightStart + offsetEnd;
            }
            
            addHighlight(chars, tail3Start, tail3End, {
              color: "#FF1493",
              borderColor: "#FF1493",
              type: 'hairpin3_tail',
              primer: p,
              hairpin: hp
            });
          }
          
          if (compStartInSeq >= rightPartStartInSeq) {
            const rightLen = p.right.length;
            const offsetStart = compStartInSeq - rightPartStartInSeq;
            const offsetEnd = compEndInSeq - rightPartStartInSeq;
            let compStart, compEnd;
            if (isBIP) {
              // Right is RC
              compStart = p.rightStart + (rightLen - offsetEnd);
              compEnd = p.rightStart + (rightLen - offsetStart);
            } else {
              // Right is forward
              compStart = p.rightStart + offsetStart;
              compEnd = p.rightStart + offsetEnd;
            }
            
            addHighlight(chars, compStart, compEnd, {
              color: "#C71585",
              borderColor: "#FF1493",
              type: 'hairpin3_comp',
              primer: p,
              hairpin: hp
            });
          }
        }
        
        if (p.leftStart !== undefined && p.leftStart !== -1) {
          if (compStartInSeq < leftPartLen) {
            let compStartOnGene, compEndOnGene;
            if (isBIP) {
              // Left is forward in testing mode
              compStartOnGene = p.leftStart + compStartInSeq;
              compEndOnGene = p.leftStart + compEndInSeq;
            } else {
              // Left is RC
              compStartOnGene = p.leftStart + (leftPartLen - compEndInSeq);
              compEndOnGene = p.leftStart + (leftPartLen - compStartInSeq);
            }
            
            addHighlight(chars, compStartOnGene, compEndOnGene, {
              color: "#C71585",
              borderColor: "#FF1493",
              type: 'hairpin3_comp',
              primer: p,
              hairpin: hp
            });
          }
        }
      }
      
      if (p.hairpin5) {
        const hp = p.hairpin5;
        const leftPartLen = p.left.length;
        const rightPartStartInSeq = leftPartLen;
        const isBIP = p.name && p.name.toUpperCase() === 'BIP';
        const head5StartInSeq = hp.pos5PrimeStart;
        const head5EndInSeq = hp.pos5PrimeEnd;
        const compStartInSeq = hp.posDownstreamStart;
        const compEndInSeq = hp.posDownstreamEnd;
        
        if (p.leftStart !== undefined && p.leftStart !== -1) {
          if (head5StartInSeq < leftPartLen) {
            let head5StartOnGene, head5EndOnGene;
            if (isBIP) {
              // Left is forward: direct mapping
              head5StartOnGene = p.leftStart + head5StartInSeq;
              head5EndOnGene = p.leftStart + head5EndInSeq;
            } else {
              // Left is RC: reverse mapping
              head5StartOnGene = p.leftStart + (leftPartLen - head5EndInSeq);
              head5EndOnGene = p.leftStart + (leftPartLen - head5StartInSeq);
            }
            
            addHighlight(chars, head5StartOnGene, head5EndOnGene, {
              color: "#1E90FF",
              borderColor: "#1E90FF",
              type: 'hairpin5_head',
              primer: p,
              hairpin: hp
            });
          }
          
          if (compStartInSeq < leftPartLen) {
            let compStartOnGene, compEndOnGene;
            if (isBIP) {
              // Left is forward
              compStartOnGene = p.leftStart + compStartInSeq;
              compEndOnGene = p.leftStart + compEndInSeq;
            } else {
              // Left is RC
              compStartOnGene = p.leftStart + (leftPartLen - compEndInSeq);
              compEndOnGene = p.leftStart + (leftPartLen - compStartInSeq);
            }
            
            addHighlight(chars, compStartOnGene, compEndOnGene, {
              color: "#4169E1",
              borderColor: "#1E90FF",
              type: 'hairpin5_comp',
              primer: p,
              hairpin: hp
            });
          }
        }
        
        if (p.rightStart !== undefined && p.rightStart !== -1) {
          if (head5EndInSeq > leftPartLen) {
            const rightLen = p.right.length;
            const offsetStart = Math.max(0, head5StartInSeq - rightPartStartInSeq);
            const offsetEnd = head5EndInSeq - rightPartStartInSeq;
            let head5Start, head5End;
            if (isBIP) {
              // Right is RC: reverse mapping
              head5Start = p.rightStart + (rightLen - offsetEnd);
              head5End = p.rightStart + (rightLen - offsetStart);
            } else {
              // Right is forward
              head5Start = p.rightStart + offsetStart;
              head5End = p.rightStart + offsetEnd;
            }
            
            addHighlight(chars, head5Start, head5End, {
              color: "#1E90FF",
              borderColor: "#1E90FF",
              type: 'hairpin5_head',
              primer: p,
              hairpin: hp
            });
          }
          
          if (compEndInSeq > leftPartLen) {
            const rightLen = p.right.length;
            const offsetStart = Math.max(0, compStartInSeq - rightPartStartInSeq);
            const offsetEnd = compEndInSeq - rightPartStartInSeq;
            let compStart, compEnd;
            if (isBIP) {
              // Right is RC: reverse mapping
              compStart = p.rightStart + (rightLen - offsetEnd);
              compEnd = p.rightStart + (rightLen - offsetStart);
            } else {
              // Right is forward
              compStart = p.rightStart + offsetStart;
              compEnd = p.rightStart + offsetEnd;
            }
            
            addHighlight(chars, compStart, compEnd, {
              color: "#4169E1",
              borderColor: "#1E90FF",
              type: 'hairpin5_comp',
              primer: p,
              hairpin: hp
            });
          }
        }
      }
    }
  });

  // Render with tooltips and exon junction markers
  let html = '';
  chars.forEach((charObj, idx) => {
    // Render the base
    if (charObj.highlights.length === 0) {
      html += charObj.base;
    } else {
      // Use the top-most (last added) highlight for visual styling
      const topHighlight = charObj.highlights[charObj.highlights.length - 1];
      const border = topHighlight.borderColor ? 
        `border: 2px solid ${topHighlight.borderColor}; font-weight: bold;` : "";
      
      // Generate tooltip content from ALL highlights at this position
      const tooltipText = generateTooltip(charObj.highlights, charObj.index);
      
      html += `<span class="sequence-base" 
                    style="background:${topHighlight.color}; padding:2px; border-radius:3px; ${border}" 
                    data-tooltip="${tooltipText}">${charObj.base}</span>`;
    }
    
    // Add exon junction marker after this base if position matches
    // Junction at position N means: junction appears after base at index N-1
    const junctionAtThisPos = exonJunctions.find(j => {
      // Handle both old format (numbers) and new format (objects)
      const pos = typeof j === 'number' ? j : j.adjusted;
      return pos === idx + 1;
    });
    
    if (junctionAtThisPos) {
      const adjustedPos = typeof junctionAtThisPos === 'number' ? junctionAtThisPos : junctionAtThisPos.adjusted;
      const originalPos = typeof junctionAtThisPos === 'number' ? junctionAtThisPos : junctionAtThisPos.original;
      const tooltipText = originalPos === adjustedPos 
        ? `Exon junction at position ${adjustedPos}`
        : `Exon junction at position ${adjustedPos} (reference position: ${originalPos})`;
      
      html += `<span class="exon-junction" data-position="${adjustedPos}" title="${tooltipText}"></span>`;
    }
  });

  viewer.innerHTML = html;
}

function addHighlight(chars, start, end, highlightInfo) {
  if (start < 0 || start === undefined || end === undefined) return;
  for (let i = start; i < end && i < chars.length; i++) {
    chars[i].highlights.push(highlightInfo);
  }
}

function generateTooltip(highlights, position) {
  const parts = [];
  
  highlights.forEach(h => {
    if (h.type === 'primer') {
      parts.push(`${h.primer.name} (${h.primer.orientation})`);
    } else if (h.type === 'fip_bip_part') {
      parts.push(`${h.primer.name} - ${h.partType}`);
    } else if (h.type === 'hairpin3_tail') {
      parts.push(`3′ hairpin tail (stem: ${h.hairpin.stemLength}bp, loop: ${h.hairpin.loopLength}bp)`);
    } else if (h.type === 'hairpin3_comp') {
      parts.push(`3′ hairpin complement`);
    } else if (h.type === 'hairpin5_head') {
      parts.push(`5′ hairpin head (stem: ${h.hairpin.stemLength}bp, loop: ${h.hairpin.loopLength}bp)`);
    } else if (h.type === 'hairpin5_comp') {
      parts.push(`5′ hairpin complement`);
    }
  });
  
  parts.push(`Position: ${position + 1}`);
  
  // Escape quotes for HTML attribute
  return parts.join(' | ').replace(/"/g, '&quot;');
}
