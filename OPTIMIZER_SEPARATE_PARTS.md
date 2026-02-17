# Separate Part Optimization for FIP/BIP

## Overview
The optimizer now supports optimizing FIP and BIP primers by their individual parts, making it easier to meet the thermodynamic constraints for each component.

## How It Works

### FIP Primer (F1c + F2)
- **F1c (Left)**: Binds as reverse complement to gene; target Tm = 64-66°C
- **F2 (Right)**: Binds forward to gene; target Tm = 59-61°C

### BIP Primer (B1c + B2)
- **B1c (Left)**: Binds forward to gene; target Tm = 59-61°C
- **B2 (Right)**: Binds as reverse complement to gene; target Tm = 64-66°C

## Workflow

### Step 1: Open Optimizer Modal
- Click **Analyze** button in the primer table row for FIP or BIP
- Modal opens with part selector and interval controls

### Step 2: Select Part to Optimize
- Choose **Left Part** (F1c or B1c) or **Right Part** (F2 or B2)
- Set the search interval for that part
- Click **Run** to generate candidates

### Step 3: Accept Part
- Review candidates (sorted by score)
- Click **Accept** to replace just that part
- The other part remains unchanged
- Modal closes and main table updates

### Step 4: Optimize Other Part
- Open modal again for same primer
- Switch radio button to other part
- Set new interval if needed
- Click **Run** to generate candidates for the other part
- Accept the best candidate

### Step 5: Repeat as Needed
- Iterate on either part as many times as needed
- Each accept updates only the selected part
- Full primer sequence updates automatically

## Scoring

Each part is scored independently using:
- **Tm deviation**: Penalizes distance from target range
- **GC content**: Prefers 40-60% (targets 50%)
- **5'/3' end stability**: Penalizes ΔG > -4.0 kcal/mol
- **Hairpin detection**: Penalizes 3' and 5' hairpins

## Example: FIP Optimization

1. **Optimize F2 (right part)**:
   - Select "F2" radio button
   - Set Right Part Interval to gene region of interest
   - Run → get candidates for F2 variants
   - Accept best F2

2. **Optimize F1c (left part)**:
   - Select "F1c" radio button
   - Set Left Part Interval to different region if needed
   - Run → get candidates for F1c variants
   - Accept best F1c

3. **Result**: FIP now contains optimized F1c + optimized F2

## Technical Details

### generatePartCandidates() Function
- Enumerates all valid part-length combinations (15-35bp for right part)
- For each candidate, applies correct binding orientation
- Scores using appropriate Tm target
- Filters by selected interval
- Returns top N sorted by score

### Single-Part Candidate Object
```javascript
{
  name: "FIP",           // Primer name
  partName: "F1c",       // Which part
  partType: "left",      // left or right
  seq: "ACGTACGTAC",     // The part sequence
  isInner: true,
  isSinglePart: true,    // ← Key flag for new format
  start: 100,            // Position in gene
  end: 112,
  originalSeq: "...",    // Full FIP sequence for reference
  rightLen: 20,          // If optimizing left, what right length?
  score: 87.5,
  info: { gc, tm, dg5, dg3, ... }
}
```

### applyCandidate() Logic
- If `cand.isSinglePart`:
  - Update `primer.left` or `primer.right` only
  - Reconstruct `primer.seq = left + right`
  - Recalculate hairpins on full sequence
- Otherwise: full primer replacement (existing logic)

## Tips

- **Start with easier part**: Usually right part (F2/B2) is easier to optimize
- **Use narrow intervals**: Smaller search space = faster & more focused results
- **Check scores**: Green (≥85) is good, yellow (70-85) is acceptable, red (<70) needs attention
- **Iterate**: Don't settle for first candidate; try multiple runs with different intervals
- **Monitor cross-dimers**: After each part change, check the dimer analysis table

## Troubleshooting

**No candidates found**:
- Interval too small or doesn't match any valid part positions
- Try expanding the interval
- Check that selected interval actually contains matches in gene

**Low scores**:
- Tm far from target (adjust interval to find better Tm regions)
- High GC% or low GC% (look for regions closer to 50%)
- End stability issues (prefer ΔG ≤ -4.0)

**Hairpins present**:
- Candidates with hairpins are penalized (-20 points)
- Try different intervals to find sequences without hairpins
- 3' end hairpins are more critical than 5' for LAMP
