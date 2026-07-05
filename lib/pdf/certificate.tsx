import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
    renderToBuffer,
} from "@react-pdf/renderer";
import { NOTO_SANS_REGULAR, NOTO_SANS_BOLD } from "./fonts.generated";
import type { CertificateType } from "@/types";

/**
 * Server-side school certificate (справка) PDF.
 *
 * Renders an official, factual document — it only states things the school can
 * verify (enrollment, class, academic year) and never fabricates grades,
 * attendance percentages or character judgements. The issuing staff member's
 * name and role are printed on the signature line so the document is traceable.
 *
 * The Cyrillic + Kazakh + Latin font is embedded as a base64 data URL
 * (`fonts.generated.ts`), so registration needs no filesystem or network access
 * and works unchanged on Vercel serverless.
 */

export type CertificateData = {
    /** Recipient full name (Latin, as stored on the profile). */
    fullName: string;
    grade: number | null;
    classLetter: string | null;
    type: CertificateType;
    /** Free-text purpose the requester entered ("для предъявления по месту требования", …). */
    purpose: string;
    /** Human-readable document number, e.g. "SPR-2026-1A2B3C". */
    docNumber: string;
    /** Issue date, 'yyyy-MM-dd' in Asia/Almaty. */
    issuedDate: string;
    /** Academic year label, e.g. "2025–2026". */
    academicYear: string;
    /** Name of the staff member who approved/issued the certificate. */
    issuerName: string;
    /** Role of that staff member ('moderator' | 'admin'). */
    issuerRole: string;
};

let fontsRegistered = false;
function ensureFonts() {
    if (fontsRegistered) return;
    Font.register({
        family: "NotoSans",
        fonts: [
            { src: NOTO_SANS_REGULAR, fontWeight: 400 },
            { src: NOTO_SANS_BOLD, fontWeight: 700 },
        ],
    });
    // Keep names/words intact — never hyphenate across a line break.
    Font.registerHyphenationCallback((word) => [word]);
    fontsRegistered = true;
}

/** Replace control chars with spaces, collapse whitespace, hard-cap length. */
function clean(value: unknown, max = 200): string {
    if (typeof value !== "string") return "";
    let out = "";
    for (const ch of value) {
        const code = ch.codePointAt(0) ?? 0;
        out += code < 0x20 || (code >= 0x7f && code <= 0x9f) ? " " : ch;
    }
    return out.replace(/\s+/g, " ").trim().slice(0, max);
}

const TYPE_SUBTITLE: Record<CertificateType, string> = {
    enrollment: "с места учёбы",
    grades: "об успеваемости",
    attendance: "о посещаемости",
    character: "характеристика",
};

function bodyText(type: CertificateType, name: string, cls: string, ay: string): string {
    const base = `Настоящая справка подтверждает, что ${name} обучается в ${cls} классе школы «BINOM» (город Астана) в ${ay} учебном году`;
    switch (type) {
        case "grades":
            return `${base} и осваивает образовательную программу соответствующего класса.`;
        case "attendance":
            return `${base} и посещает учебные занятия согласно утверждённому расписанию.`;
        case "character":
            return `Настоящая характеристика дана обучающемуся ${name}, ${cls} класс школы «BINOM» (город Астана), ${ay} учебный год.`;
        case "enrollment":
        default:
            return `${base}.`;
    }
}

function issuerRoleLabel(role: string): string {
    if (role === "admin") return "Администрация школы";
    if (role === "moderator") return "Заместитель директора";
    return "Уполномоченное лицо";
}

const NAVY = "#1e293b";
const INK = "#0f172a";
const MUTED = "#475569";
const LINE = "#cbd5e1";
const ACCENT = "#4f46e5";

const styles = StyleSheet.create({
    page: {
        fontFamily: "NotoSans",
        fontSize: 11,
        color: INK,
        paddingVertical: 54,
        paddingHorizontal: 56,
        lineHeight: 1.5,
    },
    frame: {
        flexGrow: 1,
        borderWidth: 1.5,
        borderColor: NAVY,
        borderRadius: 4,
        padding: 28,
    },
    accentBar: {
        height: 4,
        backgroundColor: ACCENT,
        borderRadius: 2,
        marginBottom: 18,
    },
    header: { alignItems: "center", marginBottom: 6 },
    schoolName: { fontSize: 20, fontWeight: 700, color: NAVY, letterSpacing: 1 },
    schoolSub: { fontSize: 9, color: MUTED, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
    rule: { borderBottomWidth: 1, borderBottomColor: LINE, marginVertical: 16 },
    metaRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: MUTED },
    title: { fontSize: 22, fontWeight: 700, color: INK, textAlign: "center", marginTop: 20, letterSpacing: 3 },
    subtitle: { fontSize: 11, color: MUTED, textAlign: "center", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },
    body: { fontSize: 12, color: INK, marginTop: 26, textAlign: "justify" },
    purpose: { fontSize: 11, color: MUTED, marginTop: 12 },
    signBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 48 },
    signCol: { width: "60%" },
    signRoleLabel: { fontSize: 10, color: MUTED },
    signLine: { borderBottomWidth: 1, borderBottomColor: INK, marginTop: 22, marginBottom: 4 },
    signName: { fontSize: 11, fontWeight: 700, color: INK },
    stamp: { width: "30%", alignItems: "center", justifyContent: "flex-end" },
    stampText: { fontSize: 9, color: MUTED },
    footer: { position: "absolute", bottom: 30, left: 56, right: 56, textAlign: "center" },
    footerText: { fontSize: 8, color: MUTED },
});

function CertificateDoc(data: CertificateData) {
    const name = clean(data.fullName, 120) || "—";
    const gradePart = Number.isInteger(data.grade) ? String(data.grade) : "";
    const letterPart = clean(data.classLetter, 4);
    const cls = [gradePart, letterPart ? `«${letterPart}»` : ""].filter(Boolean).join(" ") || "—";
    const purpose = clean(data.purpose, 300);
    const ay = clean(data.academicYear, 20);
    const subtitle = TYPE_SUBTITLE[data.type] ?? TYPE_SUBTITLE.enrollment;

    return (
        <Document
            title={`Справка ${clean(data.docNumber, 40)}`}
            author="BINOM School"
            creator="Ulagat"
            producer="Ulagat"
        >
            <Page size="A4" style={styles.page}>
                <View style={styles.frame}>
                    <View style={styles.accentBar} />

                    <View style={styles.header}>
                        <Text style={styles.schoolName}>Школа «BINOM»</Text>
                        <Text style={styles.schoolSub}>BINOM мектебі · город Астана</Text>
                    </View>

                    <View style={styles.rule} />

                    <View style={styles.metaRow}>
                        <Text>№ {clean(data.docNumber, 40)}</Text>
                        <Text>Дата выдачи: {clean(data.issuedDate, 10)}</Text>
                    </View>

                    <Text style={styles.title}>СПРАВКА</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>

                    <Text style={styles.body}>{bodyText(data.type, name, cls, ay)}</Text>

                    {purpose ? (
                        <Text style={styles.purpose}>Выдана для предъявления: {purpose}.</Text>
                    ) : null}

                    <View style={styles.signBlock}>
                        <View style={styles.signCol}>
                            <Text style={styles.signRoleLabel}>{issuerRoleLabel(data.issuerRole)}</Text>
                            <View style={styles.signLine} />
                            <Text style={styles.signName}>{clean(data.issuerName, 120) || "—"}</Text>
                        </View>
                        <View style={styles.stamp}>
                            <Text style={styles.stampText}>М.П.</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        Документ сформирован в системе Ulagat. Для проверки подлинности обратитесь в администрацию школы «BINOM».
                    </Text>
                </View>
            </Page>
        </Document>
    );
}

/** Renders the certificate to a PDF Buffer (server-only). */
export async function renderCertificatePdf(data: CertificateData): Promise<Buffer> {
    ensureFonts();
    return renderToBuffer(<CertificateDoc {...data} />);
}
