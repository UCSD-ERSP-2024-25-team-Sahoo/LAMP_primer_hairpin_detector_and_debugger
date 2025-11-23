/* ================================================================
   APP.JS - Main Application Orchestration
   Coordinates between hairpin.js, sequence.js, and ui.js
   ================================================================ */

// Global state for real-time updates
window.currentGene = null;
window.currentPrimers = null;

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
