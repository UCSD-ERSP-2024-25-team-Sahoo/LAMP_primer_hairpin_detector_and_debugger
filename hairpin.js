/* ================================================================
   HAIRPIN.JS - Core Algorithms
   Contains: reverse complement, hairpin detection, primer splitting
   ================================================================ */

/* -----------------------
   Reverse Complement
------------------------ */
function revcomp(seq) {
  const map = { A: "T", T: "A", C: "G", G: "C" };
  return seq
    .split("")
    .reverse()
    .map(base => map[base] || base)
    .join("");
}

/* -----------------------
   Thermodynamic Calculations
------------------------ */

// Calculate GC content percentage
function calculateGCContent(seq) {
  if (!seq || seq.length === 0) return 0;
  seq = seq.toUpperCase();
  const gcCount = (seq.match(/[GC]/g) || []).length;
  return (gcCount / seq.length) * 100;
}

// Calculate melting temperature using basic formula
// Tm = 64.9 + 0.41 × GC% - 500/length
function calculateTm(seq) {
  if (!seq || seq.length === 0) return 0;
  const gc = calculateGCContent(seq);
  const length = seq.length;
  return 64.9 + (0.41 * gc) - (500 / length);
}

// Nearest-neighbor thermodynamic parameters (ΔG values at 37°C in kcal/mol)
// Reference: SantaLucia (1998) and Allawi & SantaLucia (1997)
const NN_DG = {
  'AA': -1.00, 'TT': -1.00,
  'AT': -0.88, 'TA': -0.58,
  'CA': -1.45, 'TG': -1.45,
  'GT': -1.44, 'AC': -1.44,
  'CT': -1.28, 'AG': -1.28,
  'GA': -1.30, 'TC': -1.30,
  'CG': -2.17, 'GC': -2.24,
  'GG': -1.84, 'CC': -1.84
};

// Calculate Gibbs free energy (ΔG) for a sequence
// Uses nearest-neighbor model
function calculateDeltaG(seq) {
  if (!seq || seq.length < 2) return 0;
  seq = seq.toUpperCase();
  
  let deltaG = 0;
  
  // Sum up nearest-neighbor contributions
  for (let i = 0; i < seq.length - 1; i++) {
    const dinucleotide = seq[i] + seq[i + 1];
    if (NN_DG[dinucleotide]) {
      deltaG += NN_DG[dinucleotide];
    }
  }
  
  // Add initiation penalty (approximately +0.2 kcal/mol for terminal AT, 0 for GC)
  const first = seq[0];
  const last = seq[seq.length - 1];
  if (first === 'A' || first === 'T') deltaG += 0.2;
  if (last === 'A' || last === 'T') deltaG += 0.2;
  
  return deltaG;
}

// Validate primer thermodynamics with LAMP-specific constraints
function validatePrimerThermodynamics(primer) {
  const warnings = [];
  const info = {};
  
  // Determine primer type from name
  const primerName = primer.name.toUpperCase();
  let primerType = 'unknown';
  
  if (primerName === 'F3' || primerName === 'B3') primerType = 'outer';
  else if (primerName === 'F2' || primerName === 'B2') primerType = 'outer';
  else if (primerName.includes('F1C') || primerName.includes('B1C')) primerType = 'inner_part';
  else if (primerName === 'LF' || primerName === 'LOOPF' || primerName === 'LB' || primerName === 'LOOPB') primerType = 'loop';
  else if (primerName === 'FIP' || primerName === 'BIP') primerType = 'inner_full';
  
  // For FIP/BIP, analyze both parts separately
  if (primer.isInner && primer.left && primer.right) {
    const isBIP = primer.name && primer.name.toUpperCase() === 'BIP';
    // Analyze left part (F1c/B1c)
    const leftGC = calculateGCContent(primer.left);
    const leftTm = calculateTm(primer.left);
    const left5DG = calculateDeltaG(primer.left.substring(0, Math.min(6, primer.left.length)));
    const left3DG = calculateDeltaG(primer.left.substring(Math.max(0, primer.left.length - 6)));
    
    info.leftGC = leftGC;
    info.leftTm = leftTm;
    info.left5DG = left5DG;
    info.left3DG = left3DG;
    
    // Validate left part Tm based on orientation
    if (leftGC < 40 || leftGC > 60) {
      warnings.push(`${primer.leftType} GC content ${leftGC.toFixed(1)}% outside 40-60% range`);
    }
    if (isBIP) {
      // Testing mode: BIP-left is forward
      if (leftTm < 59 || leftTm > 61) {
        warnings.push(`${primer.leftType} Tm ${leftTm.toFixed(1)}°C outside 59-61°C range`);
      }
    } else {
      // FIP-left (or default) is RC
      if (leftTm < 64 || leftTm > 66) {
        warnings.push(`${primer.leftType} Tm ${leftTm.toFixed(1)}°C outside 64-66°C range`);
      }
    }
    if (left5DG > -4.0) {
      warnings.push(`${primer.leftType} 5' end ΔG ${left5DG.toFixed(2)} > -4.0 kcal/mol (weak)`);
    }
    if (left3DG > -4.0) {
      warnings.push(`${primer.leftType} 3' end ΔG ${left3DG.toFixed(2)} > -4.0 kcal/mol (weak)`);
    }
    
    // Analyze right part (F2/B2)
    const rightGC = calculateGCContent(primer.right);
    const rightTm = calculateTm(primer.right);
    const right5DG = calculateDeltaG(primer.right.substring(0, Math.min(6, primer.right.length)));
    const right3DG = calculateDeltaG(primer.right.substring(Math.max(0, primer.right.length - 6)));
    
    info.rightGC = rightGC;
    info.rightTm = rightTm;
    info.right5DG = right5DG;
    info.right3DG = right3DG;
    
    // Validate right part Tm based on orientation
    if (rightGC < 40 || rightGC > 60) {
      warnings.push(`${primer.rightType} GC content ${rightGC.toFixed(1)}% outside 40-60% range`);
    }
    if (isBIP) {
      // Testing mode: BIP-right is RC
      if (rightTm < 64 || rightTm > 66) {
        warnings.push(`${primer.rightType} Tm ${rightTm.toFixed(1)}°C outside 64-66°C range`);
      }
    } else {
      // FIP-right (or default) is forward
      if (rightTm < 59 || rightTm > 61) {
        warnings.push(`${primer.rightType} Tm ${rightTm.toFixed(1)}°C outside 59-61°C range`);
      }
    }
    if (right5DG > -4.0) {
      warnings.push(`${primer.rightType} 5' end ΔG ${right5DG.toFixed(2)} > -4.0 kcal/mol (weak)`);
    }
    if (right3DG > -4.0) {
      warnings.push(`${primer.rightType} 3' end ΔG ${right3DG.toFixed(2)} > -4.0 kcal/mol (weak)`);
    }
  } else {
    // Regular primer or loop primer
    const gc = calculateGCContent(primer.seq);
    const tm = calculateTm(primer.seq);
    const dg5 = calculateDeltaG(primer.seq.substring(0, Math.min(6, primer.seq.length)));
    const dg3 = calculateDeltaG(primer.seq.substring(Math.max(0, primer.seq.length - 6)));
    
    info.gc = gc;
    info.tm = tm;
    info.dg5 = dg5;
    info.dg3 = dg3;
    
    // GC content validation (applies to all)
    if (gc < 40 || gc > 60) {
      warnings.push(`GC content ${gc.toFixed(1)}% outside 40-60% range`);
    }
    
    // Tm validation based on primer type
    if (primerType === 'outer') {
      if (tm < 59 || tm > 61) {
        warnings.push(`Tm ${tm.toFixed(1)}°C outside 59-61°C range for outer primers`);
      }
    } else if (primerType === 'loop') {
      if (tm < 64 || tm > 66) {
        warnings.push(`Tm ${tm.toFixed(1)}°C outside 64-66°C range for loop primers`);
      }
    }
    
    // ΔG validation for end stability
    if (dg5 > -4.0) {
      warnings.push(`5' end ΔG ${dg5.toFixed(2)} > -4.0 kcal/mol (weak binding)`);
    }
    if (dg3 > -4.0) {
      warnings.push(`3' end ΔG ${dg3.toFixed(2)} > -4.0 kcal/mol (weak binding)`);
    }
  }
  
  return { warnings, info };
}

/* -----------------------
   Hairpin Detection (3' and 5' ends)
   Adopts the proven Python logic
------------------------ */
function checkHairpin3Prime(primer, maxStem = 6, minStem = 2, maxLoop = 12) {
  primer = primer.toUpperCase();
  const n = primer.length;
  
  // Focus on 3' end region (most problematic)
  const scanRegion = n > 15 ? primer.slice(-15) : primer;
  const scanStart = n > 15 ? n - 15 : 0; // Offset in original primer
  
  console.log(`\n3' Hairpin check: ${primer}`);
  console.log(`  Scan region (last 15bp): ${scanRegion}`);

  for (let stemLen = maxStem; stemLen >= minStem; stemLen--) {
    const stem = scanRegion.slice(-stemLen); // 3' tail
    const rcStem = revcomp(stem);
    
    console.log(`  Checking stem_len=${stemLen}: stem="${stem}" rc="${rcStem}"`);

    // Search upstream (avoid trivial overlap)
    const searchRegion = scanRegion.slice(0, -stemLen);
    
    for (let loop = 3; loop <= maxLoop; loop++) {
      const start = searchRegion.length - stemLen - loop;
      if (start < 0) break;

      const window = searchRegion.slice(start, start + stemLen);
      
      if (window === rcStem) {
        const pos3PrimeFrom = n - stemLen;
        const posUpstreamStart = scanStart + start;
        
        console.log(`  ✓✓ 3' HAIRPIN FOUND!`);
        console.log(`    stem="${stem}" loop=${loop} stem_len=${stemLen}`);
        console.log(`    3' end at position ${pos3PrimeFrom} to ${n}`);
        console.log(`    Upstream pair at position ${posUpstreamStart} to ${posUpstreamStart + stemLen}`);
        
        return {
          type: "3prime",
          stemSeq: stem,
          stemRC: rcStem,
          stemLength: stemLen,
          loopLength: loop,
          pos3PrimeStart: pos3PrimeFrom,
          pos3PrimeEnd: n,
          posUpstreamStart: posUpstreamStart,
          posUpstreamEnd: posUpstreamStart + stemLen
        };
      }
    }
  }
  
  console.log(`  ✗ No 3' hairpin found`);
  return null;
}

function checkHairpin5Prime(primer, maxStem = 6, minStem = 2, maxLoop = 12) {
  primer = primer.toUpperCase();
  const n = primer.length;
  
  // Focus on 5' end region
  const scanRegion = n > 15 ? primer.slice(0, 15) : primer;
  
  console.log(`\n5' Hairpin check: ${primer}`);
  console.log(`  Scan region (first 15bp): ${scanRegion}`);

  for (let stemLen = maxStem; stemLen >= minStem; stemLen--) {
    const stem = scanRegion.slice(0, stemLen); // 5' head
    const rcStem = revcomp(stem);
    
    console.log(`  Checking stem_len=${stemLen}: stem="${stem}" rc="${rcStem}"`);

    // Search downstream (avoid trivial overlap)
    const searchStart = stemLen;
    
    for (let loop = 3; loop <= maxLoop; loop++) {
      const start = searchStart + loop;
      const end = start + stemLen;
      
      if (end > scanRegion.length) break;

      const window = scanRegion.slice(start, end);
      
      if (window === rcStem) {
        console.log(`  ✓✓ 5' HAIRPIN FOUND!`);
        console.log(`    stem="${stem}" loop=${loop} stem_len=${stemLen}`);
        console.log(`    5' end at position 0 to ${stemLen}`);
        console.log(`    Downstream pair at position ${start} to ${end}`);
        
        return {
          type: "5prime",
          stemSeq: stem,
          stemRC: rcStem,
          stemLength: stemLen,
          loopLength: loop,
          pos5PrimeStart: 0,
          pos5PrimeEnd: stemLen,
          posDownstreamStart: start,
          posDownstreamEnd: end
        };
      }
    }
  }
  
  console.log(`  ✗ No 5' hairpin found`);
  return null;
}

/* -----------------------
   Split FIP/BIP into F1c+F2 or B1c+B2
   FIP = F1c-spacer-F2 (F2 binds forward, F1c binds as RC)
   BIP = B1c-spacer-B2 (B2 binds forward, B1c binds as RC)
   
   Strategy: Try all possible splits, for each split:
   - Check if right part binds forward on gene
   - Check if left part's RC binds on gene
------------------------ */
function splitInnerPrimer(innerPrimer, gene, isFIP) {
  const seq = innerPrimer.toUpperCase();
  
  console.log(`\n=== Splitting ${isFIP ? 'FIP' : 'BIP'} ===`);
  console.log(`Full sequence: ${seq}`);
  console.log(`Length: ${seq.length}`);
  
  // Try different split points - right part between 15-35 bases
  for (let rightLen = 15; rightLen <= 35 && rightLen < seq.length - 10; rightLen++) {
    const leftPart = seq.slice(0, seq.length - rightLen);  // F1c or B1c
    const rightPart = seq.slice(seq.length - rightLen);     // F2 or B2
    
    // Check if right part binds forward on gene
    const rightIdx = gene.indexOf(rightPart);
    
    if (rightIdx !== -1) {
      // Found right part! Now check if left part's RC is on gene
      const leftRC = revcomp(leftPart);
      const leftIdx = gene.indexOf(leftRC);
      
      if (leftIdx !== -1) {
        console.log(`✓ Found valid split!`);
        console.log(`  Left part (${isFIP ? 'F1c' : 'B1c'}): ${leftPart}`);
        console.log(`  Left RC found at: ${leftIdx}`);
        console.log(`  Right part (${isFIP ? 'F2' : 'B2'}): ${rightPart}`);
        console.log(`  Right found at: ${rightIdx}`);
        
        return {
          found: true,
          left: leftPart,
          right: rightPart,
          leftType: isFIP ? "F1c" : "B1c",
          rightType: isFIP ? "F2" : "B2",
          leftStart: leftIdx,
          leftEnd: leftIdx + leftPart.length,
          rightStart: rightIdx,
          rightEnd: rightIdx + rightPart.length
        };
      }
    }
    
    // Also try the reverse order: left part binds forward, right part as RC
    const leftIdx2 = gene.indexOf(leftPart);
    if (leftIdx2 !== -1) {
      const rightRC = revcomp(rightPart);
      const rightIdx2 = gene.indexOf(rightRC);
      
      if (rightIdx2 !== -1) {
        console.log(`✓ Found valid split (reversed binding)!`);
        console.log(`  Left part (${isFIP ? 'F2' : 'B2'}): ${leftPart}`);
        console.log(`  Left found at: ${leftIdx2}`);
        console.log(`  Right part (${isFIP ? 'F1c' : 'B1c'}): ${rightPart}`);
        console.log(`  Right RC found at: ${rightIdx2}`);
        
        return {
          found: true,
          left: rightPart,  // Swap them
          right: leftPart,
          leftType: isFIP ? "F1c" : "B1c",
          rightType: isFIP ? "F2" : "B2",
          leftStart: rightIdx2,
          leftEnd: rightIdx2 + rightPart.length,
          rightStart: leftIdx2,
          rightEnd: leftIdx2 + leftPart.length
        };
      }
    }
  }
  
  console.log(`✗ No valid split found`);
  return { found: false };
}

/* -----------------------
   Cross-Dimer Detection
   Checks for 3' end complementarity between two primers
------------------------ */
function checkDimer(p1Name, p1Seq, p2Name, p2Seq, minMatch = 3) {
  p1Seq = p1Seq.toUpperCase();
  p2Seq = p2Seq.toUpperCase();
  
  const dimers = [];
  
  // Scan different lengths of 3' ends (from 3bp to 8bp)
  for (let matchLen = 8; matchLen >= minMatch; matchLen--) {
    // Check p1's 3' end binding to p2
    if (p1Seq.length >= matchLen) {
      const p1_3prime = p1Seq.slice(-matchLen);
      const p1_3prime_rc = revcomp(p1_3prime);
      const idxInP2 = p2Seq.indexOf(p1_3prime_rc);
      
      if (idxInP2 !== -1) {
        dimers.push({
          primer1: p1Name,
          primer2: p2Name,
          primer1_3prime: p1_3prime,
          primer1_3prime_rc: p1_3prime_rc,
          bindingPos: idxInP2,
          matchLength: matchLen,
          direction: "p1_to_p2"
        });
        // Return longest match found for this direction
        break;
      }
    }
  }
  
  // Check p2's 3' end binding to p1
  for (let matchLen = 8; matchLen >= minMatch; matchLen--) {
    if (p2Seq.length >= matchLen) {
      const p2_3prime = p2Seq.slice(-matchLen);
      const p2_3prime_rc = revcomp(p2_3prime);
      const idxInP1 = p1Seq.indexOf(p2_3prime_rc);
      
      if (idxInP1 !== -1) {
        dimers.push({
          primer1: p2Name,
          primer2: p1Name,
          primer1_3prime: p2_3prime,
          primer1_3prime_rc: p2_3prime_rc,
          bindingPos: idxInP1,
          matchLength: matchLen,
          direction: "p2_to_p1"
        });
        // Return longest match found for this direction
        break;
      }
    }
  }
  
  return dimers;
}

/* -----------------------
   Check All Cross-Dimers
   Analyzes all primer pairs for potential dimerization
------------------------ */
function checkAllDimers(primers) {
  const allDimers = [];
  
  // Check all unique pairs (i, j where i < j)
  for (let i = 0; i < primers.length; i++) {
    for (let j = i + 1; j < primers.length; j++) {
      const p1 = primers[i];
      const p2 = primers[j];
      
      // Get sequences - for FIP/BIP use full sequence
      const p1Seq = p1.seq;
      const p2Seq = p2.seq;
      
      const dimers = checkDimer(p1.name, p1Seq, p2.name, p2Seq);
      
      if (dimers.length > 0) {
        allDimers.push(...dimers);
      }
    }
  }
  
  return allDimers;
}

/* -----------------------
   Attach Primer Positions to Gene
   Finds where each primer binds and detects hairpins
------------------------ */
function attachPrimerPositions(gene, primers) {
  gene = gene.toUpperCase();

  for (let p of primers) {
    // Check for FIP/BIP
    const isFIP = p.name.toUpperCase() === "FIP";
    const isBIP = p.name.toUpperCase() === "BIP";

    if (isFIP || isBIP) {
      const split = splitInnerPrimer(p.seq, gene, isFIP);
      
      if (split.found) {
        p.isInner = true;
        p.left = split.left;
        p.right = split.right;
        p.leftType = split.leftType;
        p.rightType = split.rightType;
        p.leftStart = split.leftStart;
        p.leftEnd = split.leftEnd;
        p.rightStart = split.rightStart;
        p.rightEnd = split.rightEnd;

        // Enforce orientation per primer type
        // FIP: left binds as RC (F1c), right binds forward (F2)
        // BIP (testing mode): left binds forward (B1c), right binds as RC (B2)
        const bindsForward = (seq) => gene.indexOf(seq) !== -1;
        const bindsRC = (seq) => gene.indexOf(revcomp(seq)) !== -1;
        if (isFIP) {
          // Ensure left=RC, right=Fwd
          if (bindsForward(p.left) && bindsRC(p.right)) {
            const tmpSeq = p.left; p.left = p.right; p.right = tmpSeq;
            const tmpType = p.leftType; p.leftType = p.rightType; p.rightType = tmpType;
            const tmpStart = p.leftStart; const tmpEnd = p.leftEnd;
            p.leftStart = p.rightStart; p.leftEnd = p.rightEnd;
            p.rightStart = tmpStart; p.rightEnd = tmpEnd;
          }
        } else if (isBIP) {
          // Testing mode: Ensure left=Fwd, right=RC
          if (bindsRC(p.left) && bindsForward(p.right)) {
            const tmpSeq = p.left; p.left = p.right; p.right = tmpSeq;
            const tmpType = p.leftType; p.leftType = p.rightType; p.rightType = tmpType;
            const tmpStart = p.leftStart; const tmpEnd = p.leftEnd;
            p.leftStart = p.rightStart; p.leftEnd = p.rightEnd;
            p.rightStart = tmpStart; p.rightEnd = tmpEnd;
          }
        }

        // Normalize names strictly per requested convention
        if (isFIP) { p.leftType = "F1c"; p.rightType = "F2"; }
        else { p.leftType = "B1c"; p.rightType = "B2"; }
        
        // Hairpin detection on full sequence
        const hp3 = checkHairpin3Prime(p.seq);
        const hp5 = checkHairpin5Prime(p.seq);
        
        p.hairpin3 = hp3;
        p.hairpin5 = hp5;
        p.hasHairpin = !!(hp3 || hp5);
        
        continue;
      } else {
        p.isInner = true;
        p.orientation = "not split";
        p.start = -1;
        p.end = -1;
        continue;
      }
    }

    // Regular primer: find forward or reverse complement
    const forwardIdx = gene.indexOf(p.seq);
    const rcSeq = revcomp(p.seq);
    const reverseIdx = gene.indexOf(rcSeq);

    if (forwardIdx !== -1) {
      p.start = forwardIdx;
      p.end = forwardIdx + p.seq.length;
      p.orientation = "forward";
    } else if (reverseIdx !== -1) {
      p.start = reverseIdx;
      p.end = reverseIdx + p.seq.length;
      p.orientation = "reverse (RC)";
    } else {
      p.start = -1;
      p.end = -1;
      p.orientation = "not found";
    }

    // Hairpin detection - check the full sequence (for FIP/BIP, this is the combined sequence)
    const hp3 = checkHairpin3Prime(p.seq);
    const hp5 = checkHairpin5Prime(p.seq);

    p.hairpin3 = hp3;
    p.hairpin5 = hp5;
    p.hasHairpin = !!(hp3 || hp5);
  }
  
  // Check for cross-dimers between all primers
  const dimers = checkAllDimers(primers);
  return dimers;
}

/* -----------------------
   Optimizer Candidate Generation (MVP)
   - Enumerates inner primer splits (FIP/BIP)
   - Generates small adjustments for regular primers
------------------------ */

// Enumerate all valid splits for an inner primer across right-part lengths
function enumerateInnerPrimerSplits(innerSeq, gene, isFIP) {
  innerSeq = innerSeq.toUpperCase();
  gene = gene.toUpperCase();
  const results = [];

  for (let rightLen = 15; rightLen <= 35 && rightLen < innerSeq.length - 10; rightLen++) {
    const leftPart = innerSeq.slice(0, innerSeq.length - rightLen);
    const rightPart = innerSeq.slice(innerSeq.length - rightLen);

    // Case A: right binds forward; left RC binds
    const rightIdx = gene.indexOf(rightPart);
    const leftIdx = gene.indexOf(revcomp(leftPart));
    if (rightIdx !== -1 && leftIdx !== -1) {
      results.push({
        left: leftPart,
        right: rightPart,
        leftType: isFIP ? 'F1c' : 'B1c',
        rightType: isFIP ? 'F2' : 'B2',
        leftStart: leftIdx,
        leftEnd: leftIdx + leftPart.length,
        rightStart: rightIdx,
        rightEnd: rightIdx + rightPart.length,
      });
      continue; // prefer forward-right when available
    }

    // Case B: left binds forward; right RC binds (reversed binding)
    const leftIdx2 = gene.indexOf(leftPart);
    const rightIdx2 = gene.indexOf(revcomp(rightPart));
    if (leftIdx2 !== -1 && rightIdx2 !== -1) {
      // Normalize output to standard types by swapping parts
      // so that left corresponds to RC-bound component (F1c/B1c) and right to forward-bound (F2/B2)
      results.push({
        left: rightPart,
        right: leftPart,
        leftType: isFIP ? 'F1c' : 'B1c',
        rightType: isFIP ? 'F2' : 'B2',
        leftStart: rightIdx2,
        leftEnd: rightIdx2 + rightPart.length,
        rightStart: leftIdx2,
        rightEnd: leftIdx2 + leftPart.length,
      });
    }
  }

  return results;
}

// Compute a simple score for a regular primer candidate based on LAMP rules
function scoreRegularCandidate(name, info, hasHairpin) {
  const nm = name.toUpperCase();
  const targetTmRange = (nm === 'F3' || nm === 'B3' || nm === 'F2' || nm === 'B2') ? [59, 61]
                     : (nm.includes('LOOP') || nm === 'LF' || nm === 'LB') ? [64, 66]
                     : [59, 61];
  const tm = info.tm || 0;
  const gc = info.gc || 0;
  const dg5 = info.dg5 || 0;
  const dg3 = info.dg3 || 0;

  let score = 100;
  // Tm deviation penalty
  if (tm < targetTmRange[0]) score -= (targetTmRange[0] - tm) * 5;
  if (tm > targetTmRange[1]) score -= (tm - targetTmRange[1]) * 5;
  // GC deviation from 50%
  score -= Math.abs(gc - 50) * 0.8;
  // End stability penalties (prefer <= -4.0)
  if (dg5 > -4.0) score -= (dg5 + 4.0) * 10;
  if (dg3 > -4.0) score -= (dg3 + 4.0) * 12; // 3' more important
  // Hairpin penalty
  if (hasHairpin) score -= 20;
  return score;
}

// Compute a simple score for inner primer candidate based on part orientations
function scoreInnerCandidate(isBIP, info, hasHairpin) {
  const leftTm = info.leftTm || 0;
  const rightTm = info.rightTm || 0;
  const leftGC = info.leftGC || 0;
  const rightGC = info.rightGC || 0;
  const left5DG = info.left5DG || 0;
  const left3DG = info.left3DG || 0;
  const right5DG = info.right5DG || 0;
  const right3DG = info.right3DG || 0;

  // Targets depend on primer type (test mode BIP: left Fwd 59-61, right RC 64-66)
  const leftRange = isBIP ? [59, 61] : [64, 66];
  const rightRange = isBIP ? [64, 66] : [59, 61];

  let score = 100;
  // Tm penalties
  if (leftTm < leftRange[0]) score -= (leftRange[0] - leftTm) * 4;
  if (leftTm > leftRange[1]) score -= (leftTm - leftRange[1]) * 4;
  if (rightTm < rightRange[0]) score -= (rightRange[0] - rightTm) * 4;
  if (rightTm > rightRange[1]) score -= (rightTm - rightRange[1]) * 4;
  // GC deviations
  score -= Math.abs(leftGC - 50) * 0.6;
  score -= Math.abs(rightGC - 50) * 0.6;
  // End stabilities
  if (left5DG > -4.0) score -= (left5DG + 4.0) * 8;
  if (left3DG > -4.0) score -= (left3DG + 4.0) * 10;
  if (right5DG > -4.0) score -= (right5DG + 4.0) * 8;
  if (right3DG > -4.0) score -= (right3DG + 4.0) * 10;
  // Hairpin penalty
  if (hasHairpin) score -= 15;
  return score;
}

function generatePrimerCandidates(primer, gene, options) {
  gene = gene.toUpperCase();
  const candidates = [];
  const start = options && typeof options.start === 'number' ? Math.max(0, options.start) : 0;
  const end = options && typeof options.end === 'number' ? Math.min(gene.length, options.end) : gene.length;
  const topN = options && typeof options.topN === 'number' ? Math.max(1, options.topN) : 20;

  if (primer.name && (primer.name.toUpperCase() === 'FIP' || primer.name.toUpperCase() === 'BIP')) {
    const isFIP = primer.name.toUpperCase() === 'FIP';
    const isBIP = primer.name.toUpperCase() === 'BIP';
    const splits = enumerateInnerPrimerSplits(primer.seq, gene, isFIP);
    splits.forEach(s => {
      // Filter by interval: both parts start within [start, end)
      if (s.leftStart < start || s.leftStart >= end) return;
      if (s.rightStart < start || s.rightStart >= end) return;
      const cand = {
        name: primer.name,
        seq: s.left + s.right,
        isInner: true,
        left: s.left,
        right: s.right,
        leftType: s.leftType,
        rightType: s.rightType,
        leftStart: s.leftStart,
        leftEnd: s.leftEnd,
        rightStart: s.rightStart,
        rightEnd: s.rightEnd,
      };
      const therm = validatePrimerThermodynamics(cand);
      const hp3 = checkHairpin3Prime(cand.seq);
      const hp5 = checkHairpin5Prime(cand.seq);
      cand.hairpin3 = hp3; cand.hairpin5 = hp5; cand.hasHairpin = !!(hp3 || hp5);
      cand.score = scoreInnerCandidate(isBIP, therm.info, cand.hasHairpin);
      cand.info = therm.info;
      candidates.push(cand);
    });
  } else {
    // Regular primer: scan the selected interval using current length
    const nm = primer.name.toUpperCase();
    const isReverse = primer.orientation === 'reverse (RC)';
    const curLen = (primer.start !== -1 && primer.end !== -1) ? (primer.end - primer.start) : primer.seq.length;
    for (let s = start; s + curLen <= end; s++) {
      const newStart = s;
      const newEnd = s + curLen;
      let seqExtract = gene.substring(newStart, newEnd);
      const seqFinal = isReverse ? revcomp(seqExtract) : seqExtract;
      const cand = {
        name: primer.name,
        seq: seqFinal,
        isInner: false,
        start: newStart,
        end: newEnd,
        orientation: primer.orientation,
      };
      const therm = validatePrimerThermodynamics(cand);
      const hp3 = checkHairpin3Prime(cand.seq);
      const hp5 = checkHairpin5Prime(cand.seq);
      cand.hairpin3 = hp3; cand.hairpin5 = hp5; cand.hasHairpin = !!(hp3 || hp5);
      cand.score = scoreRegularCandidate(nm, therm.info, cand.hasHairpin);
      cand.info = therm.info;
      candidates.push(cand);
    }
  }

  // Sort by score descending and deduplicate by sequence
  const unique = new Map();
  candidates.forEach(c => {
    if (!unique.has(c.seq)) unique.set(c.seq, c);
    else {
      const existing = unique.get(c.seq);
      if (c.score > existing.score) unique.set(c.seq, c);
    }
  });
  const out = Array.from(unique.values()).sort((a,b) => b.score - a.score).slice(0, topN);
  return out;
}

// Expose optimizer to UI
window.generatePrimerCandidates = generatePrimerCandidates;
window.enumerateInnerPrimerSplits = enumerateInnerPrimerSplits;
