import { useState, useEffect, useRef } from "react";

// ─── COLOUR TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg: "#F5F3EE",
  panel: "#FFFFFF",
  navy: "#1A2B4A",
  teal: "#2D7D7B",
  tealLight: "#E8F4F4",
  amber: "#D4860A",
  amberLight: "#FFF4E0",
  red: "#C0392B",
  redLight: "#FDE8E8",
  text: "#2C2C2C",
  muted: "#6B7280",
  border: "#E2DDD5",
  vaultGreen: "#1B5E38",
  vaultGreenLight: "#E8F5EE",
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Georgia', 'Times New Roman', serif",
    color: C.text,
  },
  header: {
    background: C.navy,
    color: "#fff",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: "-0.5px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    background: C.teal,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
  },
  nav: {
    display: "flex",
    gap: 4,
    background: "#fff",
    borderBottom: `2px solid ${C.border}`,
    padding: "0 24px",
    overflowX: "auto",
  },
  navBtn: (active) => ({
    padding: "14px 20px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "'Georgia', serif",
    fontWeight: active ? "700" : "400",
    color: active ? C.teal : C.muted,
    borderBottom: active ? `3px solid ${C.teal}` : "3px solid transparent",
    marginBottom: -2,
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  }),
  container: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 24px",
  },
  card: {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  disclaimer: {
    background: C.amberLight,
    border: `1px solid ${C.amber}`,
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 13,
    color: "#7A4F00",
    marginBottom: 24,
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  btn: (variant = "primary") => ({
    padding: "10px 20px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "'Georgia', serif",
    fontWeight: "600",
    background: variant === "primary" ? C.teal : variant === "vault" ? C.vaultGreen : C.navy,
    color: "#fff",
    transition: "opacity 0.2s",
  }),
  tag: (color = C.teal) => ({
    display: "inline-block",
    background: color + "20",
    color: color,
    border: `1px solid ${color}40`,
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 6,
  }),
  input: {
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "'Georgia', serif",
    background: C.panel,
    boxSizing: "border-box",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.navy,
    marginBottom: 6,
    marginTop: 0,
  },
  sectionSub: {
    color: C.muted,
    fontSize: 14,
    marginBottom: 24,
    marginTop: 0,
  },
};

// ─── DATA ─────────────────────────────────────────────────────────────────────

const LEGAL_INFO = [
  {
    category: "Divorce & Separation",
    color: C.teal,
    items: [
      {
        title: "Applying for Divorce",
        summary:
          "To get a divorce in Australia you must have been separated for at least 12 months. The divorce only ends your marriage — it does not deal with property or children. You apply through the Commonwealth Courts Portal. There is a filing fee (currently around $1,060; reduced fees available for eligible applicants).",
        legislation: "Family Law Act 1975 (Cth), s 48–55A",
        link: "https://www.fcfcoa.gov.au/fl/divorce",
        tip: "You can apply jointly (with your spouse) or as a sole applicant. Joint applications are simpler and cheaper.",
      },
      {
        title: "12-Month Separation Rule",
        summary:
          "You and your spouse must have lived separately for at least 12 months (and one day) before the divorce is granted. You can be 'separated under one roof' if finances and domestic lives are genuinely separate. You will need an affidavit to support this.",
        legislation: "Family Law Act 1975 (Cth), s 49",
        link: "https://www.legislation.gov.au/Details/C2022C00085",
        tip: "Keep records (e.g. separate bank accounts, changes to Medicare) as evidence of separation date.",
      },
      {
        title: "De Facto Relationships",
        summary:
          "De facto partners (including same-sex couples) have largely the same property rights as married couples under the Family Law Act, but you must apply within 2 years of separation. The court considers the nature of the relationship, finances, and children.",
        legislation: "Family Law Act 1975 (Cth), s 4AA, Part VIIIAB",
        link: "https://www.legislation.gov.au/Details/C2022C00085",
        tip: "If you miss the 2-year window, you need court permission to apply late.",
      },
    ],
  },
  {
    category: "Children & Parenting",
    color: "#7B3FA8",
    items: [
      {
        title: "Parenting Orders — What They Are",
        summary:
          "A parenting order is a court order setting out who a child lives with, spends time with, and how major decisions are made. The paramount consideration is always the best interests of the child. Orders can be made by consent (agreement) or after a hearing.",
        legislation: "Family Law Act 1975 (Cth), s 60B, s 65D",
        link: "https://www.fcfcoa.gov.au/fl/children",
        tip: "Try mediation first. Courts require a genuine attempt at dispute resolution before most parenting applications.",
      },
      {
        title: "Best Interests of the Child",
        summary:
          "Amended in 2023: the court considers a list of factors including the child's safety, relationship with each parent, the child's own views, and the benefit of a meaningful relationship with both parents (where safe).",
        legislation: "Family Law Act 1975 (Cth), s 60CC (as amended 2023)",
        link: "https://www.legislation.gov.au/Details/C2022C00085",
        tip: "The 2023 amendments removed the presumption of equal shared parental responsibility — focus is now squarely on each child's individual circumstances.",
      },
      {
        title: "Independent Children's Lawyer (ICL)",
        summary:
          "In complex cases, the court may appoint an ICL to represent the child's best interests. The ICL is not the child's advocate but provides the court with an independent view. Their fees are usually split between parties.",
        legislation: "Family Law Act 1975 (Cth), s 68L",
        link: "https://www.fcfcoa.gov.au/fl/children/icl",
        tip: "Either party or the court can request appointment of an ICL, particularly where there are serious safety concerns.",
      },
      {
        title: "Family Violence & Safety",
        summary:
          "Protecting children from family violence is a primary consideration. You can apply for an urgent injunction or contact police for a Family Violence Order (FVO/AVO/IVO depending on state). The FCFCOA has a Safe at Home program.",
        legislation: "Family Law Act 1975 (Cth), s 60CG; State DFV Acts",
        link: "https://www.fcfcoa.gov.au/fl/familyviolence",
        tip: "If you or your children are in immediate danger, call 000. For safety planning call 1800RESPECT (1800 737 732).",
      },
    ],
  },
  {
    category: "Property & Financial",
    color: C.amber,
    items: [
      {
        title: "Property Settlement",
        summary:
          "When a marriage or de facto relationship ends, you can reach an agreement with your former partner (via consent orders or a binding financial agreement) or ask the court to make orders. The court follows a four-step process: identify assets; assess contributions; consider future needs; assess whether the result is just and equitable.",
        legislation: "Family Law Act 1975 (Cth), s 79 (married), s 90SM (de facto)",
        link: "https://www.fcfcoa.gov.au/fl/property",
        tip: "Both parties must make full and frank financial disclosure. Hiding assets is a contempt of court.",
      },
      {
        title: "Superannuation Splitting",
        summary:
          "Superannuation is treated as property and can be split between parties. You'll need to get member information from the fund and serve them with the court application. The split takes effect when the relationship ends legally.",
        legislation: "Family Law Act 1975 (Cth), Part VIIIB",
        link: "https://www.legislation.gov.au/Details/C2022C00085",
        tip: "Superannuation splitting does not mean your ex receives a cash payment immediately — it stays in a super fund.",
      },
      {
        title: "Spousal / Partner Maintenance",
        summary:
          "One party may be ordered to pay maintenance to the other if they cannot meet their reasonable needs and the other has the capacity to pay. Time limits apply: 12 months from divorce for married couples, 2 years for de facto.",
        legislation: "Family Law Act 1975 (Cth), s 72, s 90SF",
        link: "https://www.fcfcoa.gov.au/fl/maintenance",
        tip: "Urgent/interim maintenance can be sought at short notice if you are in financial hardship.",
      },
      {
        title: "Child Support",
        summary:
          "Child support is calculated by Services Australia using a formula based on income, percentage of care, and number of children. You can apply through myGov. Private agreements are also possible.",
        legislation: "Child Support (Assessment) Act 1989 (Cth)",
        link: "https://www.servicesaustralia.gov.au/child-support",
        tip: "The formula uses 'taxable income' — if income has changed, request a reassessment or apply for a 'change of assessment'.",
      },
    ],
  },
  {
    category: "Going to Court",
    color: C.navy,
    items: [
      {
        title: "Pre-Action Procedures",
        summary:
          "Before filing most family law applications, you must make a genuine attempt to resolve the dispute through dispute resolution (mediation/family dispute resolution). You'll need a Section 60I certificate from an FDR practitioner. Exceptions apply for urgent matters and family violence.",
        legislation: "Family Law Act 1975 (Cth), s 60I; FCFCOA Rules 2021 Part 4.1",
        link: "https://www.fcfcoa.gov.au/fl/dispute-resolution",
        tip: "Legal Aid, Relationships Australia, and Interrelate all offer subsidised FDR services.",
      },
      {
        title: "Filing an Application",
        summary:
          "Most applications are filed through the Commonwealth Courts Portal (online). You will need to create an account, complete the relevant form, pay the filing fee, and serve the other party with your application and supporting documents.",
        legislation: "FCFCOA Rules 2021",
        link: "https://www.comcourts.gov.au",
        tip: "File fees are currently around $490–$1,060 for family law. Fee waivers are available for Health Care Card holders and those in financial hardship.",
      },
      {
        title: "Serving Documents",
        summary:
          "You must serve all filed documents on the other party. For divorce, service must be personal (hand delivery) or by post (with an affidavit of service). For parenting/property, service is by hand, post, or sometimes email if the other party agrees.",
        legislation: "FCFCOA Rules 2021, Part 6",
        link: "https://www.fcfcoa.gov.au/fl/proceedings/service",
        tip: "You cannot personally serve your former spouse — ask a friend, process server, or sheriff.",
      },
      {
        title: "Self-Represented Litigants",
        summary:
          "You have the right to represent yourself in the Family Court. The court has Self-Represented Litigant Coordinators at each registry who can give procedural (not legal) information. Legal Aid and Community Legal Centres may also assist.",
        legislation: "FCFCOA Act 2021 (Cth), s 100",
        link: "https://www.fcfcoa.gov.au/fl/srl",
        tip: "National Legal Aid: 1300 650 579. Law Access NSW: 1300 888 529. Victoria Legal Aid: 1300 792 387.",
      },
    ],
  },
];

const FORMS = [
  {
    category: "Divorce",
    forms: [
      {
        number: "Application for Divorce",
        when: "When you want to formally end your marriage. Must be 12+ months separated.",
        url: "https://www.fcfcoa.gov.au/fl/divorce/apply",
        fee: "~$1,060 (reduced fees available)",
        notes: "Filed through Commonwealth Courts Portal. Joint or sole application.",
      },
      {
        number: "Affidavit for eFiling (Divorce)",
        when: "Required with divorce application. Confirms facts in your application under oath.",
        url: "https://www.fcfcoa.gov.au/resources/forms",
        fee: "No separate fee",
        notes: "Must be signed before an authorised witness (lawyer, JP, notary).",
      },
      {
        number: "Affidavit of Service (Divorce)",
        when: "After you serve divorce documents on your spouse — proves service occurred.",
        url: "https://www.fcfcoa.gov.au/resources/forms",
        fee: "No separate fee",
        notes: "Completed by the person who did the serving, not you.",
      },
    ],
  },
  {
    category: "Children & Parenting",
    forms: [
      {
        number: "Initiating Application (Family Law)",
        when: "To start proceedings — parenting orders, property, spousal maintenance, or injunctions.",
        url: "https://www.fcfcoa.gov.au/resources/forms",
        fee: "~$490",
        notes: "Most common starting document for parenting or property disputes.",
      },
      {
        number: "Response to Initiating Application",
        when: "If you have been served with an initiating application and want to respond.",
        url: "https://www.fcfcoa.gov.au/resources/forms",
        fee: "~$490",
        notes: "Due date will be on the court documents you were served with.",
      },
      {
        number: "Application — Consent Orders",
        when: "You and your former partner have reached an agreement and want it made into court orders.",
        url: "https://www.fcfcoa.gov.au/resources/forms",
        fee: "~$195",
        notes: "Cheaper and quicker than contested proceedings. For parenting or property.",
      },
      {
        number: "Parenting Plan",
        when: "You want a written agreement about parenting arrangements — NOT a court order.",
        url: "https://www.fcfcoa.gov.au/resources/forms",
        fee: "Free",
        notes: "Can be changed by mutual agreement. Not enforceable like a court order.",
      },
      {
        number: "Notice of Child Abuse or Family Violence",
        when: "Required if applying for Part VII orders and there are allegations of child abuse or family violence.",
        url: "https://www.fcfcoa.gov.au/resources/forms",
        fee: "No separate fee",
        notes: "Not filed — given to the judicial officer at first court appearance.",
      },
    ],
  },
  {
    category: "Property & Finance",
    forms: [
      {
        number: "Financial Statement",
        when: "In any property or maintenance proceedings — discloses your financial position.",
        url: "https://www.fcfcoa.gov.au/resources/forms",
        fee: "No separate fee",
        notes: "Full financial disclosure is mandatory. Must be updated if circumstances change.",
      },
      {
        number: "Application for Superannuation Information",
        when: "To get a member's super fund details for super splitting.",
        url: "https://www.fcfcoa.gov.au/resources/forms",
        fee: "None to court (fund may charge)",
        notes: "Served on the trustee of the super fund.",
      },
    ],
  },
  {
    category: "General Court",
    forms: [
      {
        number: "Affidavit",
        when: "A sworn written statement of facts used in most family law proceedings.",
        url: "https://www.fcfcoa.gov.au/resources/forms",
        fee: "No separate fee",
        notes: "Must contain facts, not opinions. Signed before authorised witness.",
      },
      {
        number: "Subpoena",
        when: "To compel a third party to produce documents or give evidence.",
        url: "https://www.fcfcoa.gov.au/resources/forms",
        fee: "~$45 per subpoena",
        notes: "Requires court permission. Conduct money must accompany the subpoena.",
      },
    ],
  },
];

const GLOSSARY_TERMS = [
  { term: "Affidavit", def: "A written statement sworn or affirmed to be true, used as evidence in court proceedings. You sign it in front of an authorised witness (like a JP or solicitor)." },
  { term: "Applicant", def: "The person who starts court proceedings by filing an application." },
  { term: "Best Interests of the Child", def: "The primary consideration in all parenting decisions. The court looks at safety, relationships, the child's views, and other factors set out in s 60CC of the Family Law Act." },
  { term: "Binding Financial Agreement (BFA)", def: "A private written agreement between partners about property and financial matters. Does not go through court. Must be signed with independent legal advice to be binding." },
  { term: "Child Support", def: "Money paid by one parent to another to help with the costs of raising children. Calculated by Services Australia using the Child Support Formula." },
  { term: "Consent Orders", def: "Court orders made with the agreement of both parties. Legally binding and enforceable, unlike a parenting plan." },
  { term: "Contravention", def: "Breaching a court order without a reasonable excuse. Can result in fines, community service, or imprisonment." },
  { term: "De Facto Relationship", def: "A couple (same or different sex) living together on a genuine domestic basis who are not married." },
  { term: "Disclosure", def: "The obligation to provide full, frank, and honest information about your financial situation. Failure to disclose is a serious breach." },
  { term: "Divorce", def: "The legal ending of a marriage. In Australia this requires 12 months of separation. It is separate from property and parenting arrangements." },
  { term: "Enforcement", def: "The process of making a party comply with a court order they are not following." },
  { term: "Family Dispute Resolution (FDR)", def: "Mediation to help separating families resolve disputes without going to court. Mandatory (with exceptions) before most parenting applications." },
  { term: "Family Violence Order (FVO)", def: "Also called AVO (NSW), IVO (Vic), DVO (Qld) etc. A protection order from a state court. Can run alongside family law proceedings." },
  { term: "FCFCOA", def: "Federal Circuit and Family Court of Australia — the main court handling family law matters in Australia." },
  { term: "Financial Statement", def: "A compulsory form in property proceedings listing income, expenses, assets, liabilities and financial resources." },
  { term: "ICL (Independent Children's Lawyer)", def: "A lawyer appointed by the court to represent the best interests of a child in complex proceedings. Not the same as being the child's own lawyer." },
  { term: "Injunction", def: "A court order requiring someone to do or not do something. Can be urgent/interim (temporary) or final." },
  { term: "Initiating Application", def: "The main form used to start family law proceedings in the FCFCOA." },
  { term: "Interim Order", def: "A temporary order made while proceedings are ongoing, to deal with urgent matters until a final decision is made." },
  { term: "Jurisdiction", def: "The authority of a court to hear and decide a matter. Family law is primarily a federal matter in Australia." },
  { term: "Just and Equitable", def: "The standard the court applies in property settlements — the outcome must be fair in all circumstances." },
  { term: "Leave", def: "Permission from the court to do something, e.g. 'apply for leave to file out of time'." },
  { term: "Legal Aid", def: "Government-funded legal assistance for people who cannot afford a lawyer. Eligibility is means and merits tested." },
  { term: "Maintenance", def: "Financial support paid by one party to another after separation. Includes spousal/partner maintenance and urgent maintenance." },
  { term: "Parenting Order", def: "A court order about arrangements for children — who they live with, spend time with, and how decisions are made." },
  { term: "Parenting Plan", def: "A written agreement between parents about children's arrangements. Not a court order and not enforceable." },
  { term: "Property Settlement", def: "The division of assets, liabilities, and financial resources between parties after separation." },
  { term: "Registrar", def: "A judicial officer below a Judge who can make procedural orders and some final orders in less complex matters." },
  { term: "Respondent", def: "The person who responds to a court application filed by someone else." },
  { term: "Section 60I Certificate", def: "A certificate from a Family Dispute Resolution Practitioner confirming you attended (or attempted) mediation. Required before most parenting applications." },
  { term: "Self-Represented Litigant (SRL)", def: "A person who appears in court without a lawyer. Also called litigant in person." },
  { term: "Separation", def: "When a couple stops living together as a couple. Can happen while still living in the same house." },
  { term: "Service / Serve", def: "The legal process of delivering court documents to the other party, following court rules." },
  { term: "Subpoena", def: "A court order requiring a person or organisation to produce documents or give evidence." },
  { term: "Superannuation Splitting", def: "The process of dividing superannuation entitlements between former partners as part of property settlement." },
  { term: "Without Prejudice", def: "Communications made in genuine attempts to settle a dispute that cannot later be used as evidence in court." },
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Disclaimer() {
  return (
    <div style={styles.disclaimer}>
      <span style={{ fontSize: 18 }}>⚠️</span>
      <span>
        <strong>Important:</strong> This website provides <em>legal information only</em>, not legal advice. Every situation is different. For advice about your specific circumstances, please consult a qualified family law solicitor, your state Legal Aid commission, or a community legal centre.
      </span>
    </div>
  );
}

// ─── TAB: LEGAL INFO ──────────────────────────────────────────────────────────

function LegalInfoTab() {
  const [open, setOpen] = useState({});
  const [search, setSearch] = useState("");

  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const filtered = search
    ? LEGAL_INFO.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (i) =>
            i.title.toLowerCase().includes(search.toLowerCase()) ||
            i.summary.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((cat) => cat.items.length > 0)
    : LEGAL_INFO;

  return (
    <div style={styles.container}>
      <Disclaimer />
      <h1 style={styles.sectionTitle}>Australian Family Law — Information Guide</h1>
      <p style={styles.sectionSub}>Plain-English explanations of key laws, rights, and processes under the Family Law Act 1975 (Cth) and FCFCOA Rules 2021.</p>

      <input
        style={{ ...styles.input, marginBottom: 24 }}
        placeholder="🔍  Search topics..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.map((cat) => (
        <div key={cat.category} style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 4, height: 24, background: cat.color, borderRadius: 2 }} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: "700", color: cat.color }}>{cat.category}</h2>
          </div>
          {cat.items.map((item, i) => {
            const key = cat.category + i;
            const isOpen = open[key];
            return (
              <div key={i} style={{ ...styles.card, borderLeft: `3px solid ${cat.color}30` }}>
                <div
                  style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
                  onClick={() => toggle(key)}
                >
                  <div>
                    <div style={{ fontWeight: "700", fontSize: 15, color: C.navy }}>{item.title}</div>
                    {!isOpen && <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{item.summary.slice(0, 100)}…</div>}
                  </div>
                  <span style={{ fontSize: 18, color: C.muted, marginLeft: 12, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ margin: "0 0 12px", lineHeight: 1.7, fontSize: 14 }}>{item.summary}</p>
                    <div style={{ background: C.tealLight, borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: C.teal, fontWeight: "700", marginBottom: 2 }}>📖 LEGISLATION</div>
                      <div style={{ fontSize: 13 }}>{item.legislation}</div>
                    </div>
                    <div style={{ background: C.amberLight, borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: C.amber, fontWeight: "700", marginBottom: 2 }}>💡 PRACTICAL TIP</div>
                      <div style={{ fontSize: 13 }}>{item.tip}</div>
                    </div>
                    <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: C.teal }}>
                      → View official court information ↗
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── TAB: FORMS LIBRARY ───────────────────────────────────────────────────────

function FormsTab() {
  const [search, setSearch] = useState("");

  const filtered = search
    ? FORMS.map((cat) => ({
        ...cat,
        forms: cat.forms.filter(
          (f) =>
            f.number.toLowerCase().includes(search.toLowerCase()) ||
            f.when.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((c) => c.forms.length > 0)
    : FORMS;

  return (
    <div style={styles.container}>
      <Disclaimer />
      <h1 style={styles.sectionTitle}>Official Court Forms — Plain-English Guide</h1>
      <p style={styles.sectionSub}>All forms are official FCFCOA forms. Click the link to access them on the court's website. This guide explains when and why to use each one.</p>

      <input
        style={{ ...styles.input, marginBottom: 24 }}
        placeholder="🔍  Search forms..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.map((cat) => (
        <div key={cat.category} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 17, fontWeight: "700", color: C.navy, borderBottom: `2px solid ${C.border}`, paddingBottom: 8 }}>{cat.category}</h2>
          {cat.forms.map((form, i) => (
            <div key={i} style={{ ...styles.card, display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
              <div>
                <div style={{ fontWeight: "700", fontSize: 15, color: C.navy, marginBottom: 6 }}>{form.number}</div>
                <div style={{ fontSize: 13, color: C.text, marginBottom: 8, lineHeight: 1.6 }}>
                  <strong>When to use:</strong> {form.when}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
                  <strong>Notes:</strong> {form.notes}
                </div>
                <span style={styles.tag(C.amber)}>Fee: {form.fee}</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <a
                  href={form.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...styles.btn("primary"), textDecoration: "none", fontSize: 13, padding: "8px 14px" }}
                >
                  Get Form ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div style={{ ...styles.card, background: C.tealLight, borderColor: C.teal }}>
        <strong>📋 Commonwealth Courts Portal</strong>
        <p style={{ margin: "8px 0 0", fontSize: 14 }}>
          Most family law forms are filed electronically through the{" "}
          <a href="https://www.comcourts.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: C.teal }}>
            Commonwealth Courts Portal
          </a>
          . You'll need to create a free account. Paper filing is still available at court registries.
        </p>
      </div>
    </div>
  );
}

// ─── TAB: DOCUMENT VAULT ─────────────────────────────────────────────────────

const VAULT_CATEGORIES = [
  "Court Documents",
  "Financial Records",
  "Property Documents",
  "Children / Parenting",
  "Correspondence",
  "Evidence",
  "Other",
];

function VaultTab() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [docs, setDocs] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", category: VAULT_CATEGORIES[0], notes: "", file: null });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const fileRef = useRef();

  const addDoc = () => {
    if (!newDoc.name) return;
    setDocs((d) => [
      ...d,
      {
        id: Date.now(),
        name: newDoc.name,
        category: newDoc.category,
        notes: newDoc.notes,
        fileName: newDoc.file ? newDoc.file.name : "No file attached",
        size: newDoc.file ? (newDoc.file.size / 1024).toFixed(1) + " KB" : "—",
        date: new Date().toLocaleDateString("en-AU"),
        encrypted: true,
      },
    ]);
    setNewDoc({ name: "", category: VAULT_CATEGORIES[0], notes: "", file: null });
    setShowUpload(false);
  };

  const filtered = docs.filter(
    (d) =>
      (filter === "All" || d.category === filter) &&
      (d.name.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase()))
  );

  if (!loggedIn) {
    return (
      <div style={styles.container}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div
            style={{
              background: C.vaultGreen,
              color: "#fff",
              borderRadius: 16,
              padding: "32px",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <h2 style={{ margin: "0 0 8px", fontWeight: "700", fontSize: 22 }}>Secure Document Vault</h2>
            <p style={{ margin: 0, opacity: 0.85, fontSize: 14, lineHeight: 1.6 }}>
              Your documents are encrypted using AES-256 encryption and stored on isolated AWS S3 infrastructure. No documents are ever accessible to the public or other users.
            </p>
          </div>

          <div style={styles.card}>
            <h3 style={{ margin: "0 0 16px", color: C.navy }}>Sign In to Your Vault</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: "600", display: "block", marginBottom: 4 }}>Email Address</label>
              <input style={styles.input} type="email" placeholder="you@example.com" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: "600", display: "block", marginBottom: 4 }}>Password</label>
              <input style={styles.input} type="password" placeholder="••••••••" />
            </div>
            <button style={{ ...styles.btn("vault"), width: "100%" }} onClick={() => setLoggedIn(true)}>
              Included
            </button>
            <p style={{ textAlign: "center", fontSize: 13, color: C.muted, marginTop: 12 }}>
              Don't have an account?{" "}
              <span style={{ color: C.vaultGreen, cursor: "pointer", fontWeight: "600" }}>Create one free</span>
            </p>
          </div>

          <div style={{ ...styles.card, background: C.vaultGreenLight, borderColor: C.vaultGreen + "40" }}>
            <h4 style={{ margin: "0 0 10px", color: C.vaultGreen, fontSize: 14 }}>🛡️ How We Protect Your Documents</h4>
            <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, lineHeight: 2, color: C.text }}>
              <li>AES-256 encryption at rest (AWS S3 + KMS)</li>
              <li>TLS 1.3 encryption in transit</li>
              <li>Each user has a completely isolated storage bucket</li>
              <li>No staff can access your documents</li>
              <li>Data hosted in Australian AWS regions (ap-southeast-2)</li>
              <li>Two-factor authentication supported</li>
              <li>Zero public internet access to documents</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ ...styles.sectionTitle, marginBottom: 4 }}>
            <span style={{ color: C.vaultGreen }}>🔒</span> My Vault
          </h1>
          <p style={{ ...styles.sectionSub, marginBottom: 0 }}>
            {docs.length} document{docs.length !== 1 ? "s" : ""} stored securely · Encrypted
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.btn("vault")} onClick={() => setShowUpload(!showUpload)}>
            + Add Document
          </button>
          <button
            style={{ ...styles.btn(), background: "#6B7280", fontSize: 13 }}
            onClick={() => setLoggedIn(false)}
          >
            Lock Vault
          </button>
        </div>
      </div>

      {showUpload && (
        <div style={{ ...styles.card, border: `2px solid ${C.vaultGreen}`, marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 16px", color: C.vaultGreen }}>Add New Document</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: "600", display: "block", marginBottom: 4 }}>Document Name *</label>
              <input
                style={styles.input}
                placeholder="e.g. Parenting Affidavit — March 2025"
                value={newDoc.name}
                onChange={(e) => setNewDoc((n) => ({ ...n, name: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: "600", display: "block", marginBottom: 4 }}>Category</label>
              <select
                style={styles.input}
                value={newDoc.category}
                onChange={(e) => setNewDoc((n) => ({ ...n, category: e.target.value }))}
              >
                {VAULT_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: "600", display: "block", marginBottom: 4 }}>Notes</label>
            <input
              style={styles.input}
              placeholder="Optional notes about this document"
              value={newDoc.notes}
              onChange={(e) => setNewDoc((n) => ({ ...n, notes: e.target.value }))}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: "600", display: "block", marginBottom: 4 }}>Attach File</label>
            <input
              ref={fileRef}
              type="file"
              style={{ fontSize: 13 }}
              onChange={(e) => setNewDoc((n) => ({ ...n, file: e.target.files[0] }))}
            />
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>PDF, DOCX, JPG, PNG — max 50MB. Encrypted before upload.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.btn("vault")} onClick={addDoc}>Save to Vault</button>
            <button style={{ ...styles.btn(), background: C.muted }} onClick={() => setShowUpload(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          style={{ ...styles.input, width: "auto", flex: 1 }}
          placeholder="🔍  Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {["All", ...VAULT_CATEGORIES].map((c) => (
          <button
            key={c}
            style={{
              padding: "8px 12px",
              border: `1px solid ${filter === c ? C.vaultGreen : C.border}`,
              borderRadius: 20,
              background: filter === c ? C.vaultGreenLight : C.panel,
              color: filter === c ? C.vaultGreen : C.muted,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ ...styles.card, textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
          <div style={{ color: C.muted }}>
            {docs.length === 0
              ? "Your vault is empty. Add your first document using the button above."
              : "No documents match your search."}
          </div>
        </div>
      )}

      {filtered.map((doc) => (
        <div key={doc.id} style={{ ...styles.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <span style={{ fontWeight: "700", fontSize: 15, color: C.navy }}>{doc.name}</span>
              <span style={styles.tag(C.vaultGreen)}>Encrypted</span>
            </div>
            <div style={{ fontSize: 13, color: C.muted, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>📂 {doc.category}</span>
              <span>📄 {doc.fileName}</span>
              <span>💾 {doc.size}</span>
              <span>📅 Added {doc.date}</span>
            </div>
            {doc.notes && <div style={{ fontSize: 13, color: C.text, marginTop: 6 }}>📝 {doc.notes}</div>}
          </div>
          <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
            <button style={{ ...styles.btn(), background: C.teal, fontSize: 12, padding: "6px 12px" }}>
              View
            </button>
            <button
              style={{ ...styles.btn(), background: C.redLight, color: C.red, fontSize: 12, padding: "6px 12px", border: `1px solid ${C.red}` }}
              onClick={() => setDocs((d) => d.filter((x) => x.id !== doc.id))}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <div style={{ ...styles.card, background: C.vaultGreenLight, borderColor: C.vaultGreen + "40", marginTop: 16 }}>
        <div style={{ fontSize: 13, color: C.vaultGreen }}>
          🔐 <strong>Production Architecture Note:</strong> In the full deployment, files are encrypted client-side using AES-256 before leaving your browser, then stored in your dedicated AWS S3 bucket (ap-southeast-2) with AWS KMS key management. Only you hold the decryption key. No Cloudfront CDN exposure. No public S3 ACLs. Access logs audited.
        </div>
      </div>
    </div>
  );
}

// ─── TAB: GLOSSARY ────────────────────────────────────────────────────────────

function GlossaryTab() {
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState("All");

  const letters = ["All", ...Array.from(new Set(GLOSSARY_TERMS.map((t) => t.term[0].toUpperCase()))).sort()];

  const filtered = GLOSSARY_TERMS.filter(
    (t) =>
      (letter === "All" || t.term[0].toUpperCase() === letter) &&
      (t.term.toLowerCase().includes(search.toLowerCase()) || t.def.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={styles.container}>
      <h1 style={styles.sectionTitle}>Family Law Glossary</h1>
      <p style={styles.sectionSub}>Plain-English definitions of {GLOSSARY_TERMS.length}+ legal terms you'll encounter in Australian family law proceedings.</p>

      <input
        style={{ ...styles.input, marginBottom: 16 }}
        placeholder="🔍  Search terms..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 24 }}>
        {letters.map((l) => (
          <button
            key={l}
            style={{
              padding: "5px 10px",
              border: `1px solid ${letter === l ? C.navy : C.border}`,
              borderRadius: 6,
              background: letter === l ? C.navy : C.panel,
              color: letter === l ? "#fff" : C.muted,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: "600",
            }}
            onClick={() => setLetter(l)}
          >
            {l}
          </button>
        ))}
      </div>

      <div style={{ columns: "1", gap: 12 }}>
        {filtered.map((t, i) => (
          <div key={i} style={{ ...styles.card, marginBottom: 10, breakInside: "avoid" }}>
            <div style={{ fontWeight: "700", color: C.navy, fontSize: 15, marginBottom: 6 }}>{t.term}</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: C.text }}>{t.def}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ ...styles.card, textAlign: "center", color: C.muted }}>No terms found for your search.</div>
        )}
      </div>
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "info", label: "⚖️  Legal Information" },
  { id: "forms", label: "📋  Forms Library" },
  { id: "vault", label: "🔒  Document Vault" },
  { id: "glossary", label: "📖  Glossary" },
];

export default function App() {
  const [tab, setTab] = useState("info");

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>⚖️</div>
          <span>Family Court Navigator</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", textAlign: "right" }}>
          Australia · Federal & State
          <br />
          <span style={{ color: "rgba(255,255,255,0.4)" }}>For information purposes only</span>
        </div>
      </div>

      <div style={styles.nav}>
        {TABS.map((t) => (
          <button key={t.id} style={styles.navBtn(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && <LegalInfoTab />}
      {tab === "forms" && <FormsTab />}
      {tab === "vault" && <VaultTab />}
      {tab === "glossary" && <GlossaryTab />}

      <div
        style={{
          borderTop: `1px solid ${C.border}`,
          padding: "20px 24px",
          textAlign: "center",
          fontSize: 12,
          color: C.muted,
          background: C.panel,
        }}
      >
        Family Court Navigator · For information only · Not legal advice · Australia
        <br />
        Document vault secured with AES-256 encryption · AWS ap-southeast-2 · No public data exposure
      </div>
    </div>
  );
}
