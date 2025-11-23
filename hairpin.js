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
}
