# OT Assurance Twin Internal Explainer Video

Audience: mixed leadership, account, cyber, and OT practitioners  
Target length: 10-12 minutes  
Tone: clear, credible, understated  
Working title: "From Asset Inventory to Engineering Evidence"

## One-Sentence Thesis
The Assurance Twin is not another OT dashboard; it is a framework for reconciling what engineering says exists, what the network actually sees, and what evidence is strong enough to support risk and assurance decisions.

## Internal Sharing Blurb
Sharing a 10-12 minute walkthrough of the OT Assurance Twin concept and MVP. The core idea is engineering epistemology: how we know what we know about cyber-physical assets. The tool reconciles engineering baselines and network discovery into an evidence-scored denominator, then surfaces blind spots, undocumented devices, inferred critical assets, topology, risk, and client-specific requirement crosswalks. The video also pressure-tests the utilities and transportation/DOT demos so we can separate the reusable platform story from client-specific lenses.

## Video Structure

| Time | Scene | Screen | Purpose |
| --- | --- | --- | --- |
| 0:00-0:45 | Why this matters | Title slide or app home before data load | Set the problem: inventories are not lists, they are competing evidence. |
| 0:45-2:00 | Framework | Methodology view | Explain engineering epistemology and the four states. |
| 2:00-4:00 | Reconciliation | Inventory table | Show documented vs discovered vs absent-but-expected. |
| 4:00-5:30 | Asset-level proof | Device detail / passport | Show the evidence trail and confidence language. |
| 5:30-7:00 | Utilities pressure test | Utilities demo, map/table | Show what utilities means and why industry fit matters. |
| 7:00-8:30 | Transportation/DOT lens | Transportation demo | Show the client-aware profile without making the app proposal-shaped. |
| 8:30-10:00 | Security, topology, risk | Security, Topology, Risk views | Show how the denominator turns into action. |
| 10:00-11:30 | Client translation | RFI tab | Show RFI as an output lens, not the whole product. |
| 11:30-12:00 | Close | Inventory or Methodology | Summarize internal value and next steps. |

## Voiceover Script

### 0:00-0:45 — Opening
What we are looking at is an early MVP of an OT Assurance Twin.

The reason this exists is simple: in operational technology, asset inventory is often treated like a list. But in the real world, it is not a list. It is a set of competing witnesses.

Engineering drawings say one thing. Network discovery says another. Maintenance systems add a third view. Vulnerability tools add another. And when those sources disagree, the most important question is not simply, "how many assets do we have?" The better question is: "how do we know?"

That is the frame for this tool.

The Assurance Twin is an attempt to turn OT asset inventory into an evidence problem. It asks what is documented, what is observed, what is inferred, what is absent but expected, and what is still unknown.

### 0:45-2:00 — Framework
The framework underneath this is what we have been calling engineering epistemology.

That phrase sounds academic, but the idea is practical. It means: how engineers and operators know what they know about a cyber-physical environment.

Most plants or infrastructure operators live with at least four versions of reality.

There is the as-designed view: P&IDs, asset registers, control narratives, expected devices, expected protocols.

There is the as-built view: what discovery tools, scans, passive sensors, or network data actually observe.

There is the as-operated view: what maintenance, historian, telemetry, and operating records show over time.

And then there is the as-assured view: the claim we are comfortable making after reconciling the evidence.

The point of the Twin is to make those transitions visible. If a device is in the engineering baseline and also appears on the network, we can say it is cross-validated. If it is documented but never observed, that is a blind spot. If it appears on the network but is not in the baseline, it is an orphan. If a device class or security tier is inferred from partial data, we say that out loud.

That disclosure is important. It creates trust. It also gives an AI agent or a human reviewer enough context to know where it can act and where it needs escalation.

### 2:00-4:00 — Reconciliation Walkthrough
The first view to show is Inventory. This is intentionally the front door.

We start with a denominator: the union of what engineering believes exists and what the network actually sees. The top line tells us in-scope assets, discovery coverage, and unmanaged inferred Tier 1-2 assets.

The table is deliberately more important than the map at the beginning. Maps are useful once the data is reconciled, but the table is where the evidence quality is visible.

Each row is an asset claim. Some are matched. Some are blind spots. Some are observed but undocumented. Some have CVEs or unmanaged status. The Evidence column is the critical distinction. It tells us whether the row is cross-validated, inferred, expected missing, observed unexpected, or unknown.

This is the pivot from a dashboard to an assurance workflow. The tool is not just saying "here are the assets." It is saying, "here is what we believe, why we believe it, and where the belief is weak."

When we drill into an asset, the detail panel shows the device-level proof: identifiers, owner or maintenance fields where available, firmware, vulnerability exposure, match confidence, source records, and provenance. This is where the framework becomes operational.

### 4:00-5:30 — Asset-Level Proof
The Device Passport is meant to answer the questions a practitioner actually asks.

What is this asset? Where is it? What source did it come from? Is it managed? Does it have a network identity? Does it have CVEs? Was it found by exact tag, IP, hostname, or MAC? Did the sources agree?

This matters because OT conversations often get stuck at the aggregate level. "We have 18,000 assets" is not actionable by itself. A control engineer, a cyber analyst, and an auditor all eventually ask for the row-level basis.

The Twin is built around that basis. It treats every asset as a claim with supporting evidence.

### 5:30-7:00 — Utilities Pressure Test
This is also where we have to pressure-test ourselves.

The utilities demo is a good example. In the current tool, utilities means electric utility: generation, transformer yard, switchyard, protective relays, IEDs, RTUs, metering units, battery storage, and IEC 61850-style environments.

That is a valid industry profile. It matches a power generation or transmission company.

But it is not the same thing as a transportation agency or DOT, even though both are cyber-physical operators. A transportation client thinks in terms of traffic management centers, corridors, roadside cabinets, signal controllers, CCTV cameras, dynamic message signs, ramp meters, RWIS weather stations, pump stations, field switches, cellular routers, UPS units, remote vendor access, and physical cabinet sensors.

That distinction matters. If we show a DOT a turbine hall and a switchyard, the tool feels generic or misaligned. If we show an electric utility only traffic cabinets, the same problem happens in reverse.

So the pressure test is not just whether the tool can ingest a CSV. The pressure test is whether the profile, asset taxonomy, and map match the operational world of the client.

That is the push-pull relationship we want.

We pull from what the client asks for: asset inventory, vulnerability context, topology, reports, response priorities.

But we push with a stronger frame: the hard part is not the list; it is reconciling evidence across sources and making uncertainty visible.

### 7:00-8:30 — Transportation/DOT Lens
For a transportation or DOT context, the map should start from the operating model.

Traffic Management Center to fiber backhaul. Fiber backhaul to corridors. Corridors to roadside cabinets and field devices. Field devices include signal controllers, cameras, dynamic message signs, vehicle detectors, RWIS stations, pump PLCs, and cabinet infrastructure.

The dataset should carry that same language. It should not just say "PLC" or "router." It should say where that PLC lives and what public function it supports: a pump station preventing underpass flooding, a signal controller managing an intersection, a message sign informing drivers, or a remote access gateway supporting field maintenance.

That gives the internal viewer an important message: we can be client-aware without making the entire platform client-specific.

The core engine stays the same. The industry profile changes the vocabulary, expectations, and map. That is what makes this scalable.

### 8:30-10:00 — Security, Topology, and Risk
Once the inventory is reconciled, the rest of the tool becomes easier to understand.

Security posture is no longer a generic risk dashboard. It is grounded in the denominator. Which inferred critical or networkable devices are unmanaged? Which assets have known CVEs? Which discovery signals are stale? Which devices are undocumented but present on the network?

Topology adds the system perspective. We can look at assets by zone, segment, protocol, and Purdue-style layer. This is where the network becomes meaningful in relation to engineering context.

Risk prioritization then becomes less arbitrary. The tool can rank assets not only by CVE count or severity, but by context: criticality, exposure, evidence quality, and whether the asset is part of a sensitive unit or operational function.

That is the "do more with less" principle. We do not need more panels if the evidence model is coherent. A small number of views can carry a lot of meaning.

### 10:00-11:30 — Client Translation
The RFI tab is intentionally treated as an output lens, not the product's identity.

If a client asks for an asset inventory, vulnerability attributes, topology, reports, remote access evidence, or configuration baselines, the RFI view translates the canonical inventory into those requirement buckets.

The key is that the requirement answer is grounded in the same evidence model. If the required source is missing, the tool should say so. If a field is inferred, it should say so. If a requirement is partially met, it should say why.

This is where the Twin becomes useful for account teams and practitioners at the same time.

The account team gets a client-facing crosswalk. The practitioner gets the evidence behind it. Leadership gets a clearer answer to where the opportunity is going.

### 11:30-12:00 — Close
The internal takeaway is that this is not just a demo UI.

The reusable point of view is evidence-grounded OT inventory.

The reusable mechanism is reconciliation across sources.

The reusable output is a defensible denominator that can support risk, topology, and client requirement narratives.

The next step is to keep improving the industry profiles: utilities for electric utility environments, transportation for DOT environments, and then other sectors where the same evidence problem appears under different language.

If we keep the product calm and let the evidence model carry the story, the MVP can feel both rigorous and surprisingly relevant.

## Demo Click Path

1. Start from a clean session.
2. Load **Transportation / DOT** demo.
3. Open **Inventory** first.
4. Search/filter one expected device class such as `Traffic Signal Controller` or `CCTV Camera`.
5. Click one asset and show Device Passport / evidence details.
6. Click **Show Map** and show the transportation operating model.
7. Click **Security** and point to unmanaged Tier 1-2 and CVE exposure.
8. Click **Topology** or **Risk** only briefly; do not over-navigate.
9. Click **Methodology** to explain engineering epistemology.
10. Click **RFI** last to show client translation and profile selection.

## What To Avoid In The Recording

- Do not start in the RFI tab.
- Do not lead with compliance frameworks.
- Do not over-explain every metric.
- Do not imply inferred tiering is final criticality.
- Do not show Utilities as if it is the DOT demo.
- Do not let maps distract from reconciliation. The map supports the story after the inventory has established evidence quality.

## Utilities Pressure Test

### What Works
- Utilities now represents electric utility / generation / transmission.
- Expected assets include IEDs, RTUs, meters, turbine/generation controls, transformer yard, switchyard, and protection systems.
- Standards context such as IEC 61850 and NERC CIP fits this profile.

### What Would Be Misleading
- Using the Utilities demo for a DOT or transportation client.
- Showing turbine/generation layouts as if they answer roadside infrastructure needs.
- Treating "utilities" as a catch-all for infrastructure.

### What The DOT Profile Adds
- TMC, DMZ, fiber backhaul, corridors, roadside cabinets, pump stations, bridge systems, weather/RWIS, and weigh stations.
- Device classes that match transportation operations: signal controllers, CCTV, DMS, ramp meters, vehicle detectors, RWIS, pump PLCs, field switches, cellular routers, UPS, jump hosts, remote access concentrators, cabinet door sensors.
- A map that follows the operating model: central operations to communications backbone to corridors to field assets.

## Aesthetic Criteria

- Less chrome, more evidence.
- One primary idea per view.
- Keep maps as support, not spectacle.
- Keep RFI language contained to the RFI view.
- Use industry-specific language in datasets and maps, not everywhere in the UI.
- Prefer sparse, operator-grade labels over marketing language.

## Short Version
The Assurance Twin reconciles OT engineering records and network discovery into an evidence-scored inventory. The key idea is engineering epistemology: making clear how we know what we know, where sources agree, where they conflict, and what is absent but expected. The tool uses that denominator to support security posture, topology, risk, and client requirement crosswalks. The important design principle is that the core product stays neutral and reusable, while industry profiles such as Utilities or Transportation/DOT provide the right asset language and map for the client context.
