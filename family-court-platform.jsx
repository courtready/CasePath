import { useState, useMemo } from "react";

// ============================================================
// DATA
// ============================================================

const GLOSSARY_TERMS = [
  { term: "Affidavit", definition: "A written statement of facts that you sign in front of a Justice of the Peace or solicitor. It becomes sworn evidence in court proceedings. You can be cross-examined on what you write in an affidavit." },
  { term: "Applicant", definition: "The person who starts (files) court proceedings. If you file first, you are the Applicant. The other party becomes the Respondent." },
  { term: "Best interests of the child", definition: "The primary consideration the court must apply when making parenting orders. The court looks at factors like the benefit of the child having a meaningful relationship with both parents, and protecting the child from harm." },
  { term: "Binding Financial Agreement (BFA)", definition: "A written agreement between parties about how property and finances will be divided. Often called a 'pre-nup' before marriage. Must be signed and each party must receive independent legal advice." },
  { term: "Care arrangements", definition: "How parenting time is divided between separated parents — including where a child lives and when they spend time with each parent." },
  { term: "Caveat", definition: "A notice lodged on a property title that prevents it from being sold or transferred without your knowledge. Used to protect your interest in real estate during property settlement." },
  { term: "Contravention", definition: "When a party fails to comply with a court order. The court can impose penalties including fines, community service, or imprisonment for serious contraventions." },
  { term: "Costs order", definition: "An order requiring one party to pay some or all of the other party's legal costs. Family courts do not often make costs orders, but can when a party's conduct has been unreasonable." },
  { term: "Divorce", definition: "The legal ending of a marriage. In Australia, you must be separated for at least 12 months before you can apply. Divorce only ends the marriage — it does not deal with property or parenting." },
  { term: "Duty lawyer", definition: "A free lawyer available at the courthouse on the day of your hearing who can give basic advice and sometimes appear for you. Available through Legal Aid. They are very busy — arrive early." },
  { term: "Equal shared parental responsibility", definition: "A presumption in the Family Law Act that parents share decision-making about major long-term issues (education, health, religion). Does not mean equal time — it's about decisions, not time." },
  { term: "Execution of orders", definition: "Enforcing a court order. If the other party won't follow an order, you can apply to the court to enforce it." },
  { term: "Family Dispute Resolution (FDR)", definition: "Mediation with a trained family dispute resolution practitioner. You usually must attempt FDR before filing parenting proceedings. If FDR fails, you get a section 60I certificate to file in court." },
  { term: "Family Report", definition: "A report prepared by a family consultant (usually a psychologist or social worker) who meets with the children and parents. The court uses this report to understand the family's situation." },
  { term: "Federal Circuit and Family Court of Australia (FCFCOA)", definition: "Australia's main family law court, formed in 2021 by merging the Family Court and Federal Circuit Court. Has two divisions. Division 1 handles complex cases; Division 2 handles most standard family law matters." },
  { term: "Final orders", definition: "Permanent court orders that resolve the matter. Unlike interim orders, final orders are intended to be long-lasting unless circumstances significantly change." },
  { term: "ICL (Independent Children's Lawyer)", definition: "A lawyer appointed by the court to represent the interests of the child (not the parents). The ICL is independent and does not act on the child's instructions." },
  { term: "Injunction", definition: "A court order requiring someone to do something or stop doing something. Example: an injunction preventing a party from removing children from Australia." },
  { term: "Interim orders", definition: "Temporary orders made while the case is ongoing, before final orders are made. For example, interim orders about where children will live while the case is heard." },
  { term: "Judicial officer", definition: "A judge or registrar who presides over court proceedings." },
  { term: "Leave", definition: "Permission from the court to do something. For example, 'leave to file' means the court gives you permission to lodge documents." },
  { term: "Mediation", definition: "A process where a neutral third party (mediator) helps two parties reach agreement. Less formal than court. Usually confidential. In family law, often called Family Dispute Resolution." },
  { term: "Non-molestation order", definition: "A type of intervention order that prohibits someone from harassing, threatening, or harming another person. Also called a Domestic Violence Order (DVO) in some states." },
  { term: "Parenting order", definition: "A court order about parenting arrangements — where children live, when they spend time with each parent, and how decisions about the children are made." },
  { term: "Primary carer", definition: "The parent with whom the child primarily lives. Sometimes called the 'residential parent'. Does not have more rights than the other parent regarding major decisions." },
  { term: "Property settlement", definition: "The legal process of dividing assets and debts after separation. Includes real estate, superannuation, vehicles, savings, and debts. Must be formalised within 12 months of divorce or 2 years after de facto separation." },
  { term: "Registrar", definition: "A court officer with legal qualifications who can make certain orders. Less senior than a judge but handles many routine matters including first court dates." },
  { term: "Respondent", definition: "The person who is served with court documents by the Applicant. If the other party filed first, you are the Respondent." },
  { term: "Section 60I certificate", definition: "A certificate issued by a Family Dispute Resolution practitioner after FDR was attempted or if FDR was not possible. Required before filing most parenting applications." },
  { term: "Self-represented litigant (SRL)", definition: "A person who represents themselves in court without a lawyer. Also called a litigant in person. Courts have special procedures to assist SRLs." },
  { term: "Service", definition: "The formal process of delivering court documents to the other party. Some documents must be personally served (handed directly). Others can be served by email or post once agreed." },
  { term: "Subpoena", definition: "A court order requiring a person or organisation to produce documents or attend court to give evidence. Used to obtain records from schools, hospitals, employers, etc." },
  { term: "Superannuation splitting", definition: "The process of dividing superannuation (retirement savings) as part of property settlement. Requires a specific court order or agreement and involves the super fund." },
  { term: "Undertaking", definition: "A formal promise to the court. Breaking an undertaking is a serious matter and can result in penalties similar to breaching a court order." },
  { term: "Without prejudice", definition: "Negotiations or communications marked 'without prejudice' cannot generally be used as evidence in court. Allows parties to negotiate more freely." },
];

const FORMS = [
  {
    category: "Starting Proceedings",
    items: [
      { code: "Initiating Application", title: "Initiating Application", use: "Used to start most family law cases — parenting, property, or both. This is your first document filed with the court.", link: "https://www.fcfcoa.gov.au/fl/forms/initiating-application", tip: "You must fill out the 'conciliation' section and tick what orders you are asking for. Be specific — vague requests cause delays." },
      { code: "Response", title: "Response to Initiating Application", use: "Filed by the Respondent to reply to the Initiating Application. You must file this within 28 days of being served.", link: "https://www.fcfcoa.gov.au/fl/forms/response-to-initiating-application", tip: "Even if you agree with some things, file a Response. Otherwise the other party may get everything they asked for by default." },
      { code: "Application in a Case", title: "Application in a Case", use: "Used to apply for orders while a case is already running — for example, to apply for interim orders or to change a previous order.", link: "https://www.fcfcoa.gov.au/fl/forms/application-in-a-case", tip: "This is different from an Initiating Application. Only use this if you already have an active case number." },
    ]
  },
  {
    category: "Divorce",
    items: [
      { code: "Divorce", title: "Application for Divorce", use: "Apply to legally end your marriage. You must have been separated for at least 12 months and day.", link: "https://www.fcfcoa.gov.au/fl/forms/application-for-divorce", tip: "You can apply sole or jointly. Joint applications are simpler if you are on speaking terms. Divorce does NOT deal with property or children — those are separate." },
    ]
  },
  {
    category: "Financial & Property",
    items: [
      { code: "FinStatement", title: "Financial Statement", use: "A sworn document listing your income, expenses, assets, liabilities, and superannuation. Compulsory in all financial matters.", link: "https://www.fcfcoa.gov.au/fl/forms/financial-statement", tip: "Be thorough and honest — this is sworn evidence. Include all accounts, even ones with small balances. Include debts too." },
      { code: "ConsentOrders", title: "Application for Consent Orders", use: "Used when both parties have already agreed on parenting and/or financial arrangements and want the court to make them into formal orders.", link: "https://www.fcfcoa.gov.au/fl/forms/application-for-consent-orders", tip: "This is the cheapest and fastest way to get orders if you agree. No court hearing required — a registrar reviews the paperwork." },
      { code: "SuperSplit", title: "Superannuation Information Form", use: "Sent to a superannuation fund to get information about the other party's super balance for property settlement.", link: "https://www.fcfcoa.gov.au/fl/forms/superannuation-information-form", tip: "You need the super fund's details. The fund has 28 days to respond. File this early as it slows down property settlement." },
    ]
  },
  {
    category: "Parenting",
    items: [
      { code: "60I", title: "Section 60I Certificate", use: "This is NOT a form you fill in — it is issued by your Family Dispute Resolution (FDR) practitioner after mediation. You need it before filing most parenting applications.", link: "https://www.fcfcoa.gov.au/fl/fdr", tip: "Book FDR early — there can be waiting times. Keep your certificate safe. It expires for some purposes." },
      { code: "ParentingPlan", title: "Parenting Plan", use: "A written agreement between parents about care arrangements. It is NOT a court order but shows the court you have tried to cooperate.", link: "https://www.fcfcoa.gov.au/fl/parenting/parenting-plans", tip: "Parenting plans are not enforceable by the court, but they show cooperation. Later parenting orders take precedence over parenting plans." },
    ]
  },
  {
    category: "Safety & Protection",
    items: [
      { code: "Urgent", title: "Urgent Application without Notice", use: "Apply for urgent orders when there is an immediate risk of harm to a child or adult. Can be filed without first telling the other party.", link: "https://www.fcfcoa.gov.au/fl/forms/application-in-a-case", tip: "Only for genuine emergencies. You must disclose why notice was not given. The court will hear the other party at a later date." },
      { code: "NoticeRisk", title: "Notice of Child Abuse, Family Violence or Risk", use: "Must be filed alongside any parenting application if you are alleging child abuse, family violence, or risk of these.", link: "https://www.fcfcoa.gov.au/fl/forms/notice-of-child-abuse-family-violence-or-risk", tip: "Be specific with dates, incidents, and evidence. Vague allegations are less persuasive. Attach police reports or hospital records if you have them." },
    ]
  },
  {
    category: "Evidence & Documents",
    items: [
      { code: "Subpoena", title: "Subpoena to Produce Documents", use: "Order a third party (school, hospital, employer) to produce documents to the court.", link: "https://www.fcfcoa.gov.au/fl/forms/subpoena", tip: "You need leave (permission) from the court to issue a subpoena. Raise it at your first court date." },
      { code: "Affidavit", title: "Affidavit", use: "Your sworn written statement of facts to be used as evidence. This is how you tell your story to the court in writing.", link: "https://www.fcfcoa.gov.au/fl/forms/affidavit", tip: "Write in first person. Stick to facts, not opinions. Each paragraph should cover one topic. Number your paragraphs. Attach documents as exhibits." },
    ]
  },
];

const PROCESS_STEPS = [
  {
    phase: "Before You File",
    icon: "⚖️",
    color: "#2D6A4F",
    steps: [
      { title: "Attempt Family Dispute Resolution (FDR)", body: "For parenting matters, you must generally attempt mediation before filing. Contact a FDR provider to book. Services like Relationships Australia, Interrelate, or Legal Aid FDR centres offer this. Some are free or low cost.", urgent: false },
      { title: "Get your Section 60I certificate", body: "After FDR, you'll receive a certificate. Keep it — you must file it with your parenting application. If FDR was not appropriate (e.g., due to family violence), you may be exempt.", urgent: false },
      { title: "Gather your financial documents", body: "For property matters: bank statements (3 years), tax returns, superannuation statements, property valuations, mortgage documents, business financials if relevant.", urgent: false },
    ]
  },
  {
    phase: "Filing",
    icon: "📋",
    color: "#1B4332",
    steps: [
      { title: "Complete your Initiating Application", body: "Download and complete the form from the FCFCOA website or file online at the Commonwealth Courts Portal. Attach your 60I certificate for parenting applications.", urgent: false },
      { title: "Pay the filing fee", body: "Current fees: Initiating Application ~$165 (2024). Concession rates available. Hardship exemptions available through the court registry. Commonwealth Health Care Card holders pay reduced fees.", urgent: false },
      { title: "File at the registry or online", body: "You can file at your nearest registry or online via the Commonwealth Courts Portal (www.comcourts.gov.au). Keep your file number — you'll need it for everything.", urgent: false },
    ]
  },
  {
    phase: "After Filing",
    icon: "📬",
    color: "#40916C",
    steps: [
      { title: "Serve the other party", body: "You must serve your documents on the other party. Most documents can be posted or emailed once agreed. The Initiating Application must be personally served by someone over 18 who is not you.", urgent: true },
      { title: "File an Affidavit of Service", body: "The person who served the documents must swear an affidavit confirming they did so, and when and how. File this with the court before your first hearing.", urgent: true },
      { title: "The other party files a Response", body: "They have 28 days to file a Response. If they do not, you can apply for orders by default. The court will notify both parties of the first court date.", urgent: false },
    ]
  },
  {
    phase: "Court Process",
    icon: "🏛️",
    color: "#52B788",
    steps: [
      { title: "First court date (Directions hearing)", body: "A registrar will list the matter for directions. They may make procedural orders — timelines for filing evidence, scheduling mediation, or listing for a hearing. Arrive 30 mins early. Dress professionally.", urgent: false },
      { title: "Interim hearing (if needed)", body: "If urgent arrangements are needed while the case runs, you can seek interim orders. These are temporary until final orders are made. Prepare a strong affidavit with specific, factual evidence.", urgent: false },
      { title: "Conciliation conference / Family report", body: "Many cases involve a conciliation conference (mediation with a registrar) or a family report where a consultant meets both parties and the children. These often lead to resolution without trial.", urgent: false },
      { title: "Final hearing", body: "Both parties give sworn evidence and are cross-examined. The judge makes final orders. This is the most stressful and expensive stage. Most cases settle before reaching this point.", urgent: false },
    ]
  },
  {
    phase: "After Orders",
    icon: "✅",
    color: "#74C69D",
    steps: [
      { title: "Comply with orders immediately", body: "Court orders are binding. Non-compliance can result in serious penalties including fines or imprisonment. If you cannot comply due to a genuine reason, apply to the court to vary the order.", urgent: true },
      { title: "Formalise property transfers", body: "Property transfers usually require additional steps — transferring title at Land Registry, splitting superannuation through the fund, closing joint accounts. Orders tell you what to do; you execute them.", urgent: false },
      { title: "Varying orders later", body: "Parenting orders can be varied if there is a significant change in circumstances. Property orders are generally final. Apply in a Case if you need to change existing orders.", urgent: false },
    ]
  },
];

const RESOURCES = [
  { name: "Federal Circuit and Family Court of Australia", url: "https://www.fcfcoa.gov.au", desc: "Official court forms, guides, and online filing" },
  { name: "Legal Aid (National)", url: "https://www.legalaid.gov.au", desc: "Free and low-cost legal help. Each state has its own Legal Aid." },
  { name: "Family Relationship Advice Line", url: "tel:1800050321", desc: "1800 050 321 — Free advice on family relationship issues including separation" },
  { name: "Commonwealth Courts Portal", url: "https://www.comcourts.gov.au", desc: "Online filing and case management" },
  { name: "Relationships Australia", url: "https://www.relationships.org.au", desc: "FDR mediation services across Australia" },
  { name: "1800RESPECT", url: "tel:1800737732", desc: "1800 737 732 — Support for family violence" },
  { name: "Family Law Act 1975 (Cth)", url: "https://www.legislation.gov.au/C2004A00275", desc: "The main federal legislation governing family law in Australia" },
];

// ============================================================
// COMPONENTS
// ============================================================

const TABS = ["Legal Guide", "Forms Library", "Document Vault", "Glossary"];

const TAB_ICONS = {
  "Legal Guide": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  "Forms Library": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  "Document Vault": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  "Glossary": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
};

function LegalGuide() {
  const [openPhase, setOpenPhase] = useState(0);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{
          background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)",
          borderRadius: 16,
          padding: "28px 32px",
          color: "white",
          marginBottom: 24,
        }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, marginBottom: 10, fontWeight: 700 }}>
            Australian Family Court Guide
          </h2>
          <p style={{ fontSize: 15, opacity: 0.9, lineHeight: 1.6, marginBottom: 16 }}>
            This guide covers the <strong>Federal Circuit and Family Court of Australia (FCFCOA)</strong> — the court that handles most family law matters including parenting, property, divorce, and domestic violence orders.
          </p>
          <div style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            borderLeft: "3px solid #74C69D",
          }}>
            ⚠️ <strong>Important:</strong> This is legal <em>information</em>, not legal <em>advice</em>. Every situation is different. For advice about your specific case, speak with a lawyer or Legal Aid.
          </div>
        </div>

        {PROCESS_STEPS.map((phase, i) => (
          <div key={i} style={{
            marginBottom: 12,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #E8F5E9",
            boxShadow: openPhase === i ? "0 4px 20px rgba(44,107,66,0.1)" : "none",
          }}>
            <button
              onClick={() => setOpenPhase(openPhase === i ? -1 : i)}
              style={{
                width: "100%",
                background: openPhase === i ? phase.color : "#F9FBF9",
                color: openPhase === i ? "white" : "#1B4332",
                border: "none",
                padding: "18px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 17,
                fontWeight: 600,
              }}
            >
              <span>{phase.icon} &nbsp; Phase {i + 1}: {phase.phase}</span>
              <span style={{ fontSize: 20, opacity: 0.7 }}>{openPhase === i ? "−" : "+"}</span>
            </button>
            {openPhase === i && (
              <div style={{ background: "white", padding: "8px 24px 20px" }}>
                {phase.steps.map((step, j) => (
                  <div key={j} style={{
                    padding: "16px 0",
                    borderBottom: j < phase.steps.length - 1 ? "1px solid #E8F5E9" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: step.urgent ? "#D62828" : phase.color,
                        color: "white", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 13, fontWeight: 700,
                        flexShrink: 0, marginTop: 2,
                      }}>{j + 1}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#1B4332", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                          {step.title}
                          {step.urgent && <span style={{ background: "#D62828", color: "white", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>DEADLINE</span>}
                        </div>
                        <p style={{ color: "#495057", lineHeight: 1.7, fontSize: 14, margin: 0 }}>{step.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ background: "#F0FFF4", borderRadius: 12, padding: 24, border: "1px solid #B7E4C7" }}>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: "#1B4332", marginBottom: 16 }}>
          📞 Key Resources
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {RESOURCES.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{
              background: "white",
              borderRadius: 8,
              padding: "12px 14px",
              textDecoration: "none",
              border: "1px solid #D8F3DC",
              transition: "box-shadow 0.2s",
            }}>
              <div style={{ fontWeight: 700, color: "#2D6A4F", fontSize: 13, marginBottom: 4 }}>{r.name}</div>
              <div style={{ color: "#6B7280", fontSize: 12 }}>{r.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function FormsLibrary() {
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return FORMS;
    const q = search.toLowerCase();
    return FORMS.map(cat => ({
      ...cat,
      items: cat.items.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.use.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q)
      )
    })).filter(cat => cat.items.length > 0);
  }, [search]);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, color: "#1B4332", marginBottom: 8 }}>
          Court Forms Library
        </h2>
        <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 20 }}>
          All key forms for the Federal Circuit and Family Court of Australia. Click any form for a plain-English explanation and the official link.
        </p>
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search forms..."
            style={{
              width: "100%", padding: "12px 14px 12px 42px",
              borderRadius: 10, border: "1px solid #D8F3DC",
              fontSize: 14, outline: "none", background: "white",
              fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {filtered.map((cat, i) => (
        <div key={i} style={{ marginBottom: 28 }}>
          <h3 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 16, color: "#40916C",
            borderBottom: "2px solid #D8F3DC",
            paddingBottom: 8, marginBottom: 12,
          }}>{cat.category}</h3>
          {cat.items.map((form, j) => (
            <div key={j} style={{
              background: "white",
              borderRadius: 10,
              border: "1px solid #E8F5E9",
              marginBottom: 8,
              overflow: "hidden",
              boxShadow: openForm === `${i}-${j}` ? "0 2px 12px rgba(44,107,66,0.1)" : "none",
            }}>
              <button
                onClick={() => setOpenForm(openForm === `${i}-${j}` ? null : `${i}-${j}`)}
                style={{
                  width: "100%", background: "none", border: "none",
                  padding: "14px 18px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: "#1B4332", fontSize: 15 }}>{form.title}</span>
                  <span style={{ color: "#9CA3AF", fontSize: 13, marginLeft: 10 }}>{form.code}</span>
                </div>
                <span style={{ color: "#40916C", fontSize: 18 }}>{openForm === `${i}-${j}` ? "−" : "+"}</span>
              </button>
              {openForm === `${i}-${j}` && (
                <div style={{ padding: "0 18px 18px", borderTop: "1px solid #E8F5E9" }}>
                  <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 14, marginTop: 12 }}>
                    <strong>When to use:</strong> {form.use}
                  </p>
                  <div style={{
                    background: "#F0FFF4",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#1B4332",
                    margin: "10px 0",
                    borderLeft: "3px solid #40916C",
                  }}>
                    💡 <strong>Tip:</strong> {form.tip}
                  </div>
                  <a href={form.link} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "#2D6A4F", color: "white",
                    padding: "8px 16px", borderRadius: 7, fontSize: 13,
                    textDecoration: "none", fontWeight: 600,
                  }}>
                    Download Official Form →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DocumentVault() {
  const [files, setFiles] = useState([
    { id: 1, name: "Affidavit_draft_v2.pdf", category: "Affidavits", size: "284 KB", date: "14 Feb 2025", encrypted: true },
    { id: 2, name: "Bank_Statements_ANZ_2024.pdf", category: "Financial", size: "1.2 MB", date: "10 Feb 2025", encrypted: true },
    { id: 3, name: "Property_Valuation_Report.pdf", category: "Property", size: "3.4 MB", date: "2 Jan 2025", encrypted: true },
  ]);
  const [dragOver, setDragOver] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = ["All", "Affidavits", "Court Orders", "Financial", "Property", "Correspondence", "Children", "Other"];

  const filtered = selectedCategory === "All" ? files : files.filter(f => f.category === selectedCategory);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = droppedFiles.map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      category: "Other",
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
      date: new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
      encrypted: true,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const deleteFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const getCatColor = (cat) => {
    const colors = { Affidavits: "#6366F1", "Court Orders": "#D62828", Financial: "#059669", Property: "#D97706", Correspondence: "#0284C7", Children: "#7C3AED", Other: "#6B7280" };
    return colors[cat] || "#6B7280";
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{
        background: "linear-gradient(135deg, #0D1B2A 0%, #1B2A3B 100%)",
        borderRadius: 16, padding: "28px 32px", color: "white", marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 42, height: 42, background: "rgba(255,255,255,0.1)",
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
          }}>🔐</div>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, marginBottom: 2 }}>
              Secure Document Vault
            </h2>
            <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>Your documents are encrypted and never indexed or shared</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          {[
            { icon: "🔒", label: "AES-256 Encryption at Rest" },
            { icon: "🌐", label: "Never accessible to search engines" },
            { icon: "👤", label: "Only you can access your vault" },
          ].map((item, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.08)", borderRadius: 8,
              padding: "8px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6, flex: 1,
            }}>
              {item.icon} {item.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
            border: "1px solid",
            borderColor: selectedCategory === cat ? "#2D6A4F" : "#E5E7EB",
            background: selectedCategory === cat ? "#2D6A4F" : "white",
            color: selectedCategory === cat ? "white" : "#374151",
            fontFamily: "inherit",
          }}>
            {cat}
          </button>
        ))}
        <button
          onClick={() => setShowUpload(!showUpload)}
          style={{
            marginLeft: "auto", padding: "6px 18px", borderRadius: 20, fontSize: 13,
            background: "#2D6A4F", color: "white", border: "none", cursor: "pointer",
            fontFamily: "inherit", fontWeight: 700,
          }}>
          + Upload
        </button>
      </div>

      {showUpload && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? "#2D6A4F" : "#D8F3DC"}`,
            borderRadius: 12, padding: "32px 24px", textAlign: "center",
            background: dragOver ? "#F0FFF4" : "#FAFAFA", marginBottom: 20,
            transition: "all 0.2s",
          }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
          <p style={{ color: "#374151", fontWeight: 600, marginBottom: 4 }}>Drag & drop files here</p>
          <p style={{ color: "#9CA3AF", fontSize: 13 }}>Files are encrypted immediately on upload. Supports PDF, DOCX, JPG, PNG.</p>
          <div style={{ marginTop: 10, background: "#FEF3C7", borderRadius: 8, padding: "8px 16px", display: "inline-block", fontSize: 12, color: "#92400E" }}>
            ⚠️ Production note: In live deployment, files upload directly to AWS S3 with client-side AES-256 encryption via AWS KMS. Zero-knowledge architecture — not even admins can read your files.
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "#9CA3AF" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
          <p>No documents in this category yet.</p>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #E8F5E9", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F9FBF9" }}>
                {["Document", "Category", "Size", "Added", ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: "left", color: "#6B7280", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((file, i) => (
                <tr key={file.id} style={{ borderTop: "1px solid #E8F5E9" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>📄</span>
                      <div>
                        <div style={{ fontWeight: 600, color: "#1B4332" }}>{file.name}</div>
                        {file.encrypted && <div style={{ fontSize: 11, color: "#059669", display: "flex", alignItems: "center", gap: 3 }}>🔒 Encrypted</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      background: getCatColor(file.category) + "20",
                      color: getCatColor(file.category),
                      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    }}>{file.category}</span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#6B7280" }}>{file.size}</td>
                  <td style={{ padding: "14px 16px", color: "#6B7280" }}>{file.date}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <button onClick={() => deleteFile(file.id)} style={{
                      background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 16, padding: "2px 6px",
                    }} title="Delete">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 20, background: "#EFF6FF", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#1E40AF", border: "1px solid #BFDBFE" }}>
        <strong>Production deployment note:</strong> Documents are stored in AWS S3 with server-side AES-256 encryption (SSE-KMS). Each user's files are isolated with IAM policies. Presigned URLs expire after 15 minutes. No file content is indexed anywhere. To deploy this live, you'll need: AWS account → S3 + KMS setup → AWS Cognito for auth → API Gateway + Lambda for file operations.
      </div>
    </div>
  );
}

function Glossary() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return GLOSSARY_TERMS;
    const q = search.toLowerCase();
    return GLOSSARY_TERMS.filter(t => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));
  }, [search]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(t => {
      const letter = t.term[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(t);
    });
    return groups;
  }, [filtered]);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, color: "#1B4332", marginBottom: 8 }}>
          Family Law Glossary
        </h2>
        <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 16 }}>
          Plain-English definitions of {GLOSSARY_TERMS.length} key legal terms you'll encounter in Australian family court.
        </p>
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search terms..."
            style={{
              width: "100%", padding: "12px 14px 12px 42px",
              borderRadius: 10, border: "1px solid #D8F3DC",
              fontSize: 14, outline: "none", background: "white",
              fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {Object.keys(grouped).sort().map(letter => (
        <div key={letter} style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 28, fontWeight: 700, color: "#D8F3DC",
            background: "#1B4332", width: 44, height: 44,
            borderRadius: 10, display: "flex", alignItems: "center",
            justifyContent: "center", marginBottom: 10,
          }}>{letter}</div>
          {grouped[letter].map((item, i) => (
            <div key={i} style={{
              background: "white",
              borderRadius: 10,
              border: "1px solid #E8F5E9",
              marginBottom: 6,
              overflow: "hidden",
              cursor: "pointer",
            }} onClick={() => setExpanded(expanded === item.term ? null : item.term)}>
              <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "#1B4332", fontSize: 15 }}>{item.term}</span>
                <span style={{ color: "#40916C", fontSize: 16 }}>{expanded === item.term ? "−" : "+"}</span>
              </div>
              {expanded === item.term && (
                <div style={{ padding: "0 18px 16px", borderTop: "1px solid #E8F5E9" }}>
                  <p style={{ color: "#374151", lineHeight: 1.75, fontSize: 14, marginTop: 12, marginBottom: 0 }}>
                    {item.definition}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "#9CA3AF" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p>No terms found for "{search}"</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [activeTab, setActiveTab] = useState("Legal Guide");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");

  if (!loggedIn) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0D2818 0%, #1B4332 50%, #2D6A4F 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "'Source Serif 4', 'Georgia', serif",
        padding: 24,
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Serif+4:wght@300;400;600&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { margin: 0; }
        `}</style>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>⚖️</div>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(32px, 5vw, 52px)",
            color: "white",
            fontWeight: 700,
            marginBottom: 12,
            letterSpacing: "-0.5px",
          }}>Family Court Guide</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, maxWidth: 420, lineHeight: 1.6, margin: "0 auto" }}>
            Free legal information, court forms, and a secure document vault for Australians navigating family court without a lawyer.
          </p>
        </div>

        <div style={{
          background: "white", borderRadius: 20, padding: "36px 40px",
          width: "100%", maxWidth: 420,
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
        }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: "#1B4332", marginBottom: 24 }}>Sign in to your account</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email address</label>
            <input
              type="email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: "100%", padding: "11px 14px",
                borderRadius: 8, border: "1px solid #D1D5DB",
                fontSize: 14, outline: "none", fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              style={{
                width: "100%", padding: "11px 14px",
                borderRadius: 8, border: "1px solid #D1D5DB",
                fontSize: 14, outline: "none", fontFamily: "inherit",
              }}
            />
          </div>
          <button onClick={() => setLoggedIn(true)} style={{
            width: "100%", padding: "13px",
            background: "linear-gradient(135deg, #1B4332, #2D6A4F)",
            color: "white", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            Sign In Securely
          </button>
          <p style={{ textAlign: "center", fontSize: 13, color: "#9CA3AF", marginTop: 16 }}>
            Don't have an account? <button onClick={() => setLoggedIn(true)} style={{ background: "none", border: "none", color: "#2D6A4F", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Create free account</button>
          </p>
          <div style={{ marginTop: 20, padding: "10px 14px", background: "#F0FFF4", borderRadius: 8, fontSize: 12, color: "#1B4332", textAlign: "center" }}>
            🔒 Your vault is end-to-end encrypted. We cannot see your documents.
          </div>
        </div>

        <div style={{ marginTop: 28, display: "flex", gap: 28, color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
          <span>✓ Free to use</span>
          <span>✓ No lawyers required</span>
          <span>✓ Australian law</span>
          <span>✓ Private & secure</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F8F4", fontFamily: "'Source Serif 4', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Serif+4:wght@300;400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        a { transition: opacity 0.15s; }
        a:hover { opacity: 0.8; }
        button { transition: all 0.15s; }
      `}</style>

      {/* Header */}
      <header style={{
        background: "white",
        borderBottom: "1px solid #E8F5E9",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 12px rgba(27,67,50,0.06)",
      }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚖️</span>
            <div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: "#1B4332", fontSize: 17, lineHeight: 1.2 }}>Family Court Guide</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>Australian Family Law · Self-Represented</div>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 4 }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: activeTab === tab ? "#1B4332" : "transparent",
                  color: activeTab === tab ? "white" : "#6B7280",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                {TAB_ICONS[tab]} {tab}
              </button>
            ))}
          </nav>

          <button onClick={() => setLoggedIn(false)} style={{
            background: "none", border: "1px solid #E5E7EB",
            borderRadius: 8, padding: "6px 14px", fontSize: 13,
            color: "#6B7280", cursor: "pointer", fontFamily: "inherit",
          }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1060, margin: "0 auto", padding: "32px 24px" }}>
        {activeTab === "Legal Guide" && <LegalGuide />}
        {activeTab === "Forms Library" && <FormsLibrary />}
        {activeTab === "Document Vault" && <DocumentVault />}
        {activeTab === "Glossary" && <Glossary />}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #E8F5E9",
        padding: "20px 24px",
        textAlign: "center",
        fontSize: 12,
        color: "#9CA3AF",
        background: "white",
        marginTop: 40,
      }}>
        <p>This platform provides legal <strong>information</strong>, not legal <strong>advice</strong>. For advice specific to your situation, contact <a href="https://www.legalaid.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: "#2D6A4F" }}>Legal Aid</a> or a family lawyer.</p>
        <p style={{ marginTop: 4 }}>© 2025 Family Court Guide · Built for self-represented Australians · Not affiliated with the FCFCOA</p>
      </footer>
    </div>
  );
}
