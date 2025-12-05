/* ================================================================
   APP.JS - Main Application Orchestration
   Coordinates between hairpin.js, sequence.js, and ui.js
   ================================================================ */

// Global state for real-time updates
window.currentGene = null;
window.currentPrimers = null;

// Character counter for gene sequence (runs immediately since script is at bottom)
const geneSeqInput = document.getElementById("gene-sequence");
const charCountDisplay = document.getElementById("char-count");

if (geneSeqInput && charCountDisplay) {
  function updateCharCount() {
    const text = geneSeqInput.value;
    const count = text.length;
    charCountDisplay.textContent = `${count.toLocaleString()} characters`;
  }

  geneSeqInput.addEventListener("input", updateCharCount);
  geneSeqInput.addEventListener("paste", () => setTimeout(updateCharCount, 0));
  
  // Initialize count
  updateCharCount();
}

document.getElementById("analyze-btn").addEventListener("click", runAnalysis);

function runAnalysis() {
  const geneSeq = cleanSequence(
    document.getElementById("gene-sequence").value
  );
  const primers = parsePrimers(
    document.getElementById("primer-input").value
  );

  if (!geneSeq) {
    alert("Please paste a gene sequence.");
    return;
  }

  // Store in global state for real-time updates
  window.currentGene = geneSeq;
  window.currentPrimers = primers;

  // Run analysis pipeline
  attachPrimerPositions(geneSeq, primers);
  
  // Validate all primer lengths and collect warnings
  let allLengthWarnings = [];
  primers.forEach(primer => {
    const warnings = getPrimerLengthWarnings(primer);
    allLengthWarnings = allLengthWarnings.concat(warnings);
  });
  
  // Show combined length warnings if any
  if (allLengthWarnings.length > 0) {
    showLengthWarning(allLengthWarnings);
  } else {
    clearLengthWarning();
  }
  
  displaySequence(geneSeq, primers);
  populatePrimerTable(geneSeq, primers);
}

/* -----------------------
   Clean Sequence
------------------------ */
function cleanSequence(seq) {
  return seq
    .toUpperCase()
    .replace(/[^ACGT]/g, "");
}

/* -----------------------
   Parse Primers
------------------------ */
function parsePrimers(text) {
  const lines = text.split("\n");
  const primers = [];

  for (let line of lines) {
    if (!line.includes("=")) continue;
    const [name, seq] = line.split("=");

    primers.push({
      name: name.trim(),
      seq: seq.trim().toUpperCase(),
      start: null,
      end: null,
      orientation: null,
      isInner: false,
    });
  }
  return primers;
}
