import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

// Analyze API file to extract capabilities
function analyzeAPICapabilities() {
  const apiPath = path.join(rootDir, 'api/analyze-oil-gas-flexible.js')
  
  if (!fs.existsSync(apiPath)) {
    console.warn('⚠️  API file not found:', apiPath)
    return null
  }
  
  const apiFile = fs.readFileSync(apiPath, 'utf-8')
  
  const capabilities = {
    dataSources: [],
    matchingStrategies: [],
    validationFeatures: [],
    enrichmentTypes: [],
    outputs: [],
    plantIntelligence: false,
    classificationVerification: false
  }
  
  // Extract data source types
  const dataSourceMatch = apiFile.match(/dataSourceLabels\s*=\s*\{([^}]+)\}/s)
  if (dataSourceMatch) {
    const labels = dataSourceMatch[1]
    const matches = [...labels.matchAll(/(\w+):\s*'([^']+)'/g)]
    capabilities.dataSources = matches.map(m => ({ 
      key: m[1], 
      label: m[2] 
    }))
  }
  
  // Extract matching strategies from function signature
  const matchStrategiesMatch = apiFile.match(/matchStrategies\s*=\s*\[([^\]]+)\]/)
  if (matchStrategiesMatch) {
    const strategies = matchStrategiesMatch[1]
      .split(',')
      .map(s => s.trim().replace(/['"]/g, ''))
      .filter(s => s)
    capabilities.matchingStrategies = strategies
  }
  
  // Extract match types from code
  const matchTypes = []
  if (apiFile.includes("matchType: 'exact_tag_id'")) matchTypes.push('Exact Tag ID')
  if (apiFile.includes("matchType: 'ip_match'")) matchTypes.push('IP Address')
  if (apiFile.includes("matchType: 'hostname_match'")) matchTypes.push('Hostname')
  if (apiFile.includes("matchType: 'mac_match'")) matchTypes.push('MAC Address')
  if (apiFile.includes('fuzzy_type_manufacturer')) matchTypes.push('Fuzzy (Type + Manufacturer)')
  if (apiFile.includes('intelligent_pairing')) matchTypes.push('Intelligent Pairing')
  
  if (matchTypes.length > 0) {
    capabilities.matchingStrategies = matchTypes
  }
  
  // Extract validation features
  if (apiFile.includes('classificationVerification')) {
    capabilities.classificationVerification = true
    capabilities.validationFeatures.push('Cross-verification of networkable vs passive devices')
  }
  if (apiFile.includes('validationScore') || apiFile.includes('validation.level')) {
    capabilities.validationFeatures.push('Match confidence scoring (high/medium/low)')
  }
  if (apiFile.includes('validationChecks')) {
    capabilities.validationFeatures.push('Field agreement validation (tag, IP, hostname, MAC, device_type, manufacturer)')
  }
  
  // Extract enrichment types
  if (apiFile.includes('allMaintenance') || apiFile.includes('maintenance:')) {
    capabilities.enrichmentTypes.push('CMMS / Maintenance Work Orders')
  }
  if (apiFile.includes('allVulnerability') || apiFile.includes('vulnerability:')) {
    capabilities.enrichmentTypes.push('Security / Vulnerability Findings')
  }
  if (apiFile.includes('allNetwork') || apiFile.includes('network:')) {
    capabilities.enrichmentTypes.push('Network Segmentation / Firewall Zones')
  }
  if (apiFile.includes('allIncidents') || apiFile.includes('incident:')) {
    capabilities.enrichmentTypes.push('Incidents / Tickets')
  }
  
  // Extract outputs
  if (apiFile.includes('canonicalAssets')) {
    capabilities.outputs.push('Canonical Asset Inventory')
  }
  if (apiFile.includes('blindSpots')) {
    capabilities.outputs.push('Blind Spots (Engineering assets not on network)')
  }
  if (apiFile.includes('orphans')) {
    capabilities.outputs.push('Orphans (OT assets not in engineering baseline)')
  }
  if (apiFile.includes('plantCompleteness')) {
    capabilities.plantIntelligence = true
    capabilities.outputs.push('Plant Completeness Analysis (actual vs expected equipment)')
  }
  if (apiFile.includes('learningInsights') || apiFile.includes('recommendations')) {
    capabilities.outputs.push('AI Recommendations')
  }
  if (apiFile.includes('assuranceInsights')) {
    capabilities.outputs.push('Multi-Source Assurance Insights')
  }
  if (apiFile.includes('distributions')) {
    capabilities.outputs.push('Distributions (by unit, type, manufacturer)')
  }
  
  // Check for security tier classification
  if (apiFile.includes('classifyDeviceBySecurity') || apiFile.includes('security_tier')) {
    capabilities.validationFeatures.push('Security tier classification (Tier 1/2/3)')
  }
  
  return capabilities
}

// Analyze frontend to extract UI features
function analyzeUIFeatures() {
  const uiPath = path.join(rootDir, 'src/FlexibleOilGasCanonizer.jsx')
  
  if (!fs.existsSync(uiPath)) {
    console.warn('⚠️  UI file not found:', uiPath)
    return null
  }
  
  const uiFile = fs.readFileSync(uiPath, 'utf-8')
  
  const features = {
    uploadTypes: [],
    displaySections: [],
    exportFormats: [],
    sampleDatasets: []
  }
  
  // Extract upload types
  if (uiFile.includes('engineeringFiles')) features.uploadTypes.push('Engineering Baseline')
  if (uiFile.includes('otToolFiles')) features.uploadTypes.push('OT Discovery')
  if (uiFile.includes('otherFiles')) features.uploadTypes.push('Other Sources (Auto-detected)')
  
  // Extract display sections (look for h2/h3 headings)
  const sectionPatterns = [
    /<h2[^>]*>([^<]+)<\/h2>/gi,
    /<h3[^>]*>([^<]+)<\/h3>/gi,
    /className="[^"]*section[^"]*"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>/gi
  ]
  
  sectionPatterns.forEach(pattern => {
    const matches = [...uiFile.matchAll(pattern)]
    matches.forEach(m => {
      const title = m[1].trim()
      if (title && !features.displaySections.includes(title)) {
        features.displaySections.push(title)
      }
    })
  })
  
  // Extract export formats
  if (uiFile.includes('downloadCSV') || uiFile.includes('.csv') || uiFile.includes('text/csv')) {
    features.exportFormats.push('CSV')
  }
  if (uiFile.includes('downloadJSON') || uiFile.includes('application/json')) {
    features.exportFormats.push('JSON')
  }
  
  // Check for sample datasets
  const samplePath = path.join(rootDir, 'public/samples')
  if (fs.existsSync(samplePath)) {
    try {
      const sampleDirs = fs.readdirSync(samplePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
      features.sampleDatasets = sampleDirs
    } catch (e) {
      // Ignore errors
    }
  }
  
  return features
}

// Generate slide content from capabilities
function generateSlideContent(capabilities, uiFeatures) {
  if (!capabilities || !uiFeatures) {
    return '# Error: Could not analyze codebase\n\nPlease check that the API and UI files exist.'
  }
  
  const timestamp = new Date().toISOString()
  
  return `# OT Assurance Twin - Auto-Generated Slide Content
*Last updated: ${timestamp}*

---

## Slide 1: What It Is

**OT Asset MDM with Assurance Layer**

- **Core Purpose:** Fuses multiple data sources into one verified OT asset canon
- **Positioning:** Master Data Management (MDM) for OT assets with built-in assurance and cross-verification

**Data Sources Supported (${capabilities.dataSources.length} types):**
${capabilities.dataSources.map(ds => `- ${ds.label}`).join('\n')}

**Matching Strategies (${capabilities.matchingStrategies.length} methods):**
${capabilities.matchingStrategies.map(s => `- ${s}`).join('\n')}

---

## Slide 2: How It Works (4-Phase Process)

### Phase 1: Ingest & Standardize
- Multi-file upload (${uiFeatures.uploadTypes.join(', ')})
- Auto-detect data source type from CSV headers
- Normalize field names across varied CSV formats
- Merge and deduplicate files of same type

### Phase 2: Match & Canonize
- Multi-strategy matching: ${capabilities.matchingStrategies.join(', ')}
- Build canonical asset records (one row per matched asset)
- Identify blind spots and orphans
- Track match confidence and validation scores

### Phase 3: Verify & Enrich
- Cross-validate matches (${capabilities.validationFeatures.length} validation features)
${capabilities.validationFeatures.map(f => `  - ${f}`).join('\n')}
- Classify devices by security tier (Tier 1/2/3)
- Enrich with multi-source data:
${capabilities.enrichmentTypes.map(e => `  - ${e}`).join('\n')}
${capabilities.plantIntelligence ? '- Map to process units and perform multi-layered completeness analysis' : ''}

### Phase 4: Analyze & Export
- Calculate KPIs (coverage %, security coverage, completeness scores)
- Generate AI recommendations
- Export as: ${uiFeatures.exportFormats.join(', ')}

---

## Slide 3: Key Capabilities

**Data Sources:** ${capabilities.dataSources.length} types supported
**Matching Strategies:** ${capabilities.matchingStrategies.length} methods
**Validation Features:** ${capabilities.validationFeatures.length} types
**Enrichment Types:** ${capabilities.enrichmentTypes.length} sources
**Output Formats:** ${uiFeatures.exportFormats.length} formats
**Plant Intelligence:** ${capabilities.plantIntelligence ? 'Yes (completeness analysis)' : 'No'}

**Key Differentiators:**
- ✅ Cross-verification of device classifications (Engineering vs OT reality)
- ✅ Process-aware intelligence (maps assets to refinery units)
- ✅ Multi-source reconciliation (not just network discovery)
- ✅ Explicit blind spot detection (what's missing, not just what's found)
${capabilities.plantIntelligence ? '- ✅ Multi-layered completeness analysis (reference ranges, relative comparison, functional completeness, baseline tracking)' : ''}

---

## Slide 4: Outputs & Deliverables

**Generated Outputs:**
${capabilities.outputs.map(o => `- ${o}`).join('\n')}

**Export Capabilities:**
${uiFeatures.exportFormats.map(f => `- ${f} format exports`).join('\n')}

${uiFeatures.sampleDatasets.length > 0 ? `\n**Sample Datasets Available:**\n${uiFeatures.sampleDatasets.map(d => `- ${d}`).join('\n')}` : ''}

---

## Slide 5: Technical Architecture (Current State)

**Deployment:** Serverless (Vercel) - Stateless, in-memory processing
**Data Limits:** ~12K assets per run (demo scale)
**Persistence:** None (results lost on page refresh)
**Authentication:** None (public demo)

**Future Enterprise Features:**
- Database-backed persistence
- User authentication & RBAC
- Scheduled data ingestion
- API for enterprise integration
- On-premise deployment option

---

*This content is auto-generated from codebase analysis. Review and customize as needed for your presentation.*
`
}

// Generate HTML presentation from capabilities
function generateHTMLPresentation(capabilities, uiFeatures) {
  if (!capabilities || !uiFeatures) {
    return null
  }
  
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  // Generate data sources list
  const dataSourcesList = capabilities.dataSources.map(ds => `                            <li>${ds.label}</li>`).join('\n')
  
  // Generate matching strategies list
  const matchingStrategiesList = capabilities.matchingStrategies.map(s => `                            <li>${s}</li>`).join('\n')
  
  // Generate validation features list
  const validationFeaturesList = capabilities.validationFeatures.map(f => `                            <li>${f}</li>`).join('\n')
  
  // Generate enrichment types list
  const enrichmentTypesList = capabilities.enrichmentTypes.map(e => `                                <li>${e}</li>`).join('\n')
  
  // Generate outputs list
  const outputsList = capabilities.outputs.map(o => `                            <li>${o}</li>`).join('\n')
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OT Assurance Twin - Deloitte</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/reveal.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/theme/white.css">
    <style>
        /* Deloitte Green Gradient Theme */
        :root {
            --deloitte-dark-green: #1B5E20;
            --deloitte-light-green: #A5D6A7;
            --deloitte-lime: #C5E1A5;
            --deloitte-accent: #66BB6A;
        }

        .reveal {
            background: linear-gradient(to right, var(--deloitte-dark-green) 0%, var(--deloitte-dark-green) 50%, var(--deloitte-lime) 100%);
            font-family: 'Aptos', 'Segoe UI', Arial, sans-serif;
        }

        .reveal .slides section {
            text-align: left;
            color: white;
            background: transparent;
        }

        /* Deloitte Header - Fixed on all slides */
        .deloitte-header {
            position: fixed;
            top: 20px;
            left: 40px;
            z-index: 1000;
            font-family: 'Aptos', 'Segoe UI', Arial, sans-serif;
        }

        .deloitte-logo {
            font-size: 32px;
            font-weight: bold;
            color: white;
            margin: 0;
            line-height: 1.2;
        }

        .deloitte-logo::after {
            content: ".";
            color: var(--deloitte-accent);
        }

        .deloitte-tagline {
            font-size: 14px;
            font-style: italic;
            color: white;
            margin-top: 4px;
            opacity: 0.9;
        }

        /* Footer */
        .deloitte-footer {
            position: fixed;
            bottom: 20px;
            left: 40px;
            font-size: 12px;
            color: white;
            opacity: 0.7;
            z-index: 1000;
        }

        /* Slide Content Styling */
        .reveal h1 {
            color: white;
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 0.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .reveal h2 {
            color: white;
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 0.8em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            border-bottom: 2px solid var(--deloitte-accent);
            padding-bottom: 0.3em;
        }

        .reveal h3 {
            color: var(--deloitte-lime);
            font-size: 1.8em;
            font-weight: 600;
            margin-top: 1em;
            margin-bottom: 0.5em;
        }

        .reveal p, .reveal li {
            color: white;
            font-size: 1.2em;
            line-height: 1.6;
        }

        .reveal ul {
            margin-left: 1.5em;
        }

        .reveal li {
            margin-bottom: 0.5em;
        }

        /* Highlight boxes */
        .highlight-box {
            background: rgba(255, 255, 255, 0.15);
            border-left: 4px solid var(--deloitte-accent);
            padding: 1em;
            margin: 1em 0;
            border-radius: 4px;
        }

        /* Stats/Capabilities Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5em;
            margin: 1.5em 0;
        }

        .stat-box {
            background: rgba(255, 255, 255, 0.1);
            padding: 1.2em;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: var(--deloitte-lime);
            display: block;
        }

        .stat-label {
            font-size: 1em;
            color: white;
            margin-top: 0.3em;
        }

        /* Checkmark list */
        .check-list li::before {
            content: "✅ ";
            margin-right: 0.5em;
        }

        /* Two-column layout */
        .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2em;
            margin: 1em 0;
        }

        /* Phase boxes */
        .phase-box {
            background: rgba(255, 255, 255, 0.1);
            padding: 1.5em;
            border-radius: 8px;
            margin: 1em 0;
            border-left: 5px solid var(--deloitte-accent);
        }

        .phase-title {
            color: var(--deloitte-lime);
            font-size: 1.5em;
            font-weight: 600;
            margin-bottom: 0.5em;
        }

        /* Abstract graphic placeholder (right side) */
        .abstract-graphic {
            position: fixed;
            right: -100px;
            top: 50%;
            transform: translateY(-50%);
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, var(--deloitte-lime) 0%, var(--deloitte-accent) 50%, transparent 100%);
            border-radius: 50%;
            opacity: 0.3;
            filter: blur(60px);
            z-index: 0;
        }

        /* Ensure content is above graphic */
        .reveal .slides section > * {
            position: relative;
            z-index: 1;
        }

        /* Cover slide special styling */
        .cover-slide {
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        .cover-slide h1 {
            font-size: 4em;
            margin-bottom: 0.3em;
        }

        .cover-slide .subtitle {
            font-size: 1.8em;
            color: var(--deloitte-lime);
            margin-top: 0.5em;
            font-weight: 300;
        }

        .cover-slide .date {
            font-size: 1.2em;
            color: white;
            margin-top: 2em;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="deloitte-header">
        <div class="deloitte-logo">Deloitte</div>
        <div class="deloitte-tagline">Together makes progress</div>
    </div>

    <div class="deloitte-footer">
        OT Assurance Twin | Performance Assurance
    </div>

    <div class="reveal">
        <div class="slides">
            <!-- Cover Slide -->
            <section class="cover-slide">
                <h1>OT Assurance Twin</h1>
                <p class="subtitle">OT Asset MDM with Assurance Layer</p>
                <p class="date">${currentDate}</p>
            </section>

            <!-- Slide 1: What It Is -->
            <section>
                <h2>What It Is</h2>
                <div class="highlight-box">
                    <p><strong>OT Asset MDM with Assurance Layer</strong></p>
                    <p>Master Data Management (MDM) for OT assets with built-in assurance and cross-verification</p>
                </div>

                <div class="two-column">
                    <div>
                        <h3>Data Sources Supported</h3>
                        <ul>
${dataSourcesList}
                        </ul>
                    </div>
                    <div>
                        <h3>Matching Strategies</h3>
                        <ul>
${matchingStrategiesList}
                        </ul>
                    </div>
                </div>
            </section>

            <!-- Slide 2: How It Works -->
            <section>
                <h2>How It Works</h2>
                <p style="font-size: 1.4em; margin-bottom: 1em;"><strong>4-Phase Process</strong></p>

                <div class="phase-box">
                    <div class="phase-title">Phase 1: Ingest & Standardize</div>
                    <ul>
                        <li>Multi-file upload (${uiFeatures.uploadTypes.join(', ')})</li>
                        <li>Auto-detect data source type from CSV headers</li>
                        <li>Normalize field names across varied CSV formats</li>
                        <li>Merge and deduplicate files of same type</li>
                    </ul>
                </div>

                <div class="phase-box">
                    <div class="phase-title">Phase 2: Match & Canonize</div>
                    <ul>
                        <li>Multi-strategy matching (${capabilities.matchingStrategies.length} methods)</li>
                        <li>Build canonical asset records (one row per matched asset)</li>
                        <li>Identify blind spots and orphans</li>
                        <li>Track match confidence and validation scores</li>
                    </ul>
                </div>
            </section>

            <!-- Slide 3: How It Works (continued) -->
            <section>
                <h2>How It Works (continued)</h2>

                <div class="phase-box">
                    <div class="phase-title">Phase 3: Verify & Enrich</div>
                    <ul>
                        <li>Cross-validate matches (${capabilities.validationFeatures.length} validation features)</li>
                        <li>Classify devices by security tier (Tier 1/2/3)</li>
                        <li>Enrich with multi-source data:
                            <ul>
${enrichmentTypesList}
                            </ul>
                        </li>
                        ${capabilities.plantIntelligence ? '<li>Map to process units and assess plant completeness</li>' : ''}
                    </ul>
                </div>

                <div class="phase-box">
                    <div class="phase-title">Phase 4: Analyze & Export</div>
                    <ul>
                        <li>Calculate KPIs (coverage %, security coverage, completeness scores)</li>
                        <li>Generate AI recommendations</li>
                        <li>Export as: ${uiFeatures.exportFormats.join(', ')}</li>
                    </ul>
                </div>
            </section>

            <!-- Slide 4: Key Capabilities -->
            <section>
                <h2>Key Capabilities</h2>
                
                <div class="stats-grid">
                    <div class="stat-box">
                        <span class="stat-number">${capabilities.dataSources.length}</span>
                        <span class="stat-label">Data Source Types</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${capabilities.matchingStrategies.length}</span>
                        <span class="stat-label">Matching Strategies</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${capabilities.validationFeatures.length}</span>
                        <span class="stat-label">Validation Features</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${capabilities.enrichmentTypes.length}</span>
                        <span class="stat-label">Enrichment Sources</span>
                    </div>
                </div>

                <h3>Key Differentiators</h3>
                <ul class="check-list">
                    <li>Cross-verification of device classifications (Engineering vs OT reality)</li>
                    <li>Process-aware intelligence (maps assets to refinery units)</li>
                    <li>Multi-source reconciliation (not just network discovery)</li>
                    <li>Explicit blind spot detection (what's missing, not just what's found)</li>
                    ${capabilities.plantIntelligence ? '<li>Plant completeness analysis (actual vs expected equipment)</li>' : ''}
                </ul>
            </section>

            <!-- Slide 5: Outputs & Deliverables -->
            <section>
                <h2>Outputs & Deliverables</h2>

                <div class="two-column">
                    <div>
                        <h3>Generated Outputs</h3>
                        <ul>
${outputsList}
                        </ul>
                    </div>
                    <div>
                        <h3>Export Capabilities</h3>
                        <ul>
                            ${uiFeatures.exportFormats.map(f => `<li>${f} format exports</li>`).join('\n                            ')}
                        </ul>

                        ${uiFeatures.sampleDatasets.length > 0 ? `<h3 style="margin-top: 1.5em;">Sample Datasets</h3>
                        <ul>
                            ${uiFeatures.sampleDatasets.map(d => `<li>${d.charAt(0).toUpperCase() + d.slice(1)}</li>`).join('\n                            ')}
                        </ul>` : ''}
                    </div>
                </div>
            </section>

            <!-- Slide 6: Technical Architecture -->
            <section>
                <h2>Technical Architecture</h2>

                <div class="highlight-box">
                    <h3>Current State (Demo)</h3>
                    <ul>
                        <li><strong>Deployment:</strong> Serverless (Vercel) - Stateless, in-memory processing</li>
                        <li><strong>Data Limits:</strong> ~12K assets per run (demo scale)</li>
                        <li><strong>Persistence:</strong> None (results lost on page refresh)</li>
                        <li><strong>Authentication:</strong> None (public demo)</li>
                    </ul>
                </div>

                <div class="highlight-box" style="margin-top: 1.5em;">
                    <h3>Future Enterprise Features</h3>
                    <ul>
                        <li>Database-backed persistence</li>
                        <li>User authentication & RBAC</li>
                        <li>Scheduled data ingestion</li>
                        <li>API for enterprise integration</li>
                        <li>On-premise deployment option</li>
                    </ul>
                </div>
            </section>
        </div>
    </div>

    <div class="abstract-graphic"></div>

    <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.3.1/dist/reveal.js"></script>
    <script>
        // Initialize Reveal.js
        Reveal.initialize({
            hash: true,
            controls: true,
            progress: true,
            center: false,
            transition: 'slide',
            backgroundTransition: 'fade'
        });
    </script>
</body>
</html>`
}

// Main execution
console.log('🔍 Analyzing codebase capabilities...\n')

const capabilities = analyzeAPICapabilities()
const uiFeatures = analyzeUIFeatures()

if (!capabilities || !uiFeatures) {
  console.error('❌ Failed to analyze codebase. Please check file paths.')
  process.exit(1)
}

console.log('✅ Capabilities detected:')
console.log(`   - Data Sources: ${capabilities.dataSources.length}`)
console.log(`   - Matching Strategies: ${capabilities.matchingStrategies.length}`)
console.log(`   - Validation Features: ${capabilities.validationFeatures.length}`)
console.log(`   - Enrichment Types: ${capabilities.enrichmentTypes.length}`)
console.log(`   - Outputs: ${capabilities.outputs.length}`)
console.log(`   - UI Upload Types: ${uiFeatures.uploadTypes.length}`)
console.log(`   - Export Formats: ${uiFeatures.exportFormats.length}\n`)

const slideContent = generateSlideContent(capabilities, uiFeatures)
const htmlPresentation = generateHTMLPresentation(capabilities, uiFeatures)

// Write markdown file
const markdownPath = path.join(rootDir, 'docs/slides/auto-generated-slides.md')
fs.writeFileSync(markdownPath, slideContent, 'utf-8')
console.log(`✅ Markdown slides generated: ${markdownPath}`)

// Write HTML presentation
if (htmlPresentation) {
  const htmlPath = path.join(rootDir, 'docs/slides/presentation.html')
  fs.writeFileSync(htmlPath, htmlPresentation, 'utf-8')
  console.log(`✅ HTML presentation generated: ${htmlPath}`)
  console.log(`\n🌐 Open ${htmlPath} in your browser to view the presentation!`)
}

console.log(`\n📄 Review the files and customize as needed for your presentation.`)
console.log(`\n💡 Tip: Run 'npm run update-slides' anytime you make tool changes.`)

