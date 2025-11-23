#  LAMP Primer Visualizer & Hairpin Analyzer

Interactive web tool for **visualizing LAMP primer binding**, **detecting hairpins**, and **adjusting primer boundaries in real-time**.

Built for researchers who need transparent, flexible primer design and debugging.

---

##  Features

###  Primer Visualization
- Highlights exact binding locations on gene sequence
- Color-coded primers with accessible, high-contrast colors
- Supports F3, F2, F1c, B3, B2, B1c, LoopF, LoopB, FIP, BIP
- Automatic FIP/BIP splitting into component parts

###  Hairpin Detection
- **3′-end scanning** - Detects dangerous 3' hairpins
- **5′-end scanning** - Identifies 5' secondary structures  
- Shows stem length (2-6bp) and loop size (3-12bp)
- Highlights both bonding regions with clear color coding

###  Interactive Design Mode
- **Adjust primer boundaries** via input fields in table
- **Real-time recalculation** - Instant hairpin analysis updates
- **Live visualization** - Sequence highlights update dynamically
- **Turn static analysis into iterative design**

###  Mouse-Hover Tooltips
- Hover over any base for details:
  - Primer name and orientation
  - Hairpin structure (stem/loop details)
  - Bonding region types
  - Exact genome position

---

##  Quick Start

### For Users

**1. Start Local Server**
```bash
python3 -m http.server 8000
```

**2. Open Browser**
Navigate to `http://localhost:8000`

**3. Analyze**
- Paste gene sequence
- Add primers (format: `NAME=SEQUENCE`)
- Click "Analyze"

**4. Design & Debug**
- View results with color-coded highlights
- Hover over bases for detailed info
- Adjust positions in table to optimize
- See instant feedback on changes

### For Developers

**Prerequisites:**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for local server) OR any HTTP server
- Text editor (VS Code, Sublime, etc.)

**Running Locally:**

1. **Clone or Download the Repository**
   ```bash
   git clone <your-repo-url>
   cd Hairpin_debug
   ```

2. **Start a Local Web Server**
   
   Option A - Python (recommended):
   ```bash
   python3 -m http.server 8000
   ```
   
   Option B - Node.js (if installed):
   ```bash
   npx http-server -p 8000
   ```
   
   Option C - PHP (if installed):
   ```bash
   php -S localhost:8000
   ```

3. **Open in Browser**
   ```
   http://localhost:8000
   ```

4. **Make Changes**
   - Edit any `.js`, `.html`, or `.css` file
   - Refresh browser to see changes (Cmd/Ctrl + R)
   - No build step required!

**File Structure:**
```
hairpin.js    - Core algorithms (edit for hairpin detection logic)
sequence.js   - Visualization (edit for display/tooltips)
ui.js         - Interactive controls (edit for table/inputs)
app.js        - Main orchestration (edit for workflow)
index.html    - HTML structure
guide.html    - User guide page
style.css     - Styling
```

**Development Tips:**
- Open browser console (F12) to see debug logs
- Hairpin detection logs show detailed analysis
- Position changes log mapping calculations
- All code is vanilla JavaScript (no build tools needed)

---

##  Example Usage

```
Gene Sequence:
ATGGCATTGTTACCAACTGGGCTTGCTCTGGGCCTCGTCAC...

Primers:
F3=ACCTGATTGCC...
F2=GCATGCTTAA...
FIP=GTGACGAGGCCCAGAGCAAGCCCAGTTGGTAACAATGCCA
BIP=TGTCTTTTGTCCTGGTTTTCAC
LF=TGTCTTTTGTCCTGGTTTTCAC
```

**Workflow:**
1. Analyze → See FIP has 3' hairpin ⚠️
2. Hover → "3′ hairpin (stem: 4bp, loop: 6bp)"
3. Adjust FIP end position -2bp
4. Hairpin recalculates → No hairpin ✓

---

##  Project Structure

```
hairpin.js    - Core algorithms (revcomp, hairpin detection, primer splitting)
sequence.js   - Sequence visualization and tooltip generation
ui.js         - Interactive table and position controls
app.js        - Main orchestration
index.html    - HTML structure
style.css     - Styling
```

**Modular design** for easy maintenance and extensibility.

---

##  Color Scheme

**Primers** (accessible, high-contrast):
- F3: Light Green | F2: Sky Blue | F1c: Gold
- B3: Light Pink | B2: Orange | B1c: Lavender  
- LoopF: Pale Green | LoopB: Peach
- FIP: Plum | BIP: Powder Blue

**Hairpin Markers**:
- 3' Hairpins: Deep Pink (#FF1493)
- 5' Hairpins: Dodger Blue (#1E90FF)

Colors optimized for older users and color vision deficiencies.

---

##  How It Works

### Hairpin Detection Algorithm
```
For 3' hairpins:
1. Scan last 15bp of primer
2. Search for reverse complement upstream
3. Calculate stem length and loop size
4. Highlight tail and complement regions

For 5' hairpins:
1. Scan first 15bp of primer
2. Search for reverse complement downstream
3. Calculate structure parameters
4. Highlight head and complement regions
```

### Interactive Position Adjustment
```
1. User changes start/end position in table
2. Extract new sequence from gene
3. Apply reverse complement if needed
4. Re-run hairpin detection
5. Update visualization and table instantly
```

---

##  TODO / Future Enhancements

- [ ] Drag-and-drop position adjustment (visual slider)
- [ ] Melting temperature (Tm) calculation
- [ ] GC content and GC clamp analysis
- [ ] Primer dimer detection between primers
- [ ] Batch processing (upload CSV of primers)
- [ ] Export results (JSON/CSV/PDF)
- [ ] Hairpin severity scoring system
- [ ] Mobile-responsive layout
- [ ] Dark mode toggle
- [ ] Integration with primer design APIs

---

##  Troubleshooting

**Primer not found?**
- Check sequence accuracy (no whitespace)
- Try manually searching for reverse complement

**FIP/BIP not splitting?**
- Each part must be 15-35bp
- Both parts must bind to gene sequence

**Position adjustment not working?**
- Ensure positions are within gene bounds
- Click "Analyze" first to load data
- Check browser console (F12) for errors

**Tooltips not showing?**
- Ensure browser supports CSS pseudo-elements
- Hover longer (~100ms delay)

---

## 💻 Development

### Adding Features

The modular structure makes it easy:

**Example: Add GC content**
1. Add function to `hairpin.js`:
   ```javascript
   function calculateGC(seq) {
     return ((seq.match(/[GC]/gi) || []).length / seq.length * 100).toFixed(1);
   }
   ```
2. Call in `ui.js` when rendering table
3. Other modules unaffected!

### File Roles
- **`hairpin.js`** - Pure algorithms, no DOM access
- **`sequence.js`** - Visualization logic, reads from DOM
- **`ui.js`** - Table/controls, writes to DOM
- **`app.js`** - Coordinates all modules, manages state

---

##  Performance

- **Client-side only** - No server needed
- **Fast** - Instant updates on position changes
- **Lightweight** - ~50KB total JavaScript
- **Scalable** - Handles sequences up to 10kb+ easily

---

## 🤝 Contributing

Suggestions welcome! Built for the research community.

**Priority areas:**
- More sophisticated hairpin scoring
- Support for degenerate bases
- Better visual indicators for severe issues
- Integration with existing design tools

---

##  License

**Open Source - MIT License**

This tool is freely available for research and education. If you use this tool in your research or publications, please acknowledge:

**Developed by:**
- **BOOLEAN Lab**, University of California San Diego (UCSD)
- **Graduate Student Researchers:**
  - Girma Terfa 
  - Angel Cortez
  - Anu Fnu
- **Principal Advisor:** Dr. Debashis Sahoo
- **Funding:** NSF REU UR2PhD Program

**Citation/Acknowledgment:**
```
LAMP Primer Visualizer & Hairpin Analyzer
BOOLEAN Lab, UC San Diego
Developed by Girma Terfa, Angel Cortez, and Anu Fnu
Under the supervision of Dr. Debashis Sahoo
Supported by NSF REU UR2PhD Program
```

Use freely with proper acknowledgment. Contributions and feedback welcome!

---

## 🙏 Acknowledgments

Built for LAMP primer researchers who need transparent, flexible tools.

Hairpin detection algorithm validated against known problem primers and proven Python implementations.

**Special Thanks:**
- NSF REU UR2PhD Program for funding support
- BOOLEAN Lab at UCSD for research infrastructure


---

**Happy Primer Designing! 🧬✨**
