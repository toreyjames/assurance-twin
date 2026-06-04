# Assurance Twin: Engineering Epistemology for OT Asset Assurance

**Audience:** Deloitte CPS Security partners and senior leaders (Anne Robbins, Ian Fleming, partners).
**Purpose:** Anchor the Assurance Twin on engineering epistemology, position it against the current NIST/CISA/SANS/Dragos guidance landscape, name what the Twin already delivers, name what it does not, and lay out a credible roadmap.
**Status:** Internal positioning brief. Doubles as the spine for an API Cybersecurity Conference 2026 abstract (deadline June 5, 2026) and as the spec lock for the next planned app increment.

---

## 1. Executive thesis

The Assurance Twin is an **engineering epistemology tool**. Its job is to make explicit how we know what we know about a plant — with what confidence, from what evidence, and, critically, what we do not yet know but probably should.

Engineers already live four distinct states of knowledge about any plant: **as-designed** (specifications, P&IDs, engineering baseline), **as-built** (what was actually deployed), **as-operated** (runtime behavior), and **as-assured** (what we can defensibly claim today, with provenance). The gaps between those four states are where risk hides. The Twin reconciles them deterministically, with evidence per claim, and surfaces the gap explicitly — including the absent-but-expected category that no single tool reports well.

This is not a competing OT visibility product. It is the discipline by which evidence from any tool the operator already has — engineering systems, network discovery, endpoint posture, ITSM, OT protocol observation, historians, CMMS, vulnerability scanners, and SME knowledge — becomes a defensible, decision-ready inventory for both human and agentic actors. Agents specifically benefit because, unlike humans, they cannot hold ambiguity safely; they need claims with explicit epistemic state to act responsibly.

What the rest of the field calls Cyber-Informed Engineering (CIE), physics-first OT defense, control-loop-awareness, or witness reconciliation are all downstream applications of this same discipline. Anchoring on engineering epistemology gives the work a name engineers already understand and an auditor-defensible posture.

---

## 2. The anchor: Engineering Epistemology

Engineering epistemology is the discipline of how engineering knowledge is produced, validated, and known — and of the limits of that knowledge. Every plant exists simultaneously in four states; the discipline is to name them, reconcile them, and be explicit about the gap between them.

| State | What it represents | Typical source |
|-------|--------------------|----------------|
| **As-designed** | Engineering intent: tags, P&IDs, criticality designations, specifications | Engineering baseline CSV, design documents, CMMS asset records |
| **As-built** | What was actually deployed and is currently visible on the wire | OT discovery exports, network monitoring, endpoint inventories |
| **As-operated** | Runtime behavior: process variables, alarms, work orders, lifecycle status | Historians, DCS exports, maintenance systems, vulnerability scanners |
| **As-assured** | What we can defensibly claim today, with confidence and provenance per claim | Reconciliation across the above + evidence calculus + SME corroboration |

The reconciled output of the four states produces three classes of finding that all matter equally: **corroborated** (multiple sources agree), **contradicted** (sources disagree, review required), and **absent-but-expected** (no source reports something a competent source should have reported). The third class is the unique signal of an engineering-epistemology approach — and it is what agentic actors and human auditors benefit from most because it tells them about what they are not yet seeing.

Industry shorthand for the same idea travels under different names — Cyber-Informed Engineering, physics-first OT defense, witness reconciliation, control-loop-awareness. They are all downstream applications of this discipline. We anchor on engineering epistemology because it is the term engineers already understand, it does not import detection-vendor or courtroom flavor, and it survives the "is this just AI hype" question.

---

## 3. Why now — NIST, CISA, SANS, and Dragos all point at the same gap

### 3.1 NIST NCCoE OT Cybersecurity: Asset Management project (forming 2026)
NCCoE Director Cherilyn Pascoe (Federal News Network, April 2026):
> "We had several conversations with different critical infrastructure sectors and asked them, 'What are your biggest challenges?' And across the board, the largest challenge that came up was asset management, asset visibility."

NCCoE will publish a project description in 2026 and form a public-private consortium. **The Assurance Twin is a credible candidate reference implementation.** This is the single strongest tailwind in this brief.

### 3.2 CISA + JCDC + 8 international agencies — OT Asset Inventory Guidance (Aug 13, 2025)
"Foundations for OT Cybersecurity: Asset Inventory Guidance for Owners and Operators" defines a five-step canonical process for building an OT asset inventory + taxonomy as the foundation of a "modern defensible architecture." The guidance includes:

- Appendix A: high-priority asset attribute fields
- **Appendix B: Oil and Gas taxonomy** (directly relevant to API audience)
- Appendix C: Electricity taxonomy
- Appendix D: Water and Wastewater taxonomy

The Assurance Twin operationalizes this five-step process end-to-end. Deloitte should cite this guide explicitly when positioning the Twin to operators and auditors.

### 3.3 NIST SP 800-82r3 (Sept 2023; r4 in revision)
- §6.1.1 Asset Management (ID.AM): the inventory + taxonomy + lifecycle requirement.
- §5 Network Architecture: the zones-and-conduits / Purdue segmentation requirement.
- Appendix F: OT overlay for SP 800-53r5 controls.

The Twin already cites these in `docs/demo/Assurance-Twin-Methodology-NIST.md`. r4 is in active revision; we should track the comment cycle.

### 3.4 SANS 2025 State of ICS/OT Cybersecurity Survey (n=330)
- **Asset visibility was the #1 investment area in 2025 (50% of respondents) and remains #1 for 2026–2027 (54%).**
- Only **12.6%** of organizations report full visibility across the ICS Cyber Kill Chain.
- Visibility drops sharply at lower Purdue layers: Level 3: 19.7% / Level 2: 10% / Level 1: less / Remote sites: 17.5%.
- Organizations with comprehensive asset visibility are **3.7x more likely** to achieve full ICS Cyber Kill Chain visibility.

### 3.5 SANS 2026 Survey (Nov 10, 2026) — CIE as 2026 theme
SANS 2026 explicitly introduces **Cyber-Informed Engineering** as a major direction, "bridging safety, reliability, and cybersecurity." This is the formal language closest to "physics-first" and is the term we anchor to.

### 3.6 Dragos 2026 Year-in-Review — control-loop mapping is the new threat tier
Three new threat groups in 2025 (AZURITE, KAMACITE, ELECTRUM) have moved from network reconnaissance to actively **mapping control loops**. The visibility crisis Dragos publishes:
- 30% of OT networks have visibility
- 56% cannot see below the IT/OT boundary
- 88% struggle with detection and response

### 3.7 Synthesized stance
Every authoritative source in the last twelve months points at **the same prerequisite**: an engineering-grade, evidence-traceable inventory and zone/conduit reality. Without that, CIE / physics-first defenses have nothing to anchor against. The Assurance Twin is purpose-built for that prerequisite.

---

## 4. Where Assurance Twin already lands

| Capability | Twin surface | Code anchor |
|------------|--------------|-------------|
| Deterministic engineering vs. discovery reconciliation | Top inventory bar; Asset Table | `src/lib/context/constructor.js` (`performMatching`) |
| Inferred 62443-style zones and conduits | Process Map; Topology view | `src/lib/core/plant-map-model.js` |
| Per-asset evidence calculus (claim, sources, rules fired, epistemic status) | Asset detail "How We Know" drawer | `src/lib/core/evidence-builder.js`, `src/components/EvidenceDrawer.jsx` |
| Ontology with Purdue layer mapping | Inventory drill-down; Topology layers | `src/lib/core/ontology.js` |
| Documented / discovered / in-scope denominators with explicit caveats | Inventory header; Methodology view | `src/lib/core/plant-map-model.js`, `src/components/InventoryHeader.jsx` |
| "What we have / Is it secure / How is it performing" decision lens | Inventory header + Methodology view | `src/components/InventoryHeader.jsx`, `src/components/MethodologyView.jsx` |
| Inferred tier classification with explicit "inferred / heuristic" labels (post-tier-language pass) | Asset table; security posture | `src/lib/context/evaluator.js` (`classifySecurityTier` with `isInferred`, `classificationConfidence`, `basis`) |
| Auditable, deterministic pipeline with no AI in the canon path | Methodology view; brief | `docs/demo/Assurance-Twin-Methodology-NIST.md` |

---

## 5. Mapping to active guidance

| Guidance | What it asks for | Where the Twin already answers |
|----------|------------------|--------------------------------|
| CISA Aug 2025 — Step 1: Define Scope and Objectives | Identify governance, scope, what counts as an asset | Workspace dataset selector + per-engagement scope; in-app methodology copy |
| CISA Aug 2025 — Step 2: Identify Assets and Collect Attributes | Physical inspection + logical survey + high-priority attributes | Engineering baseline + OT discovery ingestion; normalized attribute schema |
| CISA Aug 2025 — Step 3: Categorize Assets / Taxonomy | Functional + criticality categorization | Tier classification (with provisional caveats), ontology device classes |
| CISA Aug 2025 — Step 4: Manage Data | Single source of truth, reconcilable | Reconciliation: matched / blind spot / orphan; evidence calculus |
| CISA Aug 2025 — Step 5: Lifecycle Management | Continuous update, change tracking | Lifecycle status enrichment (`addLifecycleStatus`); session persistence |
| CISA Aug 2025 — Appendix B: Oil & Gas taxonomy | Sector-specific zone/conduit categories | Oil & Gas demo datasets and process map templates |
| NIST SP 800-82r3 §6.1.1 (ID.AM) | Inventory, firmware, network connections | Asset Table + Inventory Header; firmware fields where present |
| NIST SP 800-82r3 §5 (Network Architecture) | Zone/conduit segmentation, Purdue layering | Process Map + Topology view (inferred, with caveats) |
| NIST CSF 2.0 ID.AM-01/02/03/04 | Inventory, software, comms, external systems | Documented denominator, blind spots, conduits, orphans |
| ISA/IEC 62443-3-2 | Zone/conduit identification | Process Map (explicitly inferred from `/24` co-residency, with caveats) |

---

## 6. Honest gap inventory — where the Twin is silent today

The Twin does **not** today address these elements that a full CIE / physics-first program requires. Naming them up front protects credibility.

| Gap | What's missing | Why it matters |
|-----|----------------|----------------|
| Process variable awareness | No setpoints, PV traces, alarm thresholds in the data model | CIE depends on knowing what "normal" physical state looks like |
| Control-loop graph | No explicit sensor → controller → actuator dependency edges | Dragos AZURITE-style threat is loop mapping; defenders need the same graph |
| Passive protocol telemetry | No PCAP / Modbus / DNP3 read-pattern ingestion | Recon detection (anomalous Modbus function-code 3 patterns) needs this |
| Behavioral residuals | Twin compares expected-vs-observed *placement*, not *behavior* | Digital-twin residual detection (KL divergence, Wasserstein) is the academic state-of-the-art |
| CIE consequence-driven design hooks | No "what would this asset's compromise cause physically" annotation | CIE first principle is consequence-prioritized engineering |

---

## 7. Roadmap to CIE / physics-first parity

Three staged options, in cost-of-delivery order:

### Stage A — Control-Loop / Process-Dependency view (next pre-spec'd app step)
Uses data the Twin already has (tag IDs with controller/instrument hints, subnet co-residency, ontology layer). Produces a per-unit loop graph showing sensor → controller → actuator candidates with explicit "expected loop integrity" markers. No new data sources required. Fully within current Twin architecture. **See spec in §10.**

### Stage B — Passive protocol telemetry ingestion
Ingest PCAP excerpts or Modbus/DNP3 read-pattern summaries (not full traffic). Adds a recon-detection lens: anomalous read-pattern fingerprints that match Dragos AZURITE-style mapping behavior. Requires a new ingest path and a small fingerprint rule set. Still deterministic; still auditable.

### Stage C — Process-variable + behavior-residual layer
Ingest historian / DCS process-variable samples; compute residuals against an engineering-derived expected envelope. This is the digital-twin layer. Highest value; highest cost. Requires customer historian access and a defensible residual model (Kalman, KL divergence, or Wasserstein per current academic state-of-the-art). Suitable for a follow-on consortium engagement (potentially aligned with NCCoE).

---

## 8. Evidence sources we integrate (not competitors)

The Twin does not compete with the OT visibility tools an operator already owns. It treats each as an evidence source with a partial vantage and structural blind spots, and reconciles the testimony into a single defensible inventory canon. The map below is illustrative — the Twin works with whichever sources the engagement actually has.

| Evidence source role | Example tool the operator may already have | What it sees | What it cannot see |
|----------------------|---------------------------------------------|--------------|---------------------|
| As-designed engineering | Engineering CSV, P&IDs, IBM Maximo | Tag, criticality, design intent | Network reality, runtime behavior |
| Network discovery | Armis, Forescout | IP, MAC, first-/last-seen, protocol | Engineering intent, criticality, process meaning |
| Endpoint posture | Tanium, CrowdStrike | OS, patch level, agent telemetry | OT-only devices that reject agents |
| Asset relationships | ServiceNow CMDB | Documented dependencies, ownership | Network reality, undocumented assets |
| OT protocol observation | Dragos, Claroty, Nozomi | Protocol behavior, asset fingerprints, control-loop signals | Engineering intent, business criticality |
| Process behavior | Historian (PI), DCS exports | PVs, alarms, setpoint changes | Identity, security posture |
| Lifecycle / maintenance | CMMS, OEM lifecycle feeds | Vendor support, EOL, work orders | Current network or process state |
| Vulnerability exposure | Tenable, Rapid7 | Known CVE matches | Things they cannot fingerprint; control-system context |
| Tacit SME knowledge | Interviews, walkdowns, exception lists | Why the system is the way it is | At scale, consistently, in agent-readable form |

The Twin's role is to ingest whichever sources the engagement has, reconcile their testimony, and produce decision-ready output that names what is corroborated, what is contradicted, and what is absent-but-expected — with provenance per claim.

**Why this is structurally Deloitte's job, not a tool vendor's.** Tool vendors are incentivized to be the source of truth, are domain-narrow by product design, cannot credibly audit their own gaps, and have no view of the engineering documents, SME knowledge, or engagement scope that surround the data. Deloitte CPS is tool-agnostic, sells the reconciled outcome rather than a tool, carries assurance-brand and audit liability by trade, and is already in the engagement room with all of the evidence sources. This is exactly the role NIST NCCoE is forming a consortium to fill.

---

## 9. API Cybersecurity Conference 2026 angle

| Element | Recommendation |
|---------|----------------|
| Working title | "From Asset Inventory to Process Truth: Building the Engineering-Grade Canon that Cyber-Informed Engineering Requires" |
| Best-fit session topic | Asset Management / Visibility; or Architecture & Defensible Design |
| Target audience level | Intermediate (per API spec) |
| Speaker | Recommend co-anchor: Anne Robbins (Deloitte CPS senior; CFP relationship owner) and Ian Fleming (subject-matter sponsor) |
| Hooks to land | (1) NCCoE OT Asset Mgmt project tailwind; (2) CISA Aug 2025 O&G taxonomy operationalization; (3) live demo of deterministic reconciliation; (4) honest CIE gap inventory + roadmap |
| Submission deadline | June 5, 2026 |
| Submission owner | Anne Robbins |

The 250-300 word abstract draft is in [docs/demo/API-CFP-Abstract-Draft.md](API-CFP-Abstract-Draft.md).

---

## 10. Pre-spec — Control-Loop / Process-Dependency view (next app increment)

This is the locked next app step. No code changes in this brief; this is the spec.

**Component:** `src/components/ControlLoopView.jsx`
**Mounted as:** new center view "Loops" alongside Inventory / Topology / Sites / Methodology

**Inputs (from existing canonized result):**
- Matched assets with ontology classifications (`sensor`, `actuator`, `controller`, `safety_plc`, `dcs_controller`, etc. from `src/lib/core/ontology.js`).
- Plant + unit grouping from `buildPlantMapModel` (`src/lib/core/plant-map-model.js`).
- Subnet co-residency for inferred connectivity.
- Tag-ID prefix conventions where present (e.g., `FT-101`, `TIC-205` style instrument numbering).

**Output (per unit):**
- A directed graph of inferred loops: sensor(s) → controller(s) → actuator(s) where co-located on the same subnet and within the same unit.
- Per-loop integrity markers:
  - Loop has all three roles present (sensor + controller + actuator) — green
  - Loop missing at least one role — amber, named gap
  - Loop has actuator with no controller in scope — red (potential safety/ops concern)
- Per-loop blind-spot / orphan overlay (carry through reconciliation status).
- Drill-through to the existing Asset Table filtered to loop members.

**Acceptance criteria:**
- [ ] Renders without new data inputs on existing demo datasets.
- [ ] Every loop edge carries an evidence record (source assets, rule that produced the edge, confidence).
- [ ] Explicit "inferred loop, not authoritative" caveat banner — same epistemic stance as current zone/conduit inference.
- [ ] No new logic in the canon pipeline; this is a pure derived view.
- [ ] Deterministic — same inputs render the same loop graph.

**Out of scope for Stage A:**
- No process-variable ingestion (Stage C).
- No protocol-traffic analysis (Stage B).
- No automated SME-validation workflow (future).

**Estimated effort:** small. Could be drafted in a single working session once approved.

---

## 11. Validation summary

This brief was researched against:
- NIST NCCoE 2026 project portfolio + Federal News Network coverage (Apr 2026)
- CISA "Foundations for OT Cybersecurity: Asset Inventory Guidance" (Aug 13, 2025) including Appendix B Oil & Gas taxonomy
- NIST SP 800-82r3 (Sept 2023) §5, §6.1.1, Appendix F
- SANS 2025 State of ICS/OT Cybersecurity Survey + 2026 webcast preview
- Dragos 2026 OT Cybersecurity Year-in-Review
- Nozomi Networks + DERSec partnership announcement
- Trout "Control Loop Mapping" analysis of Dragos 2026 findings
- Academic: physics-guided contrastive temporal graph learning (Sci Reports, Apr 2026); Information-Theoretic Digital Twins (arXiv 2603.01621); OT-DETECT (arXiv 2603.16588)

The plan, framing, and gap inventory in this brief align with current government, vendor, and practitioner guidance as of May 2026.
